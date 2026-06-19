import { NT_STUDY_GUIDES } from './src/data/guides.js'; // Might need .ts or tsx will handle it
import fs from 'fs';
import path from 'path';

const missing = [];

for (const guide of NT_STUDY_GUIDES) {
  if (!guide.anchors) continue;
  
  const guideId = guide.id;
  const dirPath = path.join(process.cwd(), 'public', 'chapters', guideId);
  
  for (const anchor of guide.anchors) {
    const ch = anchor.ch;
    const imgPath = path.join(dirPath, `ch${ch}.png`);
    
    if (!fs.existsSync(imgPath)) {
      missing.push({
        guideId,
        ch,
        word: anchor.word,
        scene: anchor.scene,
      });
    }
  }
}

console.log(JSON.stringify(missing, null, 2));
