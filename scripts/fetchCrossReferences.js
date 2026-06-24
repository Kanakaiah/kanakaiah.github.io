import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/cross_references/cross_references.txt';
const OUTPUT_PATH = path.join(__dirname, '../public/data/cross_references.json');
const MAX_REFS_PER_VERSE = 6;

const ABBR_MAP = {
  'Gen': 'genesis', 'Exod': 'exodus', 'Lev': 'leviticus', 'Num': 'numbers', 'Deut': 'deuteronomy',
  'Josh': 'joshua', 'Judg': 'judges', 'Ruth': 'ruth', '1Sam': '1samuel', '2Sam': '2samuel',
  '1Kgs': '1kings', '2Kgs': '2kings', '1Chr': '1chronicles', '2Chr': '2chronicles', 'Ezra': 'ezra',
  'Neh': 'nehemiah', 'Esth': 'esther', 'Job': 'job', 'Ps': 'psalms', 'Prov': 'proverbs',
  'Eccl': 'ecclesiastes', 'Song': 'songofsolomon', 'Isa': 'isaiah', 'Jer': 'jeremiah', 'Lam': 'lamentations',
  'Ezek': 'ezekiel', 'Dan': 'daniel', 'Hos': 'hosea', 'Joel': 'joel', 'Amos': 'amos', 'Obad': 'obadiah',
  'Jonah': 'jonah', 'Mic': 'micah', 'Nah': 'nahum', 'Hab': 'habakkuk', 'Zeph': 'zephaniah',
  'Hag': 'haggai', 'Zech': 'zechariah', 'Mal': 'malachi',
  'Matt': 'matthew', 'Mark': 'mark', 'Luke': 'luke', 'John': 'john', 'Acts': 'acts',
  'Rom': 'romans', '1Cor': '1corinthians', '2Cor': '2corinthians', 'Gal': 'galatians', 'Eph': 'ephesians',
  'Phil': 'philippians', 'Col': 'colossians', '1Thess': '1thessalonians', '2Thess': '2thessalonians',
  '1Tim': '1timothy', '2Tim': '2timothy', 'Titus': 'titus', 'Phlm': 'philemon', 'Heb': 'hebrews',
  'Jas': 'james', '1Pet': '1peter', '2Pet': '2peter', '1John': '1john', '2John': '2john', '3John': '3john',
  'Jude': 'jude', 'Rev': 'revelation'
};

function parseReference(refStr) {
  const parts = refStr.split('.');
  if (parts.length !== 3) return null;
  const mappedBook = ABBR_MAP[parts[0]];
  if (!mappedBook) return null;
  return `${mappedBook} ${parts[1]}:${parts[2]}`;
}

function writeFallback() {
  console.log('Using fallback cross-references for testing...');
  const stub = {
    "genesis 1:1": ["john 1:1", "john 1:2", "john 1:3", "colossians 1:16", "hebrews 1:10", "revelation 4:11"],
    "john 1:1": ["genesis 1:1", "1john 1:1", "1john 1:2", "revelation 19:13", "proverbs 8:22", "proverbs 8:23"],
    "john 3:16": ["romans 5:8", "1john 4:9", "1john 4:10", "ephesians 2:4", "ephesians 2:5"],
    "romans 8:28": ["genesis 50:20", "jeremiah 29:11", "ephesians 1:11"]
  };
  
  const outDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(stub));
  console.log(`Saved stub cross-references to ${OUTPUT_PATH}`);
}

async function downloadAndProcess() {
  console.log('Downloading OpenBible cross-references...');
  
  const req = https.get(URL, { timeout: 10000 }, (res) => {
    if (res.statusCode !== 200) {
      console.error('Failed to download file. Status Code:', res.statusCode);
      writeFallback();
      return;
    }

    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    
    res.on('end', () => {
      console.log('Download complete. Processing data...');
      const lines = rawData.split('\n');
      const crossRefs = {};

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('From Verse')) continue;

        const parts = line.split('\t');
        if (parts.length < 3) continue;

        const fromRef = parseReference(parts[0]);
        const toRef = parseReference(parts[1]);
        const votes = parseInt(parts[2], 10) || 0;

        if (!fromRef || !toRef) continue;
        if (!crossRefs[fromRef]) crossRefs[fromRef] = [];
        crossRefs[fromRef].push({ r: toRef, v: votes });
      }

      console.log(`Parsed references for ${Object.keys(crossRefs).length} verses.`);
      const finalRefs = {};
      let totalLinks = 0;

      for (const [verse, refs] of Object.entries(crossRefs)) {
        refs.sort((a, b) => b.v - a.v);
        const topRefs = refs.slice(0, MAX_REFS_PER_VERSE).map(ref => ref.r);
        finalRefs[verse] = topRefs;
        totalLinks += topRefs.length;
      }

      console.log(`Total cross-reference links saved: ${totalLinks}`);
      const outDir = path.dirname(OUTPUT_PATH);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalRefs));
      console.log(`Saved compressed cross-references to ${OUTPUT_PATH}`);
    });
  });

  req.on('timeout', () => {
    console.error('Download timed out!');
    req.destroy();
    writeFallback();
  });

  req.on('error', (e) => {
    console.error('Download error:', e.message);
    writeFallback();
  });
}

downloadAndProcess();
