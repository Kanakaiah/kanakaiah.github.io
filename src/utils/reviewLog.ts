import type { ReviewEvent, SM2Data } from '../types/models';
import { suggestedScore } from './sm2';

/**
 * Writing and reading the review history.
 *
 * The write half exists because nothing in the app recorded that a review happened, so
 * retention was not merely unmeasured but unmeasurable. The read half is in the same
 * file on purpose: this codebase has now three times built a signal and then never read
 * it — `lapses` is computed by the scheduler and consulted by nothing, `chainHits` was
 * collected and dropped for months, and `RECORD_ACTIVITY` sat in the reducer with no
 * dispatcher at all. A log with no selectors is that same mistake with more bytes.
 */

/** Roughly a year of heavy use. localStorage is one ~5MB budget shared with the verse
 * library and chapterProgress (up to 1,189 records for the whole Bible), so the history
 * cannot grow without limit. Oldest events are dropped first; the recent window is what
 * every selector below actually asks about. */
export const MAX_REVIEW_LOG = 4000;

const uid = (): string => {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export interface ReviewRecordInput {
  itemKind: ReviewEvent['itemKind'];
  itemId: string;
  gradeSubmitted: number;
  /** The item's schedule as it stood *before* this grade — may be absent on first sight. */
  before: SM2Data | undefined;
  /** The schedule `evaluateSM2` just produced. */
  after: SM2Data;
  mode?: ReviewEvent['mode'];
  cueLevel?: ReviewEvent['cueLevel'];
  direction?: ReviewEvent['direction'];
  gradeCeiling?: number;
  elapsedMs?: number;
  committed?: string | null;
  measuredAccuracy?: number | null;
  now?: Date;
}

/**
 * Builds one event. Deliberately takes the before/after schedules rather than computing
 * them, so the log records what the scheduler actually did rather than what this module
 * thinks it should have done — the two drifting apart is precisely the kind of silent
 * disagreement the history exists to expose.
 */
export function buildReviewEvent(input: ReviewRecordInput): ReviewEvent {
  const now = input.now || new Date();
  const scheduledFor = input.before?.nextDueDate || null;

  // How overdue the item was when it was finally answered. Floored at zero: reviewing
  // something early is a legitimate thing to do and is not "negatively late".
  const daysLate = scheduledFor
    ? Math.max(0, Math.floor((now.getTime() - new Date(scheduledFor).getTime()) / 86400000))
    : 0;

  return {
    id: uid(),
    ts: now.toISOString(),
    itemKind: input.itemKind,
    itemId: input.itemId,
    ...(input.direction ? { direction: input.direction } : {}),
    cueLevel: input.cueLevel ?? 0,
    mode: input.mode ?? 'reveal',
    elapsedMs: input.elapsedMs ?? 0,
    committed: input.committed ?? null,
    measuredAccuracy: input.measuredAccuracy ?? null,
    gradeSubmitted: input.gradeSubmitted,
    gradeCeiling: input.gradeCeiling ?? 5,
    intervalBefore: input.before?.interval ?? 0,
    intervalAfter: input.after.interval,
    efactorAfter: input.after.efactor,
    scheduledFor,
    daysLate,
  };
}

/** Appends within the cap, dropping the oldest. Pure, so the reducer stays trivial. */
export function appendReview(log: ReviewEvent[], event: ReviewEvent): ReviewEvent[] {
  const next = [...log, event];
  return next.length > MAX_REVIEW_LOG ? next.slice(next.length - MAX_REVIEW_LOG) : next;
}

// ── Reading ───────────────────────────────────────────────────────────────────────

/** A grade of 3 or better is the scheduler's own definition of a successful recall —
 * below 3 it resets the repetition count. Retention is measured on the same line so the
 * number on screen and the number driving the schedule cannot disagree. */
export const wasRecalled = (e: ReviewEvent): boolean => e.gradeSubmitted >= 3;

const withinDays = (e: ReviewEvent, days: number, now: Date) =>
  now.getTime() - new Date(e.ts).getTime() <= days * 86400000;

export interface RetentionBucket {
  label: string;
  /** Upper bound of the bucket in days, inclusive. Infinity for the last. */
  maxDays: number;
  attempts: number;
  recalled: number;
  /** 0–1, or null when there is not enough in the bucket to mean anything. */
  rate: number | null;
}

const BUCKETS: { label: string; maxDays: number }[] = [
  { label: '1d', maxDays: 1 },
  { label: '3d', maxDays: 3 },
  { label: '1w', maxDays: 7 },
  { label: '1mo', maxDays: 30 },
  { label: '3mo', maxDays: 90 },
  { label: '3mo+', maxDays: Infinity },
];

/** Minimum attempts before a bucket's rate is reported at all. A single review is not a
 * retention rate, and showing "100%" off one answer invites exactly the wrong conclusion. */
const MIN_BUCKET_N = 5;

/**
 * The app's own forgetting curve: how often an item was recalled, grouped by how long it
 * had been scheduled away. This is the diagnostic the scheduler has never had — if the
 * rate collapses at the long end, SM-2's intervals are running past what this reader
 * actually holds, and the fix is a shorter schedule rather than more effort.
 */
export function retentionByInterval(
  log: ReviewEvent[],
  windowDays = 90,
  now: Date = new Date(),
): RetentionBucket[] {
  const buckets: RetentionBucket[] = BUCKETS.map(b => ({ ...b, attempts: 0, recalled: 0, rate: null }));

  for (const e of log) {
    if (!withinDays(e, windowDays, now)) continue;
    // A first sight has no interval behind it and so says nothing about retention.
    if (e.intervalBefore <= 0) continue;
    const bucket = buckets.find(b => e.intervalBefore <= b.maxDays);
    if (!bucket) continue;
    bucket.attempts++;
    if (wasRecalled(e)) bucket.recalled++;
  }

  for (const b of buckets) {
    b.rate = b.attempts >= MIN_BUCKET_N ? b.recalled / b.attempts : null;
  }
  return buckets;
}

export interface HonestyGap {
  n: number;
  meanGrade: number;
  meanSuggested: number;
  /** Positive means the reader graded themselves higher than the words they produced. */
  gap: number;
}

/**
 * The difference between what the reader claimed and what they actually produced, over
 * the attempts where both are known.
 *
 * This is the single most useful number the log can yield. Self-graded spaced repetition
 * rests entirely on the grades being honest, and until now the app had no way to check —
 * it collected measured accuracy in two modes and threw it away at the moment of
 * grading. A persistent positive gap means intervals are being bought rather than
 * earned, and every "secure" count in the app is inflated by roughly that much.
 *
 * Returns null when no attempt has been measured, which is the current state of the
 * daily loop and is itself the finding.
 */
export function honestyGap(log: ReviewEvent[], windowDays = 30, now: Date = new Date()): HonestyGap | null {
  const measured = log.filter(e => e.measuredAccuracy !== null && withinDays(e, windowDays, now));
  if (measured.length === 0) return null;

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanGrade = mean(measured.map(e => e.gradeSubmitted));
  const meanSuggested = mean(measured.map(e => suggestedScore(e.measuredAccuracy as number)));

  return { n: measured.length, meanGrade, meanSuggested, gap: meanGrade - meanSuggested };
}

/**
 * First-try recall over a window — the headline number. "First try" means the cue was
 * not escalated: an answer read off a full hint is not a recall, whatever grade it was
 * given, so anything above cue level 1 is excluded rather than counted as a success.
 */
export function firstTryRetention(
  log: ReviewEvent[],
  windowDays = 30,
  now: Date = new Date(),
): { attempts: number; recalled: number; rate: number | null } {
  const eligible = log.filter(e => withinDays(e, windowDays, now) && e.cueLevel <= 1 && e.intervalBefore > 0);
  const recalled = eligible.filter(wasRecalled).length;
  return {
    attempts: eligible.length,
    recalled,
    rate: eligible.length >= MIN_BUCKET_N ? recalled / eligible.length : null,
  };
}
