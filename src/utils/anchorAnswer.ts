/**
 * Judging a typed anchor.
 *
 * Anchors are single words, which is what makes asking the reader to produce one almost
 * free — the whole objection to typed recall (a hundred words on a phone keyboard) does
 * not apply. But a one-word answer needs judging with some care, because two failure
 * modes are not the same failure:
 *
 *   WRESTLING for WRESTLE is the reader knowing the anchor and inflecting it. Grading
 *   that as a blank is the fastest way to make someone stop trusting the app.
 *
 *   STONE for chapter 30 is the reader confusing two anchors in the same book — Genesis
 *   holds WELL(21)/WELLS(26) and STONE(29)/STICKS(30) — and that is the dominant way
 *   anchors actually fail. Saying only "wrong, it's STICKS" throws away the useful half
 *   of what just happened.
 */

export type AnchorVerdict = 'correct' | 'near' | 'wrong';

export interface AnchorJudgement {
  verdict: AnchorVerdict;
  /** SM-2 grade this verdict earns before the reader adjusts it. */
  score: number;
  /** When the answer was another anchor in the same book, the chapter it belongs to. */
  confusedWith?: { chapter: number; word: string };
}

export const normalizeAnchor = (s: string) =>
  (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

/** Straight Levenshtein, on words short enough that the quadratic cost is irrelevant. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

/**
 * Whether one word is the other inflected — DANCES for DANCING, STONES for STONE, READ
 * for READING. Tested by common stem rather than by a list of endings, because the guide
 * data inflects these words freely and enumerating English morphology here would be both
 * wrong and endless.
 */
function sameStem(a: string, b: string): boolean {
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  // Four characters is enough to distinguish the anchors that actually collide while
  // still catching ordinary inflection; below that, two words sharing a prefix are more
  // likely to be genuinely different words (ARK / ARM).
  const stem = Math.max(4, shorter.length - 3);
  return shorter.length >= 4 && longer.startsWith(shorter.slice(0, stem));
}

/**
 * Grades one typed anchor against the expected word, with the book's other anchors
 * available so a confusion can be named rather than merely marked wrong.
 */
export function judgeAnchor(
  typed: string,
  expected: string,
  siblings: { ch: number; word: string }[] = [],
  expectedChapter?: number,
): AnchorJudgement {
  const t = normalizeAnchor(typed);
  const e = normalizeAnchor(expected);

  if (!t) return { verdict: 'wrong', score: 1 };
  if (t === e) return { verdict: 'correct', score: 4 };

  // An inflection, or a near-miss spelling of a long word, is a recall that came out
  // imperfectly — Hard, not Blank.
  //
  // The length gate matters more than the distance. In a short word a single changed
  // character is usually a different word rather than a slip: ARM is not a misspelling
  // of ARK, and forgiving it would quietly mark a genuine failure as a partial success.
  // Long words are where real typos live, and CIRCUMCISION is where they live most.
  const distance = editDistance(t, e);
  const typoForgivable = e.length >= 6 && distance <= Math.min(2, Math.floor(e.length / 4));
  if (sameStem(t, e) || typoForgivable) {
    return { verdict: 'near', score: 3 };
  }

  // Wrong — but if it is another anchor from the same book, say which.
  const confused = siblings.find(s =>
    s.ch !== expectedChapter && normalizeAnchor(s.word) === t);

  return {
    verdict: 'wrong',
    score: 1,
    ...(confused ? { confusedWith: { chapter: confused.ch, word: confused.word } } : {}),
  };
}

/**
 * Which way round the question is asked, chosen by the schedule rather than by the reader.
 *
 * The anchor drill offered three direction buttons that persisted across items, so a
 * reader could settle into whichever was easiest and the schedule would credit it as
 * though all three had been tested. Number → word is the cold, useful question and stays
 * the default until the item is genuinely known; after that the other two rotate, so a
 * chapter counted as secure has actually been asked about from more than one side.
 */
export type AnchorDirection = 'n2w' | 'w2n' | 'p2w';

/**
 * Which way round to ask, given how well the anchor is known and whether a plate exists.
 *
 * `hasArt` is not a detail. A plate prompt is a materially easier question — the picture
 * carries most of the association — and seventeen books of the canon have no chapter art
 * at all, with Numbers covered only to chapter 13. In those books the card fell back to
 * showing the chapter number, which *is* the number→word question, while the review
 * history went on recording `direction: 'p2w'`. The field exists precisely so a chapter
 * known cold can be told apart from one only ever recognised off its picture, and for a
 * quarter of the canon it was saying the opposite of what happened.
 *
 * Without art the rotation is simply the two directions that can honestly be asked.
 */
export function directionFor(repetition: number, hasArt = true): AnchorDirection {
  if (repetition < 3) return 'n2w';
  if (!hasArt) return repetition % 2 === 1 ? 'w2n' : 'n2w';
  return repetition % 2 === 1 ? 'w2n' : 'p2w';
}

/**
 * Judging a chapter *number*, which is what `w2n` actually asks for.
 *
 * Being one or two chapters out is not the same as not knowing. The whole anchor system
 * recovers a chapter number by counting forward from a block boundary — it is why the
 * cards carry an "after X · before Y" line at all — so a reader who lands next door has
 * the association and miscounted the offset. That is a Hard, and telling them it is a
 * blank teaches them to distrust a system that was very nearly right.
 */
export function judgeChapter(
  typed: string,
  expectedChapter: number,
  siblings: { ch: number; word: string }[] = [],
): AnchorJudgement {
  const n = parseInt((typed || '').trim(), 10);
  if (!Number.isFinite(n)) return { verdict: 'wrong', score: 1 };
  if (n === expectedChapter) return { verdict: 'correct', score: 4 };
  if (Math.abs(n - expectedChapter) <= 2) return { verdict: 'near', score: 3 };

  const confused = siblings.find(s => s.ch === n);
  return {
    verdict: 'wrong',
    score: 1,
    ...(confused ? { confusedWith: { chapter: confused.ch, word: confused.word } } : {}),
  };
}

/**
 * The single entry point the session uses, so the question asked and the answer judged
 * can never disagree.
 *
 * They did. `w2n` shows the anchor word and asks which chapter it belongs to, with a
 * numeric keypad — and the answer was being compared against the *word*, so typing the
 * correct chapter number scored Blank every time. Because `directionFor` sends every
 * anchor to `w2n` the moment it reaches three clean recalls, a mature anchor would fail,
 * drop to repetition 0, climb back to 3, and fail again, permanently, while accruing
 * lapses that then surfaced it as a leech. The only way to score correct was to type the
 * word already displayed on screen as the prompt.
 *
 * Routing through one function means adding a fourth direction cannot reintroduce this.
 */
export function judgeByDirection(
  typed: string,
  item: { direction: AnchorDirection; word: string; chapter: number; siblings?: { ch: number; word: string }[] },
): AnchorJudgement {
  const siblings = item.siblings || [];
  return item.direction === 'w2n'
    ? judgeChapter(typed, item.chapter, siblings)
    : judgeAnchor(typed, item.word, siblings, item.chapter);
}
