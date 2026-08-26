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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
