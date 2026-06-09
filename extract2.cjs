const fs = require('fs');
const content = fs.readFileSync('src/data/guides.ts', 'utf8');

const regex = /id:\s*['"]([^'"]+)['"][\s\S]*?anchors:\s*\[([\s\S]*?)\]/g;
let match;
const results = [];

while ((match = regex.exec(content)) !== null) {
  const guide_id = match[1];
  const anchorsStr = match[2];
  
  const anchorRegex = /{[\s\S]*?ch:\s*(\d+),\s*word:\s*['"]([^'"]+)['"],\s*scene:\s*['"]([^'"]+)['"][\s\S]*?}/g;
  let anchorMatch;
  while ((anchorMatch = anchorRegex.exec(anchorsStr)) !== null) {
    results.push({
      guide_id,
      ch: parseInt(anchorMatch[1]),
      word: anchorMatch[2],
      scene: anchorMatch[3]
    });
  }
}

fs.writeFileSync('extracted_anchors.json', JSON.stringify(results, null, 2));
console.log("Extracted " + results.length + " anchors.");
