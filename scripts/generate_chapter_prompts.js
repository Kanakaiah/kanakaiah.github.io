/**
 * Emits image-generation prompts for a book's chapter art, using the anchors already
 * written in that book's study guide.
 *
 *   node scripts/generate_chapter_prompts.js jeremiah
 *   node scripts/generate_chapter_prompts.js jeremiah --all --stdout
 *
 * By default only chapters with no image yet are listed, so re-running after generating
 * a batch picks up where you left off; --all ignores what's on disk. Output goes to
 * prompts/<book>-prompts.md unless --stdout is passed.
 *
 * This replaces the per-book copies (generate_prompts.cjs and friends), which hardcoded
 * one book each and read from stale intermediate files. The prompt wording below is
 * theirs verbatim — chapter art is only worth anything if the whole set matches.
 *
 * Guides are imported straight from src/data/otGuides/<book>.ts, which works because
 * those files import nothing but their type. src/data/guides.ts (the NT registry) pulls
 * in extensionless imports that only a bundler resolves, so NT books aren't supported
 * here; every book currently missing art is in the OT.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { OT_BOOKS } from '../src/data/otBooks.ts';
import { NT_BOOKS } from '../src/data/ntBooks.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHAPTERS_DIR = path.join(__dirname, '../public/chapters');
const GUIDES_DIR = path.join(__dirname, '../src/data/otGuides');
const OUT_DIR = path.join(__dirname, '../prompts');

// The house style. Every existing chapter image was generated from the first sentence.
// The second was added after Jeremiah's first batch came back with the scene description
// rendered as signage, captions, or carved inscriptions on 17 of 46 images (37%) — the
// generator kept treating the anchor word as something to letter into the scene. The
// redo batch, prompted with this clause added, came back 0/17. Keep it on by default.
const promptFor = (scene, word) =>
  `A dramatic, cinematic biblical illustration of ${scene}. Symbolizes '${word}'. ` +
  'Photorealistic oil painting style, 16:9 widescreen composition, warm atmospheric lighting, rich earth tones. ' +
  'No text, letters, words, captions, signage, inscriptions, watermarks or signatures anywhere in the image.';

// Scenes are stored already wrapped in quotes where they quote the text; the prompt reads
// better as a description than as a quotation.
const cleanScene = (scene) => String(scene).replace(/^"|"$/g, '').trim();

// One guide file is named differently from its book id: the book is `songofsolomon`
// everywhere in the app, but its guide lives in song-of-solomon.ts. Without this the
// lookup below misses, and the caller reports "NT books are not supported" — which is
// both wrong and confusing for a book sitting in the middle of the Old Testament.
const GUIDE_FILENAMES = { songofsolomon: 'song-of-solomon' };

async function loadGuide(bookId) {
  const file = path.join(GUIDES_DIR, `${GUIDE_FILENAMES[bookId] || bookId}.ts`);
  if (!fs.existsSync(file)) return null;

  // Export names vary (JEREMIAH_GUIDE, FIRST_SAMUEL_GUIDE, …), so match on the id rather
  // than trying to reconstruct the name.
  const mod = await import(`file://${file.replace(/\\/g, '/')}`);
  return Object.values(mod).find((v) => v && v.id === bookId && Array.isArray(v.anchors)) || null;
}

function existingChapters(bookId) {
  const dir = path.join(CHAPTERS_DIR, bookId);
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs.readdirSync(dir)
      .map((f) => (f.match(/^ch(\d+)\.png$/) || [])[1])
      .filter(Boolean)
      .map(Number)
  );
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const toStdout = args.includes('--stdout');
  const bookId = args.find((a) => !a.startsWith('--'));

  if (!bookId) {
    console.error('Usage: node scripts/generate_chapter_prompts.js <book-id> [--all] [--stdout]');
    console.error('Example: node scripts/generate_chapter_prompts.js jeremiah');
    process.exit(2);
  }

  const book = [...OT_BOOKS, ...NT_BOOKS].find((b) => b.id === bookId);
  if (!book) {
    console.error(`Unknown book id "${bookId}". Ids look like: genesis, 1samuel, songofsolomon.`);
    process.exit(2);
  }

  const guide = await loadGuide(bookId);
  if (!guide) {
    console.error(`No study guide with anchors found at src/data/otGuides/${bookId}.ts.`);
    console.error('NT books are not supported here — see the note at the top of this file.');
    process.exit(2);
  }

  const byChapter = new Map(guide.anchors.map((a) => [Number(a.ch), a]));
  const have = existingChapters(bookId);

  const wanted = [];
  const missingAnchors = [];
  for (let ch = 1; ch <= book.chapters; ch++) {
    if (!all && have.has(ch)) continue;
    const anchor = byChapter.get(ch);
    if (!anchor) { missingAnchors.push(ch); continue; }
    wanted.push(anchor);
  }

  if (missingAnchors.length) {
    console.error(`No anchor for ${book.name} ${missingAnchors.join(', ')} — those chapters need a word/scene in the guide first.`);
  }

  if (!wanted.length) {
    console.log(`${book.name}: nothing to do — ${have.size}/${book.chapters} chapters already have art.`);
    return;
  }

  const range = all ? 'all chapters' : `chapters missing art (${have.size}/${book.chapters} already done)`;
  let md = `# Image prompts for ${book.name} — ${range}\n\n`;
  md += `Paste each prompt into your image generator. Save the result under the filename given `;
  md += `and place it in \`public/chapters/${bookId}/\`.\n\n`;
  md += `The wording is identical across every book so the set stays visually consistent — `;
  md += `change it only if you intend to restyle all ${book.chapters} chapters.\n\n`;

  for (const anchor of wanted) {
    md += `### Chapter ${anchor.ch} — ${anchor.word}\n`;
    md += `**Filename:** \`ch${anchor.ch}.png\`\n\n`;
    md += '```\n' + promptFor(cleanScene(anchor.scene), anchor.word) + '\n```\n\n';
  }

  if (toStdout) {
    process.stdout.write(md);
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${bookId}-prompts.md`);
  fs.writeFileSync(outPath, md);

  console.log(`${book.name}: ${wanted.length} prompt(s) written to prompts/${bookId}-prompts.md`);
  console.log(`Chapters: ${wanted.map((a) => a.ch).join(', ')}`);
  console.log(`Save images as ch<N>.png in public/chapters/${bookId}/`);
}

main().catch((err) => {
  console.error('Failed to generate prompts:', err.message);
  process.exit(1);
});
