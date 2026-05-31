import type { SM2Data } from '../types/models';

export function evaluateSM2(sm2: SM2Data, score: number): { newSM2: SM2Data, newStatus: 'learning' | 'review' } {
  let { interval, repetition, efactor } = sm2;

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

  // Calculate next due date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  
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
