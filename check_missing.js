const fs = require('fs');
const ts = fs.readFileSync('C:/Users/etipa/.gemini/antigravity/scratch/kanakaiah_git/src/data/guides.ts', 'utf8');

let code = ts.replace("import { PREACHERS_GUIDE } from './preachers';", "const PREACHERS_GUIDE = {};");
code = code.replace("export const NT_STUDY_GUIDES =", "global.NT_STUDY_GUIDES =");

eval(code);

const guides = global.NT_STUDY_GUIDES;
const missing = [];
for (const g of guides) {
  if (!g.anchors) continue;
  for (const a of g.anchors) {
    const dir = `C:/Users/etipa/.gemini/antigravity/scratch/kanakaiah_git/public/chapters/${g.id}`;
    const png = `${dir}/ch${a.ch}.png`;
    const jpg = `${dir}/ch${a.ch}.jpg`;
    if (!fs.existsSync(png) && !fs.existsSync(jpg)) {
      missing.push({
        id: g.id,
        ch: a.ch,
        word: a.word,
        scene: a.scene,
        dir: dir,
        png: png
      });
    }
  }
}

fs.writeFileSync('C:/Users/etipa/.gemini/antigravity/scratch/kanakaiah_git/missing.json', JSON.stringify(missing, null, 2));
console.log(`Found ${missing.length} missing images.`);
