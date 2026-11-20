export interface CanonicalBookRef {
  id: string;
  name: string;
  chapters: number;
}

export interface ChapterCoordinate {
  bookId: string;
  chapter: number;
}

export interface WindowChapterItem extends ChapterCoordinate {
  key: string;
}

/**
 * Resolves the previous or next chapter across canonical book boundaries.
 * Never wraps from Revelation back to Genesis (or Genesis back to Revelation).
 */
export function adjacentReadingChapter(
  books: CanonicalBookRef[],
  bookId: string,
  chapter: number,
  direction: -1 | 1,
): ChapterCoordinate | null {
  const idx = books.findIndex(b => b.id === bookId);
  if (idx < 0) return null;
  const current = books[idx];
  if (chapter < 1 || chapter > current.chapters) return null;

  const nextCh = chapter + direction;
  if (nextCh >= 1 && nextCh <= current.chapters) {
    return { bookId, chapter: nextCh };
  }

  const neighbor = books[idx + direction];
  if (!neighbor) return null;
  return {
    bookId: neighbor.id,
    chapter: direction > 0 ? 1 : neighbor.chapters,
  };
}

/**
 * Caps a continuous reading window at five contiguous chapters centered around `focus`.
 */
export function boundedChapterWindow<T extends WindowChapterItem>(
  chapters: T[],
  focus: ChapterCoordinate,
  books: { id: string }[],
): T[] {
  const bookOrder = new Map<string, number>();
  books.forEach((b, i) => bookOrder.set(b.id, i));

  const deduped = new Map<string, T>();
  for (const ch of chapters) {
    deduped.set(ch.key, ch);
  }

  const sorted = Array.from(deduped.values()).sort((a, b) => {
    const ba = bookOrder.get(a.bookId) ?? 999;
    const bb = bookOrder.get(b.bookId) ?? 999;
    if (ba !== bb) return ba - bb;
    return a.chapter - b.chapter;
  });

  if (sorted.length <= 5) return sorted;

  const center = Math.max(
    0,
    sorted.findIndex(c => c.bookId === focus.bookId && c.chapter === focus.chapter),
  );
  const start = Math.max(0, Math.min(center - 2, sorted.length - 5));
  return sorted.slice(start, start + 5);
}

/**
 * Merges a newly prefetched adjacent chapter into the active 5-chapter window,
 * resetting to `[loaded]` if the chapter is not contiguous with the existing window.
 */
export function mergeReadingWindow<T extends WindowChapterItem>(
  window: T[],
  loaded: T,
  focus: ChapterCoordinate,
  books: CanonicalBookRef[],
): T[] {
  const connected = window.some(item => {
    if (item.key === loaded.key) return true;
    const next = adjacentReadingChapter(books, item.bookId, item.chapter, 1);
    const prev = adjacentReadingChapter(books, item.bookId, item.chapter, -1);
    return (
      (next !== null && next.bookId === loaded.bookId && next.chapter === loaded.chapter) ||
      (prev !== null && prev.bookId === loaded.bookId && prev.chapter === loaded.chapter)
    );
  });

  if (!connected) return [loaded];
  return boundedChapterWindow(
    [...window.filter(item => item.key !== loaded.key), loaded],
    focus,
    books,
  );
}
