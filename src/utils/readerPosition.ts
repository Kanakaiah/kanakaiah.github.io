export interface StoredReaderPosition {
  bookId: string;
  chapter: number;
  verse?: number;
  hasOpened: boolean;
}

const READER_POSITION_KEY = 'remora_reader_position';

const DEFAULT_POSITION: StoredReaderPosition = {
  bookId: 'genesis',
  chapter: 1,
  hasOpened: false,
};

export function loadReaderPosition(): StoredReaderPosition {
  try {
    const raw = localStorage.getItem(READER_POSITION_KEY);
    if (!raw) return DEFAULT_POSITION;
    const parsed = JSON.parse(raw) as Partial<StoredReaderPosition>;
    if (!parsed.bookId || typeof parsed.chapter !== 'number' || parsed.chapter < 1) {
      return DEFAULT_POSITION;
    }
    const verse = typeof parsed.verse === 'number' && parsed.verse >= 1 ? parsed.verse : undefined;
    return {
      bookId: parsed.bookId,
      chapter: parsed.chapter,
      ...(verse ? { verse } : {}),
      hasOpened: Boolean(parsed.hasOpened),
    };
  } catch {
    return DEFAULT_POSITION;
  }
}

export function saveReaderPosition(bookId: string, chapter: number, verse?: number): void {
  if (!bookId || !chapter || chapter < 1) return;
  try {
    const validVerse = typeof verse === 'number' && verse >= 1 ? verse : undefined;
    const payload: StoredReaderPosition = {
      bookId,
      chapter,
      ...(validVerse ? { verse: validVerse } : {}),
      hasOpened: true,
    };
    localStorage.setItem(READER_POSITION_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}
