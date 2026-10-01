import fs from 'fs';

const versesStr = 'Joshua 1:8; Joshua 1:9; Joshua 24:15; Psalm 5:3; Psalm 16:8; Psalm 19:14; Psalm 34:18; Psalm 37:4-5; Psalm 46:1; Psalm 51:10; Psalm 73:25-26; Psalm 119:11; Psalm 139:23-24; Proverbs 3:5-6; Proverbs 4:23; Proverbs 15:1; Proverbs 16:9; Proverbs 27:17; Isaiah 26:3; Isaiah 41:10; Jeremiah 29:11; Jeremiah 31:3; Lam. 3:21-23; Zephaniah 3:17; Matthew 6:33; Matthew 11:28; Matthew 19:26; Matthew 20:26-28; Matthew 22:37-40; Matthew 28:19-20; Luke 9:23; John 1:12; John 3:16; John 3:30; John 10:10; John 10:27-28; John 13:35; John 14:15; John 14:27; John 15:5; John 16:24; Acts 2:38; Acts 4:12; Romans 1:16; Romans 3:23; Romans 5:8; Romans 6:23; Romans 8:1; Romans 8:28-29; Romans 8:32; Romans 10:9; Romans 10:13; Romans 12:1-2; Romans 12:18; Romans 15:13; I Cor. 6:19-20; I Cor. 10:13; I Cor. 10:31; I Cor. 15:58; 2 Cor. 5:9; 2 Cor. 5:17; 2 Cor. 10:5; Galatian 2:20; Galatians 5:22-23; Galatians 6:7-8; Ephesians 2:4-5; Ephesians 2:8-9; Ephesians 3:20; Ephesians 4:29; Ephesians 4:31-32; Ephesians 6:10-11; Philippians 1:6; Philippians 1:9; Philippians 2:3-4; Philippians 4:6-7; Philippians 4:13; Philippians 4:19; Colossians 3:1-2; Colossians 3:15; Colossians 3:23; I Thes. 5:16-18; I Timothy 1:5; I Timothy 4:12; 2 Timothy 2:2; 2 Timothy 2:15; 2 Timothy 3:16; Hebrews 4:12; Hebrews 4:16; Hebrews 12:1-2; Hebrews 13:5; Hebrews 13:8; James 1:2; James 1:5; James 1:19-20; James 4:7; I Peter 3:15; I Peter 5:6-7; I John 1:9; I John 4:4; I John 5:13';
const refs = versesStr.split(';').map(r => r.trim());

const BOLLS_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", 
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", 
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", 
  "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", 
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", 
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", 
  "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];

function resolveBook(query) {
  let q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  if(q === 'songofsongs') q = 'songofsolomon';
  if(q === 'psalm') q = 'psalms';
  if(q === '1cor' || q === 'icor') q = '1corinthians';
  if(q === '2cor') q = '2corinthians';
  if(q === '1thes' || q === 'ithes') q = '1thessalonians';
  if(q === '1timothy' || q === 'itimothy') q = '1timothy';
  if(q === '2timothy') q = '2timothy';
  if(q === '1peter' || q === 'ipeter') q = '1peter';
  if(q === '1john' || q === 'ijohn') q = '1john';
  if(q === 'galatian') q = 'galatians';
  if(q === 'lam') q = 'lamentations';
  
  for(let i=0; i<BOLLS_BOOKS.length; i++) {
    if(BOLLS_BOOKS[i].toLowerCase().replace(/[^a-z0-9]/g, '') === q) {
      return { id: i+1, name: BOLLS_BOOKS[i] };
    }
  }
  return null;
}

const refPattern = /^([1-3I]?\s*[A-Za-z\.]+(?:\s+[A-Za-z\.]+)*)?\s*(\d+):(\d+)(?:-(\d+))?$/;

async function run() {
  const finalVerses = [];
  
  for (let i = 0; i < refs.length; i++) {
    const rawRef = refs[i];
    const match = rawRef.match(refPattern);
    if (!match) {
      console.log('UNMATCHED:', rawRef);
      continue;
    }
    
    let bookName = match[1] || '';
    if (bookName.startsWith('I ')) bookName = '1 ' + bookName.slice(2);
    if (bookName === 'I Cor.') bookName = '1 Corinthians';
    if (bookName === '2 Cor.') bookName = '2 Corinthians';
    if (bookName === 'I Thes.') bookName = '1 Thessalonians';
    if (bookName === 'Lam.') bookName = 'Lamentations';
    
    const book = resolveBook(bookName);
    if (!book) {
      console.log('UNKNOWN BOOK:', bookName);
      continue;
    }
    
    const chapter = parseInt(match[2]);
    const startVerse = parseInt(match[3]);
    const endVerse = match[4] ? parseInt(match[4]) : startVerse;
    
    console.log(`Fetching ${book.name} ${chapter}:${startVerse}-${endVerse} ...`);
    
    // Fetch chapter from bolls
    let success = false;
    let data;
    while(!success) {
      const res = await fetch(`https://bolls.life/get-text/LSB/${book.id}/${chapter}/`);
      if (res.ok) {
        data = await res.json();
        success = true;
      } else {
        console.log('  rate limit/error... waiting 2s');
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    let combinedText = '';
    for(let v = startVerse; v <= endVerse; v++) {
      const vData = data.find(vd => vd.verse === v);
      if (vData) {
        const cleanText = vData.text
          .replace(/<b\b[^>]*>.*?<\/b>/gi, '')
          .replace(/<h[1-6]\b[^>]*>.*?<\/h[1-6]>/gi, '')
          .replace(/<div\b[^>]*class="[^"]*heading[^"]*"[^>]*>.*?<\/div>/gi, '')
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<\/p>/gi, ' ')
          .replace(/<[^>]*>/g, '')
          .trim();
        combinedText += cleanText + ' ';
      }
    }
    
    finalVerses.push({
      ref: `${book.name} ${chapter}:${startVerse}${endVerse !== startVerse ? '-' + endVerse : ''}`,
      text: combinedText.trim(),
      translation: 'LSB'
    });
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  let outContent = "import type { Verse } from '../types/models';\n\nexport const TOP_100_VERSES: Verse[] = [\n";
  for(let i=0; i<finalVerses.length; i++) {
    const v = finalVerses[i];
    outContent += `  {
    id: "top100-${i+1}",
    ref: "${v.ref}",
    text: ${JSON.stringify(v.text)},
    translation: "${v.translation}",
    addedDate: new Date().toISOString(),
    status: "learning",
    sm2: { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date(Date.now() + (${i} % 7) * 86400000).toISOString() },
    streak: 0,
    attempts: 0
  }${i < finalVerses.length - 1 ? ',' : ''}\n`;
  }
  outContent += "];\n";
  
  fs.writeFileSync('src/data/top100.ts', outContent);
  console.log('DONE! Wrote src/data/top100.ts');
}

run();
