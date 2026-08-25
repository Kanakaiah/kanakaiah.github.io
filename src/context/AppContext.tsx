import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { UserSettings, Verse, AppState, MemorySentenceProgress } from '../types/models';
import { SEED_VERSES } from '../data/seed';

// --- INITIAL STATE ---
const initialState: AppState = {
  verses: SEED_VERSES,
  streak: 0,
  lastActiveDate: null,
  theme: "black",
  sortOrder: "smart",
  memorySentenceProgress: {},
  settings: {
    ttsEnabled: false,
    notificationsEnabled: false,
    recallMasking: false,
    bionicReading: false,
    fontSize: 1,
    fontFamily: 'serif',
    bibleVersion: 'LSB'
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
  | { type: 'UPDATE_MEMORY_SENTENCE_PROGRESS'; payload: MemorySentenceProgress };

// --- REDUCER ---
function appReducer(state: AppState, action: AppAction): AppState {
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
    default:
      return state;
  }
}

// --- CONTEXT ---
interface AppContextProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// Reads and merges any saved state synchronously, before the first render, via
// useReducer's lazy-init argument below. This used to happen in a mount effect
// that dispatched HYDRATE — but that effect's own sibling "save to localStorage"
// effect runs in the same post-mount flush, before the dispatch's state update
// has landed, so it saw isHydrated already flipped true but `state` still equal
// to initialState and wrote that stale, pre-hydration value straight back over
// the real saved data. React's Strict Mode double-invoke made this reliably
// reproducible: any field updated in the same session it was hydrated (verses
// included) would be silently reverted to its default on the very next reload.
// Loading synchronously here means the first render already has the right data,
// so there's no separate hydration phase left for the save effect to race.
function loadInitialState(): AppState {
  try {
    const stored = localStorage.getItem('remora_data');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.verses)) {
        // Migrate old themes
        if (parsed.theme && !['black', 'dark', 'sepia', 'white'].includes(parsed.theme)) {
          parsed.theme = 'black';
        }
        // Deduplicate verses on load to clean up any corrupted state from older versions
        const seen = new Set<string>();
        const uniqueVerses: Verse[] = [];
        for (const v of parsed.verses as Verse[]) {
          const key = `${v.ref.toLowerCase()}-${v.translation?.toLowerCase() || 'lsb'}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueVerses.push(v);
          }
        }
        return {
          ...initialState,
          ...parsed,
          verses: uniqueVerses,
          settings: { ...initialState.settings, ...(parsed.settings || {}) },
        };
      }
    }
  } catch (e) {
    console.error("Failed to parse local storage", e);
  }
  return initialState;
}

// --- PROVIDER ---
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, undefined, loadInitialState);

  // Save to localStorage on every state change. State is already correct on the
  // very first render (loadInitialState above), so there's no pre-hydration
  // phase here to guard against.
  useEffect(() => {
    localStorage.setItem('remora_data', JSON.stringify(state));
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', state.theme);
    // Remove global font scaling on root HTML; font size will be applied directly to verse text instead.
    document.documentElement.style.fontSize = '';
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
