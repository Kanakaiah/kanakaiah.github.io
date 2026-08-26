// Rules the reducer has to obey. Run: npx vite-node scripts/reducer.test.mjs
//
// The review history is written by six different screens, and whether an event actually
// lands is not something a type checker can tell you — the dispatch either reaches the
// reducer and is appended, or it silently does nothing and the app goes on looking
// perfectly healthy while recording nothing. That is precisely the failure this history
// exists to stop, so it gets a test rather than a click-through.

import { appReducer } from '../src/context/appReducer.ts';
import { buildReviewEvent, MAX_REVIEW_LOG } from '../src/utils/reviewLog.ts';

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
};

const sm2 = (over = {}) => ({ interval: 10, repetition: 3, efactor: 2.5,
  nextDueDate: new Date().toISOString(), ...over });

const base = () => ({
  verses: [], streak: 0, lastActiveDate: null, theme: 'black', sortOrder: 'smart',
  memorySentenceProgress: {}, chapterProgress: {}, themeProgress: {}, blockProgress: {},
  reviewLog: [], settings: {},
});

const ev = (over = {}) => buildReviewEvent({
  itemKind: 'verse', itemId: 'v1', gradeSubmitted: 4,
  before: sm2(), after: sm2({ interval: 25 }), ...over,
});

// ── The event actually lands ────────────────────────────────────────────────────
let s = appReducer(base(), { type: 'RECORD_REVIEW', payload: ev() });
t('RECORD_REVIEW appends the event', s.reviewLog.length === 1 && s.reviewLog[0].itemId === 'v1');

s = appReducer(s, { type: 'RECORD_REVIEW', payload: ev({ itemId: 'v2' }) });
t('a second event appends rather than replacing',
  s.reviewLog.length === 2 && s.reviewLog[1].itemId === 'v2');

t('the rest of the state is untouched',
  s.verses.length === 0 && s.streak === 0 && s.theme === 'black');

// A profile written before the history existed has no key for it. The reducer must not
// throw on the first grade after an upgrade.
s = appReducer({ ...base(), reviewLog: undefined }, { type: 'RECORD_REVIEW', payload: ev() });
t('a profile with no history yet gains one', s.reviewLog.length === 1);

// ── The cap holds at the reducer, not only in the helper ────────────────────────
let full = base();
full.reviewLog = Array.from({ length: MAX_REVIEW_LOG }, (_, i) => ev({ itemId: 'old' + i }));
s = appReducer(full, { type: 'RECORD_REVIEW', payload: ev({ itemId: 'newest' }) });
t('the log never exceeds the cap', s.reviewLog.length === MAX_REVIEW_LOG);
t('the newest event survives the cap', s.reviewLog[s.reviewLog.length - 1].itemId === 'newest');
t('the oldest event is the one dropped', s.reviewLog[0].itemId === 'old1');

// ── Grading a verse and recording it are separate writes ────────────────────────
// Both have to happen for a graded review to be both scheduled and remembered.
const verse = { id: 'v1', ref: 'John 3:16', text: 'x', translation: 'LSB',
  addedDate: '', status: 'review', sm2: sm2(), streak: 0, attempts: 0 };
s = appReducer({ ...base(), verses: [verse] },
  { type: 'UPDATE_VERSE', payload: { ...verse, attempts: 1 } });
t('UPDATE_VERSE alone records no history', s.reviewLog.length === 0 && s.verses[0].attempts === 1);
s = appReducer(s, { type: 'RECORD_REVIEW', payload: ev() });
t('the pair leaves both a schedule and a record',
  s.verses[0].attempts === 1 && s.reviewLog.length === 1);

// ── A chain pass still records evidence, never a grade ──────────────────────────
s = appReducer(base(), { type: 'RECORD_CHAIN_PASS', payload: {
  bookId: 'genesis', results: [{ chapter: 1, revealed: false }, { chapter: 2, revealed: true }] } });
t('a chain hit is counted', s.chapterProgress['genesis:1'].chainHits === 1);
t('a chain miss is counted', s.chapterProgress['genesis:2'].chainMisses === 1);
t('a chain pass never grades a chapter',
  s.chapterProgress['genesis:1'].attempts === 0 && s.chapterProgress['genesis:1'].sm2.repetition === 0);

// ── The streak counts calendar days ─────────────────────────────────────────────
s = appReducer(base(), { type: 'RECORD_ACTIVITY' });
t('first activity starts the streak at 1', s.streak === 1);
const again = appReducer(s, { type: 'RECORD_ACTIVITY' });
t('a second review the same day does not double-count', again.streak === 1);

const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
s = appReducer({ ...base(), streak: 6, lastActiveDate: yesterday.toISOString() }, { type: 'RECORD_ACTIVITY' });
t('a consecutive day extends the streak', s.streak === 7);

// One missed day is forgiven; the streak continues. A hundred-day run collapsing over a
// single bad Tuesday is the moment people abandon a daily habit.
const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
s = appReducer({ ...base(), streak: 100, lastActiveDate: twoDaysAgo.toISOString() }, { type: 'RECORD_ACTIVITY' });
t('one missed day does not cost the streak', s.streak === 101);

const longAgo = new Date(); longAgo.setDate(longAgo.getDate() - 5);
s = appReducer({ ...base(), streak: 200, lastActiveDate: longAgo.toISOString() }, { type: 'RECORD_ACTIVITY' });
t('a real gap still resets the streak', s.streak === 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
