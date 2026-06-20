const fs = require('fs');
const path = require('path');

const anchors = JSON.parse(fs.readFileSync('anchors.json', 'utf8'));
const publicDir = path.join(__dirname, 'public', 'chapters');

const books = ['matthew', 'mark', 'luke', '1corinthians', '2corinthians', 'colossians', '1thessalonians', '2thessalonians', '1timothy', '2timothy', 'titus', 'philemon', 'james', '1peter', '2peter', '1john', '2john', '3john', 'jude', 'revelation'];

const missing = [];

for (const book of books) {
  if (!anchors[book]) continue;
  const bookDir = path.join(publicDir, book);
  for (const anchor of anchors[book]) {
    const ch = anchor.ch;
    const filePath = path.join(bookDir, `ch${ch}.png`);
    if (!fs.existsSync(filePath)) {
      missing.push({
        book,
        ch,
        word: anchor.word,
        scene: anchor.scene
      });
    }
  }
}

fs.writeFileSync('missing.json', JSON.stringify(missing, null, 2));
console.log(`Total missing: ${missing.length}`);
