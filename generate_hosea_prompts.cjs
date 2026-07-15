const fs = require('fs');

const content = fs.readFileSync('src/data/otGuides/hosea.ts', 'utf8');

const regex = /\{ ch: (\d+), word: '([^']+)', scene: '(.*?)' \}/g;
let match;
let prompts = [];

while ((match = regex.exec(content)) !== null) {
  prompts.push({ ch: match[1], word: match[2], scene: match[3] });
}

let md = `# Prompts for Hosea (Chapters 1-14)\n\nCopy and paste these prompts into your image generator to maintain a consistent style across all chapters.\n\n`;

prompts.forEach(p => {
  let cleanScene = p.scene.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/^"|"$/g, '');
  md += `### Chapter ${p.ch}\n**Filename:** \`ch${p.ch}.png\`\n\`\`\`\nA dramatic, cinematic biblical illustration of ${cleanScene}. Symbolizes '${p.word}'. Photorealistic oil painting style, 16:9 widescreen composition, warm atmospheric lighting, rich earth tones.\n\`\`\`\n\n`;
});

fs.writeFileSync('C:/Users/etipa/.gemini/antigravity/brain/c4e0d273-1f10-4c43-ad02-d1d0b66b3d91/hosea_prompts.md', md);
