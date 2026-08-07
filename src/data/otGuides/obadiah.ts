import type { StudyGuide } from '../types';

export const OBADIAH_GUIDE: StudyGuide = {
  id: 'obadiah',
  subtitle: 'Pride Soars on Eagles\' Wings — and Falls to Ruin',
  // Obadiah is a single chapter, so these ranges are verses (1-21), not
  // chapters — matching how the other single-chapter books (Philemon, Jude,
  // 2-3 John) structure their own blocks. All three previously pointed at
  // "chapter 1", which made every section identical and broke the
  // distribution chart's math (each read as 100% of a 1-chapter book).
  architecture: [
    { name: 'EDOM\'S JUDGMENT (Pride and coming fall)', chapters: [1, 9] },
    { name: 'EDOM\'S CRIME (Standing by while Jerusalem burned)', chapters: [10, 14] },
    { name: 'THE DAY (All nations judged — Israel restored)', chapters: [15, 21] }
  ],
  anchors: [
    { ch: 1, word: 'CLIFF', scene: '"You who live in the clefts of the rocks and make your home on the heights — you say to yourself, who can bring me down? Though you soar like the eagle — I will bring you down"' }
  ],
  memorySentence: "Edom perches on the CLIFF of pride declaring no one can bring them down — but the God who sees brothers betray brothers says: as you did to Jacob's descendants it will be done to you — the DAY OF THE LORD is near for all nations and the house of Jacob will be a fire.",
  keyVerses: [
    { ref: '1:15', text: '"The day of the LORD is near for all nations — as you have done it will be done to you — your deeds will return on your own head"', theme: 'The law of divine reciprocity' }
  ]
};
