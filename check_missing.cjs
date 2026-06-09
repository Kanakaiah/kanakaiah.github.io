const fs = require('fs');
const jobs = JSON.parse(fs.readFileSync('jobs.json', 'utf8'));

let missing = [];
for (const job of jobs) {
  const path = `public/chapters/${job.id}/ch${job.ch}.png`;
  if (!fs.existsSync(path)) {
    missing.push(job);
  }
}

fs.writeFileSync('missing.json', JSON.stringify(missing, null, 2));
console.log('Missing: ' + missing.length);
