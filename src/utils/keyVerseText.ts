import { BOLLS_BIBLE_MAP } from '../data/bibleMap';

// Key verses in the study guides carry a hand-written snippet plus a reference. The
// snippet was written against one translation, so it goes stale the moment the reader
// picks a different Bible version in Settings. These helpers turn the reference into a
// live lookup against the same bolls.life API the chapter reader uses, so the quoted
// text always matches the version on screen. The stored snippet stays as the offline /
// API-failure fallback.

export interface ParsedKeyVerseRef {
  bollsId: number;
  chapter: number;
  verses: number[];
}

interface BollsVerse {
  verse: number;
  text: string;
}

// Guide ids already match BOLLS_BIBLE_MAP's keys, so this only has to cover the book
// names spelled out inside refs on topical guides ("Psalm 119:18", not "psalms").
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

/**
 * Parses a key-verse reference into something the API can be asked for.
 *
 * Handles both shapes present in the guide data: book-relative ("2:4", "3:17–18" on a
 * book guide) and fully qualified ("Romans 8:28", "John 1:1, 14" on topical guides).
 * Ranges may use a hyphen or an en/em dash, and comma-separated verses are supported.
 * Returns null for anything it cannot resolve — callers fall back to the stored text.
 */
export function parseKeyVerseRef(ref: string, fallbackBookId?: string): ParsedKeyVerseRef | null {
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

  return verses.length ? { bollsId, chapter, verses } : null;
}

// Chapters are cached per version so the three cards on a guide page (and a return
// visit to that guide) share a single request. Keyed on the promise rather than the
// result so simultaneous cards don't each fire their own fetch.
const chapterCache = new Map<string, Promise<BollsVerse[]>>();

function fetchChapter(version: string, bollsId: number, chapter: number): Promise<BollsVerse[]> {
  const cacheKey = `${version}:${bollsId}:${chapter}`;
  const cached = chapterCache.get(cacheKey);
  if (cached) return cached;

  const pending = fetch(`https://bolls.life/get-text/${version}/${bollsId}/${chapter}/`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch verse text.');
      return res.json();
    });

  // A rejected promise must not stay cached, or one offline moment would pin the
  // fallback text in place for the rest of the session.
  pending.catch(() => chapterCache.delete(cacheKey));
  chapterCache.set(cacheKey, pending);
  return pending;
}

// bolls returns display HTML: section headings in <b>, poetry line breaks as <br/>,
// and translator-supplied words in <i>. A key-verse card is a plain-text quote, so
// headings are dropped and everything else is flattened to a single line.
function toPlainText(html: string): string {
  const stripped = html
    .replace(/<b\b[^>]*>.*?<\/b>/gi, '')
    .replace(/<h[1-6]\b[^>]*>.*?<\/h[1-6]>/gi, '')
    .replace(/<div\b[^>]*class="[^"]*heading[^"]*"[^>]*>.*?<\/div>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '');

  // Decode entities the API leaves in the text (&mdash;, &quot;, …) now that no real
  // markup remains to be re-interpreted.
  const decoder = document.createElement('textarea');
  decoder.innerHTML = stripped;

  return decoder.value.replace(/\s+/g, ' ').trim();
}

/** Fetches the referenced verses in `version` and joins them into one quotable line. */
export async function fetchKeyVerseText(version: string, ref: ParsedKeyVerseRef): Promise<string> {
  const chapterData = await fetchChapter(version, ref.bollsId, ref.chapter);

  const text = ref.verses
    .map(n => chapterData.find(v => v.verse === n))
    .filter((v): v is BollsVerse => Boolean(v))
    .map(v => toPlainText(v.text))
    .filter(Boolean)
    .join(' ');

  if (!text) throw new Error('Verse not found in this version.');
  return text;
}

/**
 * Strips the quotation marks baked into the stored snippets. The card draws its own
 * quotes around the text, and most guide entries are already wrapped in them — which
 * is what produced the doubled ""like this"" quotes on the OT guide pages.
 */
export function stripWrappingQuotes(text: string): string {
  return text ? text.trim().replace(/^["“”]+|["“”]+$/g, '').trim() : '';
}
