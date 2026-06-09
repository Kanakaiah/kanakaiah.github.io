const fs = require('fs');
const content = fs.readFileSync('src/data/guides.ts', 'utf8');
const guides = content.split('id: "');
const out = [];
for (let i = 1; i < guides.length; i++) {
  const guideStr = guides[i];
  const guideId = guideStr.substring(0, guideStr.indexOf('"'));
  const anchorsMatch = guideStr.match(/anchors:\s*\[([\s\S]*?)\]/);
  if (anchorsMatch) {
    const anchorsStr = anchorsMatch[1];
    const chRegex = /{\s*ch:\s*(\d+),\s*word:\s*"([^"]+)",\s*scene:\s*"([^"]+)"\s*}/g;
    let match;
    while ((match = chRegex.exec(anchorsStr)) !== null) {
      out.push({ guide_id: guideId, ch: parseInt(match[1]), word: match[2], scene: match[3] });
    }
  }
}
fs.writeFileSync('dump.json', JSON.stringify(out, null, 2));
