const fs = require('fs');
const path = require('path');

const findMissing = (fileContent) => {
  const regex = /id:\s*'([^']+)'[\s\S]*?anchors:\s*\[([\s\S]*?)\]/g;
  let match;
  let missing = [];
  while ((match = regex.exec(fileContent)) !== null) {
    const book = match[1];
    const anchorsStr = match[2];
    const chRegex = /ch:\s*(\d+)/g;
    let chMatch;
    while ((chMatch = chRegex.exec(anchorsStr)) !== null) {
      const ch = chMatch[1];
      const imgPath = 'public/chapters/' + book + '/ch' + ch + '.png';
      if (!fs.existsSync(imgPath)) {
        missing.push({ book, ch, imgPath });
      }
    }
  }
  return missing;
};

// Read NT Guides
const ntGuides = fs.readFileSync('src/data/guides.ts', 'utf8');
const ntMissing = findMissing(ntGuides);

// Read OT Guides (they are split in files)
const otDir = 'src/data/otGuides';
const otFiles = fs.readdirSync(otDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
let otMissing = [];
otFiles.forEach(f => {
  const content = fs.readFileSync(path.join(otDir, f), 'utf8');
  otMissing.push(...findMissing(content));
});

console.log('NT Missing:', ntMissing.length);
if (ntMissing.length > 0) console.log(ntMissing.slice(0, 5));
console.log('OT Missing:', otMissing.length);
if (otMissing.length > 0) console.log(otMissing.slice(0, 5));
