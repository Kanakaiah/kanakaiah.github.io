const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('src/data/guides.ts', 'utf8');
const results = {};
const blocks = content.split('id: ');

for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  const idMatch = block.match(/^['"]([a-z0-9]+)['"]/);
  if (!idMatch) continue;
  const book = idMatch[1];
  
  const anchorsMatch = block.match(/anchors:\s*\[([\s\S]*?)\]/);
  if (!anchorsMatch) continue;
  
  const anchorsBlock = anchorsMatch[1];
  const anchors = [];
  const anchorRegex = /\{\s*ch:\s*(\d+),\s*word:\s*["'](.*?)["'],\s*scene:\s*["'](.*?)["']\s*\}/g;
  let aMatch;
  while ((aMatch = anchorRegex.exec(anchorsBlock)) !== null) {
    anchors.push({ ch: parseInt(aMatch[1]), word: aMatch[2], scene: aMatch[3] });
  }
  if (anchors.length > 0 && book !== 'evangelists' && book !== 'paul' && book !== 'general') {
    results[book] = anchors;
  }
}

const publicDir = path.join(__dirname, 'public', 'chapters');
const pending = [];

for (const book of Object.keys(results)) {
  for (const anchor of results[book]) {
    const filePath = path.join(publicDir, book, `ch${anchor.ch}.png`);
    if (!fs.existsSync(filePath)) {
      pending.push({
        book: book,
        ch: anchor.ch,
        word: anchor.word,
        scene: anchor.scene
      });
    }
  }
}

fs.writeFileSync('pending_generation.json', JSON.stringify(pending, null, 2));
console.log(`Wrote ${pending.length} pending items to pending_generation.json`);
