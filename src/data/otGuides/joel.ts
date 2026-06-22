import type { StudyGuide } from '../types';

export const joelGuide: StudyGuide = {
  id: 'joel',
  anchors: [
    { ch: 1, word: 'Hear this', scene: 'The locust plague' },
    { ch: 2, word: 'Blow the trumpet', scene: 'The approaching day of the Lord' },
    { ch: 2, word: 'Pour out my Spirit', scene: 'The promise of the Spirit' },
    { ch: 3, word: 'Valley of Jehoshaphat', scene: 'Judgment of the nations' }
  ],
  architecture: [
    { name: 'The Locust Plague and the Day of the Lord', chapters: [1, 2] },
    { name: 'The Promise of the Spirit and Final Judgment', chapters: [2, 3] }
  ]
};
