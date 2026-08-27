import type { UserSettings, Verse, AppState, MemorySentenceProgress, ChapterProgress, ThemeProgress, BlockProgress, ReviewEvent, ColdCheckRecord } from '../types/models';
import { chapterProgressKey, blockProgressKey } from '../types/models';
import { appendReview } from '../utils/reviewLog';

// The app's state shape, its actions, and the pure reducer over both.
//
// Split out of AppContext.tsx, which exports the provider component: a file that mixes
// components with other exports breaks React Fast Refresh for everything in it, and the
// reducer is the part most worth importing elsewhere — the tests in scripts/ drive it
// directly, because whether a dispatched review actually lands in the history is exactly
// the kind of thing that fails silently and looks fine in the UI.

// --- INITIAL STATE ---
// The seeded library is offered, not imposed.
//
// A new reader used to open Today and find seventy-five passages already in their
// library and already due — someone else's choices, presented as work they owed. The
// first thing the app did was hand them a backlog they had not agreed to, which is a
// poor way to begin a practice that depends on the reader's own investment in what they
// are learning. The set is still there, one tap away, on the empty state.
export const initialState: AppState = {
  verses: [],
  streak: 0,
  lastActiveDate: null,
  theme: "black",
  sortOrder: "smart",
  memorySentenceProgress: {},
  chapterProgress: {},
  themeProgress: {},
  blockProgress: {},
  reviewLog: [],
  coldChecks: [],
  adherence: { started: 0, completed: 0, itemsGraded: 0, completedMs: 0, abandonedAtSum: 0, abandonedCount: 0 },
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
  | { type: 'POSTPONE_BACKLOG'; payload: { days: number } }
  | { type: 'RECORD_COLD_CHECK'; payload: ColdCheckRecord }
  | { type: 'SESSION_STARTED' }
  | { type: 'SESSION_COMPLETED'; payload: { itemsGraded: number; durationMs: number } }
  | { type: 'SESSION_ABANDONED'; payload: { atIndex: number } }
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

    case 'POSTPONE_BACKLOG': {
      // Spreading a backlog forward instead of leaving it as a wall.
      //
      // A reader returning after three weeks away meets several hundred overdue items and
      // a session cap of twenty, which means the backlog cannot shrink faster than it
      // grows and there is no way to say so. The alternative people actually reach for is
      // abandoning the library, so the app should offer something better than nothing.
      //
      // Only *overdue* items move, and they are fanned out across the window rather than
      // all pushed to the same day — dropping them on one future date would rebuild the
      // same wall a few weeks later. Nothing here touches interval, repetition or
      // efactor: this reschedules, it does not pretend anything was recalled.
      const { days } = action.payload;
      const now = Date.now();
      // Fanned across days 1..days inclusive.
      //
      // The first version used `floor((i / total) * days)`, which put item zero at day
      // zero — still overdue, unchanged — and never reached `days` at all: a single
      // overdue verse was "postponed" to right now, and sixty were postponed with the
      // first five still due today. Postponing has to move everything it touches, or the
      // wall it exists to dismantle is still standing when the reader returns.
      const spread = (i: number, total: number) =>
        new Date(now + (1 + Math.floor((i / Math.max(1, total)) * (days - 1))) * 86400000).toISOString();

      const overdueVerses = state.verses.filter(v => new Date(v.sm2.nextDueDate).getTime() <= now);
      let vi = 0;
      const verses = state.verses.map(v =>
        new Date(v.sm2.nextDueDate).getTime() <= now
          ? { ...v, sm2: { ...v.sm2, nextDueDate: spread(vi++, overdueVerses.length) } }
          : v);

      const chapterEntries = Object.entries(state.chapterProgress);
      const overdueChapters = chapterEntries.filter(([, p]) => p.attempts > 0 && new Date(p.sm2.nextDueDate).getTime() <= now);
      let ci = 0;
      const chapterProgress = { ...state.chapterProgress };
      for (const [key, p] of overdueChapters) {
        chapterProgress[key] = { ...p, sm2: { ...p.sm2, nextDueDate: spread(ci++, overdueChapters.length) } };
      }

      return { ...state, verses, chapterProgress };
    }

    case 'RECORD_COLD_CHECK':
      // Kept whole rather than capped: five items roughly monthly is a handful of rows a
      // year, and the entire value of this measurement is the trend across all of them.
      return { ...state, coldChecks: [...(state.coldChecks || []), action.payload] };

    // ── Adherence ────────────────────────────────────────────────────────────────
    // Counted separately from the review history because they answer a different
    // question. The history says whether recall is holding; these say whether anyone is
    // still turning up. A technique people abandon has an effect size of zero, so a rise
    // in retention alongside a collapse in completion is a loss — and until now the app
    // could not have told those apart.
    case 'SESSION_STARTED':
      return { ...state, adherence: { ...state.adherence, started: state.adherence.started + 1 } };

    case 'SESSION_COMPLETED':
      return {
        ...state,
        adherence: {
          ...state.adherence,
          completed: state.adherence.completed + 1,
          itemsGraded: state.adherence.itemsGraded + action.payload.itemsGraded,
          completedMs: state.adherence.completedMs + action.payload.durationMs,
        },
      };

    case 'SESSION_ABANDONED':
      // Where people stop is more useful than how often: consistently quitting at item
      // three says something specific about item three's cost that a completion rate does
      // not. Summed with a count so the mean survives without storing a row per session.
      return {
        ...state,
        adherence: {
          ...state.adherence,
          abandonedAtSum: state.adherence.abandonedAtSum + action.payload.atIndex,
          abandonedCount: state.adherence.abandonedCount + 1,
        },
      };

    case 'RECORD_ACTIVITY': {
      // Any graded review — a verse, a memory sentence, or a chapter — counts as a
      // day's activity toward the streak. One calendar day (not a rolling 24h
      // window) so reviewing at 11pm and again at 7am the same morning doesn't
      // silently cost the streak.
      const todayKey = new Date().toDateString();
      const lastKey = state.lastActiveDate ? new Date(state.lastActiveDate).toDateString() : null;
      if (todayKey === lastKey) return state;

      // One free miss per rolling week — not one free miss, always.
      //
      // A hundred-day run collapsing over a single bad Tuesday is the documented moment
      // people abandon a daily habit, and in a devotional product that cost is out of
      // all proportion to the accuracy gained by being strict. But forgiving *every*
      // gap of one day, as the first attempt at this did, makes the number meaningless:
      // reviewing Monday, Wednesday, Friday, Sunday would grow a "daily streak" forever
      // while the reader was practising half the time. A streak that survives anything
      // measures nothing and is worth nothing to look at.
      //
      // So the grace is real but finite: a one-day gap is forgiven only if there wasn't
      // another one in the past seven days. Two days away is a genuine break either way.
      // The unvarnished picture lives on the Retention screen as "N of the last 45
      // days", which neither punishes a miss nor pretends it didn't happen.
      const startOfDay = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      const daysSince = state.lastActiveDate
        ? Math.round((startOfDay(new Date()) - startOfDay(new Date(state.lastActiveDate))) / 86400000)
        : Infinity;

      // Whether the week's grace has already been spent, tracked directly.
      //
      // The first version inferred this from the review log — "were you active on six of
      // the last seven days?" — which is a different rule than the one stated, and wrong
      // twice over. It denied the free miss to anyone with fewer than six days of history
      // at all, so a new reader who practised every day for four and then missed one lost
      // everything. And it silently excluded the surfaces that keep a streak without
      // writing a graded review: a reader whose daily practice is the Memory Sentence
      // recorded activity, kept a streak, and had zero "active days" by that measure, so
      // their first missed day always reset it.
      //
      // Recording the grace itself has neither problem. It is one date, it means exactly
      // what the rule says, and it does not care which surface earned the day.
      const graceUsedAt = state.lastGraceDate ? new Date(state.lastGraceDate).getTime() : 0;
      const graceAvailable = Date.now() - graceUsedAt >= 7 * 86400000;

      const forgiven = daysSince === 2 && graceAvailable;
      const continues = daysSince <= 1 || forgiven;

      return {
        ...state,
        streak: continues ? state.streak + 1 : 1,
        lastActiveDate: new Date().toISOString(),
        ...(forgiven ? { lastGraceDate: new Date().toISOString() } : {}),
      };
    }
    default:
      return state;
  }
}

