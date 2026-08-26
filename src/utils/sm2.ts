import type { SM2Data } from '../types/models';

/**
 * The three layers are three different memory tasks, and they were sharing one schedule.
 *
 * A book's theme is a two-word paired associate. A chapter anchor is one word plus an
 * ordinal. A verse is verbatim serial recall of anything up to a hundred and nine words.
 * Until now all three ran through identical arithmetic, so "Hard" on Genesis 32:26-29
 * and "Hard" on GARDEN moved the same efactor by the same amount and bought the same
 * growth — despite one being a single association and the other being eighty-eight
 * ordered ones, any of which can break the whole recall.
 *
 * Long verbatim text decays faster and fails more completely, so it gets slower growth
 * and a shorter second step; a one-word associate that has been recalled cleanly can be
 * pushed out harder. Chains and memory sentences sit between the two.
 *
 * These multipliers are a starting point, not a result. They are the kind of thing that
 * should be set from the reader's own retention-by-interval curve rather than from
 * anyone's intuition — which is precisely what the review history exists to make
 * possible, and why it was built before this was touched.
 */
export type ScheduleKind = 'verse' | 'anchor' | 'theme' | 'chain' | 'sentence';

interface SchedulerProfile {
  /** Interval after the first success. */
  firstInterval: number;
  /** Interval after the second success — textbook SM-2's flat six days. */
  secondInterval: number;
  /** Applied to each subsequent multiplication by the efactor. */
  growth: number;
  /** Above this an item counts as mature: worth remembering where it was when it fell.
   * Below it there is no accumulated schedule to protect, so a lapse simply restarts. */
  matureInterval: number;
  /** How much of a lapsed item's old interval the second success aims at. Deliberately
   * conservative — the item *was* forgotten, and the efactor has already taken its own
   * hit from the failing grade. */
  lapseRecovery: number;
}

/** Textbook SM-2, and what every item used to get. Still the default, so any caller that
 * doesn't name a kind behaves exactly as before. */
const DEFAULT_PROFILE: SchedulerProfile = {
  firstInterval: 1, secondInterval: 6, growth: 1, matureInterval: 21, lapseRecovery: 0.25,
};

const PROFILES: Record<ScheduleKind, SchedulerProfile> = {
  // Eighty-eight ordered words, any one of which can break the recall. Grows slowly and
  // is treated as mature later, because a verse that feels solid at three weeks is
  // routinely gone at three months.
  verse: { firstInterval: 1, secondInterval: 4, growth: 0.85, matureInterval: 30, lapseRecovery: 0.2 },
  // One word against a number. Cheap to test, and cheap to be wrong about.
  anchor: { firstInterval: 1, secondInterval: 8, growth: 1.15, matureInterval: 21, lapseRecovery: 0.3 },
  // Sixty-six of them, the smallest and most tractable layer in the app.
  theme: { firstInterval: 1, secondInterval: 10, growth: 1.2, matureInterval: 21, lapseRecovery: 0.3 },
  chain: DEFAULT_PROFILE,
  sentence: DEFAULT_PROFILE,
};

export const profileFor = (kind?: ScheduleKind): SchedulerProfile =>
  (kind && PROFILES[kind]) || DEFAULT_PROFILE;

/** "3 days", "2 mo", "today" — the human-readable form of an SM2 interval, shared by
 * every grading UI (memory sentence, chapter recall) so the same number always reads
 * the same way. */
export function formatInterval(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return `${Math.round(days / 365)} yr`;
}

/**
 * Maps measured word-accuracy onto the four grades. The boundaries are deliberately
 * strict at the top: word-for-word memorization is the goal, so 90% is "Good" rather
 * than "Easy" — a verse recalled with one word in ten wrong is not one to push out to
 * a long interval. Below 70% the attempt failed, whatever it felt like.
 *
 * Lives here beside `evaluateSM2` rather than inside the practice screen because the
 * review history now measures self-grading against it. If the screen's idea of what 90%
 * is worth ever drifted from the one used to audit those grades, the audit would quietly
 * be measuring nothing.
 */
export const suggestedScore = (accuracy: number): number =>
  accuracy >= 98 ? 5 : accuracy >= 90 ? 4 : accuracy >= 70 ? 3 : 1;

/**
 * The one definition of "due" in the app.
 *
 * `status` records which *phase* an item is in — 'learning' until three successful
 * recalls, 'review' after — and it is a label, not a schedule. Every verse surface
 * used to test `status === 'review' || nextDueDate <= now`, but `status` never
 * returns to 'learning' except on a lapse, so that first clause was permanently true
 * for any item recalled three times and the date half was dead code. The better you
 * knew a verse, the more permanently "due" it became.
 *
 * Chapter recall already got this right (`mastery.ts` tests the date alone). This is
 * that same test, exported once so the two halves of the app cannot drift apart again.
 *
 * An item with no schedule at all is treated as due: it needs one, and surfacing it is
 * safer than letting it vanish from every queue. It gets a real date on its first grade.
 */
export function isDue(sm2: SM2Data | undefined, now: Date = new Date()): boolean {
  if (!sm2?.nextDueDate) return true;
  return new Date(sm2.nextDueDate) <= now;
}

export function evaluateSM2(sm2: SM2Data, score: number, kind?: ScheduleKind): { newSM2: SM2Data, newStatus: 'learning' | 'review' } {
  const profile = profileFor(kind);
  let { interval, repetition, efactor = 2.5 } = sm2;
  let lapses = sm2.lapses || 0;
  let preLapseInterval = sm2.preLapseInterval;

  // SM-2 Algorithm Implementation
  if (score < 3) {
      // Remember where this item was before it fell, but only if it had actually got
      // somewhere — there is nothing worth preserving about a card that was on a
      // six-day interval, and MATURE_INTERVAL keeps the recovery path below from
      // firing for items that never earned it.
      if (interval > profile.matureInterval) {
        preLapseInterval = interval;
        lapses += 1;
      }
      repetition = 0;
      interval = 1; // repeat tomorrow — you did just fail it
  } else {
      if (repetition === 0) {
          // Still tomorrow. A lapse is a lapse: one success the day after does not
          // undo it, whatever the item's history.
          interval = profile.firstInterval;
      } else if (repetition === 1) {
          // The re-climb. Second success after a lapse aims at a fraction of the
          // interval the item used to hold, rather than the flat second step a brand-new
          // card gets. A 200-day verse returns at ~40 days instead of crawling
          // 4 → 9 → 20 → 45; a 30-day one barely changes; a short one is untouched,
          // because Math.max keeps the second step as the floor. Only genuine maturity is
          // preserved, which is the only thing that was being thrown away.
          interval = preLapseInterval
            ? Math.max(profile.secondInterval, Math.round(preLapseInterval * profile.lapseRecovery))
            : profile.secondInterval;
          preLapseInterval = undefined; // consumed
      } else {
          interval = Math.max(interval + 1, Math.round(interval * efactor * profile.growth));
      }
      repetition += 1;
  }

  // Adjust Easiness Factor (EF)
  efactor = efactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02));
  if (efactor < 1.3) efactor = 1.3;

  // Assign status
  const newStatus = repetition >= 3 ? 'review' : 'learning';

  // Calculate next due date.
  //
  // Intervals of four days or more get ±15% of scatter. Items are routinely graded in
  // cohorts — a testament sweep, a book drilled end to end in one sitting — and an
  // exact formula returns the whole cohort on a single day, forever: 1 → 6 → 15 → 37,
  // in lockstep, arriving as a wall that the drill queue's own cap then truncates.
  // Short intervals are left exact so the "1 day" / "3 days" printed on the grade
  // button is precisely what the reader gets.
  const nextDate = new Date();
  let daysUntilDue = interval;
  if (interval >= 4) {
    const spread = Math.round(interval * 0.15);
    daysUntilDue = Math.max(1, interval + (Math.floor(Math.random() * (spread * 2 + 1)) - spread));
  }
  nextDate.setDate(nextDate.getDate() + daysUntilDue);

  return {
    newSM2: {
      interval,
      repetition,
      efactor,
      nextDueDate: nextDate.toISOString(),
      // Spread conditionally so records that have never lapsed stay exactly the shape
      // they were, rather than gaining `lapses: 0` noise across a whole library.
      ...(lapses > 0 ? { lapses } : {}),
      ...(preLapseInterval ? { preLapseInterval } : {}),
    },
    newStatus
  };
}
