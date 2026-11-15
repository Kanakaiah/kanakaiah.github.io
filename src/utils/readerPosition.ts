export interface StoredReaderPosition {
  bookId: string;
  chapter: number;
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
    return {
      bookId: parsed.bookId,
      chapter: parsed.chapter,
      hasOpened: Boolean(parsed.hasOpened),
    };
  } catch {
    return DEFAULT_POSITION;
  }
}

export function saveReaderPosition(bookId: string, chapter: number): void {
  if (!bookId || !chapter || chapter < 1) return;
  try {
    localStorage.setItem(
      READER_POSITION_KEY,
      JSON.stringify({ bookId, chapter, hasOpened: true } satisfies StoredReaderPosition),
    );
  } catch {
    // Ignore storage quota errors
  }
}
