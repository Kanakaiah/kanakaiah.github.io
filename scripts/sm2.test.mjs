// Rules the scheduler has to obey. Run: npx vite-node scripts/sm2.test.mjs
// Plain assertions, no framework — the project has no test runner configured and this
// did not seem worth adding one for.
import { evaluateSM2, isDue } from '../src/utils/sm2.ts';

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
};

const sm2 = (over = {}) => ({ interval: 0, repetition: 0, efactor: 2.5,
  nextDueDate: new Date().toISOString(), ...over });

// ── due is a date question, and only a date question ────────────────────────────
const future = new Date(Date.now() + 5 * 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();
t('an item scheduled in the future is not due', !isDue(sm2({ nextDueDate: future })));
t('an overdue item is due', isDue(sm2({ nextDueDate: past })));
t('an item with no schedule is treated as due', isDue(undefined));

// ── the grade boundary: 3 must pass ─────────────────────────────────────────────
const hard = evaluateSM2(sm2({ interval: 6, repetition: 2 }), 3);
t('"Hard" (3) advances rather than lapsing', hard.newSM2.repetition === 3);
const blank = evaluateSM2(sm2({ interval: 6, repetition: 2 }), 1);
t('"Blank" (1) resets repetition', blank.newSM2.repetition === 0);
t('a failing grade returns the item tomorrow', blank.newSM2.interval === 1);

// ── efactor ─────────────────────────────────────────────────────────────────────
t('Good (4) leaves efactor unchanged',
  Math.abs(evaluateSM2(sm2({ repetition: 2, interval: 6 }), 4).newSM2.efactor - 2.5) < 1e-9);
t('Easy (5) raises efactor',
  evaluateSM2(sm2({ repetition: 2, interval: 6 }), 5).newSM2.efactor > 2.5);
t('efactor never falls below 1.3',
  evaluateSM2(sm2({ efactor: 1.3, repetition: 2, interval: 6 }), 1).newSM2.efactor >= 1.3);

// ── lapse recovery ──────────────────────────────────────────────────────────────
// A mature verse: ten reviews, sitting on a 200-day interval, then missed once.
const mature = sm2({ interval: 200, repetition: 10, efactor: 2.4 });
const lapsed = evaluateSM2(mature, 1).newSM2;
t('a mature lapse is remembered', lapsed.preLapseInterval === 200);
t('a mature lapse is counted', lapsed.lapses === 1);
t('a lapsed item still returns tomorrow', lapsed.interval === 1);

const firstBack = evaluateSM2(lapsed, 4).newSM2;
t('one success does not undo a lapse', firstBack.interval === 1);
t('the remembered interval survives the first success', firstBack.preLapseInterval === 200);

const secondBack = evaluateSM2(firstBack, 4).newSM2;
t('the second success re-climbs to a quarter of the old interval', secondBack.interval === 50);
t('the remembered interval is consumed once used', secondBack.preLapseInterval === undefined);

// Without this, textbook SM-2 would have gone 1 → 6 here.
t('re-climb genuinely beats restarting from scratch', secondBack.interval > 6);

// ── young items get no special treatment ────────────────────────────────────────
const young = sm2({ interval: 6, repetition: 2 });
const youngLapsed = evaluateSM2(young, 1).newSM2;
t('a young lapse records no maturity to restore', youngLapsed.preLapseInterval === undefined);
t('a young lapse is not counted as a lapse', youngLapsed.lapses === undefined);
const youngBack = evaluateSM2(evaluateSM2(youngLapsed, 4).newSM2, 4).newSM2;
t('a young item rebuilds on the ordinary 6-day step', youngBack.interval === 6);

// A 30-day item is only just mature; recovery should be modest, not dramatic.
const midLapsed = evaluateSM2(sm2({ interval: 30, repetition: 5 }), 1).newSM2;
const midBack = evaluateSM2(evaluateSM2(midLapsed, 4).newSM2, 4).newSM2;
t('a barely-mature item recovers modestly', midBack.interval === 8);

// ── never-lapsed records keep their original shape ──────────────────────────────
const clean = evaluateSM2(sm2({ repetition: 2, interval: 6 }), 4).newSM2;
t('a clean record gains no lapse fields',
  !('lapses' in clean) && !('preLapseInterval' in clean));

// ── Each layer gets its own schedule ────────────────────────────────────────────
// A verse is verbatim serial recall of up to a hundred words; a theme is a single
// paired associate. They used to grow through identical arithmetic.
const climb = (kind) => {
  let s = sm2();
  for (let i = 0; i < 4; i++) s = evaluateSM2(s, 4, kind).newSM2;
  return s.interval;
};
t('a verse grows more slowly than an anchor', climb('verse') < climb('anchor'));
t('an anchor grows more slowly than a theme', climb('anchor') < climb('theme'));
t('naming no kind keeps the old behaviour', climb(undefined) === climb('chain'));

t('a verse second step is shorter than a theme second step',
  evaluateSM2(sm2({ repetition: 1 }), 4, 'verse').newSM2.interval <
  evaluateSM2(sm2({ repetition: 1 }), 4, 'theme').newSM2.interval);

// Growth must never stall. A floored efactor multiplied by a growth factor below 1 would
// otherwise leave the interval unchanged — or shrinking — on a *successful* recall,
// trapping a hard verse in a loop it can never climb out of.
t('a successful recall always lengthens the interval',
  evaluateSM2(sm2({ interval: 10, repetition: 5, efactor: 1.3 }), 3, 'verse').newSM2.interval > 10);

// ── The global interval scale ───────────────────────────────────────────────────
// The one dial that answers the retention curve. Shortening every interval is the honest
// response to "you forget faster than this schedule assumes" — unlike grading harder,
// which corrupts the record, or reviewing more often, which is the same schedule with
// more effort spent on it.
// Measured on the due date, which is what the scale actually moves. This assertion used
// to read `.interval` and so pinned the compounding bug in place: scaling the stored
// interval is exactly what made a "30% shorter" setting reach 89% shorter by the sixth
// review.
const daysUntil = (scale) => {
  const { newSM2 } = evaluateSM2(sm2({ interval: 40, repetition: 5 }), 4, 'anchor', scale);
  return Math.round((new Date(newSM2.nextDueDate).getTime() - Date.now()) / 86400000);
};

t('a scale below one brings the next review forward', daysUntil(0.7) < daysUntil(1));
t('a scale above one pushes it out', daysUntil(1.3) > daysUntil(1));
t('an omitted scale behaves as one', Math.abs(daysUntil(undefined) - daysUntil(1)) <= 30);

// Shortening must never collapse to same-day review — that would turn spaced repetition
// into massed repetition and defeat the whole mechanism.
t('a scale can never drive an interval below a day',
  evaluateSM2(sm2({ interval: 1, repetition: 5 }), 4, 'verse', 0.1).newSM2.interval >= 1);

// The efactor is the item's own measured difficulty. It belongs to the item, not to a
// global preference, and a reader shortening their schedule must not silently rewrite it.
t('the scale does not touch the efactor',
  evaluateSM2(sm2({ interval: 40, repetition: 5 }), 4, 'anchor', 0.7).newSM2.efactor ===
  evaluateSM2(sm2({ interval: 40, repetition: 5 }), 4, 'anchor', 1).newSM2.efactor);


// ── The scale shifts the schedule; it does not compound ─────────────────────────
// Applied to the stored interval, a "30% shorter" setting multiplied by 0.7 again on
// every review — 4/9/19/40 became 3/4/6/9, which is 89% shorter by the sixth and not what
// the button says. It belongs on the due date, leaving the interval as the item's own
// measured strength.
const climbScaled = (scale, steps = 6) => {
  let s = sm2({ interval: 1, repetition: 1 });
  for (let i = 0; i < steps; i++) s = evaluateSM2(s, 4, 'verse', scale).newSM2;
  return s.interval;
};
t('the stored interval is unchanged by the scale', climbScaled(0.7) === climbScaled(1));
t('turning the dial back restores the original schedule',
  climbScaled(1) === climbScaled(0.7, 6) && climbScaled(1) > 20);

// Out-of-range values are clamped rather than trusted.
t('an absurd scale cannot zero the schedule',
  evaluateSM2(sm2({ interval: 40, repetition: 5 }), 4, 'verse', 0).newSM2.interval > 0);
t('a scale is clamped at both ends',
  evaluateSM2(sm2({ interval: 40, repetition: 5 }), 4, 'verse', 99).newSM2.interval ===
  evaluateSM2(sm2({ interval: 40, repetition: 5 }), 4, 'verse', 1.5).newSM2.interval);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
