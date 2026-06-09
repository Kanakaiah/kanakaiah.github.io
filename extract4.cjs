const fs = require('fs');
const content = fs.readFileSync('src/data/guides.ts', 'utf8');

const results = [];
const blocks = content.split(/id:\s*['"]/);

for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  const guideIdMatch = block.match(/^([^'"]+)['"]/);
  if (!guideIdMatch) continue;
  const guide_id = guideIdMatch[1];
  
  const anchorsMatch = block.match(/anchors:\s*\[([\s\S]*?)\]/);
  if (anchorsMatch) {
    const anchorsStr = anchorsMatch[1];
    const anchorRegex = /{[\s\S]*?ch:\s*(\d+),\s*word:\s*(['"])(.*?)\2,\s*scene:\s*(['"])(.*?)\4[\s\S]*?}/g;
    let anchorMatch;
    while ((anchorMatch = anchorRegex.exec(anchorsStr)) !== null) {
      results.push({
        guide_id,
        ch: parseInt(anchorMatch[1]),
        word: anchorMatch[3],
        scene: anchorMatch[5]
      });
    }
  }
}

fs.writeFileSync('extracted_anchors.json', JSON.stringify(results, null, 2));
console.log("Extracted " + results.length + " anchors.");
