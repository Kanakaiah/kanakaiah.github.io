const fs = require('fs');
const content = fs.readFileSync('src/data/guides.ts', 'utf8');
const match = content.match(/id:\s*['"]revelation['"][\s\S]*?anchors:\s*\[([\s\S]*?)\]/);
if (match) {
  const anchorsStr = match[1];
  const lines = anchorsStr.split('\n').filter(l => l.includes('{') && (l.includes('ch: 21') || l.includes('ch: 22')));
  console.log(lines.join('\n'));
} else {
  console.log('Not found');
}
