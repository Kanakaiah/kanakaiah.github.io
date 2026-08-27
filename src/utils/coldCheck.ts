import type { AppState, ReviewEvent } from '../types/models';
import { OT_BOOKS } from '../data/otBooks';
import { NT_BOOKS } from '../data/ntBooks';
import { OT_STUDY_GUIDES } from '../data/otGuides';
import { NT_STUDY_GUIDES } from '../data/guides';
import { chapterProgressKey } from '../types/models';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
const ALL_GUIDES = [...OT_STUDY_GUIDES, ...NT_STUDY_GUIDES] as unknown as {
  id: string; anchors?: { ch: number | string; word: string }[];
}[];

/**
 * The one measurement that answers what this app is for.
 *
 * Everything else the app records is *scheduled* review: the item was due, the app chose
 * the moment, and the reader arrived expecting to be asked. That is the right way to
 * build memory and the wrong way to measure it, because a schedule tuned to keep
 * retention high will report high retention almost by construction. Ask an item on the
 * day it is due and a 90% pass rate says the scheduler is working; it does not say the
 * reader could produce the verse unprompted next month.
 *
 * A cold check asks items the schedule is *not* asking for — things last recalled well
 * over a month ago, chosen without regard to due date — and, critically, throws the
 * result away. Nothing here writes to SM-2, and nothing here counts toward a streak.
 * Measuring must not disturb what it measures: if a cold check moved intervals, it would
 * become just another review and stop being an independent read.
 *
 * It is deliberately small and infrequent. Five items, roughly monthly, is enough to
 * track a trend and little enough that it never feels like extra work owed.
 */

/** Minimum days since the last successful recall for an item to count as cold. */
export const COLD_DAYS = 30;
export const COLD_CHECK_SIZE = 5;

export interface ColdItem {
  key: string;
  kind: 'verse' | 'anchor' | 'theme';
  /** What the reader is shown. */
  prompt: string;
  /** What counts as right. */
  answer: string;
  /** Days since this item was last recalled successfully. */
  coldFor: number;
}

export interface ColdCheckResult {
  ts: string;
  correct: number;
  total: number;
  /** Median days cold across the items asked, so a rising score can be told apart from
   * an easier sample. */
  medianColdFor: number;
}

const daysBetween = (a: number, b: number) => Math.floor((a - b) / 86400000);

/**
 * The last time each item was recalled *successfully*, from the review history.
 *
 * Deliberately from the log rather than from `lastAttemptDate` on the progress record:
 * that field moves on every attempt including failures, so an item failed daily for a
 * month would look freshly reviewed and never appear cold. What matters here is when the
 * reader last actually had it.
 */
function lastSuccessByItem(log: ReviewEvent[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of log) {
    if (e.gradeSubmitted < 3) continue;
    const key = `${e.itemKind}:${e.itemId}`;
    const t = new Date(e.ts).getTime();
    const prev = out.get(key);
    if (prev === undefined || t > prev) out.set(key, t);
  }
  return out;
}

const bookName = (id: string) => ALL_BOOKS.find(b => b.id === id)?.name || id;

/**
 * Picks the items to ask. Sampled across kinds and shuffled, not simply "the coldest
 * five" — the coldest are systematically the hardest, and a check that always asked them
 * would report a pessimistic number that never moved.
 */
export function buildColdCheck(
  state: AppState,
  size = COLD_CHECK_SIZE,
  now: Date = new Date(),
  shuffle: <T>(xs: T[]) => T[] = xs => [...xs].sort(() => Math.random() - 0.5),
): ColdItem[] {
  const lastSuccess = lastSuccessByItem(state.reviewLog || []);
  const nowMs = now.getTime();
  const candidates: ColdItem[] = [];

  const coldFor = (kind: string, id: string): number | null => {
    const t = lastSuccess.get(`${kind}:${id}`);
    if (t === undefined) return null; // never successfully recalled — nothing to retain
    const d = daysBetween(nowMs, t);
    return d >= COLD_DAYS ? d : null;
  };

  for (const v of state.verses || []) {
    const d = coldFor('verse', v.id);
    if (d !== null) {
      candidates.push({ key: `verse:${v.id}`, kind: 'verse', prompt: v.ref, answer: v.text, coldFor: d });
    }
  }

  for (const p of Object.values(state.chapterProgress || {})) {
    const key = chapterProgressKey(p.bookId, p.chapter);
    const d = coldFor('anchor', key);
    if (d === null) continue;
    const anchor = ALL_GUIDES.find(g => g.id === p.bookId)?.anchors
      ?.find(a => Number(a.ch) === p.chapter);
    if (!anchor) continue;
    candidates.push({
      key: `anchor:${key}`, kind: 'anchor',
      prompt: `${bookName(p.bookId)} ${p.chapter}`, answer: anchor.word, coldFor: d,
    });
  }

  for (const p of Object.values(state.themeProgress || {})) {
    const d = coldFor('theme', p.bookId);
    if (d === null) continue;
    const book = ALL_BOOKS.find(b => b.id === p.bookId);
    if (!book) continue;
    candidates.push({
      key: `theme:${p.bookId}`, kind: 'theme',
      prompt: book.name, answer: book.themeWord, coldFor: d,
    });
  }

  return shuffle(candidates).slice(0, size);
}

/** Whether there is enough cold material for a check to mean anything. */
export function coldCheckAvailable(state: AppState, now: Date = new Date()): number {
  return buildColdCheck(state, Number.MAX_SAFE_INTEGER, now, xs => xs).length;
}

export function summarizeColdCheck(
  items: ColdItem[],
  correctKeys: Set<string>,
  now: Date = new Date(),
): ColdCheckResult {
  const cold = items.map(i => i.coldFor).sort((a, b) => a - b);
  const median = cold.length
    ? cold[Math.floor(cold.length / 2)]
    : 0;
  return {
    ts: now.toISOString(),
    correct: items.filter(i => correctKeys.has(i.key)).length,
    total: items.length,
    medianColdFor: median,
  };
}
