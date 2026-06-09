const fs = require('fs');
const path = require('path');

const anchors = JSON.parse(fs.readFileSync('extracted_anchors.json'));
const missing = [];

for (const a of anchors) {
  const p = path.join('public', 'chapters', a.guide_id, `ch${a.ch}.png`);
  if (!fs.existsSync(p)) {
    missing.push(a);
  }
}

fs.writeFileSync('missing_anchors.json', JSON.stringify(missing, null, 2));
console.log(missing.length + ' missing anchors out of ' + anchors.length);
