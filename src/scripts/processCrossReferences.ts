// @ts-nocheck
import fs from 'fs';
import path from 'path';

// OpenBible book abbreviations mapped to BOLLS_BIBLE_MAP IDs (1-66)
const BOOK_MAP: Record<string, number> = {
  'Gen': 1, 'Exod': 2, 'Lev': 3, 'Num': 4, 'Deut': 5,
  'Josh': 6, 'Judg': 7, 'Ruth': 8, '1Sam': 9, '2Sam': 10,
  '1Kgs': 11, '2Kgs': 12, '1Chr': 13, '2Chr': 14,
  'Ezra': 15, 'Neh': 16, 'Esth': 17, 'Job': 18, 'Ps': 19, 'Prov': 20,
  'Eccl': 21, 'Song': 22, 'Isa': 23, 'Jer': 24, 'Lam': 25,
  'Ezek': 26, 'Dan': 27, 'Hos': 28, 'Joel': 29, 'Amos': 30, 'Obad': 31,
  'Jonah': 32, 'Mic': 33, 'Nah': 34, 'Hab': 35, 'Zeph': 36,
  'Hag': 37, 'Zech': 38, 'Mal': 39,

  'Matt': 40, 'Mark': 41, 'Luke': 42, 'John': 43, 'Acts': 44,
  'Rom': 45, '1Cor': 46, '2Cor': 47, 'Gal': 48,
  'Eph': 49, 'Phil': 50, 'Col': 51, '1Thess': 52,
  '2Thess': 53, '1Tim': 54, '2Tim': 55, 'Titus': 56,
  'Phlm': 57, 'Heb': 58, 'Jas': 59, '1Pet': 60, '2Pet': 61,
  '1John': 62, '2John': 63, '3John': 64, 'Jude': 65, 'Rev': 66
};

// Returns { book, chapter, verse } from string like "Gen.1.1" or "Gen.1.1-Gen.1.2"
function parseRef(refStr: string) {
  const parts = refStr.split('-')[0].split('.');
  if (parts.length < 3) return null;
  const bookName = parts[0];
  const bookId = BOOK_MAP[bookName];
  if (!bookId) return null;
  return {
    bookId,
    chapter: parseInt(parts[1], 10),
    verse: parseInt(parts[2], 10)
  };
}

async function run() {
  console.log("Fetching cross references...");
  const res = await fetch('https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/extras/cross_references.txt');
  const text = await res.text();

  // otQuotes[bookId][chapter] = Set of verses
  const otQuotes: Record<number, Record<number, number[]>> = {};

  const lines = text.split('\n');
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('From Verse')) continue;
    const cols = line.split('\t');
    if (cols.length < 2) continue;

    const ref1 = parseRef(cols[0]);
    const ref2 = parseRef(cols[1]);

    if (!ref1 || !ref2) continue;

    let ntRef = null;
    let otRef = null;

    if (ref1.bookId >= 40 && ref2.bookId <= 39) {
      ntRef = ref1;
      otRef = ref2;
    } else if (ref2.bookId >= 40 && ref1.bookId <= 39) {
      ntRef = ref2;
      otRef = ref1;
    }

    if (ntRef && otRef) {
      if (!otQuotes[ntRef.bookId]) otQuotes[ntRef.bookId] = {};
      if (!otQuotes[ntRef.bookId][ntRef.chapter]) otQuotes[ntRef.bookId][ntRef.chapter] = [];
      if (!otQuotes[ntRef.bookId][ntRef.chapter].includes(ntRef.verse)) {
        otQuotes[ntRef.bookId][ntRef.chapter].push(ntRef.verse);
      }
    }
  }

  // Sort verses for neatness
  for (const bookId in otQuotes) {
    for (const chapter in otQuotes[bookId]) {
      otQuotes[bookId][chapter].sort((a, b) => a - b);
    }
  }

  const outPath = path.join(process.cwd(), 'src', 'data', 'otQuotes.json');
  fs.writeFileSync(outPath, JSON.stringify(otQuotes, null, 2));
  console.log(`Saved mapping to ${outPath}`);
}

run().catch(console.error);
