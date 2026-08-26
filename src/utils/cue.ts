/**
 * How much of a passage the reader is shown, and how much of it they are asked for.
 *
 * Two problems solved in one place, because they are the same problem seen from either
 * end: a 109-word passage was being presented as a single retrieval, and the amount of
 * help on screen was either fixed forever (first letters, always) or set by a slider the
 * reader dragged themselves.
 *
 * Neither is how verbatim text is learned. Long passages are learned in parts that are
 * then chained together, and support is withdrawn as the item gets stronger — not
 * chosen per-session by the person whose judgement is the thing being tested.
 */

/** How much of the text is visible. Ordered most help to least. */
export type CueLevel = 'full' | 'first-letters' | 'sparse' | 'none';

/**
 * Cue strength as a function of the item's own history, not of how the reader feels
 * today. `repetition` is SM-2's count of consecutive successful recalls, so support
 * falls away exactly as the evidence for dropping it accumulates — and returns on a
 * lapse, because a lapse resets that count.
 */
export function cueForRepetition(repetition: number): CueLevel {
  if (repetition <= 1) return 'full';
  if (repetition <= 3) return 'first-letters';
  if (repetition <= 5) return 'sparse';
  return 'none';
}

/** The review history records cue strength as 0 (nothing shown) to 4 (all of it), so a
 * grade earned with the text on screen can never be mistaken for a cold recall. */
export function cueLevelToNumber(level: CueLevel): 0 | 1 | 2 | 3 | 4 {
  switch (level) {
    case 'full': return 4;
    case 'first-letters': return 3;
    case 'sparse': return 2;
    case 'none': return 0;
  }
}

/** Beyond this many words, a passage is learned in parts rather than whole. Chosen to sit
 * above the length of most single verses — the point is to split the long multi-verse
 * passages, not to fragment "Jesus wept". */
export const MAX_CHUNK_WORDS = 25;

const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * Splits a passage at phrase boundaries, never mid-clause.
 *
 * The tokenizer is the one `ReadMode` already uses to lay verses out as sense-lines: the
 * app has always known where this text breaks, and practice simply never asked. The
 * alternative already in the codebase — `ScrambleMode`'s fixed ten-word window — cuts
 * straight through clauses, which teaches the reader to recall across a boundary that
 * isn't there.
 *
 * Clauses are accumulated greedily up to MAX_CHUNK_WORDS. A single clause longer than the
 * limit is left whole rather than broken: an over-long part is a smaller problem than a
 * part that starts mid-thought.
 */
export function chunkText(text: string, maxWords = MAX_CHUNK_WORDS): string[] {
  const trimmed = (text || '').trim();
  if (!trimmed) return [];
  if (countWords(trimmed) <= maxWords) return [trimmed];

  // Split on sentence/clause punctuation, keeping the punctuation with the phrase it ends.
  const tokens = trimmed.split(/([.?!;:,]["'”’]?\s+)/);
  const clauses: string[] = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const phrase = (tokens[i] || '') + (tokens[i + 1] || '');
    if (phrase.trim()) clauses.push(phrase.trim());
  }
  if (clauses.length === 0) return [trimmed];

  const chunks: string[] = [];
  let current = '';
  for (const clause of clauses) {
    if (!current) { current = clause; continue; }
    if (countWords(current) + countWords(clause) <= maxWords) {
      current = `${current} ${clause}`;
    } else {
      chunks.push(current);
      current = clause;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * The tail of the previous chunk, used as the cue for the next one.
 *
 * This is what makes the parts a chain rather than a pile: part two is recalled *from*
 * the end of part one, which is exactly the transition that has to work when the passage
 * is eventually recited whole. Deliberately short — a few words, not the whole clause —
 * so it stays a prompt and cannot become a re-read of what was just tested.
 */
export function chainCue(previousChunk: string, words = 6): string {
  const parts = (previousChunk || '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const tail = parts.slice(-words).join(' ');
  return parts.length > words ? `…${tail}` : tail;
}

/**
 * Renders one line of cue text. Returns the string actually shown, so the caller can put
 * the same value in an aria-label — a row of underscores is read out as nothing useful,
 * and this is the app's primary prompt mechanism.
 */
export function cueString(text: string, level: CueLevel): string {
  if (level === 'full') return text;
  if (level === 'none') return '';

  const tokens = text.split(/(\s+)/);
  let wordIndex = -1;

  return tokens.map(token => {
    if (!token.trim()) return token;
    wordIndex++;
    // 'sparse' leaves every third word standing in full and removes the rest entirely;
    // 'first-letters' keeps the opening character of every word.
    if (level === 'sparse' && wordIndex % 3 === 0) return token;
    return token.split('').map((ch, i) => {
      if (!/[a-zA-Z0-9]/.test(ch)) return ch;
      if (level === 'sparse') return '_';
      return i === 0 ? ch : '_';
    }).join('');
  }).join('');
}

const normalizeWord = (w: string) => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

export interface AttemptWord { word: string; ok: boolean }
export interface AttemptScore {
  matched: number;
  total: number;
  /** 0–100. */
  accuracy: number;
  words: AttemptWord[];
}

/**
 * Compares what the reader produced against the passage, word by word and in order.
 *
 * Shared by every surface that collects a typed or spoken attempt, so the number shown
 * on screen, the number the grade is suggested from, and the number the review history
 * audits self-grading against are all the same number. Punctuation and case are ignored:
 * the goal is the words, and marking someone wrong for a missing comma would make the
 * measurement useless as a proxy for memory.
 */
export function scoreAttempt(target: string, typed: string): AttemptScore {
  const targetWords = (target || '').split(/\s+/).filter(Boolean);
  const typedWords = (typed || '').split(/\s+/).filter(Boolean);

  const words = targetWords.map((word, i) => ({
    word,
    ok: !!typedWords[i] && normalizeWord(typedWords[i]) === normalizeWord(word),
  }));
  const matched = words.filter(w => w.ok).length;

  return {
    matched,
    total: targetWords.length,
    accuracy: targetWords.length ? Math.round((matched / targetWords.length) * 100) : 0,
    words,
  };
}

/** The cue spoken aloud, for screen readers: "First letters: T, h, s" rather than a run
 * of underscores. Empty when nothing is being shown. */
export function cueAriaLabel(text: string, level: CueLevel): string {
  if (level === 'full') return text;
  if (level === 'none') return 'No cue — recall the passage from the reference alone.';

  const words = text.split(/\s+/).filter(Boolean);
  if (level === 'sparse') {
    const shown = words.filter((_, i) => i % 3 === 0);
    return `Every third word: ${shown.join(', ')}`;
  }
  const letters = words
    .map(w => (w.match(/[a-zA-Z0-9]/) || [''])[0])
    .filter(Boolean);
  return `First letters: ${letters.join(', ')}`;
}
