// Rules for judging a typed anchor. Run: npx vite-node scripts/anchorAnswer.test.mjs

import { judgeAnchor, judgeByDirection, judgeChapter, editDistance, directionFor, normalizeAnchor } from '../src/utils/anchorAnswer.ts';

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
};

// Genesis, where the collisions actually are.
const GENESIS = [
  { ch: 21, word: 'WELL' }, { ch: 26, word: 'WELLS' },
  { ch: 29, word: 'STONE' }, { ch: 30, word: 'STICKS' },
  { ch: 32, word: 'WRESTLE' }, { ch: 17, word: 'CIRCUMCISION' },
];

// ── Correct ─────────────────────────────────────────────────────────────────────
t('an exact answer is correct', judgeAnchor('HANDS', 'HANDS').verdict === 'correct');
t('case and punctuation are ignored', judgeAnchor('  hands! ', 'HANDS').verdict === 'correct');
t('a correct answer earns Good, leaving Easy for the reader to claim',
  judgeAnchor('HANDS', 'HANDS').score === 4);

// ── Near miss ───────────────────────────────────────────────────────────────────
t('an inflection is a near miss, not a blank',
  judgeAnchor('WRESTLING', 'WRESTLE', GENESIS, 32).verdict === 'near');
t('a plural is a near miss', judgeAnchor('STONES', 'STONE', GENESIS, 29).verdict === 'near');
t('a near miss earns Hard', judgeAnchor('WRESTLING', 'WRESTLE').score === 3);
t('a typo in a long word is forgiven',
  judgeAnchor('CIRCUMCISON', 'CIRCUMCISION', GENESIS, 17).verdict === 'near');
t('a typo in a short word is not silently forgiven',
  judgeAnchor('ARM', 'ARK').verdict === 'wrong');

// ── Wrong, and why ──────────────────────────────────────────────────────────────
let j = judgeAnchor('STONE', 'STICKS', GENESIS, 30);
t('a different anchor is wrong', j.verdict === 'wrong' && j.score === 1);
t('the confusion is named', j.confusedWith && j.confusedWith.chapter === 29);

j = judgeAnchor('BANANA', 'STICKS', GENESIS, 30);
t('an answer from nowhere is just wrong', j.verdict === 'wrong' && !j.confusedWith);

t('an empty answer is a blank', judgeAnchor('', 'HANDS').verdict === 'wrong');

// WELL/WELLS are a genuine collision, but they are also one inflection apart — the near
// rule wins, which is right: the reader plainly knows the word, just not the chapter.
t('WELL for WELLS reads as a near miss rather than a confusion',
  judgeAnchor('WELL', 'WELLS', GENESIS, 26).verdict === 'near');

// ── Edit distance ───────────────────────────────────────────────────────────────
t('identical words are distance 0', editDistance('abc', 'abc') === 0);
t('one substitution is distance 1', editDistance('abc', 'abd') === 1);
t('an empty string costs its length', editDistance('', 'abcd') === 4);

// ── Direction is the scheduler's choice ─────────────────────────────────────────
t('a new anchor is asked number to word', directionFor(0) === 'n2w');
t('a still-learning anchor stays number to word', directionFor(2) === 'n2w');
t('a known anchor starts rotating', directionFor(3) !== 'n2w');
t('the rotation actually alternates', directionFor(3) !== directionFor(4));
t('every direction is reachable',
  new Set([directionFor(0), directionFor(3), directionFor(4)]).size === 3);

t('normalize strips everything but letters and digits', normalizeAnchor('Well-Spring!') === 'wellspring');

// ── The question asked must match the answer judged ─────────────────────────────
//
// This is the seam the original bug lived in. judgeAnchor was tested, directionFor was
// tested, and nothing tested them together — so w2n (which shows the word and asks for
// the chapter) was judging the typed number against the word, and every correct answer
// scored Blank. Because directionFor sends every anchor to w2n at three clean recalls,
// mature anchors could never escape the failure.
const item = (direction) => ({ direction, word: 'HANDS', chapter: 27, siblings: GENESIS });

t('word-to-number accepts the chapter number',
  judgeByDirection('27', item('w2n')).verdict === 'correct');
t('word-to-number rejects the word it just displayed as the prompt',
  judgeByDirection('HANDS', item('w2n')).verdict !== 'correct');
t('number-to-word accepts the word',
  judgeByDirection('HANDS', item('n2w')).verdict === 'correct');
t('number-to-word rejects the chapter number it just displayed',
  judgeByDirection('27', item('n2w')).verdict !== 'correct');
t('plate-to-word is judged as a word',
  judgeByDirection('HANDS', item('p2w')).verdict === 'correct');

// A mature anchor must be able to survive its own review.
t('an anchor at the repetition that triggers w2n can still be answered correctly',
  judgeByDirection('27', item(directionFor(3))).score >= 4 ||
  judgeByDirection('HANDS', item(directionFor(3))).score >= 4);

// ── Chapter answers ─────────────────────────────────────────────────────────────
t('the exact chapter is correct', judgeChapter('27', 27, GENESIS).verdict === 'correct');
t('whitespace is tolerated', judgeChapter('  27 ', 27, GENESIS).verdict === 'correct');
// Counting forward from a block boundary is how the system recovers a number at all, so
// landing next door is a miscount, not an absence of knowledge.
t('being one chapter out is a near miss', judgeChapter('28', 27, GENESIS).verdict === 'near');
t('being far out is wrong', judgeChapter('3', 27, GENESIS).verdict === 'wrong');
t('a non-number is a blank', judgeChapter('HANDS', 27, GENESIS).verdict === 'wrong');
t('an empty answer is a blank', judgeChapter('', 27, GENESIS).verdict === 'wrong');
t('naming another anchor chapter names the confusion',
  judgeChapter('29', 21, GENESIS).confusedWith?.word === 'STONE');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
