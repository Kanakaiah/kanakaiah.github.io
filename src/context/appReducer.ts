import type { UserSettings, Verse, AppState, MemorySentenceProgress, ChapterProgress, ThemeProgress, BlockProgress, ReviewEvent } from '../types/models';
import { chapterProgressKey, blockProgressKey } from '../types/models';
import { appendReview } from '../utils/reviewLog';
import { SEED_VERSES } from '../data/seed';

// The app's state shape, its actions, and the pure reducer over both.
//
// Split out of AppContext.tsx, which exports the provider component: a file that mixes
// components with other exports breaks React Fast Refresh for everything in it, and the
// reducer is the part most worth importing elsewhere — the tests in scripts/ drive it
// directly, because whether a dispatched review actually lands in the history is exactly
// the kind of thing that fails silently and looks fine in the UI.

// --- INITIAL STATE ---
export const initialState: AppState = {
  verses: SEED_VERSES,
  streak: 0,
  lastActiveDate: null,
  theme: "black",
  sortOrder: "smart",
  memorySentenceProgress: {},
  chapterProgress: {},
  themeProgress: {},
  blockProgress: {},
  reviewLog: [],
  settings: {
    ttsEnabled: false,
    recallMasking: false,
    bionicReading: false,
    fontSize: 1,
    fontFamily: 'serif',
    bibleVersion: 'LSB',
    anchorReveal: 'tap',
    dailyChapterTarget: 3,
    streakIncludesChapters: true,
  }
};

// --- ACTION TYPES ---
export type AppAction =
  | { type: 'HYDRATE'; payload: AppState }
  | { type: 'ADD_VERSE'; payload: Verse }
  | { type: 'UPDATE_VERSE'; payload: Verse }
  | { type: 'DELETE_VERSE'; payload: string }
  | { type: 'HYDRATE_VERSES'; payload: Verse[] }
  | { type: 'SET_THEME'; payload: string }
  | { type: 'SET_SORT_ORDER'; payload: AppState['sortOrder'] }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'UPDATE_STREAK'; payload: { streak: number, lastActiveDate: string } }
  | { type: 'UPDATE_MEMORY_SENTENCE_PROGRESS'; payload: MemorySentenceProgress }
  | { type: 'GRADE_CHAPTER_PROGRESS'; payload: ChapterProgress }
  | { type: 'MARK_CHAPTER_READ'; payload: { bookId: string; chapter: number } }
  | { type: 'GRADE_THEME_PROGRESS'; payload: ThemeProgress }
  | { type: 'GRADE_BLOCK_PROGRESS'; payload: BlockProgress }
  | { type: 'RECORD_CHAIN_PASS'; payload: { bookId: string; results: { chapter: number; revealed: boolean }[] } }
  | { type: 'RECORD_REVIEW'; payload: ReviewEvent }
  | { type: 'RECORD_ACTIVITY' };

// --- REDUCER ---
// Exported for the tests in scripts/. It is a pure function of (state, action) and is
// where several of the app's real rules now live — that a chain pass records evidence
// and never a grade, that the streak counts calendar days, that the review history is
// append-only and capped. Those are worth pinning down somewhere cheaper than a browser.
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'HYDRATE': {
      // Deduplicate verses on load to clean up any corrupted state from older versions
      const verses = action.payload.verses || [];
      const uniqueVerses: typeof verses = [];
      const seen = new Set<string>();
      for (const v of verses) {
        const key = `${v.ref.toLowerCase()}-${v.translation?.toLowerCase() || 'lsb'}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueVerses.push(v);
        }
      }
      return {
        ...state,
        ...action.payload,
        verses: uniqueVerses,
        settings: {
          ...state.settings,
          ...(action.payload.settings || {})
        }
      };
    }
    case 'ADD_VERSE':
      return { ...state, verses: [...state.verses, action.payload] };
    case 'UPDATE_VERSE':
      return {
        ...state,
        verses: state.verses.map(v => v.id === action.payload.id ? action.payload : v)
      };
    case 'DELETE_VERSE':
      return {
        ...state,
        verses: state.verses.filter(v => v.id !== action.payload)
      };
    case 'HYDRATE_VERSES': {
      const existingKeys = new Set(state.verses.map(v => `${v.ref.toLowerCase()}-${v.translation?.toLowerCase() || 'lsb'}`));
      const uniqueNewVerses = action.payload.filter(v => !existingKeys.has(`${v.ref.toLowerCase()}-${v.translation?.toLowerCase() || 'lsb'}`));
      return {
        ...state,
        verses: [...state.verses, ...uniqueNewVerses]
      };
    }
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_SORT_ORDER':
      return { ...state, sortOrder: action.payload };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'UPDATE_STREAK':
      return { ...state, streak: action.payload.streak, lastActiveDate: action.payload.lastActiveDate };
    case 'UPDATE_MEMORY_SENTENCE_PROGRESS':
      return {
        ...state,
        memorySentenceProgress: {
          ...state.memorySentenceProgress,
          [action.payload.guideId]: action.payload,
        },
      };
    case 'GRADE_CHAPTER_PROGRESS': {
      const key = chapterProgressKey(action.payload.bookId, action.payload.chapter);
      return {
        ...state,
        chapterProgress: {
          ...state.chapterProgress,
          [key]: action.payload,
        },
      };
    }
    case 'MARK_CHAPTER_READ': {
      const { bookId, chapter } = action.payload;
      const key = chapterProgressKey(bookId, chapter);
      const existing = state.chapterProgress[key];
      const updated: ChapterProgress = existing
        ? { ...existing, readCount: existing.readCount + 1, lastReadDate: new Date().toISOString() }
        : {
            bookId,
            chapter,
            sm2: { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() },
            status: 'learning',
            attempts: 0,
            lastScore: 0,
            lastAttemptDate: '',
            readCount: 1,
            lastReadDate: new Date().toISOString(),
          };
      return {
        ...state,
        chapterProgress: {
          ...state.chapterProgress,
          [key]: updated,
        },
      };
    }
    case 'GRADE_THEME_PROGRESS':
      return {
        ...state,
        themeProgress: { ...state.themeProgress, [action.payload.bookId]: action.payload },
      };
    case 'GRADE_BLOCK_PROGRESS': {
      const key = blockProgressKey(action.payload.bookId, action.payload.blockIndex);
      return { ...state, blockProgress: { ...state.blockProgress, [key]: action.payload } };
    }
    case 'RECORD_CHAIN_PASS': {
      // One pass through a book's Memory Sentence. Records *evidence*, never a grade —
      // see the chainHits note on ChapterProgress. Deliberately does not touch `sm2`,
      // `status`, `attempts` or `lastScore`, so a chapter's real schedule and its
      // mastery level stay derived entirely from isolated cued recall.
      const { bookId, results } = action.payload;
      const now = new Date().toISOString();
      const chapterProgress = { ...state.chapterProgress };

      for (const { chapter, revealed } of results) {
        const key = chapterProgressKey(bookId, chapter);
        const existing = chapterProgress[key];
        const base: ChapterProgress = existing || {
          bookId,
          chapter,
          sm2: { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() },
          status: 'learning',
          attempts: 0,
          lastScore: 0,
          lastAttemptDate: '',
          readCount: 0,
          lastReadDate: null,
        };
        chapterProgress[key] = {
          ...base,
          chainHits: (base.chainHits || 0) + (revealed ? 0 : 1),
          chainMisses: (base.chainMisses || 0) + (revealed ? 1 : 0),
          lastChainDate: now,
        };
      }

      return { ...state, chapterProgress };
    }
    case 'RECORD_REVIEW':
      // Deliberately separate from the four GRADE_* actions rather than folded into
      // them. Those write *current state*, and each is dispatched from a surface that
      // knows only its own item kind; this writes history, is uniform across kinds, and
      // is capped. Keeping them apart means a new drill can start recording history
      // without touching the reducer, and a mistake in one cannot corrupt the other.
      return { ...state, reviewLog: appendReview(state.reviewLog || [], action.payload) };

    case 'RECORD_ACTIVITY': {
      // Any graded review — a verse, a memory sentence, or a chapter — counts as a
      // day's activity toward the streak. One calendar day (not a rolling 24h
      // window) so reviewing at 11pm and again at 7am the same morning doesn't
      // silently cost the streak.
      const todayKey = new Date().toDateString();
      const lastKey = state.lastActiveDate ? new Date(state.lastActiveDate).toDateString() : null;
      if (todayKey === lastKey) return state;

      const isYesterday = (() => {
        if (!lastKey) return false;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return lastKey === yesterday.toDateString();
      })();

      return {
        ...state,
        streak: isYesterday ? state.streak + 1 : 1,
        lastActiveDate: new Date().toISOString(),
      };
    }
    default:
      return state;
  }
}

