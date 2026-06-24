import fs from 'fs';
import path from 'path';
import { NT_STUDY_GUIDES } from './src/data/guides';

const publicChaptersDir = path.join(process.cwd(), 'public', 'chapters');

const missing = [];

for (const guide of NT_STUDY_GUIDES) {
  if (guide.type !== 'book-guide' || !guide.anchors) continue;
  const guideDir = path.join(publicChaptersDir, guide.id);
  
  if (!fs.existsSync(guideDir)) {
    fs.mkdirSync(guideDir, { recursive: true });
  }

  for (const anchor of guide.anchors) {
    const imagePath = path.join(guideDir, `ch${anchor.ch}.png`);
    if (!fs.existsSync(imagePath)) {
      missing.push({
        guideId: guide.id,
        ch: anchor.ch,
        word: anchor.word,
        scene: anchor.scene,
      });
    }
  }
}

fs.writeFileSync('missing.json', JSON.stringify(missing, null, 2));
console.log(`Found ${missing.length} missing images.`);
