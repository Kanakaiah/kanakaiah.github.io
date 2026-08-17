import { YOUVERSION_ABBR } from '../data/bibleMap';

/**
 * Reader URLs read like bible.com's: /#/bible/HAB.1, or /#/bible/HAB.1.4 to land on a
 * verse. They replace an older query-string form (?readerBook=habakkuk&readerChapter=1),
 * which is still accepted and redirected — see readerPathFromLegacyParams.
 *
 * The translation deliberately stays out of the URL: it's a reader setting, so a shared
 * link opens in whatever translation the reader has chosen rather than overriding it.
 */

const CODE_TO_BOOK_ID: Record<string, string> = Object.fromEntries(
  Object.entries(YOUVERSION_ABBR).map(([bookId, code]) => [code, bookId])
);

export interface ReaderRef {
  bookId: string;
  chapter: number;
  /** Verse to scroll to and flash, when the link points at one. */
  verse?: number;
}

/** "/bible/HAB.1" or "/bible/HAB.1.4"; null for anything that isn't a Bible book. */
export function readerPath(bookId: string, chapter: number, verse?: number): string | null {
  const code = YOUVERSION_ABBR[bookId];
  if (!code) return null;

  return `/bible/${code}.${chapter}${verse ? `.${verse}` : ''}`;
}

/** Parses the :ref segment. Case-insensitive, so a hand-typed /bible/hab.1 still works. */
export function parseReaderRef(ref: string | undefined): ReaderRef | null {
  if (!ref) return null;

  const match = ref.trim().match(/^([A-Za-z0-9]+)\.(\d+)(?:\.(\d+))?$/);
  if (!match) return null;

  const bookId = CODE_TO_BOOK_ID[match[1].toUpperCase()];
  if (!bookId) return null;

  const chapter = parseInt(match[2], 10);
  if (!chapter) return null;

  const verse = match[3] ? parseInt(match[3], 10) : undefined;
  return { bookId, chapter, verse: verse || undefined };
}

export function guidePath(guideId: string): string {
  return `/guides/${guideId}`;
}

/**
 * Translates a pre-existing link — bookmark, share, or a URL sitting in someone's
 * history — into the current shape. `highlightVerse` was written by the library's
 * "go to chapter" action but read by nothing; it becomes the verse segment, which the
 * reader does act on.
 */
export function readerPathFromLegacyParams(params: URLSearchParams): string | null {
  const bookId = params.get('readerBook');
  const chapter = parseInt(params.get('readerChapter') || '', 10);
  if (!bookId || !chapter) return null;

  const verse = parseInt(params.get('highlightVerse') || '', 10);
  return readerPath(bookId, chapter, verse || undefined);
}
