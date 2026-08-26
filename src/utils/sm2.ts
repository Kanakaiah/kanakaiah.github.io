import type { SM2Data } from '../types/models';

/** Above this, an item counts as mature: worth remembering where it was when it fell.
 * Below it there is no accumulated schedule to protect, so a lapse simply restarts. */
const MATURE_INTERVAL = 21;

/** How much of a lapsed item's old interval the second success aims at. A quarter is
 * deliberately conservative — the item *was* forgotten, and the efactor has already
 * taken its own hit from the failing grade. */
const LAPSE_RECOVERY = 0.25;

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
  let lapses = sm2.lapses || 0;
  let preLapseInterval = sm2.preLapseInterval;

  // SM-2 Algorithm Implementation
  if (score < 3) {
      // Remember where this item was before it fell, but only if it had actually got
      // somewhere — there is nothing worth preserving about a card that was on a
      // six-day interval, and MATURE_INTERVAL keeps the recovery path below from
      // firing for items that never earned it.
      if (interval > MATURE_INTERVAL) {
        preLapseInterval = interval;
        lapses += 1;
      }
      repetition = 0;
      interval = 1; // repeat tomorrow — you did just fail it
  } else {
      if (repetition === 0) {
          // Still tomorrow. A lapse is a lapse: one success the day after does not
          // undo it, whatever the item's history.
          interval = 1;
      } else if (repetition === 1) {
          // The re-climb. Second success after a lapse aims at a quarter of the
          // interval the item used to hold, rather than the flat six days a brand-new
          // card gets. A 200-day verse returns at ~50 days instead of crawling
          // 6 → 15 → 37 → 90; a 30-day one barely changes; a 10-day one is untouched,
          // because Math.max keeps six as the floor. Only genuine maturity is
          // preserved, which is the only thing that was being thrown away.
          interval = preLapseInterval
            ? Math.max(6, Math.round(preLapseInterval * LAPSE_RECOVERY))
            : 6;
          preLapseInterval = undefined; // consumed
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
      nextDueDate: nextDate.toISOString(),
      // Spread conditionally so records that have never lapsed stay exactly the shape
      // they were, rather than gaining `lapses: 0` noise across a whole library.
      ...(lapses > 0 ? { lapses } : {}),
      ...(preLapseInterval ? { preLapseInterval } : {}),
    },
    newStatus
  };
}
