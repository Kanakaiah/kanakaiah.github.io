const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('src/data/guides.ts', 'utf8');

const results = {};
// Split by id: 
const blocks = content.split('id: ');

for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  const idMatch = block.match(/^['"]([a-z0-9]+)['"]/);
  if (!idMatch) continue;
  const book = idMatch[1];
  
  // Find anchors array
  const anchorsMatch = block.match(/anchors:\s*\[([\s\S]*?)\]/);
  if (!anchorsMatch) continue;
  
  const anchorsBlock = anchorsMatch[1];
  const anchors = [];
  
  // Better regex for anchors
  // Match { ch: 1, word: "ANY", scene: "ANY" }
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
const books = Object.keys(results);

const report = {
  totalAnchors: 0,
  totalGenerated: 0,
  totalMissing: 0,
  completedBooks: [],
  missingDetails: []
};

for (const book of books) {
  const bookAnchors = results[book];
  const bookDir = path.join(publicDir, book);
  
  const bookStats = {
    book: book,
    total: bookAnchors.length,
    generated: 0,
    missing: 0,
    missingChapters: []
  };

  for (const anchor of bookAnchors) {
    report.totalAnchors++;
    const filePath = path.join(bookDir, `ch${anchor.ch}.png`);
    if (fs.existsSync(filePath)) {
      bookStats.generated++;
      report.totalGenerated++;
    } else {
      bookStats.missing++;
      report.totalMissing++;
      bookStats.missingChapters.push(anchor.ch);
    }
  }

  if (bookStats.missing > 0) {
    report.missingDetails.push(bookStats);
  } else {
    report.completedBooks.push(book);
  }
}

console.log(`Total Anchors: ${report.totalAnchors}`);
console.log(`Generated: ${report.totalGenerated}`);
console.log(`Missing: ${report.totalMissing}`);
console.log('\n--- COMPLETED BOOKS ---');
console.log(report.completedBooks.join(', '));
console.log('\n--- MISSING DETAILS ---');
for (const detail of report.missingDetails) {
  console.log(`${detail.book}: Missing ${detail.missing}/${detail.total} -> Chapters: ${detail.missingChapters.join(', ')}`);
}

fs.writeFileSync('true_missing.json', JSON.stringify(report, null, 2));
