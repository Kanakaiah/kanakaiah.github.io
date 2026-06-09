const fs = require('fs');

const content = fs.readFileSync('src/data/guides.ts', 'utf8');
const lines = content.split('\n');

const tasks = [];
let currentBook = null;

for (let line of lines) {
  let match = line.match(/id:\s*"([^"]+)"/);
  if (match) {
    currentBook = match[1];
  }
  let anchorMatch = line.match(/\{\s*ch:\s*(\d+),\s*word:\s*"([^"]+)",\s*scene:\s*"([^"]+)"\s*\}/);
  if (anchorMatch && currentBook) {
    tasks.push({
      guide_id: currentBook,
      ch: parseInt(anchorMatch[1], 10),
      word: anchorMatch[2],
      scene: anchorMatch[3]
    });
  }
}

fs.writeFileSync('tasks.json', JSON.stringify(tasks, null, 2));
