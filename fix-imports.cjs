const fs = require('fs');
const path = require('path');
const dir = 'src/data/otGuides';
const files = fs.readdirSync(dir);
for (const file of files) {
  if (file.endsWith('.ts')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace("import { StudyGuide } from '../types';", "import type { StudyGuide } from '../types';");
    fs.writeFileSync(filePath, content);
  }
}
console.log('Done');
