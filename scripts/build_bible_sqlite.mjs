import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { OT_BOOKS } from '../src/data/otBooks.ts';
import { NT_BOOKS } from '../src/data/ntBooks.ts';
import { SEED_VERSES } from '../src/data/seed.ts';
import { TOP_100_VERSES } from '../src/data/top100.ts';

const ROOT_DIR = process.cwd();
const ASSETS_DIR = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'assets');
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const DB_PATH = path.join(ASSETS_DIR, 'bible.db');
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

console.log('Creating SQLite database at:', DB_PATH);
const db = new DatabaseSync(DB_PATH);

// Pragmas for ultra-fast creation
db.exec('PRAGMA synchronous = OFF;');
db.exec('PRAGMA journal_mode = MEMORY;');

// 1. Create Tables
db.exec(`
CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  book_key TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_te TEXT NOT NULL,
  name_ta TEXT,
  testament TEXT NOT NULL,
  section TEXT NOT NULL,
  chapters INTEGER NOT NULL,
  theme_word TEXT,
  key_word TEXT,
  subtitle TEXT
);

CREATE TABLE verses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text_te TEXT,
  text_en TEXT,
  text_ta TEXT,
  FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE INDEX idx_verses_lookup ON verses(book_id, chapter, verse);

CREATE TABLE strongs (
  id TEXT PRIMARY KEY,
  lang TEXT NOT NULL,
  lemma TEXT,
  xlit TEXT,
  pron TEXT,
  derivation TEXT,
  strongs_def TEXT,
  kjv_def TEXT,
  pos TEXT
);

CREATE TABLE paragraph_breaks (
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  PRIMARY KEY (book_id, chapter, verse)
);

CREATE TABLE user_verses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'learning',
  repetition INTEGER NOT NULL DEFAULT 0,
  interval INTEGER NOT NULL DEFAULT 0,
  efactor REAL NOT NULL DEFAULT 2.5,
  next_due_date INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(book_id, chapter, verse),
  FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE TABLE user_stats (
  key TEXT PRIMARY KEY,
  val TEXT
);

CREATE TABLE preset_collections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  count INTEGER NOT NULL
);

CREATE TABLE preset_verses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  FOREIGN KEY (collection_id) REFERENCES preset_collections(id),
  FOREIGN KEY (book_id) REFERENCES books(id)
);
`);

console.log('Tables created successfully.');

// Book list in order
const BOOK_LIST = [
  // OT (1-39)
  { id: 1, key: 'genesis', name_en: 'Genesis', name_te: 'ఆదికాండము', name_ta: 'ஆதியாகமம்', testament: 'OT', section: 'Pentateuch', chapters: 50 },
  { id: 2, key: 'exodus', name_en: 'Exodus', name_te: 'నిర్గమకాండము', name_ta: 'யாத்திராகமம்', testament: 'OT', section: 'Pentateuch', chapters: 40 },
  { id: 3, key: 'leviticus', name_en: 'Leviticus', name_te: 'లేవీయకాండము', name_ta: 'லேவியராகமம்', testament: 'OT', section: 'Pentateuch', chapters: 27 },
  { id: 4, key: 'numbers', name_en: 'Numbers', name_te: 'సంఖ్యాకాండము', name_ta: 'எண்ணாகமம்', testament: 'OT', section: 'Pentateuch', chapters: 36 },
  { id: 5, key: 'deuteronomy', name_en: 'Deuteronomy', name_te: 'ద్వితీయోపదేశకాండము', name_ta: 'உபாகமம்', testament: 'OT', section: 'Pentateuch', chapters: 34 },
  { id: 6, key: 'joshua', name_en: 'Joshua', name_te: 'యెహోషువ', name_ta: 'யோசுவா', testament: 'OT', section: 'Historical', chapters: 24 },
  { id: 7, key: 'judges', name_en: 'Judges', name_te: 'న్యాయాధిపతులు', name_ta: 'நியாயாதிபதிகள்', testament: 'OT', section: 'Historical', chapters: 21 },
  { id: 8, key: 'ruth', name_en: 'Ruth', name_te: 'రూతు', name_ta: 'ரூத்', testament: 'OT', section: 'Historical', chapters: 4 },
  { id: 9, key: '1samuel', name_en: '1 Samuel', name_te: '1 సమూయేలు', name_ta: '1 சாமுவேல்', testament: 'OT', section: 'Historical', chapters: 31 },
  { id: 10, key: '2samuel', name_en: '2 Samuel', name_te: '2 సమూయేలు', name_ta: '2 சாமுவேல்', testament: 'OT', section: 'Historical', chapters: 24 },
  { id: 11, key: '1kings', name_en: '1 Kings', name_te: '1 రాజులు', name_ta: '1 இராஜாக்கள்', testament: 'OT', section: 'Historical', chapters: 22 },
  { id: 12, key: '2kings', name_en: '2 Kings', name_te: '2 రాజులు', name_ta: '2 இராஜாக்கள்', testament: 'OT', section: 'Historical', chapters: 25 },
  { id: 13, key: '1chronicles', name_en: '1 Chronicles', name_te: '1 దినవృత్తాంతములు', name_ta: '1 நாளாகமம்', testament: 'OT', section: 'Historical', chapters: 29 },
  { id: 14, key: '2chronicles', name_en: '2 Chronicles', name_te: '2 దినవృత్తాంతములు', name_ta: '2 நாளாகமம்', testament: 'OT', section: 'Historical', chapters: 36 },
  { id: 15, key: 'ezra', name_en: 'Ezra', name_te: 'ఎజ్రా', name_ta: 'எஸ்றா', testament: 'OT', section: 'Historical', chapters: 10 },
  { id: 16, key: 'nehemiah', name_en: 'Nehemiah', name_te: 'నెహెమ్యా', name_ta: 'நெகேமியா', testament: 'OT', section: 'Historical', chapters: 13 },
  { id: 17, key: 'esther', name_en: 'Esther', name_te: 'ఎస్తేరు', name_ta: 'எஸ்தர்', testament: 'OT', section: 'Historical', chapters: 10 },
  { id: 18, key: 'job', name_en: 'Job', name_te: 'యోబు', name_ta: 'யோபு', testament: 'OT', section: 'Poetry', chapters: 42 },
  { id: 19, key: 'psalms', name_en: 'Psalms', name_te: 'కీర్తనలు', name_ta: 'சங்கீதம்', testament: 'OT', section: 'Poetry', chapters: 150 },
  { id: 20, key: 'proverbs', name_en: 'Proverbs', name_te: 'సామెతలు', name_ta: 'நீதிமொழிகள்', testament: 'OT', section: 'Poetry', chapters: 31 },
  { id: 21, key: 'ecclesiastes', name_en: 'Ecclesiastes', name_te: 'ప్రసంగి', name_ta: 'பிரசங்கி', testament: 'OT', section: 'Poetry', chapters: 12 },
  { id: 22, key: 'songofsolomon', name_en: 'Song of Solomon', name_te: 'పరమగీతము', name_ta: 'உன்னதப்பாட்டு', testament: 'OT', section: 'Poetry', chapters: 8 },
  { id: 23, key: 'isaiah', name_en: 'Isaiah', name_te: 'యెషయా', name_ta: 'ஏசாயா', testament: 'OT', section: 'Major Prophets', chapters: 66 },
  { id: 24, key: 'jeremiah', name_en: 'Jeremiah', name_te: 'యిర్మీయా', name_ta: 'எரேமியா', testament: 'OT', section: 'Major Prophets', chapters: 52 },
  { id: 25, key: 'lamentations', name_en: 'Lamentations', name_te: 'విలాపవాక్యములు', name_ta: 'புலம்பல்', testament: 'OT', section: 'Major Prophets', chapters: 5 },
  { id: 26, key: 'ezekiel', name_en: 'Ezekiel', name_te: 'యెహెజ్కేలు', name_ta: 'எசேக்கியேல்', testament: 'OT', section: 'Major Prophets', chapters: 48 },
  { id: 27, key: 'daniel', name_en: 'Daniel', name_te: 'దానియేలు', name_ta: 'தானியேல்', testament: 'OT', section: 'Major Prophets', chapters: 12 },
  { id: 28, key: 'hosea', name_en: 'Hosea', name_te: 'హోషేయ', name_ta: 'ஓசியா', testament: 'OT', section: 'Minor Prophets', chapters: 14 },
  { id: 29, key: 'joel', name_en: 'Joel', name_te: 'యోవేలు', name_ta: 'யோவேல்', testament: 'OT', section: 'Minor Prophets', chapters: 3 },
  { id: 30, key: 'amos', name_en: 'Amos', name_te: 'ఆమోసు', name_ta: 'ஆமோஸ்', testament: 'OT', section: 'Minor Prophets', chapters: 9 },
  { id: 31, key: 'obadiah', name_en: 'Obadiah', name_te: 'ఓబద్యా', name_ta: 'ஒபதியா', testament: 'OT', section: 'Minor Prophets', chapters: 1 },
  { id: 32, key: 'jonah', name_en: 'Jonah', name_te: 'యోనా', name_ta: 'யோனா', testament: 'OT', section: 'Minor Prophets', chapters: 4 },
  { id: 33, key: 'micah', name_en: 'Micah', name_te: 'మీకా', name_ta: 'மீகா', testament: 'OT', section: 'Minor Prophets', chapters: 7 },
  { id: 34, key: 'nahum', name_en: 'Nahum', name_te: 'నహూము', name_ta: 'நாகூம்', testament: 'OT', section: 'Minor Prophets', chapters: 3 },
  { id: 35, key: 'habakkuk', name_en: 'Habakkuk', name_te: 'హబక్కూకు', name_ta: 'ஆபகூக்', testament: 'OT', section: 'Minor Prophets', chapters: 3 },
  { id: 36, key: 'zephaniah', name_en: 'Zephaniah', name_te: 'జెఫన్యా', name_ta: 'செப்பனியா', testament: 'OT', section: 'Minor Prophets', chapters: 3 },
  { id: 37, key: 'haggai', name_en: 'Haggai', name_te: 'హగ్గయి', name_ta: 'ஆகாய்', testament: 'OT', section: 'Minor Prophets', chapters: 2 },
  { id: 38, key: 'zechariah', name_en: 'Zechariah', name_te: 'జెకర్యా', name_ta: 'சகரியா', testament: 'OT', section: 'Minor Prophets', chapters: 14 },
  { id: 39, key: 'malachi', name_en: 'Malachi', name_te: 'మలాకీ', name_ta: 'மல்கியா', testament: 'OT', section: 'Minor Prophets', chapters: 4 },
  // NT (40-66)
  { id: 40, key: 'matthew', name_en: 'Matthew', name_te: 'మత్తయి సువార్త', name_ta: 'மத்தேயு', testament: 'NT', section: 'Gospels', chapters: 28 },
  { id: 41, key: 'mark', name_en: 'Mark', name_te: 'మార్కు సువార్త', name_ta: 'மாற்கு', testament: 'NT', section: 'Gospels', chapters: 16 },
  { id: 42, key: 'luke', name_en: 'Luke', name_te: 'లూకా సువార్త', name_ta: 'லூக்கா', testament: 'NT', section: 'Gospels', chapters: 24 },
  { id: 43, key: 'john', name_en: 'John', name_te: 'యోహాను సువార్త', name_ta: 'யோவான்', testament: 'NT', section: 'Gospels', chapters: 21 },
  { id: 44, key: 'acts', name_en: 'Acts', name_te: 'అపొస్తలుల కార్యములు', name_ta: 'அப்போஸ்தலர்', testament: 'NT', section: 'History', chapters: 28 },
  { id: 45, key: 'romans', name_en: 'Romans', name_te: 'రోమీయులకు', name_ta: 'ரோமர்', testament: 'NT', section: 'Pauline Epistles', chapters: 16 },
  { id: 46, key: '1corinthians', name_en: '1 Corinthians', name_te: '1 కొరింథీయులకు', name_ta: '1 கொரிந்தியர்', testament: 'NT', section: 'Pauline Epistles', chapters: 16 },
  { id: 47, key: '2corinthians', name_en: '2 Corinthians', name_te: '2 కొరింథీయులకు', name_ta: '2 கொரிந்தியர்', testament: 'NT', section: 'Pauline Epistles', chapters: 13 },
  { id: 48, key: 'galatians', name_en: 'Galatians', name_te: 'గలతీయులకు', name_ta: 'கலாத்தியர்', testament: 'NT', section: 'Pauline Epistles', chapters: 6 },
  { id: 49, key: 'ephesians', name_en: 'Ephesians', name_te: 'ఎఫెసీయులకు', name_ta: 'எபேசியர்', testament: 'NT', section: 'Pauline Epistles', chapters: 6 },
  { id: 50, key: 'philippians', name_en: 'Philippians', name_te: 'ఫిలిప్పీయులకు', name_ta: 'பிலிப்பியர்', testament: 'NT', section: 'Pauline Epistles', chapters: 4 },
  { id: 51, key: 'colossians', name_en: 'Colossians', name_te: 'కొలొస్సయులకు', name_ta: 'கொலோசெயர்', testament: 'NT', section: 'Pauline Epistles', chapters: 4 },
  { id: 52, key: '1thessalonians', name_en: '1 Thessalonians', name_te: '1 థెస్సలొనీకయులకు', name_ta: '1 தெசலோனிக்கேயர்', testament: 'NT', section: 'Pauline Epistles', chapters: 5 },
  { id: 53, key: '2thessalonians', name_en: '2 Thessalonians', name_te: '2 థెస్సలొనీకయులకు', name_ta: '2 தெசலோனிக்கேயர்', testament: 'NT', section: 'Pauline Epistles', chapters: 3 },
  { id: 54, key: '1timothy', name_en: '1 Timothy', name_te: '1 తిమోతికి', name_ta: '1 தீமோத்தேயு', testament: 'NT', section: 'Pauline Epistles', chapters: 6 },
  { id: 55, key: '2timothy', name_en: '2 Timothy', name_te: '2 తిమోతికి', name_ta: '2 தீமோத்தேயு', testament: 'NT', section: 'Pauline Epistles', chapters: 4 },
  { id: 56, key: 'titus', name_en: 'Titus', name_te: 'తీతుకు', name_ta: 'தீத்து', testament: 'NT', section: 'Pauline Epistles', chapters: 3 },
  { id: 57, key: 'philemon', name_en: 'Philemon', name_te: 'ఫిలేమోనుకు', name_ta: 'பிலேமோன்', testament: 'NT', section: 'Pauline Epistles', chapters: 1 },
  { id: 58, key: 'hebrews', name_en: 'Hebrews', name_te: 'హెబ్రీయులకు', name_ta: 'எபிரெயர்', testament: 'NT', section: 'General Epistles', chapters: 13 },
  { id: 59, key: 'james', name_en: 'James', name_te: 'యాకోబు', name_ta: 'யாக்கோபு', testament: 'NT', section: 'General Epistles', chapters: 5 },
  { id: 60, key: '1peter', name_en: '1 Peter', name_te: '1 పేతురు', name_ta: '1 பேதுரு', testament: 'NT', section: 'General Epistles', chapters: 5 },
  { id: 61, key: '2peter', name_en: '2 Peter', name_te: '2 పేతురు', name_ta: '2 பேதுரு', testament: 'NT', section: 'General Epistles', chapters: 3 },
  { id: 62, key: '1john', name_en: '1 John', name_te: '1 యోహాను', name_ta: '1 யோவான்', testament: 'NT', section: 'General Epistles', chapters: 5 },
  { id: 63, key: '2john', name_en: '2 John', name_te: '2 యోహాను', name_ta: '2 யோவான்', testament: 'NT', section: 'General Epistles', chapters: 1 },
  { id: 64, key: '3john', name_en: '3 John', name_te: '3 యోహాను', name_ta: '3 யோவான்', testament: 'NT', section: 'General Epistles', chapters: 1 },
  { id: 65, key: 'jude', name_en: 'Jude', name_te: 'యూదా', name_ta: 'யூதா', testament: 'NT', section: 'General Epistles', chapters: 1 },
  { id: 66, key: 'revelation', name_en: 'Revelation', name_te: 'ప్రకటన గ్రంథము', name_ta: 'வெளிப்படுத்தல்', testament: 'NT', section: 'Apocalyptic', chapters: 22 }
];

// Insert books with Remora metadata
const META_MAP = new Map();
for (const b of [...OT_BOOKS, ...NT_BOOKS]) {
  META_MAP.set(b.id.toLowerCase(), {
    themeWord: b.themeWord || '',
    keyWord: b.keyWord || '',
    subtitle: b.subtitle || ''
  });
}

const insertBookStmt = db.prepare(`
  INSERT INTO books (id, book_key, name_en, name_te, name_ta, testament, section, chapters, theme_word, key_word, subtitle)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

db.exec('BEGIN TRANSACTION;');
for (const b of BOOK_LIST) {
  const meta = META_MAP.get(b.key.toLowerCase()) || { themeWord: '', keyWord: '', subtitle: '' };
  insertBookStmt.run(b.id, b.key, b.name_en, b.name_te, b.name_ta, b.testament, b.section, b.chapters, meta.themeWord, meta.keyWord, meta.subtitle);
}
db.exec('COMMIT;');
console.log('Inserted 66 books with Remora theme words and subtitles.');

// Insert Verses
const insertVerseStmt = db.prepare(`
  INSERT INTO verses (book_id, chapter, verse, text_te, text_en, text_ta)
  VALUES (?, ?, ?, ?, ?, ?)
`);

db.exec('BEGIN TRANSACTION;');
let totalVerses = 0;

for (let bookId = 1; bookId <= 66; bookId++) {
  const tePath = path.join(ROOT_DIR, 'public', 'bible', 'telugu_irv', `${bookId}.json`);
  const enPath = path.join(ROOT_DIR, 'public', 'bible', 'bsb', `${bookId}.json`);
  const taPath = path.join(ROOT_DIR, 'public', 'bible', 'tamil_bsi', `${bookId}.json`);

  const teData = fs.existsSync(tePath) ? JSON.parse(fs.readFileSync(tePath, 'utf8')) : {};
  const enData = fs.existsSync(enPath) ? JSON.parse(fs.readFileSync(enPath, 'utf8')) : {};
  const taData = fs.existsSync(taPath) ? JSON.parse(fs.readFileSync(taPath, 'utf8')) : {};

  // Find all chapters
  const allChs = new Set([...Object.keys(teData), ...Object.keys(enData), ...Object.keys(taData)]);
  const sortedChs = Array.from(allChs).map(Number).sort((a, b) => a - b);

  for (const ch of sortedChs) {
    const teVerses = teData[ch] || [];
    const enVerses = enData[ch] || [];
    const taVerses = taData[ch] || [];

    // Map by verse number
    const mapTe = new Map(teVerses.map(v => [v.verse, v.text]));
    const mapEn = new Map(enVerses.map(v => [v.verse, v.text]));
    const mapTa = new Map(taVerses.map(v => [v.verse, v.text]));

    const verseNums = new Set([...mapTe.keys(), ...mapEn.keys(), ...mapTa.keys()]);
    const sortedVerseNums = Array.from(verseNums).sort((a, b) => a - b);

    for (const v of sortedVerseNums) {
      insertVerseStmt.run(
        bookId,
        ch,
        v,
        mapTe.get(v) || null,
        mapEn.get(v) || null,
        mapTa.get(v) || null
      );
      totalVerses++;
    }
  }
}
db.exec('COMMIT;');
console.log(`Inserted ${totalVerses} verses across all 66 books.`);

// Insert Strong's Greek
const greekPath = path.join(ROOT_DIR, 'public', 'strongs-greek.json');
if (fs.existsSync(greekPath)) {
  const greek = JSON.parse(fs.readFileSync(greekPath, 'utf8'));
  const insertStrongsStmt = db.prepare(`
    INSERT INTO strongs (id, lang, lemma, xlit, pron, derivation, strongs_def, kjv_def, pos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.exec('BEGIN TRANSACTION;');
  let greekCount = 0;
  for (const [id, entry] of Object.entries(greek)) {
    insertStrongsStmt.run(
      id,
      'G',
      entry.lemma || null,
      entry.xlit || null,
      entry.pron || null,
      entry.derivation || null,
      entry.strongs_def || null,
      entry.kjv_def || null,
      entry.pos || null
    );
    greekCount++;
  }
  db.exec('COMMIT;');
  console.log(`Inserted ${greekCount} Greek Strong's entries.`);
}

// Insert Strong's Hebrew
const hebrewPath = path.join(ROOT_DIR, 'public', 'strongs-hebrew.json');
if (fs.existsSync(hebrewPath)) {
  const hebrew = JSON.parse(fs.readFileSync(hebrewPath, 'utf8'));
  const insertStrongsStmt = db.prepare(`
    INSERT INTO strongs (id, lang, lemma, xlit, pron, derivation, strongs_def, kjv_def, pos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.exec('BEGIN TRANSACTION;');
  let hebrewCount = 0;
  for (const [id, entry] of Object.entries(hebrew)) {
    insertStrongsStmt.run(
      id,
      'H',
      entry.lemma || null,
      entry.xlit || null,
      entry.pron || null,
      entry.derivation || null,
      entry.strongs_def || null,
      entry.kjv_def || null,
      entry.pos || null
    );
    hebrewCount++;
  }
  db.exec('COMMIT;');
  console.log(`Inserted ${hebrewCount} Hebrew Strong's entries.`);
}

// Insert Paragraph Breaks
const pBreakPath = path.join(ROOT_DIR, 'public', 'data', 'paragraph_breaks.json');
if (fs.existsSync(pBreakPath)) {
  const pBreaks = JSON.parse(fs.readFileSync(pBreakPath, 'utf8'));
  const insertPBreakStmt = db.prepare(`
    INSERT OR IGNORE INTO paragraph_breaks (book_id, chapter, verse)
    VALUES (?, ?, ?)
  `);
  db.exec('BEGIN TRANSACTION;');
  let pbCount = 0;
  for (const [bookKey, chMap] of Object.entries(pBreaks)) {
    const found = BOOK_LIST.find(b => b.key === bookKey.toLowerCase());
    if (found) {
      for (const [chStr, verses] of Object.entries(chMap)) {
        const ch = parseInt(chStr, 10);
        if (Array.isArray(verses)) {
          for (const vs of verses) {
            insertPBreakStmt.run(found.id, ch, vs);
            pbCount++;
          }
        }
      }
    }
  }
  db.exec('COMMIT;');
  console.log(`Inserted ${pbCount} paragraph breaks.`);
}

// Seed memory verses for Remora Spaced Repetition (Today & Practice)
const seedVerses = [
  { bookId: 1, chapter: 1, verse: 1 },    // Genesis 1:1
  { bookId: 20, chapter: 3, verse: 5 },   // Proverbs 3:5
  { bookId: 43, chapter: 3, verse: 16 },  // John 3:16
  { bookId: 45, chapter: 8, verse: 28 },  // Romans 8:28
  { bookId: 50, chapter: 4, verse: 13 },  // Philippians 4:13
];

const insertUserVerseStmt = db.prepare(`
  INSERT INTO user_verses (book_id, chapter, verse, status, repetition, interval, efactor, next_due_date, created_at)
  VALUES (?, ?, ?, 'learning', 1, 1, 2.5, ?, ?)
`);

db.exec('BEGIN TRANSACTION;');
const now = Date.now();
for (const sv of seedVerses) {
  insertUserVerseStmt.run(sv.bookId, sv.chapter, sv.verse, now, now);
}
// Seed user stats (streak = 14)
db.prepare("INSERT INTO user_stats (key, val) VALUES ('streak', '14')").run();
db.exec('COMMIT;');
console.log('Seeded initial memory verses and user stats.');

// Preset Collections (75 Well-Known & Top 100)
const bookMap = new Map();
for (const b of BOOK_LIST) {
  bookMap.set(b.name_en.toLowerCase(), b.id);
  bookMap.set(b.key.toLowerCase(), b.id);
}
bookMap.set('psalms', 19);
bookMap.set('psalm', 19);

function parseRef(ref) {
  const m = ref.match(/^([1-3]?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)[:.](\d+)/);
  if (!m) return null;
  const bName = m[1].trim().toLowerCase();
  const bookId = bookMap.get(bName);
  const ch = parseInt(m[2], 10);
  const vs = parseInt(m[3], 10);
  return { bookId, ch, vs, ref };
}

db.exec('BEGIN TRANSACTION;');
const insertCollStmt = db.prepare(`
  INSERT INTO preset_collections (id, title, description, count)
  VALUES (?, ?, ?, ?)
`);
insertCollStmt.run(
  'well_known',
  '75 Well-Known Verses',
  'A hand-picked selection of deeply encouraging and essential scriptures.',
  SEED_VERSES.length
);
insertCollStmt.run(
  'top_100',
  'Top 100 Verses',
  'The 100 most popular Bible verses according to global search data.',
  TOP_100_VERSES.length
);

const insertPresetVerseStmt = db.prepare(`
  INSERT INTO preset_verses (collection_id, reference, book_id, chapter, verse)
  VALUES (?, ?, ?, ?, ?)
`);

for (const s of SEED_VERSES) {
  const p = parseRef(s.ref);
  if (p && p.bookId) {
    insertPresetVerseStmt.run('well_known', s.ref, p.bookId, p.ch, p.vs);
  }
}

for (const t of TOP_100_VERSES) {
  const p = parseRef(t.ref);
  if (p && p.bookId) {
    insertPresetVerseStmt.run('top_100', t.ref, p.bookId, p.ch, p.vs);
  }
}
db.exec('COMMIT;');
console.log(`Inserted preset collections: 75 Well-Known and 100 Top verses.`);

// Optimize DB
db.exec('VACUUM;');
db.exec('ANALYZE;');
db.close();

const stats = fs.statSync(DB_PATH);
console.log(`Database built successfully! Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
