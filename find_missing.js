const fs = require('fs');
const path = require('path');

const guidesPath = path.join(__dirname, 'src/data/guides.ts');
const content = fs.readFileSync(guidesPath, 'utf-8');

const bookRegex = /id:\s*"([^"]+)",[\s\S]*?anchors:\s*\[([\s\S]*?)\]/g;

let match;
const tasks = [];

while ((match = bookRegex.exec(content)) !== null) {
  const guide_id = match[1];
  if (guide_id === 'evangelists' || guide_id === 'john-signs-iams') continue; // reference guides don't have chapters
  
  const anchorsBlock = match[2];
  const anchorRegex = /\{\s*ch:\s*(\d+),\s*word:\s*"([^"]+)",\s*scene:\s*"([^"]+)"/g;
  
  let anchorMatch;
  while ((anchorMatch = anchorRegex.exec(anchorsBlock)) !== null) {
    const ch = anchorMatch[1];
    const word = anchorMatch[2];
    const scene = anchorMatch[3];
    
    const imagePath = path.join(__dirname, `public/chapters/${guide_id}/ch${ch}.png`);
    if (!fs.existsSync(imagePath)) {
      tasks.push({
        guide_id,
        ch,
        word,
        scene,
        imagePath
      });
    }
  }
}

fs.writeFileSync('missing.json', JSON.stringify(tasks, null, 2));
console.log(`Found ${tasks.length} missing images.`);
