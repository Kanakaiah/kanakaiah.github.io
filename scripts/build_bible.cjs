const fs = require('fs-extra');
const path = require('path');
const { toJSON } = require('usfm-js');

// Map of USFM book abbreviations to our API-style numeric or string IDs
const BOOK_MAP = {
  'GEN': 1, 'EXO': 2, 'LEV': 3, 'NUM': 4, 'DEU': 5,
  'JOS': 6, 'JDG': 7, 'RUT': 8, '1SA': 9, '2SA': 10,
  '1KI': 11, '2KI': 12, '1CH': 13, '2CH': 14,
  'EZR': 15, 'NEH': 16, 'EST': 17, 'JOB': 18, 'PSA': 19, 'PRO': 20,
  'ECC': 21, 'SNG': 22, 'ISA': 23, 'JER': 24, 'LAM': 25,
  'EZK': 26, 'DAN': 27, 'HOS': 28, 'JOL': 29,
  'AMO': 30, 'OBA': 31, 'JON': 32, 'MIC': 33, 'NAM': 34,
  'HAB': 35, 'ZEP': 36, 'HAG': 37, 'ZEC': 38, 'MAL': 39,
  'MAT': 40, 'MRK': 41, 'LUK': 42, 'JHN': 43, 'ACT': 44,
  'ROM': 45, '1CO': 46, '2CO': 47, 'GAL': 48,
  'EPH': 49, 'PHP': 50, 'COL': 51, '1TH': 52,
  '2TH': 53, '1TI': 54, '2TI': 55, 'TIT': 56,
  'PHM': 57, 'HEB': 58, 'JAS': 59, '1PE': 60, '2PE': 61,
  '1JN': 62, '2JN': 63, '3JN': 64, 'JUD': 65, 'REV': 66
};

function renderVerseObjects(objects, state = { inWj: false }) {
  if (!objects) return '';
  let text = '';
  for (const obj of objects) {
    if (obj.type === 'footnote' || obj.tag === 'f') {
      continue;
    }

    let isWjStart = false;
    if (obj.tag === 'wj') {
      state.inWj = true;
      isWjStart = true;
      text += `<span class="words-of-jesus">`;
    }

    let inner = obj.text || obj.content || '';
    if (obj.children) {
      inner += renderVerseObjects(obj.children, state);
    }

    if (inner) {
      if (obj.tag === 'add') {
        text += `<i>${inner}</i>`;
      } else {
        text += inner;
      }
    }

    if (obj.tag === 'wj*' || (isWjStart && obj.endTag === 'wj*')) {
      state.inWj = false;
      text += `</span>`;
    }
  }
  return text;
}

async function convertUsfmDir(inputDir, outputDir) {
  await fs.ensureDir(outputDir);
  const files = await fs.readdir(inputDir);
  
  for (const file of files) {
    if (!file.endsWith('.usfm')) continue;
    
    const content = await fs.readFile(path.join(inputDir, file), 'utf8');
    const parsed = toJSON(content);
    
    const bookAbbr = parsed.headers.find(h => h.tag === 'id')?.content?.split(' ')[0];
    if (!bookAbbr || !BOOK_MAP[bookAbbr]) {
      console.warn('Unknown book:', bookAbbr, 'in file', file);
      continue;
    }
    
    const bookId = BOOK_MAP[bookAbbr];
    const bookData = {};

    let state = { inWj: false };

    for (const [chapterNum, chapterData] of Object.entries(parsed.chapters)) {
      const versesArray = [];
      
      for (const [verseNum, verseData] of Object.entries(chapterData)) {
        if (verseNum === 'front') continue;
        
        let wasInWj = state.inWj;
        let verseText = renderVerseObjects(verseData.verseObjects, state);

        if (state.inWj) {
           verseText += '</span>';
        } else if (!state.inWj && verseText.includes('<span class="words-of-jesus">') && verseText.split('<span class="words-of-jesus">').length > verseText.split('</span>').length) {
           verseText += '</span>';
        }
        
        if (wasInWj) {
           verseText = '<span class="words-of-jesus">' + verseText;
        }

        verseText = verseText.replace(/\n/g, ' ').trim();
        const nums = verseNum.split('-');
        
        versesArray.push({
          pk: `${bookId}-${chapterNum}-${nums[0]}`,
          verse: parseInt(nums[0], 10),
          text: verseText
        });
      }
      
      bookData[chapterNum] = versesArray.sort((a,b) => a.verse - b.verse);
    }
    
    await fs.writeJson(path.join(outputDir, `${bookId}.json`), bookData);
  }
}

async function main() {
  console.log('Building Telugu IRV...');
  await convertUsfmDir(
    path.join(__dirname, '../temp_telugu/usfm'),
    path.join(__dirname, '../public/bible/telugu_irv')
  );
  
  console.log('Building Tamil BSI...');
  await convertUsfmDir(
    path.join(__dirname, '../temp_tamil/usfm'),
    path.join(__dirname, '../public/bible/tamil_bsi')
  );
  
  console.log('Building Berean Standard Bible (BSB)...');
  await convertUsfmDir(
    path.join(__dirname, '../temp_bsb'),
    path.join(__dirname, '../public/bible/bsb')
  );
  
  console.log('Done!');
}

main().catch(console.error);
