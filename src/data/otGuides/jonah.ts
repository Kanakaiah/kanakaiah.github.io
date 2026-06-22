import type { StudyGuide } from '../types';

export const jonahGuide: StudyGuide = {
  id: 'jonah',
  anchors: [
    { ch: 1, word: 'Arise, go to Nineveh', scene: 'Jonah flees from the Lord' },
    { ch: 2, word: 'Then Jonah prayed', scene: 'Jonah\'s prayer from the fish' },
    { ch: 3, word: 'Arise, go to Nineveh', scene: 'Jonah goes and Nineveh repents' },
    { ch: 4, word: 'It displeased Jonah', scene: 'Jonah\'s anger and God\'s compassion' }
  ],
  architecture: [
    { name: 'Jonah\'s Disobedience and the Great Fish', chapters: [1, 2] },
    { name: 'Jonah\'s Preaching and Nineveh\'s Repentance', chapters: [3, 3] },
    { name: 'God\'s Lesson on Compassion', chapters: [4, 4] }
  ]
};
