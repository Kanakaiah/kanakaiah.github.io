import { NT_STUDY_GUIDES } from './src/data/guides';
import * as fs from 'fs';
import * as path from 'path';

const publicDir = path.join(process.cwd(), 'public', 'chapters');

const missing = [];

for (const guide of NT_STUDY_GUIDES) {
  if (!guide.anchors) continue;
  
  for (const anchor of guide.anchors) {
    const dir = path.join(publicDir, guide.id);
    const pngPath = path.join(dir, `ch${anchor.ch}.png`);
    const jpgPath = path.join(dir, `ch${anchor.ch}.jpg`);
    
    if (!fs.existsSync(pngPath) && !fs.existsSync(jpgPath)) {
      missing.push({
        guide_id: guide.id,
        ch: anchor.ch,
        word: anchor.word,
        scene: anchor.scene
      });
    }
  }
}

fs.writeFileSync('missing_images.json', JSON.stringify(missing, null, 2));
console.log(`Found ${missing.length} missing images.`);
