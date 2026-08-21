import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENBIBLE_URL = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/extras/cross_references.txt';
const TSKE_URL = 'https://raw.githubusercontent.com/helpsministries/biblewebapp/master/input/com_tske/tske.txt';
const OUT_PATH = path.join(__dirname, '../public/data/cross_references.json');
const VERSION_PATH = path.join(__dirname, '../src/data/crossRefsUrl.ts');

// How many extra, TSKe-only refs a verse may gain on top of its OpenBible list. Keeps
// the file from ~doubling in size while still filling gaps (e.g. Matthew 1:13-15, pure
// genealogy verses OpenBible's voting never surfaced anything for).
const TSKE_SUPPLEMENT_CAP = 10;

const bookMap = {
  'Gen': 'genesis', 'Exod': 'exodus', 'Lev': 'leviticus', 'Num': 'numbers', 'Deut': 'deuteronomy',
  'Josh': 'joshua', 'Judg': 'judges', 'Ruth': 'ruth', '1Sam': '1samuel', '2Sam': '2samuel',
  '1Kgs': '1kings', '2Kgs': '2kings', '1Chr': '1chronicles', '2Chr': '2chronicles',
  'Ezra': 'ezra', 'Neh': 'nehemiah', 'Esth': 'esther', 'Job': 'job', 'Ps': 'psalms', 'Prov': 'proverbs',
  'Eccl': 'ecclesiastes', 'Song': 'song of solomon', 'Isa': 'isaiah', 'Jer': 'jeremiah',
  'Lam': 'lamentations', 'Ezek': 'ezekiel', 'Dan': 'daniel', 'Hos': 'hosea', 'Joel': 'joel',
  'Amos': 'amos', 'Obad': 'obadiah', 'Jonah': 'jonah', 'Mic': 'micah', 'Nah': 'nahum',
  'Hab': 'habakkuk', 'Zeph': 'zephaniah', 'Hag': 'haggai', 'Zech': 'zechariah', 'Mal': 'malachi',
  'Matt': 'matthew', 'Mark': 'mark', 'Luke': 'luke', 'John': 'john', 'Acts': 'acts',
  'Rom': 'romans', '1Cor': '1corinthians', '2Cor': '2corinthians', 'Gal': 'galatians',
  'Eph': 'ephesians', 'Phil': 'philippians', 'Col': 'colossians', '1Thess': '1thessalonians',
  '2Thess': '2thessalonians', '1Tim': '1timothy', '2Tim': '2timothy', 'Titus': 'titus',
  'Phlm': 'philemon', 'Heb': 'hebrews', 'Jas': 'james', '1Pet': '1peter', '2Pet': '2peter',
  '1John': '1john', '2John': '2john', '3John': '3john', 'Jude': 'jude', 'Rev': 'revelation'
};

// TSKe (tske.txt) uses e-Sword-style short codes, distinct from bookMap's OSIS-ish keys
// above, so it needs its own table. Values are the same lowercase book keys bookMap
// produces, so both sources share one displayBook() below.
const TSKE_ABBR = {
  Gen: 'genesis', Exo: 'exodus', Lev: 'leviticus', Num: 'numbers', Deu: 'deuteronomy',
  Jos: 'joshua', Jdg: 'judges', Rth: 'ruth', '1Sa': '1samuel', '2Sa': '2samuel',
  '1Ki': '1kings', '2Ki': '2kings', '1Ch': '1chronicles', '2Ch': '2chronicles',
  Ezr: 'ezra', Neh: 'nehemiah', Est: 'esther', Job: 'job', Psa: 'psalms', Pro: 'proverbs',
  Ecc: 'ecclesiastes', Son: 'song of solomon', Isa: 'isaiah', Jer: 'jeremiah',
  Lam: 'lamentations', Eze: 'ezekiel', Dan: 'daniel', Hos: 'hosea', Joe: 'joel',
  Amo: 'amos', Oba: 'obadiah', Jon: 'jonah', Mic: 'micah', Nah: 'nahum',
  Hab: 'habakkuk', Zep: 'zephaniah', Hag: 'haggai', Zec: 'zechariah', Mal: 'malachi',
  Mat: 'matthew', Mar: 'mark', Luk: 'luke', Joh: 'john', Act: 'acts',
  Rom: 'romans', '1Co': '1corinthians', '2Co': '2corinthians', Gal: 'galatians',
  Eph: 'ephesians', Phi: 'philippians', Col: 'colossians', '1Th': '1thessalonians',
  '2Th': '2thessalonians', '1Ti': '1timothy', '2Ti': '2timothy', Tit: 'titus',
  Phm: 'philemon', Heb: 'hebrews', Jam: 'james', '1Pe': '1peter', '2Pe': '2peter',
  '1Jo': '1john', '2Jo': '2john', '3Jo': '3john', Jud: 'jude', Rev: 'revelation'
};

// Chapter counts for every book, keyed the same way as bookMap/TSKE_ABBR's values. Used
// only as a sanity bound on parsed citations — see the deuterocanonical note in
// fetchTskeRefs. Matches the `chapters` field in src/data/{ot,nt}Books.ts.
const CHAPTER_COUNTS = {
  genesis: 50, exodus: 40, leviticus: 27, numbers: 36, deuteronomy: 34,
  joshua: 24, judges: 21, ruth: 4, '1samuel': 31, '2samuel': 24,
  '1kings': 22, '2kings': 25, '1chronicles': 29, '2chronicles': 36,
  ezra: 10, nehemiah: 13, esther: 10, job: 42, psalms: 150, proverbs: 31,
  ecclesiastes: 12, 'song of solomon': 8, isaiah: 66, jeremiah: 52,
  lamentations: 5, ezekiel: 48, daniel: 12, hosea: 14, joel: 3,
  amos: 9, obadiah: 1, jonah: 4, micah: 7, nahum: 3,
  habakkuk: 3, zephaniah: 3, haggai: 2, zechariah: 14, malachi: 4,
  matthew: 28, mark: 16, luke: 24, john: 21, acts: 28,
  romans: 16, '1corinthians': 16, '2corinthians': 13, galatians: 6,
  ephesians: 6, philippians: 4, colossians: 4, '1thessalonians': 5,
  '2thessalonians': 3, '1timothy': 6, '2timothy': 4, titus: 3,
  philemon: 1, hebrews: 13, james: 5, '1peter': 5, '2peter': 3,
  '1john': 5, '2john': 1, '3john': 1, jude: 1, revelation: 22,
};

// Capitalizes a lowercase bookMap-style key for display, e.g. "1chronicles" -> "1 Chronicles",
// "song of solomon" -> "Song of Solomon". Shared by the OpenBible and TSKe parsers so both
// produce identical-looking target refs.
function displayBook(book) {
  let displayBook = book;
  if (book.match(/^\d/)) {
    displayBook = book.charAt(0) + ' ' + book.charAt(1).toUpperCase() + book.slice(2);
  } else {
    displayBook = book.charAt(0).toUpperCase() + book.slice(1);
  }
  if (displayBook === 'Song of solomon') displayBook = 'Song of Solomon';
  return displayBook;
}

const formatFromVerse = (str) => {
  const parts = str.split('.');
  if (parts.length !== 3) return null;
  const book = bookMap[parts[0]];
  if (!book) return null;
  return `${book} ${parts[1]}:${parts[2]}`;
};

const formatToVerse = (str) => {
  const parts = str.split('.');
  if (parts.length !== 3) return null;
  const book = bookMap[parts[0]];
  if (!book) return null;
  return `${displayBook(book)} ${parts[1]}:${parts[2]}`;
};

async function fetchOpenBibleRefs() {
  console.log('Downloading cross references from OpenBible...');
  const res = await fetch(OPENBIBLE_URL);
  if (!res.ok) throw new Error(`OpenBible download failed: ${res.status}`);
  const data = await res.text();
  console.log('Download complete. Parsing...');

  const lines = data.split('\n');
  const crossRefs = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [from, to, votesStr] = line.split('\t');
    const votes = parseInt(votesStr, 10);

    // Filter out low confidence references to keep it curated
    if (votes < 1) continue;

    const fromFormatted = formatFromVerse(from);
    const toFormatted = formatToVerse(to);

    if (!fromFormatted || !toFormatted) continue;

    if (!crossRefs[fromFormatted]) {
      crossRefs[fromFormatted] = [];
    }

    // Keep only top 15 references per verse max
    if (crossRefs[fromFormatted].length < 15) {
      crossRefs[fromFormatted].push({ ref: toFormatted, votes });
    }
  }

  // Sort and map to string arrays
  const finalData = {};
  for (const [verse, refs] of Object.entries(crossRefs)) {
    refs.sort((a, b) => b.votes - a.votes);
    finalData[verse] = refs.map(r => r.ref);
  }
  return finalData;
}

// tske.txt lines look like:
//   Gen 1:1\t<b>beginning:</b><br><u>Pro_8:22-24</u>, <u>Joh_1:1-3</u>...<b>Reciprocal:</b><br><u>Gen_2:1</u> - Thus...
// Book-intro lines (no chapter:verse) are skipped by the leading-pattern match.
const TSKE_LINE = /^([1-3]?[A-Za-z]{2,3}) (\d+):(\d+)\t(.*)$/;
const TSKE_REF = /<u>([1-3]?[A-Za-z]{2,3})_(\d+):(\d+)(?:-(\d+))?<\/u>/g;

async function fetchTskeRefs() {
  console.log('Downloading TSKe (Treasury of Scripture Knowledge, Enhanced) supplemental cross references...');
  const res = await fetch(TSKE_URL);
  if (!res.ok) throw new Error(`TSKe download failed: ${res.status}`);
  const data = await res.text();
  console.log('Download complete. Parsing...');

  // tske.txt ships with CRLF line endings.
  const lines = data.split(/\r?\n/);
  const tskeRefs = {};

  for (const line of lines) {
    const lineMatch = TSKE_LINE.exec(line);
    if (!lineMatch) continue;
    const [, fromCode, chapter, verse, body] = lineMatch;
    const fromBook = TSKE_ABBR[fromCode];
    if (!fromBook) continue;
    const fromKey = `${fromBook} ${chapter}:${verse}`;

    const seen = new Set();
    const refs = [];
    let refMatch;
    TSKE_REF.lastIndex = 0;
    while ((refMatch = TSKE_REF.exec(body))) {
      const [, toCode, toChap, toVerseStart, toVerseEnd] = refMatch;
      const toBook = TSKE_ABBR[toCode];
      if (!toBook) continue;

      // TSKe's prose occasionally cites a deuterocanonical book with a code that collides
      // with a canonical one — "Ecc_39:26", under Ezra 4:14, is Ecclesiasticus (Sirach),
      // not Ecclesiastes. Nothing in the citation distinguishes them except the chapter
      // being impossible, so bound every reference by its book's real length.
      if (Number(toChap) > CHAPTER_COUNTS[toBook]) continue;

      const start = Number(toVerseStart);
      const end = toVerseEnd ? Number(toVerseEnd) : start;

      // A passage that contains the verse being annotated only points back at itself. The
      // exact-match test this replaces missed the ranged form, which is how all 23 of the
      // self-references that reached the dataset got in (e.g. Leviticus 3:12 -> 3:7-17).
      if (toBook === fromBook && Number(toChap) === Number(chapter)
          && Number(verse) >= start && Number(verse) <= end) continue;

      const display = `${displayBook(toBook)} ${toChap}:${start}${end > start ? `-${end}` : ''}`;
      // Normalize on start verse so "Isaiah 11:1" and "Isaiah 11:1-3" collapse together.
      const normalized = `${toBook}|${toChap}|${start}`;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      refs.push(display);
    }

    if (refs.length) tskeRefs[fromKey] = refs;
  }

  return tskeRefs;
}

function mergeSupplemental(primary, supplemental) {
  const merged = { ...primary };
  let versesFilled = 0;
  let versesExtended = 0;
  let linksAdded = 0;

  for (const [verse, tskeList] of Object.entries(supplemental)) {
    const existing = merged[verse] || [];
    const seen = new Set(existing.map(r => {
      const m = r.match(/^(.*) (\d+):(\d+)/);
      return m ? `${m[1].toLowerCase()}|${m[2]}|${m[3]}` : r.toLowerCase();
    }));

    const additions = [];
    for (const ref of tskeList) {
      if (additions.length >= TSKE_SUPPLEMENT_CAP) break;
      const m = ref.match(/^(.*) (\d+):(\d+)/);
      const normalized = m ? `${m[1].toLowerCase()}|${m[2]}|${m[3]}` : ref.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      additions.push(ref);
    }

    if (additions.length) {
      merged[verse] = existing.concat(additions);
      linksAdded += additions.length;
      if (existing.length === 0) versesFilled++;
      else versesExtended++;
    }
  }

  console.log(`TSKe supplement: filled ${versesFilled} verses that had no OpenBible refs, extended ${versesExtended} more, added ${linksAdded} links total.`);
  return merged;
}

// The dataset lives in public/, so Vite copies it verbatim and can't hash its filename.
// Browsers then pin whatever copy they first saw — and because the app stores it in a
// module-level cache, one stale load keeps stale references for the whole session. Emitting
// the content hash as a query string gives the URL something to change when the data does.
function writeVersionModule(json) {
  const version = crypto.createHash('sha1').update(json).digest('hex').slice(0, 8);
  fs.writeFileSync(VERSION_PATH, `// Generated by scripts/fetch_cross_references.js — do not edit by hand.
// The query string is a content hash: it changes only when the dataset does, so browsers
// re-download the file after a regeneration and cache it normally the rest of the time.
export const CROSS_REFS_URL = '/data/cross_references.json?v=${version}';
`);
  return version;
}

async function main() {
  const [primary, supplemental] = await Promise.all([fetchOpenBibleRefs(), fetchTskeRefs()]);
  const finalData = mergeSupplemental(primary, supplemental);

  const json = JSON.stringify(finalData);
  fs.writeFileSync(OUT_PATH, json);
  console.log(`Saved merged cross references (${Object.keys(finalData).length} verses) to ${OUT_PATH}`);

  const version = writeVersionModule(json);
  console.log(`Wrote cache-busting version ${version} to ${VERSION_PATH}`);
  console.log('Attribution required by source licenses: see public/data/CROSS_REFERENCES_LICENSE.txt');
}

main().catch((err) => {
  console.error('Error building cross references:', err);
  process.exit(1);
});
