export interface SM2Data {
  interval: number;
  repetition: number;
  efactor: number;
  nextDueDate: string; // ISO date string
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
  notificationsEnabled: boolean;
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
}

export function chapterProgressKey(bookId: string, chapter: number): string {
  return `${bookId}:${chapter}`;
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
