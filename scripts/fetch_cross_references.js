import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/extras/cross_references.txt';
const OUT_PATH = path.join(__dirname, '../public/data/cross_references.json');

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

const formatVerse = (str) => {
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
  // Capitalize book name properly for display
  let displayBook = book;
  if (book.match(/^\d/)) {
    displayBook = book.charAt(0) + ' ' + book.charAt(1).toUpperCase() + book.slice(2);
  } else {
    displayBook = book.charAt(0).toUpperCase() + book.slice(1);
  }
  if (displayBook === 'Song of solomon') displayBook = 'Song of Solomon';
  
  return `${displayBook} ${parts[1]}:${parts[2]}`;
};

console.log('Downloading cross references from OpenBible...');

https.get(URL, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Download complete. Parsing...');
    const lines = data.split('\n');
    const crossRefs = {};
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const [from, to, votesStr] = line.split('\t');
      const votes = parseInt(votesStr, 10);
      
      // Filter out low confidence references to keep it curated
      if (votes < 1) continue;
      
      const fromFormatted = formatVerse(from);
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
    
    fs.writeFileSync(OUT_PATH, JSON.stringify(finalData));
    console.log(`Saved cross references to ${OUT_PATH}`);
  });
}).on('error', (err) => {
  console.error('Error downloading:', err);
});
