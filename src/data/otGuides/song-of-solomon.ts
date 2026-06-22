import type { StudyGuide } from '../types';

export const SONG_OF_SOLOMON_GUIDE: StudyGuide = {
  id: 'songofsolomon',
  anchors: [
    { ch: 1, word: 'Desire', scene: 'The lovers\' mutual admiration and longing' },
    { ch: 2, word: 'Springtime', scene: 'The pursuit and the call to come away' },
    { ch: 3, word: 'Search', scene: 'The bride’s dream and Solomon’s wedding procession' },
    { ch: 4, word: 'Beauty', scene: 'The groom praises the bride’s beauty' },
    { ch: 5, word: 'Separation', scene: 'The bride’s troubled dream and search for her beloved' },
    { ch: 6, word: 'Reunion', scene: 'The lovers are reunited; the groom praises her again' },
    { ch: 7, word: 'Delight', scene: 'The groom’s adoration and the bride’s invitation' },
    { ch: 8, word: 'Love', scene: 'The enduring, unyielding power of love' }
  ],
  architecture: [
    { name: 'The Courtship', chapters: [1, 3] },
    { name: 'The Wedding', chapters: [3, 5] },
    { name: 'The Maturing Marriage', chapters: [5, 8] }
  ]
};
