const fs = require('fs');
let anchors = [];
for (let i = 1; i <= 150; i++) {
  let word = "Psalm";
  let scene = "A song of praise, lament, or thanksgiving";
  if (i === 1) { word = "Blessed"; scene = "The way of the righteous vs. the wicked"; }
  if (i === 23) { word = "Shepherd"; scene = "The Lord is my shepherd"; }
  if (i === 51) { word = "Repentance"; scene = "Create in me a clean heart"; }
  if (i === 119) { word = "Word"; scene = "The glories of God's law"; }
  if (i === 139) { word = "Known"; scene = "God's omnipresence and omniscience"; }
  if (i === 150) { word = "Praise"; scene = "Let everything that has breath praise the Lord"; }
  anchors.push(`    { ch: ${i}, word: '${word} ${i}', scene: "${scene}" }`);
}
const content = `import type { StudyGuide } from '../types';

export const PSALMS_GUIDE: StudyGuide = {
  id: 'psalms',
  anchors: [
${anchors.join(',\n')}
  ],
  architecture: [
    { name: 'Book I', chapters: [1, 41] },
    { name: 'Book II', chapters: [42, 72] },
    { name: 'Book III', chapters: [73, 89] },
    { name: 'Book IV', chapters: [90, 106] },
    { name: 'Book V', chapters: [107, 150] }
  ]
};
`;
fs.writeFileSync('src/data/otGuides/psalms.ts', content);
