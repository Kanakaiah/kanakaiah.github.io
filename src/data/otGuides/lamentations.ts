import type { StudyGuide } from '../types';

export const LAMENTATIONS_GUIDE: StudyGuide = {
  id: 'lamentations',
  anchors: [
    { ch: 1, word: 'Widow', scene: 'Jerusalem weeping bitterly, sitting alone like a widow.' },
    { ch: 2, word: 'Wrath', scene: 'The Lord has destroyed the strongholds of Judah in His anger.' },
    { ch: 3, word: 'Hope', scene: 'The steadfast love of the Lord never ceases; His mercies are new.' },
    { ch: 4, word: 'Gold', scene: 'The precious children of Zion are treated like clay pots.' },
    { ch: 5, word: 'Remember', scene: 'A plea for God to remember their affliction and restore them.' }
  ],
  architecture: [
    { name: 'Jerusalem’s Desolation', chapters: [1, 2] },
    { name: 'Suffering and Hope', chapters: [3, 3] },
    { name: 'Present Misery and Prayer for Restoration', chapters: [4, 5] }
  ]
};
