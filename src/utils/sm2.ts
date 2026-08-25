import type { SM2Data } from '../types/models';

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

export function evaluateSM2(sm2: SM2Data, score: number): { newSM2: SM2Data, newStatus: 'learning' | 'review' } {
  let { interval, repetition, efactor = 2.5 } = sm2;

  // SM-2 Algorithm Implementation
  if (score < 3) {
      repetition = 0;
      interval = 1; // repeat tomorrow
  } else {
      if (repetition === 0) {
          interval = 1;
      } else if (repetition === 1) {
          interval = 6;
      } else {
          interval = Math.round(interval * efactor);
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
      nextDueDate: nextDate.toISOString()
    },
    newStatus
  };
}
