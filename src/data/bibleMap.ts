export const BOLLS_BIBLE_MAP: Record<string, number> = {
  // OT
  genesis: 1, exodus: 2, leviticus: 3, numbers: 4, deuteronomy: 5,
  joshua: 6, judges: 7, ruth: 8, '1samuel': 9, '2samuel': 10,
  '1kings': 11, '2kings': 12, '1chronicles': 13, '2chronicles': 14,
  ezra: 15, nehemiah: 16, esther: 17, job: 18, psalms: 19, proverbs: 20,
  ecclesiastes: 21, songofsolomon: 22, isaiah: 23, jeremiah: 24, lamentations: 25,
  ezekiel: 26, daniel: 27, hosea: 28, joel: 29, amos: 30, obadiah: 31,
  jonah: 32, micah: 33, nahum: 34, habakkuk: 35, zephaniah: 36,
  haggai: 37, zechariah: 38, malachi: 39,
  // NT
  matthew: 40, mark: 41, luke: 42, john: 43, acts: 44,
  romans: 45, '1corinthians': 46, '2corinthians': 47, galatians: 48,
  ephesians: 49, philippians: 50, colossians: 51, '1thessalonians': 52,
  '2thessalonians': 53, '1timothy': 54, '2timothy': 55, titus: 56,
  philemon: 57, hebrews: 58, james: 59, '1peter': 60, '2peter': 61,
  '1john': 62, '2john': 63, '3john': 64, jude: 65, revelation: 66,
};

// bolls.life's translation code doubles as the display label for LSB/NLT, but NASB
// specifically means the 1995 edition here — spell that out so it isn't mistaken for
// a different NASB printing.
export const BIBLE_VERSION_LABELS: Record<string, string> = {
  LSB: 'LSB',
  NASB: 'NASB95',
  NLT: 'NLT',
};

// USFM book codes, as used in bible.com URLs (.../GEN.1.LSB). All 66 are listed: a
// partial map means an unlisted book has to fall back to *some* book, and a link that
// confidently opens the wrong one is worse than no link at all.
export const YOUVERSION_ABBR: Record<string, string> = {
  // OT
  genesis: 'GEN', exodus: 'EXO', leviticus: 'LEV', numbers: 'NUM', deuteronomy: 'DEU',
  joshua: 'JOS', judges: 'JDG', ruth: 'RUT', '1samuel': '1SA', '2samuel': '2SA',
  '1kings': '1KI', '2kings': '2KI', '1chronicles': '1CH', '2chronicles': '2CH',
  ezra: 'EZR', nehemiah: 'NEH', esther: 'EST', job: 'JOB', psalms: 'PSA', proverbs: 'PRO',
  ecclesiastes: 'ECC', songofsolomon: 'SNG', isaiah: 'ISA', jeremiah: 'JER',
  lamentations: 'LAM', ezekiel: 'EZK', daniel: 'DAN', hosea: 'HOS', joel: 'JOL',
  amos: 'AMO', obadiah: 'OBA', jonah: 'JON', micah: 'MIC', nahum: 'NAM',
  habakkuk: 'HAB', zephaniah: 'ZEP', haggai: 'HAG', zechariah: 'ZEC', malachi: 'MAL',
  // NT
  matthew: 'MAT', mark: 'MRK', luke: 'LUK', john: 'JHN', acts: 'ACT',
  romans: 'ROM', '1corinthians': '1CO', '2corinthians': '2CO', galatians: 'GAL',
  ephesians: 'EPH', philippians: 'PHP', colossians: 'COL', '1thessalonians': '1TH',
  '2thessalonians': '2TH', '1timothy': '1TI', '2timothy': '2TI', titus: 'TIT',
  philemon: 'PHM', hebrews: 'HEB', james: 'JAS', '1peter': '1PE', '2peter': '2PE',
  '1john': '1JN', '2john': '2JN', '3john': '3JN', jude: 'JUD', revelation: 'REV',
};

// bible.com addresses a translation by both a numeric edition id and its abbreviation.
// Verified against the live site — 1588, a plausible-looking guess for NASB, is AMP.
export const YOUVERSION_VERSIONS: Record<string, { id: number; abbr: string }> = {
  LSB: { id: 3345, abbr: 'LSB' },
  NASB: { id: 100, abbr: 'NASB1995' },
  NLT: { id: 116, abbr: 'NLT' },
};

/** A bible.com chapter URL, or null for a guide that isn't a book of the Bible. */
export function youVersionChapterUrl(bookId: string, chapter: number, version: string): string | null {
  const abbr = YOUVERSION_ABBR[bookId];
  if (!abbr) return null;

  const edition = YOUVERSION_VERSIONS[version] || YOUVERSION_VERSIONS.LSB;
  return `https://www.bible.com/bible/${edition.id}/${abbr}.${chapter}.${edition.abbr}`;
}

/**
 * Normalizes a "book chapter:verse" string to the key format used by
 * public/data/cross_references.json. That file stores numbered books without the space
 * after the numeral ("1samuel 3:10", "1corinthians 13:13") while every other book keeps
 * its plain lowercase name ("song of solomon 2:1"), so the space is dropped only when it
 * follows a leading digit. Looking up the un-normalized form misses all 17 numbered
 * books — 5,528 verses whose cross-references would silently read as "none".
 */
export function normalizeCrossRefKey(ref: string): string {
  return ref.toLowerCase().replace(/^([123])\s+/, '$1');
}

export const BOOK_SHORT: Record<string, string> = {
  genesis: 'Gen', exodus: 'Exod', leviticus: 'Lev', numbers: 'Num',
  deuteronomy: 'Deut', joshua: 'Josh', judges: 'Judg', ruth: 'Ruth',
  '1samuel': '1 Sam', '2samuel': '2 Sam', '1kings': '1 Kgs', '2kings': '2 Kgs',
  '1chronicles': '1 Chr', '2chronicles': '2 Chr', nehemiah: 'Neh',
  songofsolomon: 'Song', ecclesiastes: 'Eccl', jeremiah: 'Jer',
  lamentations: 'Lam', ezekiel: 'Ezek', habakkuk: 'Hab', zephaniah: 'Zeph',
  haggai: 'Hag', zechariah: 'Zech', malachi: 'Mal',
  matthew: 'Matt', '1corinthians': '1 Cor', '2corinthians': '2 Cor',
  galatians: 'Gal', ephesians: 'Eph', philippians: 'Phil', colossians: 'Col',
  '1thessalonians': '1 Thess', '2thessalonians': '2 Thess',
  '1timothy': '1 Tim', '2timothy': '2 Tim', philemon: 'Philem',
  hebrews: 'Heb', '1peter': '1 Pet', '2peter': '2 Pet',
  '1john': '1 John', '2john': '2 John', '3john': '3 John',
  revelation: 'Rev',
};
