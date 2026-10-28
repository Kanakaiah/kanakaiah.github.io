import { OPENBIBLE_XREFS_URL, STEPBIBLE_WORDS_URL } from '../data/crossRefsUrl';
import { BOLLS_BIBLE_MAP } from '../data/bibleMap';
import { OT_BOOKS } from '../data/otBooks';
import { NT_BOOKS } from '../data/ntBooks';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

// Canonical 66 books in order (index 0..65 -> bollsId 1..66)
export const CANONICAL_BOOK_IDS: readonly string[] = ALL_BOOKS.map(b => b.id);

export type GenreId =
  | 'law'
  | 'history'
  | 'poetry'
  | 'major-prophets'
  | 'minor-prophets'
  | 'gospels'
  | 'acts'
  | 'pauline-epistles'
  | 'general-epistles'
  | 'revelation';

export interface GenreInfo {
  readonly id: GenreId;
  readonly ordinal: number;
  readonly label: string;
  readonly hex: string;
}

/**
 * The standard Protestant grouping of the 66 books into 10 genres, in canonical order,
 * with exact colors from `trekhleb/bible-cross-references` (`genres.ts` & `palette.ts`).
 */
export const GENRES: readonly GenreInfo[] = [
  { id: 'law', ordinal: 0, label: 'Law', hex: '#eb568f' },
  { id: 'history', ordinal: 1, label: 'History', hex: '#cd4805' },
  { id: 'poetry', ordinal: 2, label: 'Poetry & Wisdom', hex: '#b48f05' },
  { id: 'major-prophets', ordinal: 3, label: 'Major Prophets', hex: '#cd489d' },
  { id: 'minor-prophets', ordinal: 4, label: 'Minor Prophets', hex: '#88a00d' },
  { id: 'gospels', ordinal: 5, label: 'Gospels', hex: '#17a7b4' },
  { id: 'acts', ordinal: 6, label: 'Acts', hex: '#119245' },
  { id: 'pauline-epistles', ordinal: 7, label: 'Pauline Epistles', hex: '#0593e6' },
  { id: 'general-epistles', ordinal: 8, label: 'General Epistles', hex: '#03ac8f' },
  { id: 'revelation', ordinal: 9, label: 'Revelation', hex: '#a06aec' },
];

export function getBookGenreByBollsId(bollsId: number): GenreInfo {
  if (bollsId <= 5) return GENRES[0];   // Gen–Deut (Law)
  if (bollsId <= 17) return GENRES[1];  // Josh–Esth (History)
  if (bollsId <= 22) return GENRES[2];  // Job–Song (Poetry & Wisdom)
  if (bollsId <= 27) return GENRES[3];  // Isa–Dan (Major Prophets)
  if (bollsId <= 39) return GENRES[4];  // Hos–Mal (Minor Prophets)
  if (bollsId <= 43) return GENRES[5];  // Matt–John (Gospels)
  if (bollsId === 44) return GENRES[6]; // Acts (Acts)
  if (bollsId <= 57) return GENRES[7];  // Rom–Phlm (Pauline Epistles)
  if (bollsId <= 65) return GENRES[8];  // Heb–Jude (General Epistles)
  return GENRES[9];                     // Rev (Revelation)
}

/**
 * KJV chapter verse counts across all 66 books (1,189 chapters, 31,102 verses).
 * Matches `trekhleb/bible-cross-references` (`KJV_CHAPTER_VERSE_COUNTS`).
 */
export const KJV_CHAPTER_VERSE_COUNTS: readonly (readonly number[])[] = [
  // 1 Genesis
  [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26],
  // 2 Exodus
  [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38],
  // 3 Leviticus
  [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34],
  // 4 Numbers
  [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13],
  // 5 Deuteronomy
  [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12],
  // 6 Joshua
  [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33],
  // 7 Judges
  [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25],
  // 8 Ruth
  [22, 23, 18, 22],
  // 9 1 Samuel
  [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13],
  // 10 2 Samuel
  [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39, 25],
  // 11 1 Kings
  [53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53],
  // 12 2 Kings
  [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30],
  // 13 1 Chronicles
  [54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30],
  // 14 2 Chronicles
  [17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23],
  // 15 Ezra
  [11, 70, 13, 24, 17, 22, 28, 36, 15, 44],
  // 16 Nehemiah
  [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31],
  // 17 Esther
  [22, 23, 15, 17, 14, 14, 10, 17, 32, 3],
  // 18 Job
  [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17],
  // 19 Psalms
  [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 26, 17, 11, 9, 14, 20, 23, 19, 9, 6, 7, 23, 13, 11, 11, 17, 12, 8, 12, 11, 10, 13, 20, 7, 35, 36, 5, 24, 20, 28, 23, 10, 12, 20, 72, 13, 19, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16, 15, 5, 23, 11, 13, 12, 9, 9, 5, 8, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6],
  // 20 Proverbs
  [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31],
  // 21 Ecclesiastes
  [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14],
  // 22 Song of Solomon
  [17, 17, 11, 16, 16, 13, 13, 14],
  // 23 Isaiah
  [31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 12, 25, 24],
  // 24 Jeremiah
  [19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34],
  // 25 Lamentations
  [22, 22, 66, 22, 22],
  // 26 Ezekiel
  [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35],
  // 27 Daniel
  [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13],
  // 28 Hosea
  [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9],
  // 29 Joel
  [20, 32, 21],
  // 30 Amos
  [15, 16, 15, 13, 27, 14, 17, 14, 15],
  // 31 Obadiah
  [21],
  // 32 Jonah
  [17, 10, 10, 11],
  // 33 Micah
  [16, 13, 12, 13, 15, 16, 20],
  // 34 Nahum
  [15, 13, 19],
  // 35 Habakkuk
  [17, 20, 19],
  // 36 Zephaniah
  [18, 15, 20],
  // 37 Haggai
  [15, 23],
  // 38 Zechariah
  [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21],
  // 39 Malachi
  [14, 17, 18, 6],
  // 40 Matthew
  [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20],
  // 41 Mark
  [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20],
  // 42 Luke
  [80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47, 38, 71, 56, 53],
  // 43 John
  [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25],
  // 44 Acts
  [26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35, 27, 27, 32, 44, 31],
  // 45 Romans
  [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27],
  // 46 1 Corinthians
  [31, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24],
  // 47 2 Corinthians
  [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14],
  // 48 Galatians
  [24, 21, 29, 31, 26, 18],
  // 49 Ephesians
  [23, 22, 21, 32, 33, 24],
  // 50 Philippians
  [30, 30, 21, 23],
  // 51 Colossians
  [29, 23, 25, 18],
  // 52 1 Thessalonians
  [10, 20, 13, 18, 28],
  // 53 2 Thessalonians
  [12, 17, 18],
  // 54 1 Timothy
  [20, 15, 16, 16, 25, 21],
  // 55 2 Timothy
  [18, 26, 17, 22],
  // 56 Titus
  [16, 15, 15],
  // 57 Philemon
  [25],
  // 58 Hebrews
  [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25],
  // 59 James
  [27, 26, 18, 17, 20],
  // 60 1 Peter
  [25, 25, 22, 19, 14],
  // 61 2 Peter
  [21, 22, 18],
  // 62 1 John
  [10, 29, 24, 21, 21],
  // 63 2 John
  [13],
  // 64 3 John
  [14],
  // 65 Jude
  [25],
  // 66 Revelation
  [20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21],
];

export const TOTAL_VERSES = 31102;

export interface VerseCoord {
  readonly bollsId: number; // 1..66
  readonly bookId: string;  // e.g. 'exodus'
  readonly bookName: string; // e.g. 'Exodus'
  readonly chapter: number; // 1-based
  readonly verse: number;   // 1-based
  readonly genre: GenreInfo;
  readonly isOldTestament: boolean;
}

// Precompute flat lookup tables for O(1) conversion between VerseIndex (0..31101) and (bollsId, chapter, verse)
const vidToCoord: VerseCoord[] = new Array(TOTAL_VERSES);
const bookChapterOffsets: number[][] = new Array(67); // 1..66 -> array of chapter start vids (1-based index)
export const VERSE_GENRES = new Uint8Array(TOTAL_VERSES);

(function initVersification() {
  let vid = 0;
  for (let bIdx = 0; bIdx < 66; bIdx++) {
    const bollsId = bIdx + 1;
    const book = ALL_BOOKS[bIdx];
    const genre = getBookGenreByBollsId(bollsId);
    const chCounts = KJV_CHAPTER_VERSE_COUNTS[bIdx];
    const chOffsets = new Array<number>(chCounts.length + 1);
    for (let cIdx = 0; cIdx < chCounts.length; cIdx++) {
      chOffsets[cIdx + 1] = vid;
      const vCount = chCounts[cIdx];
      const chapter = cIdx + 1;
      for (let v = 1; v <= vCount; v++) {
        vidToCoord[vid] = {
          bollsId,
          bookId: book.id,
          bookName: book.name,
          chapter,
          verse: v,
          genre,
          isOldTestament: bollsId <= 39,
        };
        VERSE_GENRES[vid] = genre.ordinal;
        vid++;
      }
    }
    bookChapterOffsets[bollsId] = chOffsets;
  }
})();

export function toVerseIndex(bollsIdOrBookId: number | string, chapter: number, verse: number): number | null {
  const bollsId = typeof bollsIdOrBookId === 'number'
    ? bollsIdOrBookId
    : BOLLS_BIBLE_MAP[bollsIdOrBookId.toLowerCase().replace(/[^a-z0-9]/g, '')];
  if (!bollsId || bollsId < 1 || bollsId > 66) return null;
  const chCounts = KJV_CHAPTER_VERSE_COUNTS[bollsId - 1];
  if (chapter < 1 || chapter > chCounts.length) return null;
  const maxVerse = chCounts[chapter - 1];
  if (verse < 1 || verse > maxVerse) return null;
  return bookChapterOffsets[bollsId][chapter] + (verse - 1);
}

export function fromVerseIndex(vid: number): VerseCoord {
  return vidToCoord[vid] || vidToCoord[0];
}

export function isValidVerseIndex(vid: number): boolean {
  return Number.isInteger(vid) && vid >= 0 && vid < TOTAL_VERSES;
}

/**
 * Formats an inclusive verse index range (e.g. "Exodus 35:30–35" or "Genesis 1:31–2:3").
 * Uses an en-dash (`–`) matching `trekhleb/bible-cross-references`.
 */
export function formatVerseIndexRange(
  startVid: number,
  endVid: number,
  getLocalizedBookName?: (bookId: string, defaultName: string) => string
): string {
  const start = fromVerseIndex(startVid);
  const startBook = getLocalizedBookName ? getLocalizedBookName(start.bookId, start.bookName) : start.bookName;
  if (startVid === endVid) {
    return `${startBook} ${start.chapter}:${start.verse}`;
  }
  const end = fromVerseIndex(endVid);
  if (start.bollsId === end.bollsId) {
    if (start.chapter === end.chapter) {
      return `${startBook} ${start.chapter}:${start.verse}–${end.verse}`;
    }
    return `${startBook} ${start.chapter}:${start.verse}–${end.chapter}:${end.verse}`;
  }
  const endBook = getLocalizedBookName ? getLocalizedBookName(end.bookId, end.bookName) : end.bookName;
  return `${startBook} ${start.chapter}:${start.verse}–${endBook} ${end.chapter}:${end.verse}`;
}

export interface CrossReferenceLink {
  readonly id: number;
  readonly from: number;
  readonly targetStart: number;
  readonly targetEnd: number;
  readonly votes: number;
}

export type LinkDirection = 'outgoing' | 'incoming';

export interface Connection {
  readonly link: CrossReferenceLink;
  readonly direction: LinkDirection;
  readonly here: number;
  readonly otherStart: number;
  readonly otherEnd: number;
}

export interface PassageConnections {
  readonly outgoing: readonly Connection[];
  readonly incoming: readonly Connection[];
}

export interface BookConnectionGroup {
  readonly bollsId: number;
  readonly bookId: string;
  readonly bookName: string;
  readonly genre: GenreInfo;
  readonly connections: readonly Connection[];
}

export type LandingNote =
  | { readonly kind: 'range'; readonly start: number; readonly end: number }
  | { readonly kind: 'from-verse'; readonly verse: number }
  | { readonly kind: 'to-verse'; readonly verse: number };

/**
 * Bidirectional CSR cross-reference index ported from `trekhleb/bible-cross-references`.
 */
export class CrossReferenceIndex {
  readonly verseCount: number;
  readonly linkCount: number;
  readonly sources: Int32Array;
  readonly targetStarts: Int32Array;
  readonly targetEnds: Int32Array;
  readonly votes: Int32Array;

  private readonly outgoingOffsets: Int32Array;
  private readonly incomingOffsets: Int32Array;
  private readonly incomingLinkIds: Int32Array;

  constructor(columns: {
    offsets: readonly number[];
    targetStart: readonly number[];
    targetEnd: readonly number[];
    votes: readonly number[];
  }) {
    const verseCount = TOTAL_VERSES;
    const linkCount = columns.targetStart.length;
    this.verseCount = verseCount;
    this.linkCount = linkCount;

    this.outgoingOffsets = Int32Array.from(columns.offsets);
    this.targetStarts = Int32Array.from(columns.targetStart);
    this.targetEnds = Int32Array.from(columns.targetEnd);
    this.votes = Int32Array.from(columns.votes);

    const sources = new Int32Array(linkCount);
    for (let v = 0; v < verseCount; v++) {
      sources.fill(v, this.outgoingOffsets[v], this.outgoingOffsets[v + 1]);
    }
    this.sources = sources;

    // Incoming index: counting sort of (target verse, link ID) over expanded target ranges
    const incomingOffsets = new Int32Array(verseCount + 1);
    for (let id = 0; id < linkCount; id++) {
      const start = this.targetStarts[id];
      const end = this.targetEnds[id];
      for (let v = start; v <= end; v++) {
        incomingOffsets[v + 1]++;
      }
    }
    for (let v = 0; v < verseCount; v++) {
      incomingOffsets[v + 1] += incomingOffsets[v];
    }
    const cursors = incomingOffsets.slice(0, verseCount);
    const incomingLinkIds = new Int32Array(incomingOffsets[verseCount]);
    for (let id = 0; id < linkCount; id++) {
      const start = this.targetStarts[id];
      const end = this.targetEnds[id];
      for (let v = start; v <= end; v++) {
        incomingLinkIds[cursors[v]++] = id;
      }
    }
    this.incomingOffsets = incomingOffsets;
    this.incomingLinkIds = incomingLinkIds;
  }

  link(id: number): CrossReferenceLink {
    return {
      id,
      from: this.sources[id],
      targetStart: this.targetStarts[id],
      targetEnd: this.targetEnds[id],
      votes: this.votes[id],
    };
  }

  outgoing(verse: number): CrossReferenceLink[] {
    if (verse < 0 || verse >= this.verseCount) return [];
    const start = this.outgoingOffsets[verse];
    const end = this.outgoingOffsets[verse + 1];
    const links: CrossReferenceLink[] = [];
    for (let id = start; id < end; id++) {
      links.push(this.link(id));
    }
    return links;
  }

  incoming(verse: number): CrossReferenceLink[] {
    if (verse < 0 || verse >= this.verseCount) return [];
    const start = this.incomingOffsets[verse];
    const end = this.incomingOffsets[verse + 1];
    const links: CrossReferenceLink[] = [];
    for (let i = start; i < end; i++) {
      links.push(this.link(this.incomingLinkIds[i]));
    }
    return links;
  }

  /**
   * Fast check for whether a verse has any outgoing OR incoming cross-reference
   * meeting `minVotes` (default 4, matching `DEFAULT_LINK_FILTER`).
   */
  hasConnections(verse: number, minVotes = 4): boolean {
    if (verse < 0 || verse >= this.verseCount) return false;
    const outStart = this.outgoingOffsets[verse];
    const outEnd = this.outgoingOffsets[verse + 1];
    for (let id = outStart; id < outEnd; id++) {
      if (this.votes[id] >= minVotes) return true;
    }
    const inStart = this.incomingOffsets[verse];
    const inEnd = this.incomingOffsets[verse + 1];
    for (let i = inStart; i < inEnd; i++) {
      if (this.votes[this.incomingLinkIds[i]] >= minVotes) return true;
    }
    return false;
  }
}

function byOtherEnd(a: Connection, b: Connection): number {
  return a.otherStart - b.otherStart || a.otherEnd - b.otherEnd || a.here - b.here;
}

export function collectConnections(
  index: CrossReferenceIndex,
  startVid: number,
  endVid: number,
  minVotes = 4
): PassageConnections {
  const outgoing: Connection[] = [];
  const incoming: Connection[] = [];
  const seenIncoming = new Set<number>();

  for (let verse = startVid; verse <= endVid; verse++) {
    for (const link of index.outgoing(verse)) {
      if (minVotes <= 0 || link.votes >= minVotes) {
        outgoing.push({
          link,
          direction: 'outgoing',
          here: verse,
          otherStart: link.targetStart,
          otherEnd: link.targetEnd,
        });
      }
    }
    for (const link of index.incoming(verse)) {
      if (seenIncoming.has(link.id)) continue;
      seenIncoming.add(link.id);
      if (minVotes <= 0 || link.votes >= minVotes) {
        incoming.push({
          link,
          direction: 'incoming',
          here: verse,
          otherStart: link.from,
          otherEnd: link.from,
        });
      }
    }
  }

  return {
    outgoing: outgoing.sort(byOtherEnd),
    incoming: incoming.sort(byOtherEnd),
  };
}

export function groupConnectionsByBook(connections: readonly Connection[]): BookConnectionGroup[] {
  const groups: {
    bollsId: number;
    bookId: string;
    bookName: string;
    genre: GenreInfo;
    connections: Connection[];
  }[] = [];

  for (const conn of connections) {
    const coord = fromVerseIndex(conn.otherStart);
    const last = groups[groups.length - 1];
    if (last && last.bollsId === coord.bollsId) {
      last.connections.push(conn);
    } else {
      groups.push({
        bollsId: coord.bollsId,
        bookId: coord.bookId,
        bookName: coord.bookName,
        genre: coord.genre,
        connections: [conn],
      });
    }
  }
  return groups;
}

export function landingNote(
  connection: Connection,
  inMultiVerseOrChapter = false
): LandingNote | null {
  const { link, direction } = connection;
  if (direction === 'incoming' && link.targetEnd !== link.targetStart) {
    return { kind: 'range', start: link.targetStart, end: link.targetEnd };
  }
  if (!inMultiVerseOrChapter) {
    return null;
  }
  const verse = fromVerseIndex(connection.here).verse;
  return direction === 'outgoing' ? { kind: 'from-verse', verse } : { kind: 'to-verse', verse };
}

// ============================================================================
// Original Words (STEPBible) Index
// ============================================================================

export interface OriginalWordEntry {
  readonly index: number;
  readonly strongs: string;
  readonly lemma: string;
  readonly transliteration: string;
  readonly gloss: string;
  readonly verseCount: number;
}

export class OriginalWordsIndex {
  readonly wordCount: number;
  readonly maxVerses: number;
  private readonly strongs: readonly string[];
  private readonly lemmas: readonly string[];
  private readonly transliterations: readonly string[];
  private readonly glosses: readonly string[];
  private readonly wordOffsets: Int32Array;
  private readonly wordVerses: Int32Array;
  private readonly verseOffsets: Int32Array;
  private readonly verseWords: Int32Array;

  constructor(
    columns: {
      strongs: readonly string[];
      lemma: readonly string[];
      transliteration: readonly string[];
      gloss: readonly string[];
      offsets: readonly number[];
      verses: readonly number[];
    },
    maxVerses = 100
  ) {
    const wordCount = columns.strongs.length;
    const verseCount = TOTAL_VERSES;
    this.wordCount = wordCount;
    this.maxVerses = maxVerses;
    this.strongs = columns.strongs;
    this.lemmas = columns.lemma;
    this.transliterations = columns.transliteration;
    this.glosses = columns.gloss;
    this.wordOffsets = Int32Array.from(columns.offsets);
    this.wordVerses = Int32Array.from(columns.verses);

    // Reverse index: verse -> words in that verse, sorted rarest-first (verseCount asc, then word index)
    const verseOffsets = new Int32Array(verseCount + 1);
    for (let i = 0; i < this.wordVerses.length; i++) {
      const v = this.wordVerses[i];
      if (v >= 0 && v < verseCount) {
        verseOffsets[v + 1]++;
      }
    }
    for (let v = 0; v < verseCount; v++) {
      verseOffsets[v + 1] += verseOffsets[v];
    }
    const cursors = verseOffsets.slice(0, verseCount);
    const verseWords = new Int32Array(verseOffsets[verseCount]);
    for (let w = 0; w < wordCount; w++) {
      const start = this.wordOffsets[w];
      const end = this.wordOffsets[w + 1];
      for (let i = start; i < end; i++) {
        const v = this.wordVerses[i];
        if (v >= 0 && v < verseCount) {
          verseWords[cursors[v]++] = w;
        }
      }
    }
    // Sort each verse's word slice by (verseCount asc, word index asc)
    for (let v = 0; v < verseCount; v++) {
      const start = verseOffsets[v];
      const end = verseOffsets[v + 1];
      if (end - start > 1) {
        verseWords.subarray(start, end).sort((a, b) => {
          const countA = this.wordOffsets[a + 1] - this.wordOffsets[a];
          const countB = this.wordOffsets[b + 1] - this.wordOffsets[b];
          return countA - countB || a - b;
        });
      }
    }
    this.verseOffsets = verseOffsets;
    this.verseWords = verseWords;
  }

  word(index: number): OriginalWordEntry {
    return {
      index,
      strongs: this.strongs[index],
      lemma: this.lemmas[index],
      transliteration: this.transliterations[index],
      gloss: this.glosses[index],
      verseCount: this.wordOffsets[index + 1] - this.wordOffsets[index],
    };
  }

  wordsOf(verse: number): OriginalWordEntry[] {
    if (verse < 0 || verse >= TOTAL_VERSES) return [];
    const start = this.verseOffsets[verse];
    const end = this.verseOffsets[verse + 1];
    const result: OriginalWordEntry[] = [];
    for (let i = start; i < end; i++) {
      result.push(this.word(this.verseWords[i]));
    }
    return result;
  }

  versesOf(wordIndex: number): number[] {
    if (wordIndex < 0 || wordIndex >= this.wordCount) return [];
    const start = this.wordOffsets[wordIndex];
    const end = this.wordOffsets[wordIndex + 1];
    return Array.from(this.wordVerses.subarray(start, end));
  }
}

// ============================================================================
// Singleton Dataset Loaders
// ============================================================================

let cachedCrossRefIndex: CrossReferenceIndex | null = null;
let pendingCrossRefIndex: Promise<CrossReferenceIndex> | null = null;

export function getCrossReferenceIndexIfLoaded(): CrossReferenceIndex | null {
  return cachedCrossRefIndex;
}

export function loadCrossReferenceIndex(): Promise<CrossReferenceIndex> {
  if (cachedCrossRefIndex) return Promise.resolve(cachedCrossRefIndex);
  if (pendingCrossRefIndex) return pendingCrossRefIndex;

  pendingCrossRefIndex = fetch(OPENBIBLE_XREFS_URL)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load cross-references dataset.');
      return res.json();
    })
    .then(json => {
      const index = new CrossReferenceIndex(json.links);
      cachedCrossRefIndex = index;
      return index;
    })
    .catch(err => {
      pendingCrossRefIndex = null;
      throw err;
    });

  return pendingCrossRefIndex;
}

let cachedOriginalWordsIndex: OriginalWordsIndex | null = null;
let pendingOriginalWordsIndex: Promise<OriginalWordsIndex> | null = null;

export function getOriginalWordsIndexIfLoaded(): OriginalWordsIndex | null {
  return cachedOriginalWordsIndex;
}

export function loadOriginalWordsIndex(): Promise<OriginalWordsIndex> {
  if (cachedOriginalWordsIndex) return Promise.resolve(cachedOriginalWordsIndex);
  if (pendingOriginalWordsIndex) return pendingOriginalWordsIndex;

  pendingOriginalWordsIndex = fetch(STEPBIBLE_WORDS_URL)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load original words dataset.');
      return res.json();
    })
    .then(json => {
      const index = new OriginalWordsIndex(json.words, json.maxVerses ?? 100);
      cachedOriginalWordsIndex = index;
      return index;
    })
    .catch(err => {
      pendingOriginalWordsIndex = null;
      throw err;
    });

  return pendingOriginalWordsIndex;
}
