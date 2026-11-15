import { BOLLS_BIBLE_MAP } from '../data/bibleMap';
import { fromVerseIndex } from './verseConnections';
import { memoryVerseText } from './studyText';

// Shared "quote a verse in the reader's version" helpers, used anywhere the app shows
// verse text outside the chapter reader itself (guide key verses, cross-references,
// original word occurrences).

export interface ParsedVerseRef {
  /** Normalized book key, e.g. "habakkuk" or "1corinthians". */
  bookId: string;
  bollsId: number;
  chapter: number;
  verses: number[];
}

interface BollsVerse {
  verse: number;
  text: string;
}

const BOOK_ALIASES: Record<string, string> = {
  gen: 'genesis',
  ge: 'genesis',
  ex: 'exodus',
  exod: 'exodus',
  lev: 'leviticus',
  num: 'numbers',
  deut: 'deuteronomy',
  deu: 'deuteronomy',
  josh: 'joshua',
  judg: 'judges',
  jdg: 'judges',
  '1sam': '1samuel',
  '1sa': '1samuel',
  '2sam': '2samuel',
  '2sa': '2samuel',
  '1kgs': '1kings',
  '1ki': '1kings',
  '2kgs': '2kings',
  '2ki': '2kings',
  '1chr': '1chronicles',
  '1ch': '1chronicles',
  '2chr': '2chronicles',
  '2ch': '2chronicles',
  neh: 'nehemiah',
  est: 'esther',
  ps: 'psalms',
  psa: 'psalms',
  psalm: 'psalms',
  prov: 'proverbs',
  pro: 'proverbs',
  eccl: 'ecclesiastes',
  eccles: 'ecclesiastes',
  ecc: 'ecclesiastes',
  song: 'songofsolomon',
  songofsongs: 'songofsolomon',
  sng: 'songofsolomon',
  canticles: 'songofsolomon',
  isa: 'isaiah',
  jer: 'jeremiah',
  lam: 'lamentations',
  ezek: 'ezekiel',
  ezk: 'ezekiel',
  dan: 'daniel',
  hos: 'hosea',
  obad: 'obadiah',
  oba: 'obadiah',
  jon: 'jonah',
  mic: 'micah',
  nah: 'nahum',
  nam: 'nahum',
  hab: 'habakkuk',
  zeph: 'zephaniah',
  zep: 'zephaniah',
  hag: 'haggai',
  zech: 'zechariah',
  zec: 'zechariah',
  mal: 'malachi',
  matt: 'matthew',
  mat: 'matthew',
  mk: 'mark',
  mrk: 'mark',
  lk: 'luke',
  luk: 'luke',
  jn: 'john',
  jhn: 'john',
  act: 'acts',
  rom: 'romans',
  '1cor': '1corinthians',
  '1co': '1corinthians',
  '2cor': '2corinthians',
  '2co': '2corinthians',
  gal: 'galatians',
  eph: 'ephesians',
  phil: 'philippians',
  php: 'philippians',
  col: 'colossians',
  '1thess': '1thessalonians',
  '1th': '1thessalonians',
  '2thess': '2thessalonians',
  '2th': '2thessalonians',
  '1tim': '1timothy',
  '1ti': '1timothy',
  '2tim': '2timothy',
  '2ti': '2timothy',
  tit: 'titus',
  philem: 'philemon',
  phm: 'philemon',
  heb: 'hebrews',
  jas: 'james',
  '1pet': '1peter',
  '1pe': '1peter',
  '2pet': '2peter',
  '2pe': '2peter',
  '1jn': '1john',
  '2jn': '2john',
  '3jn': '3john',
  jud: 'jude',
  rev: 'revelation',
  revelations: 'revelation',
};

const normalizeBookName = (name: string) => {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return BOOK_ALIASES[key] || key;
};

export interface ParsedChapterRef {
  bookId: string;
  bollsId: number;
  chapter: number;
}

/** Parses a chapter-only reference like "John 3" or "Gen 1" (ignores refs with ":verse"). */
export function parseChapterRef(ref: string, fallbackBookId?: string): ParsedChapterRef | null {
  if (!ref || ref.includes(':')) return null;
  const match = ref.trim().match(/^(?:(.+?)\s+)?(\d+)$/);
  if (!match) return null;

  const [, bookName, chapterStr] = match;
  const bookKey = bookName ? normalizeBookName(bookName) : normalizeBookName(fallbackBookId || '');
  const bollsId = BOLLS_BIBLE_MAP[bookKey];
  if (!bollsId) return null;

  const chapter = parseInt(chapterStr, 10);
  if (!chapter) return null;

  return { bookId: bookKey, bollsId, chapter };
}

// Guards against a typo like "3:1-999" pulling half a chapter into a key-verse card.
const MAX_RANGE_LENGTH = 12;

export function parseVerseRef(ref: string, fallbackBookId?: string): ParsedVerseRef | null {
  if (!ref) return null;

  const match = ref.trim().match(/^(?:(.+?)\s+)?(\d+):([\d\s,–—-]+)$/);
  if (!match) return null;

  const [, bookName, chapterStr, versePart] = match;
  const bookKey = bookName ? normalizeBookName(bookName) : normalizeBookName(fallbackBookId || '');
  const bollsId = BOLLS_BIBLE_MAP[bookKey];
  if (!bollsId) return null;

  const chapter = parseInt(chapterStr, 10);
  if (!chapter) return null;

  const verses: number[] = [];
  for (const segment of versePart.split(',')) {
    const range = segment.trim().match(/^(\d+)(?:\s*[–—-]\s*(\d+))?$/);
    if (!range) return null;

    const start = parseInt(range[1], 10);
    const end = range[2] ? parseInt(range[2], 10) : start;
    if (!start || end < start || end - start >= MAX_RANGE_LENGTH) return null;

    for (let v = start; v <= end; v++) {
      if (!verses.includes(v)) verses.push(v);
    }
  }

  return verses.length ? { bookId: bookKey, bollsId, chapter, verses } : null;
}

export function formatVerseNumbers(verses: number[]): string {
  const sorted = [...verses].sort((a, b) => a - b);
  const isContiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);

  if (sorted.length > 1 && isContiguous) return `${sorted[0]}-${sorted[sorted.length - 1]}`;
  return sorted.join(',');
}

// Book-level cache for static offline JSON files (/bible/{folder}/{bollsId}.json)
const localBookCache = new Map<string, Promise<Record<string, BollsVerse[]>>>();
// Chapter-level cache for all translations
const chapterCache = new Map<string, Promise<BollsVerse[]>>();

function fetchChapter(version: string, bollsId: number, chapter: number): Promise<BollsVerse[]> {
  const cacheKey = `${version}:${bollsId}:${chapter}`;
  const cached = chapterCache.get(cacheKey);
  if (cached) return cached;

  let pending: Promise<BollsVerse[]>;

  if (version.toUpperCase() === 'TELIRV' || version.toUpperCase() === 'TBSI' || version.toUpperCase() === 'BSB') {
    const vUpper = version.toUpperCase();
    const folder = vUpper === 'TELIRV' ? 'telugu_irv' : vUpper === 'TBSI' ? 'tamil_bsi' : 'bsb';
    const bookKey = `${folder}:${bollsId}`;
    let bookPromise = localBookCache.get(bookKey);
    if (!bookPromise) {
      const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
      bookPromise = fetch(`${base}/bible/${folder}/${bollsId}.json`).then(res => {
        if (!res.ok) throw new Error('Failed to fetch local Bible book.');
        return res.json();
      });
      bookPromise.catch(() => localBookCache.delete(bookKey));
      localBookCache.set(bookKey, bookPromise);
    }
    pending = bookPromise.then(bookData => {
      const verses = bookData[String(chapter)];
      if (!verses) throw new Error('Missing chapter in local Bible file.');
      return verses;
    });
  } else {
    pending = fetch(`https://bolls.life/get-text/${version}/${bollsId}/${chapter}/`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch verse text.');
        return res.json();
      });
  }

  pending.catch(() => chapterCache.delete(cacheKey));
  chapterCache.set(cacheKey, pending);
  return pending;
}

function toPlainText(html: string, bookId?: string | number, verse?: number, version?: string): string {
  return memoryVerseText(html, bookId, verse, version);
}

export interface PlainChapterVerse {
  verse: number;
  text: string;
}

/** Fetches every verse in a chapter with clean plain text for the selected version. */
export async function fetchChapterVerses(
  version: string,
  bollsId: number,
  chapter: number
): Promise<PlainChapterVerse[]> {
  const chapterData = await fetchChapter(version, bollsId, chapter);
  return chapterData
    .map(v => ({
      verse: v.verse,
      text: toPlainText(v.text, bollsId, v.verse, version),
    }))
    .filter(v => Boolean(v.text));
}

export interface BibleSearchHit {
  bollsId: number;
  chapter: number;
  verse: number;
  text: string;
}

/** Searches Bolls full-text index (falling back to BSB/WEB index for offline Telugu/Tamil scripts before translating each hit). */
export async function searchBibleByKeyword(version: string, query: string, limit = 30): Promise<BibleSearchHit[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];
  const vUpper = version.toUpperCase();
  const isLocalOnly = vUpper === 'TELIRV' || vUpper === 'TBSI';
  let indexVersion = isLocalOnly ? 'WEB' : vUpper;

  let res = await fetch(`https://bolls.life/search/${indexVersion}/?search=${encodeURIComponent(cleanQuery)}`);
  if (!res.ok && indexVersion !== 'WEB') {
    indexVersion = 'WEB';
    res = await fetch(`https://bolls.life/search/WEB/?search=${encodeURIComponent(cleanQuery)}`);
  }
  if (!res.ok) throw new Error('Keyword search is currently unavailable.');
  const rows: Array<{ book: number; chapter: number; verse: number; text: string }> = await res.json();
  const sliced = rows.slice(0, limit);

  if (indexVersion === vUpper) {
    return sliced.map(r => ({
      bollsId: r.book,
      chapter: r.chapter,
      verse: r.verse,
      text: toPlainText(r.text, r.book, r.verse, version),
    }));
  }

  return Promise.all(
    sliced.map(async (r) => {
      try {
        const text = await fetchVerseText(version, {
          bookId: '',
          bollsId: r.book,
          chapter: r.chapter,
          verses: [r.verse],
        });
        return { bollsId: r.book, chapter: r.chapter, verse: r.verse, text };
      } catch {
        return {
          bollsId: r.book,
          chapter: r.chapter,
          verse: r.verse,
          text: toPlainText(r.text, r.book, r.verse, indexVersion),
        };
      }
    })
  );
}

/** Fetches the referenced verses in `version` and joins them into one quotable line. */
export async function fetchVerseText(version: string, ref: ParsedVerseRef): Promise<string> {
  const chapterData = await fetchChapter(version, ref.bollsId, ref.chapter);

  const text = ref.verses
    .map(n => chapterData.find(v => v.verse === n))
    .filter((v): v is BollsVerse => Boolean(v))
    .map(v => toPlainText(v.text, ref.bollsId, v.verse, version))
    .filter(Boolean)
    .join(' ');

  if (!text) throw new Error('Verse not found in this version.');
  return text;
}

export interface PassageSnippetVerse {
  vid: number;
  bollsId: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface PassageSnippetResult {
  verses: PassageSnippetVerse[];
  moreCount: number;
}

/**
 * Fetches up to `maxVerses` (default 12, matching `trekhleb/bible-cross-references`)
 * from an inclusive `startVid..endVid` range so multi-verse passages render with
 * superscript verse numbers and `+ N more verses` when truncated.
 */
export async function fetchPassageRangeSnippet(
  version: string,
  startVid: number,
  endVid: number,
  maxVerses = 12
): Promise<PassageSnippetResult> {
  const lastVid = Math.min(endVid, startVid + maxVerses - 1);
  const moreCount = Math.max(0, endVid - lastVid);
  const vids: number[] = [];
  for (let v = startVid; v <= lastVid; v++) {
    vids.push(v);
  }

  // Group required chapters so each distinct (bollsId, chapter) is fetched once
  const chapterMap = new Map<string, Promise<BollsVerse[]>>();
  for (const vid of vids) {
    const coord = fromVerseIndex(vid);
    const key = `${coord.bollsId}:${coord.chapter}`;
    if (!chapterMap.has(key)) {
      chapterMap.set(key, fetchChapter(version, coord.bollsId, coord.chapter));
    }
  }

  const verses: PassageSnippetVerse[] = [];
  for (const vid of vids) {
    const coord = fromVerseIndex(vid);
    const key = `${coord.bollsId}:${coord.chapter}`;
    const chVerses = await chapterMap.get(key)!;
    const found = chVerses.find(v => v.verse === coord.verse);
    verses.push({
      vid,
      bollsId: coord.bollsId,
      bookName: coord.bookName,
      chapter: coord.chapter,
      verse: coord.verse,
      text: found ? toPlainText(found.text, coord.bollsId, coord.verse, version) : '',
    });
  }

  return { verses, moreCount };
}

export function stripWrappingQuotes(text: string): string {
  return text ? text.trim().replace(/^["“”]+|["“”]+$/g, '').trim() : '';
}
