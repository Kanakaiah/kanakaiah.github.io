const fs = require('fs');

const content = fs.readFileSync('src/data/guides.ts', 'utf8');

// The file exports NT_STUDY_GUIDES which is an array of objects.
// Let's extract the objects using regex.
const results = {};

const books = ['matthew', 'mark', 'luke', '1corinthians', '2corinthians', 'colossians', '1thessalonians', '2thessalonians', '1timothy', '2timothy', 'titus', 'philemon', 'james', '1peter', '2peter', '1john', '2john', '3john', 'jude', 'revelation'];

for (const book of books) {
  const regex = new RegExp(`id:\\s*"${book}"[\\s\\S]*?anchors:\\s*\\[([\\s\\S]*?)\\]`, 'm');
  const match = content.match(regex);
  if (match) {
    const anchorsBlock = match[1];
    const anchors = [];
    const anchorRegex = /\{\s*ch:\s*(\d+),\s*word:\s*"([^"]+)",\s*scene:\s*"([^"]+)"/g;
    let aMatch;
    while ((aMatch = anchorRegex.exec(anchorsBlock)) !== null) {
      anchors.push({ ch: parseInt(aMatch[1]), word: aMatch[2], scene: aMatch[3] });
    }
    results[book] = anchors;
  }
}

fs.writeFileSync('anchors.json', JSON.stringify(results, null, 2));
console.log('Extracted anchors to anchors.json');
