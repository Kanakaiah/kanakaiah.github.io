import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { OT_BOOKS } from '../src/data/otBooks.ts';
import { NT_BOOKS } from '../src/data/ntBooks.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = path.join(__dirname, '../prompts');
const OT_GUIDES_DIR = path.join(__dirname, '../src/data/otGuides');
const GUIDES_FILE = path.join(__dirname, '../src/data/guides.ts');

const promptFor = (scene, word) =>
  `A dramatic, cinematic biblical illustration of ${scene}. Symbolizes '${word}'. ` +
  'Photorealistic oil painting style, 16:9 widescreen composition, warm atmospheric lighting, rich earth tones. ' +
  'No text, letters, words, captions, signage, inscriptions, watermarks or signatures anywhere in the image.';

const cleanScene = (scene) => String(scene).replace(/^"|"$/g, '').trim();

const GUIDE_FILENAMES = { songofsolomon: 'song-of-solomon' };

async function loadOtGuide(bookId) {
  const file = path.join(OT_GUIDES_DIR, `${GUIDE_FILENAMES[bookId] || bookId}.ts`);
  if (!fs.existsSync(file)) return null;
  const mod = await import(`file://${file.replace(/\\/g, '/')}`);
  return Object.values(mod).find((v) => v && v.id === bookId && Array.isArray(v.anchors)) || null;
}

function parseNtGuides() {
  const text = fs.readFileSync(GUIDES_FILE, 'utf8');
  const guideMap = new Map();

  // Find all objects with id: "..." and anchors: [...]
  const guideIdRegex = /id:\s*["']([a-z0-9-]+)["']/g;
  let match;
  while ((match = guideIdRegex.exec(text)) !== null) {
    const bookId = match[1];
    const startIdx = match.index;
    // Look for anchors in this block
    const nextGuide = text.indexOf('id: "', startIdx + 10);
    const blockEnd = nextGuide === -1 ? text.length : nextGuide;
    const block = text.slice(startIdx, blockEnd);

    const anchorsIdx = block.indexOf('anchors: [');
    if (anchorsIdx === -1) continue;

    const afterAnchors = block.slice(anchorsIdx + 10);
    const endAnchors = afterAnchors.indexOf(']');
    if (endAnchors === -1) continue;

    const anchorsText = afterAnchors.slice(0, endAnchors);
    // Parse each { ch: X, word: "...", scene: "..." }
    const anchorBlocks = anchorsText.split(/\{\s*ch:\s*/);
    const anchors = [];
    for (let j = 1; j < anchorBlocks.length; j++) {
      const aText = anchorBlocks[j];
      const chMatch = aText.match(/^(\d+)/);
      if (!chMatch) continue;
      const ch = Number(chMatch[1]);

      const wordMatch = aText.match(/word:\s*["']([^"']+)["']/);
      const word = wordMatch ? wordMatch[1] : '';

      // scene: can be enclosed in single or double quotes, and might contain the other
      let scene = '';
      const sceneIdx = aText.indexOf('scene:');
      if (sceneIdx !== -1) {
        const afterScene = aText.slice(sceneIdx + 6).trim();
        const quoteChar = afterScene[0];
        if (quoteChar === '"' || quoteChar === "'") {
          // Find matching closing quote before the closing brace '}'
          const endQuote = afterScene.lastIndexOf(quoteChar);
          if (endQuote > 0) {
            scene = afterScene.slice(1, endQuote);
          }
        }
      }
      if (word && scene) {
        anchors.push({ ch, word, scene });
      }
    }
    if (anchors.length > 0) {
      guideMap.set(bookId, anchors);
    }
  }
  return guideMap;
}

function writePromptsFile(book, anchors) {
  let md = `# Image prompts for ${book.name} — all chapters\n\n`;
  md += `Paste each prompt into your image generator. Save the result under the filename given `;
  md += `and place it in \`public/chapters/${book.id}/\`.\n\n`;
  md += `The wording is identical across every book so the set stays visually consistent — `;
  md += `change it only if you intend to restyle all ${book.chapters} chapters.\n\n`;

  const sortedAnchors = [...anchors].sort((a, b) => a.ch - b.ch);
  for (const anchor of sortedAnchors) {
    md += `### Chapter ${anchor.ch} — ${anchor.word}\n`;
    md += `**Filename:** \`ch${anchor.ch}.png\`\n\n`;
    md += '```\n' + promptFor(cleanScene(anchor.scene), anchor.word) + '\n```\n\n';
  }

  const outPath = path.join(OUT_DIR, `${book.id}-prompts.md`);
  fs.writeFileSync(outPath, md);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ntGuidesMap = parseNtGuides();
  console.log(`Parsed ${ntGuidesMap.size} NT guides from guides.ts`);

  let otCount = 0;
  for (const book of OT_BOOKS) {
    const guide = await loadOtGuide(book.id);
    if (!guide || !guide.anchors) {
      console.warn(`Missing OT guide for ${book.id}`);
      continue;
    }
    writePromptsFile(book, guide.anchors);
    otCount++;
  }
  console.log(`Generated prompts for ${otCount} OT books.`);

  let ntCount = 0;
  for (const book of NT_BOOKS) {
    const anchors = ntGuidesMap.get(book.id);
    if (!anchors || anchors.length === 0) {
      console.warn(`Missing NT guide for ${book.id}`);
      continue;
    }
    writePromptsFile(book, anchors);
    ntCount++;
  }
  console.log(`Generated prompts for ${ntCount} NT books.`);
  console.log(`Total: ${otCount + ntCount} books processed.`);
}

main().catch(console.error);
