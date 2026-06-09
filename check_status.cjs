const fs = require('fs');
const path = require('path');
const tsNode = require('ts-node');

tsNode.register({
  compilerOptions: { module: 'commonjs' }
});

const { NT_STUDY_GUIDES } = require('./src/data/guides.ts');

const publicDir = path.join(__dirname, 'public', 'chapters');

let completed = [];
let pending = [];

for (const guide of NT_STUDY_GUIDES) {
  if (guide.type !== 'book-guide') continue;
  
  let guideCompleted = [];
  let guidePending = [];
  
  if (guide.anchors) {
    for (const anchor of guide.anchors) {
      const imgPath = path.join(publicDir, guide.id, `ch${anchor.ch}.png`);
      if (fs.existsSync(imgPath)) {
        guideCompleted.push(anchor.ch);
      } else {
        guidePending.push(anchor.ch);
      }
    }
  }
  
  if (guideCompleted.length > 0) {
    completed.push({ book: guide.id, chapters: guideCompleted });
  }
  if (guidePending.length > 0) {
    pending.push({ book: guide.id, chapters: guidePending });
  }
}

console.log('\n=== COMPLETED ===');
completed.forEach(c => console.log(`- ${c.book}: ${c.chapters.length} chapters (${c.chapters.join(', ')})`));

console.log('\n=== PENDING ===');
pending.forEach(p => console.log(`- ${p.book}: ${p.chapters.length} chapters (${p.chapters.join(', ')})`));
