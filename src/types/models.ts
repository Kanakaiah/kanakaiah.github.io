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

export interface AppState {
  verses: Verse[];
  streak: number;
  lastActiveDate: string | null;
  theme: Theme | string;
  sortOrder: SortOrder;
  settings: UserSettings;
  memorySentenceProgress: Record<string, MemorySentenceProgress>;
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
