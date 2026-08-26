export interface SM2Data {
  interval: number;
  repetition: number;
  efactor: number;
  nextDueDate: string; // ISO date string
  /** How many times this item has been failed after reaching maturity. Not used by the
   * schedule itself — it is the signal that an item is a leech, i.e. one that keeps
   * being forgotten and probably needs rewording or breaking up rather than more
   * repetitions. Optional: records written before this existed simply won't have it. */
  lapses?: number;
  /** The interval this item held immediately before its most recent lapse.
   *
   * Textbook SM-2 sends a failed card back to repetition 0, so a verse recalled ten
   * times and missed once re-climbs 1 → 6 → 15 → 37 exactly as if it had never been
   * learned. That throws away real evidence: an item that survived ten reviews is not
   * in the same state as one seen yesterday, and a single bad day — tired, distracted,
   * interrupted — should not cost months of accumulated schedule. Keeping the old
   * interval lets recovery aim at a fraction of where it was rather than at zero.
   * Cleared once it has been used. */
  preLapseInterval?: number;
}

export interface Verse {
  id: string;
  ref: string;
  text: string;
  translation: string;
  addedDate: string; // ISO date string
  status: 'learning' | 'review';
  sm2: SM2Data;
  streak: number;
  attempts: number;
}

export type BibleVersion = 'LSB' | 'NASB' | 'NLT';

// Whether a chapter's memory anchor shows on arrival ('always', the pre-recall
// behavior), only once tapped ('tap'), or never inline (view it only through the
// end-of-chapter recall card / memory sentence). Undefined means 'tap' — a memory
// app's default should be the one that builds memory, not the one that skips it.
export type AnchorReveal = 'always' | 'tap' | 'never';

export interface UserSettings {
  ttsEnabled: boolean;
  recallMasking: boolean;
  bionicReading: boolean;
  fontSize: number;
  fontFamily?: 'sans' | 'serif' | 'hyper';
  bibleVersion?: BibleVersion;
  // Chapter reader apparatus. Undefined means on, so a profile saved before these
  // existed reads exactly as it did before.
  showSectionHeadings?: boolean;
  showVerseNumbers?: boolean;
  showParagraphMarks?: boolean;
  showCrossRefMarkers?: boolean;
  // Chapter/book memory. See AnchorReveal above for the default.
  anchorReveal?: AnchorReveal;
  dailyChapterTarget?: number;
  streakIncludesChapters?: boolean;
}

export type SortOrder = 'smart' | 'bible-asc' | 'bible-desc' | 'random';
export type Theme = 'black' | 'dark' | 'sepia' | 'white';

// A book guide's "Test Yourself" recall of its Memory Sentence, scheduled the
// same way a verse is — keyed by guide id (e.g. "genesis") rather than verse id.
export interface MemorySentenceProgress {
  guideId: string;
  sm2: SM2Data;
  status: 'learning' | 'review';
  attempts: number;
  lastScore: number;
  lastAttemptDate: string; // ISO date string
}

// One chapter's recall record, keyed "<bookId>:<chapter>" (e.g. "genesis:27") in
// AppState.chapterProgress. Sparse — a record exists only once a chapter has been
// read or graded, never pre-seeded for the whole Bible.
//
// Recall (sm2/status/attempts/lastScore) is graded, the same SM2 loop as a verse
// or a memory sentence. Reading (readCount/lastReadDate) is only ever counted: it
// tracks that the chapter reader was scrolled to its end, and never feeds mastery
// on its own — conflating "read" with "recalled" would let scrolling inflate
// apparent mastery.
export interface ChapterProgress {
  bookId: string;
  chapter: number;
  sm2: SM2Data;
  status: 'learning' | 'review';
  attempts: number;
  lastScore: number;
  lastAttemptDate: string; // ISO date string
  readCount: number;
  lastReadDate: string | null; // ISO date string
  // Chain evidence, kept deliberately apart from `sm2` above.
  //
  // Reciting the book's Memory Sentence used to write a full SM2 grade to every
  // chapter it mentions — fifty records for Genesis, a hundred and fifty for Psalms,
  // from one button press. That was wrong three ways: recalling GARDEN *inside* the
  // chain (neighbours adjacent, prose constraining, chapter number printed right
  // there as a superscript) is a far easier task than "what anchors Genesis 2?" asked
  // cold, so it earned intervals it hadn't tested; every chapter got byte-identical
  // SM2 data and so came due on the same day forever after; and six passes through
  // one sentence marked a whole book "secure" without a single isolated recall.
  //
  // The signal is still worth keeping — it just isn't a grade. A chapter whose word
  // had to be revealed mid-chain is a chapter worth drilling properly, so these
  // counts exist to *nominate* chapters for real cued recall, never to schedule them.
  // Optional because records written before this existed simply won't have them.
  chainHits?: number;    // recalled inside the chain without revealing
  chainMisses?: number;  // had to be revealed mid-chain
  lastChainDate?: string | null; // ISO date string
}

export function chapterProgressKey(bookId: string, chapter: number): string {
  return `${bookId}:${chapter}`;
}

/**
 * One book's theme word, scheduled like everything else — keyed by book id ("habakkuk").
 *
 * Theme is one of the three things this app exists to teach, and it was the only one
 * never tested anywhere: `themeWord`, `keyWord` and `subtitle` are authored on all 66
 * books and appeared exclusively in labels and search filters. The nearest thing was
 * the index's "Covers only" toggle, which hid the book *name* and displayed the theme
 * word — withholding what the reader already knows and showing the thing to be learned.
 *
 * Note this is unrelated to `AppState.theme`, which is the colour scheme.
 */
export interface ThemeProgress {
  bookId: string;
  sm2: SM2Data;
  status: 'learning' | 'review';
  attempts: number;
  lastScore: number;
  lastAttemptDate: string; // ISO date string
}

/**
 * One narrative block's anchor chain — "PRIMEVAL: LIGHT GARDEN SERPENT BLOOD…" —
 * keyed "<bookId>:<blockIndex>" (e.g. "genesis:0").
 *
 * Sequence is the mechanism the whole anchor system runs on: a chapter *number* is
 * recovered by counting from a block boundary, which is why the cards carry an
 * "after X · before Y" line at all. Nothing trained or measured it. The one thing
 * that came close pointed Scramble at the joined chain, which displays every
 * candidate word — ordered recognition, not recall — and recorded nothing.
 *
 * Graded here as its own item, on its own schedule. Per-chapter evidence from a
 * chain pass still goes to chainHits/chainMisses on ChapterProgress, never to a
 * chapter's sm2: recalling a word with its neighbours adjacent is a different task
 * from being asked about that chapter cold.
 */
export interface BlockProgress {
  bookId: string;
  blockIndex: number;
  label: string;
  sm2: SM2Data;
  status: 'learning' | 'review';
  attempts: number;
  lastScore: number;
  /** Fraction of the chain recalled on the last pass, 0–1. */
  lastAccuracy: number;
  lastAttemptDate: string; // ISO date string
}

export function blockProgressKey(bookId: string, blockIndex: number): string {
  return `${bookId}:${blockIndex}`;
}

/**
 * One graded retrieval attempt, recorded as it happens.
 *
 * Every other record in this file is *current state* — where an item stands right now.
 * None of them can answer the only question that matters about a memory app: is the
 * reader actually remembering more than they used to? `sm2.repetition` looks like
 * history and is not; it is a counter that resets, so an item reviewed forty times and
 * lapsed twice is indistinguishable from one reviewed six times cleanly. Nothing
 * anywhere held a dated outcome, which meant retention could not be computed, intervals
 * could not be tuned against evidence, and no change to the app could be shown to have
 * helped or hurt.
 *
 * This is that missing history. It is deliberately written *before* the changes it
 * exists to evaluate, so those changes have a baseline to be measured against rather
 * than a story told about them afterwards.
 *
 * Several fields are null at every call site today: `committed` and `measuredAccuracy`
 * can only be filled by a mode that asks the reader to produce the answer, and the
 * daily session currently reveals and asks for a self-grade instead. They are in the
 * schema now because the schema is cheap to widen today and expensive to backfill in a
 * year, and because the gap between `gradeSubmitted` and `measuredAccuracy` is the one
 * number that says whether self-grading can be trusted at all.
 */
export interface ReviewEvent {
  id: string;
  ts: string; // ISO
  itemKind: 'verse' | 'anchor' | 'theme' | 'chain' | 'sentence';
  /** Verse id, "genesis:27", "genesis" for a theme, "genesis:0" for a chain. */
  itemId: string;
  /** Which drill direction was asked, where the item kind has more than one. */
  direction?: 'n2w' | 'w2n' | 'p2w';
  /** How much of the answer was on screen as a cue: 0 none … 4 all of it. Derived from
   * hint level where one exists, so a verse read off a full hint cannot look like recall. */
  cueLevel: 0 | 1 | 2 | 3 | 4;
  mode: 'type' | 'speak' | 'reveal' | 'chain' | 'scramble' | 'erase';
  /** Prompt shown → answer committed. 0 when the surface does not time the attempt. */
  elapsedMs: number;
  /** What the reader actually produced, where a mode collects it. Null for reveal-only. */
  committed: string | null;
  /** 0–100 word-match accuracy, where a mode can measure it. Null when unmeasurable. */
  measuredAccuracy: number | null;
  gradeSubmitted: number;
  /** The best grade this attempt could honestly earn given the cues used. */
  gradeCeiling: number;
  intervalBefore: number;
  intervalAfter: number;
  efactorAfter: number;
  /** The nextDueDate this review was answering — lets "how late was it?" be recomputed. */
  scheduledFor: string | null;
  daysLate: number;
}

export interface AppState {
  verses: Verse[];
  streak: number;
  lastActiveDate: string | null;
  theme: Theme | string;
  sortOrder: SortOrder;
  settings: UserSettings;
  memorySentenceProgress: Record<string, MemorySentenceProgress>;
  chapterProgress: Record<string, ChapterProgress>;
  /** Book-level theme recall, keyed by book id. See ThemeProgress above. */
  themeProgress: Record<string, ThemeProgress>;
  /** Anchor-chain recall per narrative block. See BlockProgress above. */
  blockProgress: Record<string, BlockProgress>;
  /** Append-only history of graded retrievals, oldest first. See ReviewEvent above. */
  reviewLog: ReviewEvent[];
}

// Guides Data types based on guides_data.js
export interface GuideVerse {
  ref: string;
  text: string;
  theme: string;
}

export interface GuideAnchor {
  ch: number | string;
  word: string;
  scene: string;
}

export interface StudyGuide {
  title: string;
  author: string;
  date: string;
  theme: string;
  chapters: number;
  keyVerse: string;
  structure: Record<string, string>;
  anchors: GuideAnchor[];
  memorySentence: string;
  verses: GuideVerse[];
}

export type GuidesData = Record<string, StudyGuide>;
