const fs = require('fs');
const data = JSON.parse(fs.readFileSync('isaiah_missing.json', 'utf8'));
const remaining = data.filter(d => parseInt(d.ch) >= 23);

let md = `# Prompts for Isaiah (Chapters 23-66)

Copy and paste these prompts into your image generator to maintain a consistent style across all chapters. When you save the images, please name them \`ch23.png\`, \`ch24.png\`, etc., and place them in the \`public/chapters/isaiah/\` directory.

`;

remaining.forEach(d => {
  let cleanScene = d.scene.replace(/^"|"$/g, '');
  md += `### Chapter ${d.ch}\n**Filename:** \`ch${d.ch}.png\`\n\`\`\`\nA dramatic, cinematic biblical illustration of ${cleanScene}. Symbolizes '${d.word}'. Photorealistic oil painting style, 16:9 widescreen composition, warm atmospheric lighting, rich earth tones.\n\`\`\`\n\n`;
});

fs.writeFileSync('C:/Users/etipa/.gemini/antigravity/brain/c4e0d273-1f10-4c43-ad02-d1d0b66b3d91/isaiah_prompts.md', md);
