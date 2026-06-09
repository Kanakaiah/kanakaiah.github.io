const fs = require('fs');
const srcDir = 'C:/Users/etipa/.gemini/antigravity/brain/dc470efc-4e3a-488b-aacd-0a34c0d16fd6';
const destDir = 'C:/Users/etipa/.gemini/antigravity/scratch/kanakaiah_git/public/chapters/matthew';

for (let i = 3; i <= 18; i++) {
  const files = fs.readdirSync(srcDir);
  const match = files.find(f => f.startsWith(`matthew_ch${i}_`) && f.endsWith('.png'));
  if (match) {
    fs.copyFileSync(`${srcDir}/${match}`, `${destDir}/ch${i}.png`);
    console.log(`Copied ch${i}.png`);
  }
}
