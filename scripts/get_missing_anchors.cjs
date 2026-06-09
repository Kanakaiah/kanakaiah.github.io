const fs = require('fs');

const content = fs.readFileSync('src/data/guides.ts', 'utf8');

const anchors = [];
const regex = /id:\s*['"]([^'"]+)['"][\s\S]*?anchors:\s*\[([\s\S]*?)\]/g;
let match;

while ((match = regex.exec(content)) !== null) {
  const guide_id = match[1];
  const anchorsBlock = match[2];
  
  const anchorRegex = /\{\s*ch:\s*(\d+),\s*word:\s*['"]([^'"]+)['"],\s*scene:\s*['"]([^'"]+)['"]\s*\}/g;
  let anchorMatch;
  while ((anchorMatch = anchorRegex.exec(anchorsBlock)) !== null) {
    anchors.push({
      guide_id,
      ch: parseInt(anchorMatch[1], 10),
      word: anchorMatch[2],
      scene: anchorMatch[3]
    });
  }
}

// Print missing images
let count = 0;
const results = [];
for (const a of anchors) {
  const path = `public/chapters/${a.guide_id}/ch${a.ch}.png`;
  if (!fs.existsSync(path)) {
    results.push(a);
    count++;
    if (count === 25) break;
  }
}

console.log(JSON.stringify(results, null, 2));
