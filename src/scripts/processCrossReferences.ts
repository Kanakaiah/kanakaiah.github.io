// @ts-nocheck
import fs from 'fs';
import path from 'path';

// Mapping book names to Bolls IDs
const BOOK_TO_ID = {
  'Genesis': 1, 'Exodus': 2, 'Leviticus': 3, 'Numbers': 4, 'Deuteronomy': 5,
  'Joshua': 6, 'Judges': 7, 'Ruth': 8, '1 Samuel': 9, '2 Samuel': 10,
  '1 Kings': 11, '2 Kings': 12, '1 Chronicles': 13, '2 Chronicles': 14,
  'Ezra': 15, 'Nehemiah': 16, 'Esther': 17, 'Job': 18, 'Psalms': 19,
  'Proverbs': 20, 'Ecclesiastes': 21, 'Song of Solomon': 22, 'Isaiah': 23,
  'Jeremiah': 24, 'Lamentations': 25, 'Ezekiel': 26, 'Daniel': 27,
  'Hosea': 28, 'Joel': 29, 'Amos': 30, 'Obadiah': 31, 'Jonah': 32,
  'Micah': 33, 'Nahum': 34, 'Habakkuk': 35, 'Zephaniah': 36, 'Haggai': 37,
  'Zechariah': 38, 'Malachi': 39,
  'Matthew': 40, 'Mark': 41, 'Luke': 42, 'John': 43, 'Acts': 44,
  'Romans': 45, '1 Corinthians': 46, '2 Corinthians': 47, 'Galatians': 48,
  'Ephesians': 49, 'Philippians': 50, 'Colossians': 51, '1 Thessalonians': 52,
  '2 Thessalonians': 53, '1 Timothy': 54, '2 Timothy': 55, 'Titus': 56,
  'Philemon': 57, 'Hebrews': 58, 'James': 59, '1 Peter': 60, '2 Peter': 61,
  '1 John': 62, '2 John': 63, '3 John': 64, 'Jude': 65, 'Revelation': 66
};

async function processQuotes() {
  console.log("Fetching exact OT quotes in NT dataset...");
  const response = await fetch('https://raw.githubusercontent.com/spookylukey/bible-quotation-database/main/quotations_single.json');
  const data = await response.json();

  const output: Record<string, Record<string, number[]>> = {};

  for (const row of data) {
    const ntRef = row.scripture_reference; // e.g., "Romans 1:23"
    
    // Parse the reference string "BookName Chapter:Verse"
    const lastSpaceIdx = ntRef.lastIndexOf(' ');
    if (lastSpaceIdx === -1) continue;

    const bookName = ntRef.substring(0, lastSpaceIdx);
    const chapterVerse = ntRef.substring(lastSpaceIdx + 1);
    
    const parts = chapterVerse.split(':');
    if (parts.length !== 2) continue;
    
    const chapter = parts[0];
    const verse = parseInt(parts[1], 10);

    const bollsId = BOOK_TO_ID[bookName];
    if (!bollsId) {
      console.warn("Unknown book name:", bookName);
      continue;
    }

    if (!output[bollsId]) output[bollsId] = {};
    if (!output[bollsId][chapter]) output[bollsId][chapter] = [];
    
    if (!output[bollsId][chapter].includes(verse)) {
      output[bollsId][chapter].push(verse);
    }
  }

  // Sort verses
  for (const bookId in output) {
    for (const ch in output[bookId]) {
      output[bookId][ch].sort((a, b) => a - b);
    }
  }

  const outputPath = path.resolve('./src/data/otQuotes.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Successfully generated otQuotes.json with exact quotes!`);
}

processQuotes().catch(console.error);
