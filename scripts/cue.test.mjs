// Rules for chunking and cue withdrawal. Run: npx vite-node scripts/cue.test.mjs

import {
  chunkText, chainCue, chainSpan, chainedText, cueForRepetition, cueLevelToNumber, cueString, cueAriaLabel,
  MAX_CHUNK_WORDS,
} from '../src/utils/cue.ts';

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
};
const words = s => s.split(/\s+/).filter(Boolean).length;

// The real thing: the longest seeded passage in the library.
const GEN32 = 'Then he said, “Let me go, for the dawn is breaking.” But he said, “I will not let you go unless you bless me.” So he said to him, “What is your name?” And he said, “Jacob.” Then He said, “Your name shall no longer be Jacob, but Israel; for you have striven with God and with men and have prevailed.”';

// ── Chunking ────────────────────────────────────────────────────────────────────
t('a short verse is left whole', chunkText('Jesus wept.').length === 1);
t('a verse at the limit is left whole',
  chunkText(Array.from({ length: MAX_CHUNK_WORDS }, () => 'word').join(' ')).length === 1);

const parts = chunkText(GEN32);
t('a long passage is split', parts.length > 1);
t('no part exceeds the limit', parts.every(p => words(p) <= MAX_CHUNK_WORDS));
t('nothing is lost in the split',
  parts.join(' ').replace(/\s+/g, ' ') === GEN32.replace(/\s+/g, ' '));

// The whole point: parts break where meaning breaks, not at a fixed word count. The
// invariant is about where a part *ends* — on clause punctuation — rather than how the
// next one happens to start. "…but Israel;" / "for you have striven…" is a correct split
// even though the second part opens lowercase.
t('every part ends on a clause boundary',
  parts.slice(0, -1).every(p => /[.?!;:,]["'”’]?$/.test(p.trim())));

// A single clause longer than the limit is left whole rather than cut mid-thought.
const runOn = Array.from({ length: 40 }, () => 'word').join(' ');
t('an over-long clause is kept whole rather than broken', chunkText(runOn).length === 1);

t('empty text yields no parts', chunkText('').length === 0);

// ── Progressive chaining accumulates, it does not merely visit ──────────────────
// The difficulty a long passage presents is holding the run of clauses together, not any
// one clause. Six parts typed into six separate boxes does not test that.
t('a short passage is always asked for whole', chainSpan(1, 0) === 1);
t('a new passage is asked for one part', chainSpan(4, 0) === 1);
t('each successful recall adds a part', chainSpan(4, 2) === 2 && chainSpan(4, 3) === 3);
t('the span never exceeds the passage', chainSpan(4, 99) === 4);

t('the span is the parts joined, in order',
  chainedText(['a b', 'c d', 'e f'], 2) === 'a b c d');
t('a full span is the whole passage',
  chainedText(['a b', 'c d', 'e f'], 3) === 'a b c d e f');
t('a span is never empty', chainedText(['a b', 'c d'], 0) === 'a b');

// Each attempt contains every earlier clause, so the widest attempt is the passage.
const parts3 = chunkText(GEN32);
t('the widest span reproduces the passage exactly',
  chainedText(parts3, parts3.length).replace(/\s+/g, ' ') === GEN32.replace(/\s+/g, ' '));

// ── The chain cue ───────────────────────────────────────────────────────────────
t('the chain cue is the tail of the previous part',
  chainCue('a b c d e f g h', 3) === '…f g h');
t('a short previous part is shown whole', chainCue('a b', 6) === 'a b');
t('no previous part means no cue', chainCue('', 6) === '');

// ── Cue withdrawal follows the item, not the mood ───────────────────────────────
t('a brand-new item shows the text', cueForRepetition(0) === 'full');
t('an item recalled twice drops to first letters', cueForRepetition(2) === 'first-letters');
t('a stronger item drops to sparse', cueForRepetition(4) === 'sparse');
t('a mature item gets no cue at all', cueForRepetition(6) === 'none');
t('support returns after a lapse resets repetition', cueForRepetition(0) === 'full');

t('cue strength is recorded highest-help-first',
  cueLevelToNumber('full') === 4 && cueLevelToNumber('none') === 0 &&
  cueLevelToNumber('first-letters') > cueLevelToNumber('sparse'));

// ── What is actually shown ──────────────────────────────────────────────────────
t('first letters keep the opening character', cueString('Then he said', 'first-letters') === 'T___ h_ s___');
t('first letters keep punctuation', cueString('Jesus wept.', 'first-letters') === 'J____ w___.');
t('sparse leaves every third word standing', cueString('one two three four', 'sparse') === 'one ___ _____ four');
t('none shows nothing', cueString('Then he said', 'none') === '');
t('full shows everything', cueString('Then he said', 'full') === 'Then he said');

// ── And what a screen reader hears ──────────────────────────────────────────────
t('first letters are spoken as letters, not underscores',
  cueAriaLabel('Then he said', 'first-letters') === 'First letters: T, h, s');
t('sparse names the words that are shown',
  cueAriaLabel('one two three four', 'sparse') === 'Every third word: one, four');
t('no cue is announced as such', cueAriaLabel('x', 'none').startsWith('No cue'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
