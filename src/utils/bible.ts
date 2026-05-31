export const BIBLE_BOOKS_ORDER = [
  // Old Testament
  "genesis", "exodus", "leviticus", "numbers", "deuteronomy", "joshua", "judges", "ruth",
  "1 samuel", "2 samuel", "1 kings", "2 kings", "1 chronicles", "2 chronicles", "ezra", "nehemiah", "esther",
  "job", "psalms", "proverbs", "ecclesiastes", "song of solomon", "isaiah", "jeremiah", "lamentations",
  "ezekiel", "daniel", "hosea", "joel", "amos", "obadiah", "jonah", "micah", "nahum", "habakkuk", "zephaniah",
  "haggai", "zechariah", "malachi",
  // New Testament
  "matthew", "mark", "luke", "john", "acts", "romans", "1 corinthians", "2 corinthians", "galatians", "ephesians",
  "philippians", "colossians", "1 thessalonians", "2 thessalonians", "1 timothy", "2 timothy", "titus", "philemon",
  "hebrews", "james", "1 peter", "2 peter", "1 john", "2 john", "3 john", "jude", "revelation"
];

export function getBookIndex(bookName: string): number {
  const cleanName = bookName.toLowerCase()
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .trim();
      
  let index = BIBLE_BOOKS_ORDER.indexOf(cleanName);
  if (index !== -1) return index;
  
  // Abbreviations / aliases mapping
  const aliases: Record<string, string> = {
      "1cor": "1 corinthians", "2cor": "2 corinthians",
      "1thess": "1 thessalonians", "2thess": "2 thessalonians",
      "1tim": "1 timothy", "2tim": "2 timothy",
      "1pet": "1 peter", "2pet": "2 peter",
      "1jn": "1 john", "2jn": "2 john", "3jn": "3 john",
      "rev": "revelation", "revelations": "revelation", "gen": "genesis", "ex": "exodus",
      "lev": "leviticus", "num": "numbers", "deut": "deuteronomy",
      "josh": "joshua", "judg": "judges", "est": "esther",
      "ps": "psalms", "psalm": "psalms", "prov": "proverbs", "eccles": "ecclesiastes",
      "song": "song of solomon", "isa": "isaiah", "jer": "jeremiah",
      "lam": "lamentations", "ezek": "ezekiel", "dan": "daniel",
      "hos": "hosea", "obad": "obadiah", "mic": "micah",
      "hab": "habakkuk", "zeph": "zephaniah", "hag": "haggai",
      "zech": "zechariah", "mal": "malachi",
      "matt": "matthew", "mk": "mark", "lk": "luke",
      "jn": "john", "rom": "romans", "gal": "galatians",
      "eph": "ephesians", "phil": "philippians", "col": "colossians",
      "tim": "1 timothy", "tit": "titus", "philem": "philemon",
      "heb": "hebrews", "jas": "james", "pet": "1 peter"
  };

  if (aliases[cleanName]) {
      return BIBLE_BOOKS_ORDER.indexOf(aliases[cleanName]);
  }

  for (let i = 0; i < BIBLE_BOOKS_ORDER.length; i++) {
      if (BIBLE_BOOKS_ORDER[i].startsWith(cleanName) || cleanName.startsWith(BIBLE_BOOKS_ORDER[i])) {
          return i;
      }
  }
  
  return 999;
}

export function parseReference(refStr: string) {
  if (!refStr) return { bookIndex: 999, chapter: 999, verse: 999 };
  
  const match = refStr.trim().match(/(.+)\s+(\d+):?(\d+)?/);
  if (!match) {
      return { bookIndex: getBookIndex(refStr.trim()), chapter: 999, verse: 999 };
  }
  
  const bookName = match[1].trim();
  const chapter = parseInt(match[2], 10) || 0;
  const verse = parseInt(match[3], 10) || 0;
  
  return {
      bookIndex: getBookIndex(bookName),
      chapter,
      verse
  };
}
