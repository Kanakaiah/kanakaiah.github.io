import type { StudyGuide } from '../types';

export const ECCLESIASTES_GUIDE: StudyGuide = {
  id: 'ecclesiastes',
  anchors: [
    { ch: 1, word: 'Meaningless', scene: 'All is meaningless under the sun' },
    { ch: 2, word: 'Pleasure', scene: 'The futility of pleasure, wealth, and toil' },
    { ch: 3, word: 'Time', scene: 'A time for everything, and eternity in the human heart' },
    { ch: 4, word: 'Oppression', scene: 'The evils of oppression, toil, and friendlessness' },
    { ch: 5, word: 'Reverence', scene: 'Stand in awe of God; the emptiness of wealth' },
    { ch: 6, word: 'Wealth', scene: 'Wealth without the ability to enjoy it is a tragedy' },
    { ch: 7, word: 'Wisdom', scene: 'The practical value of wisdom and sorrow' },
    { ch: 8, word: 'Authority', scene: 'Obeying the king, and the mystery of unequal justice' },
    { ch: 9, word: 'Death', scene: 'A common destiny for all; enjoy life while you can' },
    { ch: 10, word: 'Folly', scene: 'The destructive nature of foolishness' },
    { ch: 11, word: 'Risk', scene: 'Invest boldly and rejoice in your youth' },
    { ch: 12, word: 'Conclusion', scene: 'Remember your Creator, and fear God' }
  ],
  architecture: [
    { name: 'Prologue: The Vanity of Life', chapters: [1, 1] },
    { name: 'The Teacher\'s Investigation', chapters: [1, 2] },
    { name: 'The Mystery of Time and Life', chapters: [3, 5] },
    { name: 'The Limitations of Wealth and Wisdom', chapters: [6, 8] },
    { name: 'Facing Death and Living Fully', chapters: [9, 11] },
    { name: 'Epilogue: The Conclusion of the Matter', chapters: [12, 12] }
  ]
};
