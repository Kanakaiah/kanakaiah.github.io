// Rules for the cold check. Run: npx vite-node scripts/coldCheck.test.mjs
//
// This is the measurement the whole app exists to produce, so the properties that make it
// trustworthy are the ones worth pinning: it must ask only things that have genuinely
// gone cold, it must never be able to move a schedule, and its sample must not be
// systematically the hardest items available.

import { buildColdCheck, coldCheckAvailable, summarizeColdCheck, COLD_DAYS } from '../src/utils/coldCheck.ts';
import { appReducer } from '../src/context/appReducer.ts';

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
};

const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
const noShuffle = xs => xs;

const base = (over = {}) => ({
  verses: [], streak: 0, lastActiveDate: null, theme: 'black', sortOrder: 'smart',
  memorySentenceProgress: {}, chapterProgress: {}, themeProgress: {}, blockProgress: {},
  reviewLog: [], coldChecks: [],
  adherence: { started: 0, completed: 0, itemsGraded: 0, completedMs: 0, abandonedAtSum: 0, abandonedCount: 0 },
  settings: {}, ...over,
});

const verse = (id, ref) => ({ id, ref, text: 'In the beginning God created the heavens and the earth',
  sm2: { interval: 30, repetition: 5, efactor: 2.5, nextDueDate: daysAgo(-10) }, status: 'review', attempts: 5 });

const ev = (kind, id, ts, grade = 4) => ({ itemKind: kind, itemId: id, ts, gradeSubmitted: grade });

// ── Only genuinely cold items are asked ─────────────────────────────────────────
let s = base({
  verses: [verse('cold', 'Genesis 1:1'), verse('warm', 'John 3:16')],
  reviewLog: [ev('verse', 'cold', daysAgo(60)), ev('verse', 'warm', daysAgo(3))],
});
let items = buildColdCheck(s, 5, new Date(), noShuffle);
t('an item recalled long ago is cold', items.some(i => i.key === 'verse:cold'));
t('an item recalled recently is not', !items.some(i => i.key === 'verse:warm'));
t('the days-cold is carried', items[0].coldFor >= 60);

// Never successfully recalled: there is no retention to measure, so it is not a candidate.
s = base({ verses: [verse('never', 'Ruth 1:16')], reviewLog: [] });
t('an item never recalled is not cold, just unlearned', buildColdCheck(s, 5).length === 0);

// A failure does not count as a recall — otherwise an item failed daily for a month would
// look freshly reviewed and could never surface.
s = base({
  verses: [verse('failing', 'Job 1:21')],
  reviewLog: [ev('verse', 'failing', daysAgo(50), 4), ev('verse', 'failing', daysAgo(1), 1)],
});
t('a recent failure does not make an item warm', buildColdCheck(s, 5).length === 1);

// The boundary.
s = base({ verses: [verse('edge', 'Psalm 1:1')], reviewLog: [ev('verse', 'edge', daysAgo(COLD_DAYS - 1))] });
t('just inside the window is not yet cold', buildColdCheck(s, 5).length === 0);
s = base({ verses: [verse('edge', 'Psalm 1:1')], reviewLog: [ev('verse', 'edge', daysAgo(COLD_DAYS + 1))] });
t('just outside the window is cold', buildColdCheck(s, 5).length === 1);

// ── Sampling ────────────────────────────────────────────────────────────────────
s = base({
  verses: Array.from({ length: 20 }, (_, i) => verse('v' + i, 'R' + i)),
  reviewLog: Array.from({ length: 20 }, (_, i) => ev('verse', 'v' + i, daysAgo(40 + i))),
});
t('the check is capped at its size', buildColdCheck(s, 5, new Date(), noShuffle).length === 5);
t('availability reports everything cold, not just the sample', coldCheckAvailable(s) === 20);

// ── Anchors and themes are eligible too ─────────────────────────────────────────
s = base({
  chapterProgress: { 'genesis:1': { bookId: 'genesis', chapter: 1,
    sm2: { interval: 30, repetition: 4, efactor: 2.5, nextDueDate: daysAgo(-5) },
    status: 'review', attempts: 4, lastScore: 4, lastAttemptDate: daysAgo(45), readCount: 0, lastReadDate: null } },
  themeProgress: { habakkuk: { bookId: 'habakkuk',
    sm2: { interval: 30, repetition: 4, efactor: 2.5, nextDueDate: daysAgo(-5) },
    status: 'review', attempts: 4, lastScore: 4, lastAttemptDate: daysAgo(45) } },
  reviewLog: [ev('anchor', 'genesis:1', daysAgo(45)), ev('theme', 'habakkuk', daysAgo(45))],
});
items = buildColdCheck(s, 5, new Date(), noShuffle);
t('a cold anchor is asked, with its word as the answer',
  items.some(i => i.kind === 'anchor' && i.answer === 'LIGHT'));
t('a cold theme is asked, with its theme word as the answer',
  items.some(i => i.kind === 'theme' && i.answer === 'WATCHTOWER'));

// ── The result is recorded, and changes nothing ─────────────────────────────────
const summary = summarizeColdCheck(
  [{ key: 'a', coldFor: 40 }, { key: 'b', coldFor: 50 }, { key: 'c', coldFor: 90 }],
  new Set(['a', 'c']),
);
t('the score counts what was recalled', summary.correct === 2 && summary.total === 3);
t('the median days-cold travels with it, so a softer sample cannot look like progress',
  summary.medianColdFor === 50);

const before = base({ verses: [verse('v1', 'Genesis 1:1')] });
const after = appReducer(before, { type: 'RECORD_COLD_CHECK', payload: summary });
t('the result is stored', after.coldChecks.length === 1);
// The whole basis for trusting this number: measuring must not disturb what it measures.
t('a cold check never moves a schedule',
  after.verses[0].sm2.nextDueDate === before.verses[0].sm2.nextDueDate &&
  after.verses[0].sm2.interval === before.verses[0].sm2.interval &&
  after.verses[0].sm2.repetition === before.verses[0].sm2.repetition);
t('a cold check never touches the streak', after.streak === before.streak);
t('a cold check writes no review history', after.reviewLog.length === 0);

// ── Adherence ───────────────────────────────────────────────────────────────────
let a = base();
a = appReducer(a, { type: 'SESSION_STARTED' });
a = appReducer(a, { type: 'SESSION_STARTED' });
a = appReducer(a, { type: 'SESSION_COMPLETED', payload: { itemsGraded: 12, durationMs: 300000 } });
t('starts and completions are counted separately',
  a.adherence.started === 2 && a.adherence.completed === 1);
t('a completion rate can be computed', a.adherence.completed / a.adherence.started === 0.5);
t('duration accumulates for a mean', a.adherence.completedMs === 300000);

a = appReducer(a, { type: 'SESSION_ABANDONED', payload: { atIndex: 3 } });
a = appReducer(a, { type: 'SESSION_ABANDONED', payload: { atIndex: 5 } });
t('where people stop is averaged without storing a row each',
  a.adherence.abandonedAtSum / a.adherence.abandonedCount === 4);


// ── The median is a median ──────────────────────────────────────────────────────
// Taking the upper of two middle values biased this upward, and upward is the worst
// direction: the field exists so a soft sample cannot be mistaken for progress.
const med = (...days) => summarizeColdCheck(
  days.map((d, i) => ({ key: 'k' + i, coldFor: d })), new Set()).medianColdFor;
t('an odd count takes the middle value', med(30, 50, 90) === 50);
t('an even count averages the two middle values', med(30, 40, 60, 200) === 50);
t('two items average rather than round up', med(30, 200) === 115);
t('an empty check reports zero', med() === 0);

// ── An answer read off the text is not a recall ─────────────────────────────────
// The rest of the app already refuses to count a cued answer (firstTryRetention excludes
// cueLevel > 1). Counting it here would mean a verse the reader has only ever transcribed
// could never go cold — the encoding pass alone would keep resetting the clock.
s = base({
  verses: [verse('copied', 'Genesis 1:1')],
  reviewLog: [
    { ...ev('verse', 'copied', daysAgo(60)), cueLevel: 0 },
    { ...ev('verse', 'copied', daysAgo(2)),  cueLevel: 4 },
  ],
});
t('a recent copy-through does not reset the cold clock', buildColdCheck(s, 5).length === 1);

s = base({
  verses: [verse('recalled', 'Genesis 1:1')],
  reviewLog: [{ ...ev('verse', 'recalled', daysAgo(2)), cueLevel: 0 }],
});
t('a genuine uncued recall does', buildColdCheck(s, 5).length === 0);

// ── The sample is not skewed toward whichever kind was pushed first ─────────────
// sort(() => Math.random() - 0.5) is an inconsistent comparator and measurably favours
// the head of the array — which was always verses.
const many = base({
  verses: Array.from({ length: 10 }, (_, i) => verse('v' + i, 'R' + i)),
  themeProgress: Object.fromEntries(['habakkuk','jonah','nahum','micah','amos','hosea','joel','obadiah','malachi','haggai']
    .map(id => [id, { bookId: id, sm2: { interval: 30, repetition: 4, efactor: 2.5, nextDueDate: daysAgo(-5) },
      status: 'review', attempts: 4, lastScore: 4, lastAttemptDate: daysAgo(45) }])),
  reviewLog: [
    ...Array.from({ length: 10 }, (_, i) => ({ ...ev('verse', 'v' + i, daysAgo(45)), cueLevel: 0 })),
    ...['habakkuk','jonah','nahum','micah','amos','hosea','joel','obadiah','malachi','haggai']
      .map(id => ({ ...ev('theme', id, daysAgo(45)), cueLevel: 0 })),
  ],
});
let versePicks = 0, draws = 4000;
for (let i = 0; i < draws; i++) {
  versePicks += buildColdCheck(many, 1).filter(x => x.kind === 'verse').length;
}
// Ten of each: a fair draw is 50%. The biased comparator sat several points high.
t('the sample does not favour the kind added first',
  Math.abs(versePicks / draws - 0.5) < 0.05);


// ── The pool is not silently restricted to mature verses ────────────────────────
// Borrowing firstTryRetention's cueLevel > 1 threshold removed every verse at repetitions
// 2 to 5 — they log cue level 3 or 2 — so they had no recorded success at all and could
// never be asked. The check quietly became a mature-verses-only measurement.
for (const cue of [0, 2, 3]) {
  const st = base({
    verses: [verse('v', 'Genesis 1:1')],
    reviewLog: [{ ...ev('verse', 'v', daysAgo(60)), cueLevel: cue }],
  });
  t('a recall at cue level ' + cue + ' counts toward going cold', buildColdCheck(st, 5).length === 1);
}
// Only the whole answer on screen is disqualifying.
const copied = base({
  verses: [verse('v', 'Genesis 1:1')],
  reviewLog: [{ ...ev('verse', 'v', daysAgo(60)), cueLevel: 4 }],
});
t('a full-text copy-through still does not', buildColdCheck(copied, 5).length === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
