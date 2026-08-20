export interface GuideBlock {
  chapters: string;
  label: string;
  description: string;
}

export interface GuideAnchor {
  ch: number | string;
  word: string;
  scene: string;
}

export interface GuideVerse {
  ref: string;
  text: string;
  theme: string;
}

export interface ArchitectureBlock {
  name: string;
  /**
   * The block's span. Chapter numbers by default; verse numbers within the book's one
   * chapter when `unit` is 'verse', which is how a single-chapter book (Obadiah, Jude,
   * Philemon, 2-3 John) states its movements.
   */
  chapters: [number, number];
  /**
   * Declared rather than inferred. The reader used to guess "these must be verses" from
   * the book having one chapter and more than one block, which worked but left the data
   * saying something it didn't mean — and no way to say it for a book with many chapters.
   */
  unit?: 'chapter' | 'verse';
}

export interface StudyGuide {
  id: string;
  title?: string;
  subtitle?: string;
  icon?: string;
  type?: string;
  tier?: number;
  category?: string;
  chapters?: number;
  structureFormula?: string;
  blocks?: GuideBlock[];
  anchors: GuideAnchor[];
  memorySentence?: string;
  keyVerses?: GuideVerse[];
  architecture?: ArchitectureBlock[];
}
