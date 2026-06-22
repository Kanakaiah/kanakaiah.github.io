import type { StudyGuide } from '../types';

export const DANIEL_GUIDE: StudyGuide = {
  id: 'daniel',
  anchors: [
    { ch: 2, word: 'Statue', scene: 'Nebuchadnezzar’s dream of the great statue and the rock.' },
    { ch: 3, word: 'Furnace', scene: 'Shadrach, Meshach, and Abednego in the blazing furnace.' },
    { ch: 5, word: 'Writing', scene: 'Belshazzar’s feast and the writing on the wall.' },
    { ch: 6, word: 'Lions', scene: 'Daniel is thrown into the lions’ den and survives.' },
    { ch: 7, word: 'Beasts', scene: 'Daniel’s vision of four beasts and the Ancient of Days.' },
    { ch: 9, word: 'Sevens', scene: 'Daniel’s prayer and Gabriel’s revelation of the seventy sevens.' },
    { ch: 12, word: 'End', scene: 'The promise of resurrection and the time of the end.' }
  ],
  architecture: [
    { name: 'Historical Narratives in Babylon', chapters: [1, 6] },
    { name: 'Prophetic Visions', chapters: [7, 12] }
  ]
};
