// Rules for the leech list and the honest consistency count.
// Run: npx vite-node scripts/leeches.test.mjs

import { leeches, activeDays } from '../src/utils/leeches.ts';

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
};

const sm2 = (over = {}) => ({ interval: 10, repetition: 2, efactor: 1.4,
  nextDueDate: new Date().toISOString(), ...over });

const base = (over = {}) => ({
  verses: [], streak: 0, lastActiveDate: null, theme: 'black', sortOrder: 'smart',
  memorySentenceProgress: {}, chapterProgress: {}, themeProgress: {}, blockProgress: {},
  reviewLog: [], settings: {}, ...over,
});

// ── Which items surface ─────────────────────────────────────────────────────────
let s = base({
  verses: [
    { id: 'a', ref: 'Psalm 119:9-16', sm2: sm2({ lapses: 6 }), attempts: 22 },
    { id: 'b', ref: 'John 3:16', sm2: sm2({ lapses: 1 }), attempts: 9 },
    { id: 'c', ref: 'Romans 8:28', sm2: sm2(), attempts: 4 },
  ],
  chapterProgress: {
    'leviticus:16': { bookId: 'leviticus', chapter: 16, sm2: sm2({ lapses: 8 }), attempts: 14 },
  },
  themeProgress: {
    'nahum': { bookId: 'nahum', sm2: sm2({ lapses: 4 }), attempts: 11 },
  },
});

let l = leeches(s);
t('only genuinely repeated failures surface', l.length === 3);
t('an item lapsed once is not a leech', !l.some(x => x.label === 'John 3:16'));
t('an item that has never lapsed is not a leech', !l.some(x => x.label === 'Romans 8:28'));
t('the worst offender leads', l[0].lapses === 8 && l[0].label === 'Leviticus 16');
t('book ids are resolved to names', l.some(x => x.label === 'Nahum — theme'));
t('every layer can produce a leech',
  new Set(l.map(x => x.kind)).size === 3);
t('attempts are carried, so 8-in-14 reads differently from 8-in-40',
  l[0].attempts === 14);

t('a clean library has no leeches', leeches(base()).length === 0);
t('the threshold is adjustable', leeches(s, 7).length === 1);

// ── Consistency without the cliff ───────────────────────────────────────────────
const day = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

s = base({ reviewLog: [
  { ts: day(0) }, { ts: day(0) }, { ts: day(1) }, { ts: day(3) }, { ts: day(44) },
  // Outside the window entirely.
  { ts: day(60) },
] });

t('several reviews on one day count as one day', activeDays(s, 45) === 4);
t('reviews outside the window are ignored', activeDays(s, 45) < 5);
t('a narrower window counts fewer days', activeDays(s, 2) === 2);
t('no history means no active days', activeDays(base(), 45) === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
