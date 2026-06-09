const fs = require('fs');
const t = JSON.parse(fs.readFileSync('tasks.json'));
console.log([...new Set(t.map(x => x.guide_id))].join(', '));
