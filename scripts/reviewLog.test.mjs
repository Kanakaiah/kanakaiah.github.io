// Rules the review history has to obey. Run: npx vite-node scripts/reviewLog.test.mjs
// Plain assertions, no framework — matching sm2.test.mjs and session.test.mjs.
//
// The point of these is narrow and specific: the whole reason for logging reviews is to
// be able to draw a retention-by-interval curve and to compare what a reader claimed
// against what they actually produced. If those two selectors don't work, the log is
// just bytes, so they are what gets tested.

import {
  buildReviewEvent, appendReview, MAX_REVIEW_LOG,
  retentionByInterval, honestyGap, firstTryRetention,
} from '../src/utils/reviewLog.ts';

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
};

const DAY = 86400000;
const sm2 = (over = {}) => ({ interval: 10, repetition: 3, efactor: 2.5,
  nextDueDate: new Date().toISOString(), ...over });

// ── Building ────────────────────────────────────────────────────────────────────
const now = new Date();

let e = buildReviewEvent({
  itemKind: 'verse', itemId: 'v1', gradeSubmitted: 4,
  before: sm2({ nextDueDate: new Date(now.getTime() - 3 * DAY).toISOString() }),
  after: sm2({ interval: 25 }), now,
});
t('records how overdue the item was', e.daysLate === 3);
t('carries the schedule either side of the grade', e.intervalBefore === 10 && e.intervalAfter === 25);
t('defaults to an uncued reveal', e.cueLevel === 0 && e.mode === 'reveal');
t('leaves what was produced null when nothing was collected',
  e.committed === null && e.measuredAccuracy === null);

e = buildReviewEvent({
  itemKind: 'verse', itemId: 'v1', gradeSubmitted: 4,
  before: sm2({ nextDueDate: new Date(now.getTime() + 5 * DAY).toISOString() }),
  after: sm2(), now,
});
t('reviewing early is not negatively late', e.daysLate === 0);

e = buildReviewEvent({ itemKind: 'anchor', itemId: 'genesis:1', gradeSubmitted: 1,
  before: undefined, after: sm2({ interval: 1 }), now });
t('a first sight has no prior schedule', e.intervalBefore === 0 && e.scheduledFor === null);

// ── The cap ─────────────────────────────────────────────────────────────────────
let log = [];
for (let i = 0; i < MAX_REVIEW_LOG + 50; i++) {
  log = appendReview(log, buildReviewEvent({
    itemKind: 'verse', itemId: 'v' + i, gradeSubmitted: 4, before: sm2(), after: sm2(), now,
  }));
}
t('the log stops growing at the cap', log.length === MAX_REVIEW_LOG);
t('the cap drops the oldest, not the newest', log[log.length - 1].itemId === 'v' + (MAX_REVIEW_LOG + 49));

// ── Retention by interval ───────────────────────────────────────────────────────
const ev = (over) => buildReviewEvent({
  itemKind: 'verse', itemId: 'x', gradeSubmitted: 4, before: sm2(), after: sm2(), now, ...over,
});

// Six one-day items, four recalled. Six 3-month items, one recalled.
const curveLog = [
  ...Array.from({ length: 6 }, (_, i) => ev({ before: sm2({ interval: 1 }), gradeSubmitted: i < 4 ? 4 : 1 })),
  ...Array.from({ length: 6 }, (_, i) => ev({ before: sm2({ interval: 200 }), gradeSubmitted: i < 1 ? 4 : 1 })),
];
let curve = retentionByInterval(curveLog, 90, now);
const oneDay = curve.find(b => b.label === '1d');
const longest = curve.find(b => b.label === '3mo+');
t('short intervals bucket together', oneDay.attempts === 6 && Math.abs(oneDay.rate - 4 / 6) < 1e-9);
t('long intervals bucket together', longest.attempts === 6 && Math.abs(longest.rate - 1 / 6) < 1e-9);
t('the curve can actually be drawn — this is what N1 exists for',
  curve.filter(b => b.rate !== null).length === 2);

// A first sight says nothing about retention and must not enter the curve.
curve = retentionByInterval([...curveLog, ...Array.from({ length: 9 }, () =>
  ev({ before: sm2({ interval: 0 }), gradeSubmitted: 5 }))], 90, now);
t('first sights are excluded from the curve',
  curve.reduce((n, b) => n + b.attempts, 0) === 12);

// Thin buckets report nothing rather than a flattering fiction.
curve = retentionByInterval([ev({ before: sm2({ interval: 1 }), gradeSubmitted: 5 })], 90, now);
t('a single answer is not a retention rate', curve.find(b => b.label === '1d').rate === null);

// Events outside the window are ignored.
const stale = ev({ before: sm2({ interval: 1 }) });
stale.ts = new Date(now.getTime() - 200 * DAY).toISOString();
t('old events fall outside the window',
  retentionByInterval([stale], 90, now).every(b => b.attempts === 0));

// ── The honesty gap ─────────────────────────────────────────────────────────────
t('no measured attempt means no claim about honesty', honestyGap(curveLog, 30, now) === null);

// Graded Easy (5) on attempts that only matched 75% of the words — worth "Hard" (3).
const inflated = Array.from({ length: 4 }, () =>
  ev({ gradeSubmitted: 5, measuredAccuracy: 75 }));
const gap = honestyGap(inflated, 30, now);
t('self-grading above the words produced shows as a positive gap',
  gap.n === 4 && gap.meanGrade === 5 && gap.meanSuggested === 3 && gap.gap === 2);

const honest = Array.from({ length: 4 }, () => ev({ gradeSubmitted: 5, measuredAccuracy: 100 }));
t('an honest grader shows no gap', honestyGap(honest, 30, now).gap === 0);

// ── First-try retention ─────────────────────────────────────────────────────────
const mixed = [
  ...Array.from({ length: 6 }, () => ev({ cueLevel: 0, gradeSubmitted: 4 })),
  // Read off a full hint. Whatever grade it was given, it was not a recall.
  ...Array.from({ length: 6 }, () => ev({ cueLevel: 4, gradeSubmitted: 5 })),
];
const ft = firstTryRetention(mixed, 30, now);
t('an answer read off a full hint is not counted as first-try recall',
  ft.attempts === 6 && ft.rate === 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
