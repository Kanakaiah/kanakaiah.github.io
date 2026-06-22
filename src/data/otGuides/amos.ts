import type { StudyGuide } from '../types';

export const amosGuide: StudyGuide = {
  id: 'amos',
  anchors: [
    { ch: 1, word: 'The Lord roars', scene: 'Judgments against the nations' },
    { ch: 3, word: 'Hear this word', scene: 'Judgment on Israel' },
    { ch: 5, word: 'Seek me and live', scene: 'A lament and call to repentance' },
    { ch: 7, word: 'Thus the Lord God showed me', scene: 'Visions of judgment' },
    { ch: 9, word: 'In that day', scene: 'Restoration of David\'s fallen tent' }
  ],
  architecture: [
    { name: 'Judgments on the Nations', chapters: [1, 2] },
    { name: 'Oracles Against Israel', chapters: [3, 6] },
    { name: 'Visions of Judgment and Future Hope', chapters: [7, 9] }
  ]
};
