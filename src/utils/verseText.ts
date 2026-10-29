import { BOLLS_BIBLE_MAP } from '../data/bibleMap';
import { fromVerseIndex } from './verseConnections';

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
  psalm: 'psalms',
  song: 'songofsolomon',
  songofsongs: 'songofsolomon',
  canticles: 'songofsolomon',
  revelations: 'revelation',
};

const normalizeBookName = (name: string) => {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return BOOK_ALIASES[key] || key;
};

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

function fetchChapter(version: string, bollsId: number, chapter: number, _bookId?: string): Promise<BollsVerse[]> {
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

function toPlainText(html: string): string {
  const stripped = html
    .replace(/<b\b[^>]*>.*?<\/b>/gi, '')
    .replace(/<h[1-6]\b[^>]*>.*?<\/h[1-6]>/gi, '')
    .replace(/<div\b[^>]*class="[^"]*heading[^"]*"[^>]*>.*?<\/div>/gi, '')
    .replace(/<S>\d+<\/S>/gi, '')
    .replace(/<sup\b[^>]*>.*?<\/sup>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '');

  const decoder = document.createElement('textarea');
  decoder.innerHTML = stripped;

  return decoder.value
    .replace(/([a-z][.?!;:,])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fetches the referenced verses in `version` and joins them into one quotable line. */
export async function fetchVerseText(version: string, ref: ParsedVerseRef): Promise<string> {
  const chapterData = await fetchChapter(version, ref.bollsId, ref.chapter, ref.bookId);

  const text = ref.verses
    .map(n => chapterData.find(v => v.verse === n))
    .filter((v): v is BollsVerse => Boolean(v))
    .map(v => toPlainText(v.text))
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
      chapterMap.set(key, fetchChapter(version, coord.bollsId, coord.chapter, coord.bookId));
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
      text: found ? toPlainText(found.text) : '',
    });
  }

  return { verses, moreCount };
}

export function stripWrappingQuotes(text: string): string {
  return text ? text.trim().replace(/^["“”]+|["“”]+$/g, '').trim() : '';
}
