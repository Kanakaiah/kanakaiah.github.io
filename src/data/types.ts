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
  chapters: [number, number];
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
