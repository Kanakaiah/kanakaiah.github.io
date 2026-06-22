import type { StudyGuide } from '../types';

export const ISAIAH_GUIDE: StudyGuide = {
  id: 'isaiah',
  anchors: [
    { ch: 1, word: 'Rebellion', scene: 'God indicts Judah for rebellion and empty rituals.' },
    { ch: 6, word: 'Commission', scene: 'Isaiah’s vision of God’s throne and his calling.' },
    { ch: 9, word: 'Child', scene: 'Prophecy of the child born to reign on David’s throne.' },
    { ch: 14, word: 'Babylon', scene: 'Taunt against the king of Babylon and his fall.' },
    { ch: 40, word: 'Comfort', scene: 'Words of comfort and the promise of God’s return.' },
    { ch: 53, word: 'Servant', scene: 'The suffering and triumph of the Lord’s servant.' },
    { ch: 66, word: 'New', scene: 'Vision of the new heavens and new earth.' }
  ],
  architecture: [
    { name: 'Warnings and Judgments', chapters: [1, 39] },
    { name: 'Comfort and Salvation', chapters: [40, 66] }
  ]
};
