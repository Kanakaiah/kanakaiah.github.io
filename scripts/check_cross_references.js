/**
 * Reports how much of a reference apparatus public/data/cross_references.json already
 * covers, so a change to the merge can be judged against a known-good sample rather than
 * by eye.
 *
 *   node scripts/check_cross_references.js <expected-refs.json> [--verbose]
 *
 * The expected file names a chapter, then the references each verse should carry:
 *
 *   {
 *     "matthew 2": {
 *       "1": ["Mic 5:2", "Luke 2:4-7", "Luke 1:5"],
 *       "5": ["John 7:42"]
 *     }
 *   }
 *
 * Verses with no references may be listed as [] or left out entirely. Abbreviations,
 * ranges ("Luke 2:4-7") and the "and following" suffix ("Ps 89:3f") are all understood.
 * A cited passage counts as covered when the dataset holds any verse inside it, since an
 * apparatus cites ranges where the dataset stores individual verses.
 *
 * Published apparatuses are usually copyrighted. samples/ is gitignored for exactly that
 * reason and is the conventional place to keep these locally:
 *
 *   node scripts/check_cross_references.js samples/lsb-matthew-1-2.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_PATH = path.join(__dirname, '../public/data/cross_references.json');

// Canonical book ids, with the abbreviations an apparatus is likely to use. Keys are
// compared with punctuation and spaces stripped, so "1 Sam", "1Sam" and "1sam" all land
// on the same entry.
const BOOK_ALIASES = {
  genesis: ['gen', 'ge', 'gn'],
  exodus: ['ex', 'exo', 'exod'],
  leviticus: ['lev', 'lv'],
  numbers: ['num', 'nu', 'nm'],
  deuteronomy: ['deut', 'dt', 'deu'],
  joshua: ['josh', 'jos'],
  judges: ['judg', 'jdg', 'jg'],
  ruth: ['rth', 'ru'],
  '1samuel': ['1sam', '1sa', '1sm'],
  '2samuel': ['2sam', '2sa', '2sm'],
  '1kings': ['1kin', '1kgs', '1ki'],
  '2kings': ['2kin', '2kgs', '2ki'],
  '1chronicles': ['1chr', '1ch'],
  '2chronicles': ['2chr', '2ch'],
  ezra: ['ezr'],
  nehemiah: ['neh', 'ne'],
  esther: ['esth', 'est'],
  job: ['jb'],
  psalms: ['ps', 'psa', 'psalm', 'pss'],
  proverbs: ['prov', 'pro', 'prv'],
  ecclesiastes: ['eccl', 'ecc', 'eccles'],
  'song of solomon': ['song', 'son', 'sos', 'songofsongs', 'canticles'],
  isaiah: ['is', 'isa'],
  jeremiah: ['jer', 'je'],
  lamentations: ['lam', 'la'],
  ezekiel: ['ezek', 'eze', 'ezk'],
  daniel: ['dan', 'dn'],
  hosea: ['hos', 'ho'],
  joel: ['joe', 'jl'],
  amos: ['am'],
  obadiah: ['obad', 'oba', 'ob'],
  jonah: ['jon', 'jnh'],
  micah: ['mic', 'mi'],
  nahum: ['nah', 'na'],
  habakkuk: ['hab', 'hb'],
  zephaniah: ['zeph', 'zep'],
  haggai: ['hag', 'hg'],
  zechariah: ['zech', 'zec'],
  malachi: ['mal', 'ml'],
  matthew: ['matt', 'mat', 'mt'],
  mark: ['mar', 'mk', 'mrk'],
  luke: ['luk', 'lk'],
  john: ['joh', 'jn', 'jhn'],
  acts: ['act', 'ac'],
  romans: ['rom', 'ro', 'rm'],
  '1corinthians': ['1cor', '1co'],
  '2corinthians': ['2cor', '2co'],
  galatians: ['gal', 'ga'],
  ephesians: ['eph', 'ep'],
  philippians: ['phil', 'phi', 'php'],
  colossians: ['col', 'co'],
  '1thessalonians': ['1thess', '1th', '1thes'],
  '2thessalonians': ['2thess', '2th', '2thes'],
  '1timothy': ['1tim', '1ti'],
  '2timothy': ['2tim', '2ti'],
  titus: ['tit', 'ti'],
  philemon: ['philem', 'phm', 'phlm'],
  hebrews: ['heb', 'hb'],
  james: ['jas', 'jam', 'jm'],
  '1peter': ['1pet', '1pe', '1pt'],
  '2peter': ['2pet', '2pe', '2pt'],
  '1john': ['1jo', '1jn', '1joh'],
  '2john': ['2jo', '2jn', '2joh'],
  '3john': ['3jo', '3jn', '3joh'],
  jude: ['jud', 'jde'],
  revelation: ['rev', 're', 'rv', 'revelations'],
};

const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const BOOK_BY_ALIAS = new Map();
for (const [id, aliases] of Object.entries(BOOK_ALIASES)) {
  BOOK_BY_ALIAS.set(squash(id), id);
  for (const alias of aliases) BOOK_BY_ALIAS.set(squash(alias), id);
}

/**
 * "Luke 2:4-7" / "Ps 89:3f" / "1 Chronicles 16:26" -> { bookId, chapter, start, end }.
 * Returns null for anything whose book can't be resolved. "f"/"ff" is treated as the
 * opening verse alone rather than guessing how far "and following" reaches, so it can
 * only ever undercount.
 */
function parseRef(ref) {
  const match = String(ref).trim().match(/^(.+?)\s+(\d+):(\d+)(?:\s*-\s*(\d+))?/);
  if (!match) return null;

  const bookId = BOOK_BY_ALIAS.get(squash(match[1]));
  if (!bookId) return null;

  const start = Number(match[3]);
  const end = match[4] ? Number(match[4]) : start;
  return { bookId, chapter: match[2], start, end: Math.max(start, end) };
}

/**
 * Whether two references point at any of the same text. An apparatus cites passages
 * ("2 Sam 7:12-16") where the dataset stores individual verses ("2 Samuel 7:13"), so
 * comparing opening verses alone would call that a miss when it plainly isn't.
 */
function overlaps(a, b) {
  return a.bookId === b.bookId && a.chapter === b.chapter && a.start <= b.end && b.start <= a.end;
}

const formatRef = (r) => `${r.bookId} ${r.chapter}:${r.start}${r.end > r.start ? `-${r.end}` : ''}`;

function datasetKey(bookId, chapter, verse) {
  return `${bookId} ${chapter}:${verse}`;
}

function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const expectedPath = args.find((a) => !a.startsWith('--'));

  if (!expectedPath) {
    console.error('Usage: node scripts/check_cross_references.js <expected-refs.json> [--verbose]');
    process.exit(2);
  }

  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
  const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));

  let grandExpected = 0;
  let grandMatched = 0;

  for (const [chapterRef, verses] of Object.entries(expected)) {
    const bookId = BOOK_BY_ALIAS.get(squash(chapterRef.replace(/\s*\d+$/, '')));
    const chapter = (chapterRef.match(/(\d+)\s*$/) || [])[1];

    if (!bookId || !chapter) {
      console.error(`Skipping "${chapterRef}": expected a chapter like "matthew 2".`);
      continue;
    }

    console.log(`\n${chapterRef}`);
    console.log('  verse  expected  in dataset  matched');

    let chapterExpected = 0;
    let chapterMatched = 0;

    const verseNumbers = Object.keys(verses).sort((a, b) => Number(a) - Number(b));
    for (const verse of verseNumbers) {
      const wanted = verses[verse].map(parseRef).filter(Boolean);
      const unresolved = verses[verse].length - wanted.length;
      if (unresolved) {
        console.error(`  ! ${chapterRef}:${verse} — ${unresolved} reference(s) had an unrecognized book`);
      }

      const actual = dataset[datasetKey(bookId, chapter, verse)] || [];
      const actualRefs = actual.map(parseRef).filter(Boolean);

      const hits = wanted.filter((w) => actualRefs.some((a) => overlaps(w, a)));
      chapterExpected += wanted.length;
      chapterMatched += hits.length;

      console.log(
        `  ${String(verse).padStart(5)}  ${String(wanted.length).padStart(8)}  ` +
        `${String(actual.length).padStart(10)}  ${String(hits.length).padStart(7)}`
      );

      if (verbose) {
        const missed = wanted.filter((w) => !actualRefs.some((a) => overlaps(w, a)));
        for (const m of missed) console.log(`         missing: ${formatRef(m)}`);
      }
    }

    const pct = chapterExpected ? ((100 * chapterMatched) / chapterExpected).toFixed(1) : '—';
    console.log(`  ${chapterMatched}/${chapterExpected} matched (${pct}%)`);

    grandExpected += chapterExpected;
    grandMatched += chapterMatched;
  }

  if (grandExpected) {
    const pct = ((100 * grandMatched) / grandExpected).toFixed(1);
    console.log(`\nTotal: ${grandMatched}/${grandExpected} matched (${pct}%)`);
  } else {
    console.log('\nNothing to compare.');
  }
}

main();
