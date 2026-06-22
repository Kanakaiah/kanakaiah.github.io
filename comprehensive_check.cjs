const fs = require('fs');
const path = require('path');

const anchorsPath = path.join(__dirname, 'anchors.json');
const publicDir = path.join(__dirname, 'public', 'chapters');

if (!fs.existsSync(anchorsPath)) {
  console.error("anchors.json not found");
  process.exit(1);
}

const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));
const books = Object.keys(anchors);

const report = {
  totalAnchors: 0,
  totalGenerated: 0,
  totalMissing: 0,
  details: {}
};

for (const book of books) {
  const bookAnchors = anchors[book];
  const bookDir = path.join(publicDir, book);
  
  const bookStats = {
    total: bookAnchors.length,
    generated: 0,
    missing: 0,
    missingChapters: []
  };

  for (const anchor of bookAnchors) {
    report.totalAnchors++;
    const filePath = path.join(bookDir, `ch${anchor.ch}.png`);
    if (fs.existsSync(filePath)) {
      bookStats.generated++;
      report.totalGenerated++;
    } else {
      bookStats.missing++;
      report.totalMissing++;
      bookStats.missingChapters.push(anchor.ch);
    }
  }

  report.details[book] = bookStats;
}

console.log(JSON.stringify(report, null, 2));
fs.writeFileSync('generation_report.json', JSON.stringify(report, null, 2));
