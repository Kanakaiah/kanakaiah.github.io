import { NT_STUDY_GUIDES } from '../src/data/guides.ts';
import fs from 'fs';

const results = [];
let count = 0;

for (const guide of NT_STUDY_GUIDES) {
  if (guide.anchors && Array.isArray(guide.anchors)) {
    for (const a of guide.anchors) {
      const path = `public/chapters/${guide.id}/ch${a.ch}.png`;
      if (!fs.existsSync(path)) {
        results.push({
          guide_id: guide.id,
          ch: a.ch,
          word: a.word,
          scene: a.scene
        });
        count++;
        if (count === 25) {
          console.log(JSON.stringify(results, null, 2));
          process.exit(0);
        }
      }
    }
  }
}
console.log(JSON.stringify(results, null, 2));
