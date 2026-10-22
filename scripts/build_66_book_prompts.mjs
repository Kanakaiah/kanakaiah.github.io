import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { OT_BOOKS } from '../src/data/otBooks.ts';
import { NT_BOOKS } from '../src/data/ntBooks.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_PATH = path.join(__dirname, '../prompts/66-books-cover-prompts.md');

function promptForBook(book) {
  return `A dramatic, cinematic biblical illustration representing the Book of ${book.name}. Symbolizes '${book.themeWord}' and '${book.keyWord}' — ${book.subtitle}. Photorealistic oil painting style, 4:3 composition, warm atmospheric lighting, chiaroscuro, rich earth tones. No text, letters, words, captions, signage, inscriptions, watermarks or signatures anywhere in the image.`;
}

function generateMarkdown() {
  let md = `# Remora 66 Books Cover Art Prompts\n\n`;
  md += `This document contains the official image generation prompts for all **66 Book Cover cards** in the Remora Bible app (Old Testament & New Testament).\n\n`;
  md += `These images serve as the primary visual identity for each book across the Bible Browser, Home Dashboard, and Theme Flashcards.\n\n`;
  md += `- **Aspect Ratio:** 4:3 (or 16:9 widescreen depending on target view)\n`;
  md += `- **Destination Paths:**\n`;
  md += `  - Web (PWA): \`public/books/<bookId>.png\`\n`;
  md += `  - Android: \`android/app/src/main/assets/books/<bookId>.png\`\n\n`;
  md += `---\n\n`;

  md += `## 📜 Old Testament (39 Books)\n\n`;

  let otIdx = 1;
  let currentSection = '';
  for (const book of OT_BOOKS) {
    if (book.section !== currentSection) {
      currentSection = book.section;
      md += `### ── ${currentSection.toUpperCase()} ──\n\n`;
    }
    md += `#### ${otIdx}. ${book.name} — ${book.themeWord}\n`;
    md += `- **Theme Word:** ${book.themeWord} (Visual Anchor)\n`;
    md += `- **Key Word:** ${book.keyWord} (Theological Heartbeat)\n`;
    md += `- **Subtitle:** ${book.subtitle}\n`;
    md += `- **Chapters:** ${book.chapters} chapters\n`;
    md += `- **Filename:** \`${book.id}.png\`\n\n`;
    md += '```\n' + promptForBook(book) + '\n```\n\n';
    otIdx++;
  }

  md += `---\n\n`;
  md += `## ✝️ New Testament (27 Books)\n\n`;

  let ntIdx = 1;
  currentSection = '';
  for (const book of NT_BOOKS) {
    if (book.section !== currentSection) {
      currentSection = book.section;
      md += `### ── ${currentSection.toUpperCase()} ──\n\n`;
    }
    md += `#### ${39 + ntIdx}. ${book.name} — ${book.themeWord}\n`;
    md += `- **Theme Word:** ${book.themeWord} (Visual Anchor)\n`;
    md += `- **Key Word:** ${book.keyWord} (Theological Heartbeat)\n`;
    md += `- **Subtitle:** ${book.subtitle}\n`;
    md += `- **Chapters:** ${book.chapters} chapters\n`;
    md += `- **Filename:** \`${book.id}.png\`\n\n`;
    md += '```\n' + promptForBook(book) + '\n```\n\n';
    ntIdx++;
  }

  fs.writeFileSync(OUT_PATH, md);
  console.log(`Wrote ${OUT_PATH} with all 66 book cover prompts.`);
}

generateMarkdown();
