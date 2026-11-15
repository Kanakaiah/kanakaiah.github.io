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

import { practicePassage } from './studyText';

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
/**
 * How much of the passage to ask for, given how well it is known.
 *
 * Progressive chaining, properly: part one alone, then one and two together, then one
 * through three — the parts are *accumulated*, not merely visited in turn. Typing each
 * part separately and calling it chaining misses the point, because the difficulty a
 * long passage actually presents is not any one clause but holding the run of them
 * together, and a reader who can produce six clauses in six separate boxes may still be
 * unable to produce them as one passage.
 *
 * The span grows with the item's own strength, so a verse met this week is asked for one
 * part and a verse held for months is asked for the whole thing in a single attempt.
 */
export function chainSpan(totalChunks: number, repetition: number): number {
  if (totalChunks <= 1) return 1;
  // One part while the passage is new; then one more part per successful recall.
  const earned = Math.max(1, repetition);
  return Math.min(totalChunks, earned);
}

/** The parts to be produced in this attempt, joined as one passage. */
export function chainedText(chunks: string[], span: number): string {
  return chunks.slice(0, Math.max(1, Math.min(chunks.length, span))).join(' ');
}

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
    let letterSeen = false;
    return Array.from(token).map((ch) => {
      if (!/[\p{L}\p{N}]/u.test(ch)) {
        if (/[\p{M}]/u.test(ch) && level !== 'sparse' && !letterSeen) return ch;
        if (/[\p{M}]/u.test(ch)) return '';
        return ch;
      }
      if (level === 'sparse') return '_';
      if (!letterSeen) {
        letterSeen = true;
        return ch;
      }
      return '_';
    }).join('');
  }).join('');
}

export const normalizeWord = (w: string): string =>
  (w || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '');

export interface AttemptWord {
  word: string;
  ok: boolean;
  missing?: boolean;
}

export interface AttemptScore {
  matched: number;
  total: number;
  /** 0–100. */
  accuracy: number;
  words: AttemptWord[];
  addedWords: string[];
}

/**
 * Compares what the reader produced against the passage using DP edit-distance alignment
 * so a single omitted or inserted word never shifts every subsequent word out of place.
 */
export function scoreAttempt(target: string, typed: string): AttemptScore {
  const cleanTarget = practicePassage(target || '').scoringText;
  const targetWords = cleanTarget.split(/\s+/).filter(w => normalizeWord(w).length > 0);
  const typedWords = (typed || '').trim().split(/\s+/).filter(w => normalizeWord(w).length > 0);

  if (targetWords.length === 0) {
    return { matched: 0, total: 0, accuracy: 0, words: [], addedWords: [] };
  }

  const targetNormalized = targetWords.map(normalizeWord);
  const typedNormalized = typedWords.map(normalizeWord);
  const width = typedWords.length + 1;
  const trace: Uint8Array[] = Array.from({ length: targetWords.length + 1 }, () => new Uint8Array(width));
  let previous = Array.from({ length: width }, (_, idx) => idx);

  for (let i = 1; i <= targetWords.length; i++) {
    const current = new Array<number>(width).fill(0);
    current[0] = i;
    trace[i][0] = 1;
    for (let j = 1; j <= typedWords.length; j++) {
      const diagonal = previous[j - 1] + (targetNormalized[i - 1] === typedNormalized[j - 1] ? 0 : 1);
      const missing = previous[j] + 1;
      const added = current[j - 1] + 1;
      const best = Math.min(diagonal, missing, added);
      current[j] = best;
      trace[i][j] = best === diagonal ? 0 : best === missing ? 1 : 2;
    }
    previous = current;
  }

  const words: AttemptWord[] = targetWords.map(word => ({ word, ok: false, missing: true }));
  const extras: string[] = [];
  let i = targetWords.length;
  let j = typedWords.length;

  while (i > 0 || j > 0) {
    if (i === 0 || (j > 0 && trace[i][j] === 2)) {
      extras.push(typedWords[--j]);
    } else if (j === 0 || trace[i][j] === 1) {
      i--;
    } else {
      i--;
      j--;
      words[i] = {
        word: targetWords[i],
        ok: targetNormalized[i] === typedNormalized[j],
        missing: false,
      };
    }
  }

  const matched = words.filter(w => w.ok).length;
  const accuracy =
    matched === targetWords.length && extras.length === 0
      ? 100
      : Math.min(99, Math.round((matched / (targetWords.length + extras.length)) * 100));

  return {
    matched,
    total: targetWords.length,
    accuracy,
    words,
    addedWords: extras.reverse(),
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
    .map(w => (w.match(/[\p{L}\p{N}]/u) || [''])[0])
    .filter(Boolean);
  return `First letters: ${letters.join(', ')}`;
}
