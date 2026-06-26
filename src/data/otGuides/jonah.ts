import type { StudyGuide } from '../types';

export const JONAH_GUIDE: StudyGuide = {
  id: 'jonah',
  subtitle: 'The Reluctant Prophet and the God Who Won\'t Let Go',
  architecture: [
    { name: 'FLIGHT (Jonah runs — the storm — thrown overboard)', chapters: [1, 1] },
    { name: 'PRAYER (From the fish\'s belly — "Salvation comes from the LORD")', chapters: [2, 2] },
    { name: 'PREACHING (Jonah goes — Nineveh repents — 120,000 people)', chapters: [3, 3] },
    { name: 'ANGER (Jonah sulks — the plant — God\'s question)', chapters: [4, 4] }
  ],
  anchors: [
    { ch: 1, word: 'SHIP', scene: 'Jonah pays his fare — the storm rises — sailors cast lots — Jonah thrown overboard' },
    { ch: 2, word: 'SEAWEED', scene: '"Seaweed wrapped around my head — I sank to the roots of the mountains — yet you brought me up"' },
    { ch: 3, word: 'ASHES', scene: 'The king of Nineveh rises from his throne — sits in ashes — proclaims a fast' },
    { ch: 4, word: 'PLANT', scene: 'A plant grows overnight to shelter Jonah — withers overnight — God\'s final question' }
  ],
  memorySentence: "Jonah boards a SHIP fleeing God, sinks to the depths with SEAWEED around his head and is swallowed, prays and is vomited out, goes to Nineveh, preaches eight words, and 120,000 people sit in ASHES — and then Jonah sulks under a PLANT that God grows and kills overnight to ask the question that ends the book: 'Should I not be concerned about that great city?'",
  keyVerses: [
    { ref: '2:9', text: '"Salvation comes from the LORD"', theme: 'The theological center — the shortest sermon in the book' },
    { ref: '3:10', text: '"When God saw what they did and how they turned from their evil ways he relented"', theme: 'The most unexpected moment in the OT' },
    { ref: '4:2', text: '"I knew you are a gracious and compassionate God — slow to anger — that is why I fled"', theme: 'The most honest and most ironic confession in Scripture' }
  ]
};
