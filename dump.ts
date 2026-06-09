import { NT_STUDY_GUIDES } from './src/data/guides';
import fs from 'fs';

const out = [];
for (const guide of NT_STUDY_GUIDES) {
  if (guide.anchors) {
    for (const anchor of guide.anchors) {
      out.push({ guide_id: guide.id, ch: anchor.ch, word: anchor.word, scene: anchor.scene });
    }
  }
}
fs.writeFileSync('dump.json', JSON.stringify(out, null, 2));
