const fs = require('fs');
const content = fs.readFileSync('./src/data/guides.ts', 'utf-8');
const lines = content.split('\n');

let currentGuide = null;
let results = [];

for (const line of lines) {
  const idMatch = line.match(/id:\s*"([^"]+)"/);
  if (idMatch) {
    currentGuide = idMatch[1];
  }
  
  const anchorMatch = line.match(/{ ch:\s*(\d+),\s*word:\s*"([^"]+)",\s*scene:\s*"([^"]+)"\s*}/);
  if (anchorMatch && currentGuide) {
    results.push({
      guide_id: currentGuide,
      ch: parseInt(anchorMatch[1]),
      word: anchorMatch[2],
      scene: anchorMatch[3]
    });
  }
}

fs.writeFileSync('anchors.json', JSON.stringify(results, null, 2));
console.log('Total anchors found:', results.length);
