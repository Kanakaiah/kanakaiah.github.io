/**
 * Sanity-checks public/data/cross_references.json for references the app can't render.
 *
 *   node scripts/audit_cross_references.js [--verbose]
 *
 * Exits non-zero if anything is wrong, so it can gate a regeneration. What it looks for:
 *
 *   - keys the reader can't resolve back to a book
 *   - references that don't parse as "Book chapter:verse"
 *   - book names CrossReferenceModal wouldn't resolve (these render "Book not found")
 *   - chapters past the end of their book — how a deuterocanonical citation mis-mapped
 *     onto a canonical book gives itself away (see fetch_cross_references.js)
 *   - inverted ranges, duplicates within one verse, and passages that contain the very
 *     verse they're attached to
 *
 * Book names, ids and chapter counts come from src/data/{ot,nt}Books.ts, the same
 * metadata the modal resolves against, so this stays honest if that list changes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_PATH = path.join(__dirname, '../public/data/cross_references.json');
const BOOK_SOURCES = ['../src/data/otBooks.ts', '../src/data/ntBooks.ts'];
const EXPECTED_BOOKS = 66;

// Mirrors normalizeCrossRefKey in src/data/bibleMap.ts: numbered books lose the space
// after the numeral, everything else keeps its plain lowercase name.
const REF_PATTERN = /^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/;

function loadBooks() {
  const books = [];
  for (const relative of BOOK_SOURCES) {
    const src = fs.readFileSync(path.join(__dirname, relative), 'utf8');
    const entry = /id:\s*'([^']+)',\s*\n?\s*name:\s*'([^']+)'[\s\S]*?chapters:\s*(\d+)/g;
    let match;
    while ((match = entry.exec(src))) {
      books.push({ id: match[1], name: match[2], chapters: Number(match[3]) });
    }
  }

  // Without this the audit would "pass" by finding nothing to check, which is the one
  // failure mode a sanity check must not have.
  if (books.length !== EXPECTED_BOOKS) {
    console.error(`Parsed ${books.length} books from src/data/{ot,nt}Books.ts, expected ${EXPECTED_BOOKS}.`);
    console.error('The audit resolves references against that metadata; fix the parser before trusting a clean run.');
    process.exit(2);
  }
  return books;
}

function parseRef(ref) {
  const match = String(ref).match(REF_PATTERN);
  if (!match) return null;
  const start = Number(match[3]);
  return {
    book: match[1],
    chapter: Number(match[2]),
    start,
    end: match[4] ? Number(match[4]) : start,
  };
}

function main() {
  const verbose = process.argv.includes('--verbose');
  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));

  const books = loadBooks();
  const byName = new Map();
  for (const book of books) {
    byName.set(book.name.toLowerCase(), book);
    byName.set(book.id.toLowerCase(), book);
  }

  const problems = {
    'keys that resolve to no book': [],
    'references that do not parse': [],
    'book names the reader cannot resolve': [],
    'chapters past the end of their book': [],
    'inverted ranges': [],
    'duplicate references within one verse': [],
    'passages containing their own verse': [],
  };

  let totalLinks = 0;

  for (const [key, refs] of Object.entries(dataset)) {
    const from = parseRef(key);
    const fromBook = from && byName.get(from.book.toLowerCase());
    if (!fromBook) problems['keys that resolve to no book'].push(key);

    const seen = new Set();
    for (const ref of refs) {
      totalLinks++;

      const to = parseRef(ref);
      if (!to) {
        problems['references that do not parse'].push(`${key} -> ${ref}`);
        continue;
      }

      const toBook = byName.get(to.book.toLowerCase());
      if (!toBook) {
        problems['book names the reader cannot resolve'].push(`${key} -> ${ref}`);
        continue;
      }

      if (to.chapter < 1 || to.chapter > toBook.chapters) {
        problems['chapters past the end of their book'].push(`${key} -> ${ref} (${toBook.name} has ${toBook.chapters})`);
      }
      if (to.end < to.start) {
        problems['inverted ranges'].push(`${key} -> ${ref}`);
      }

      const signature = `${toBook.id}|${to.chapter}|${to.start}|${to.end}`;
      if (seen.has(signature)) problems['duplicate references within one verse'].push(`${key} -> ${ref}`);
      seen.add(signature);

      if (fromBook && fromBook.id === toBook.id && from.chapter === to.chapter
          && from.start >= to.start && from.start <= to.end) {
        problems['passages containing their own verse'].push(`${key} -> ${ref}`);
      }
    }
  }

  console.log(`${Object.keys(dataset).length.toLocaleString()} verses, ${totalLinks.toLocaleString()} links\n`);

  let failed = 0;
  for (const [label, found] of Object.entries(problems)) {
    failed += found.length;
    console.log(`${found.length ? 'FAIL' : '  ok'}  ${label}: ${found.length}`);
    for (const item of found.slice(0, verbose ? Infinity : 5)) console.log(`        ${item}`);
    if (!verbose && found.length > 5) console.log(`        … ${found.length - 5} more (--verbose to list)`);
  }

  if (failed) {
    console.log(`\n${failed} problem(s) found.`);
    process.exit(1);
  }
  console.log('\nNo problems found.');
}

main();
