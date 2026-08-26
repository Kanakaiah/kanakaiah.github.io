import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import type { AppState, Verse } from '../types/models';
import { appReducer, initialState, type AppAction } from './appReducer';

// Re-exported so the many screens that already import their action type from here keep
// working; the shape itself now lives beside the reducer that consumes it.
export type { AppAction } from './appReducer';

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
          // A profile saved before chapterProgress existed has no key for it —
          // spreading `parsed` over `initialState` above already backfills {},
          // this just guards against a stored `null` from a corrupted write.
          chapterProgress: parsed.chapterProgress || {},
          // Profiles saved before theme recall existed have no key for it. The spread
          // above already backfills {}; this guards a stored null from a bad write.
          themeProgress: parsed.themeProgress || {},
          blockProgress: parsed.blockProgress || {},
          // Profiles saved before the review history existed have no key for it. The
          // spread above backfills [], and this guards a stored null from a bad write —
          // an Array check rather than `|| []` because a corrupted object here would make
          // every selector throw, on screens the reader then cannot get out of.
          reviewLog: Array.isArray(parsed.reviewLog) ? parsed.reviewLog : [],
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

  // Save to localStorage, debounced. Every dispatch used to re-serialize the whole
  // state synchronously in this effect — cheap with a verse library, much less so
  // once chapterProgress can hold over a thousand records (the full Bible), so a
  // burst of dispatches (typing in Add Verse, paging through a reading session)
  // would otherwise re-stringify the growing blob on every keystroke. Trailing
  // debounce coalesces a burst into one write; the visibilitychange flush makes
  // sure the last write still lands if the tab is closed or backgrounded mid-burst.
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestState = useRef(state);
  latestState.current = state;

  useEffect(() => {
    // Apply theme immediately — a visual change shouldn't wait on the debounce.
    document.documentElement.setAttribute('data-theme', state.theme);
    document.documentElement.style.fontSize = '';

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      localStorage.setItem('remora_data', JSON.stringify(latestState.current));
    }, 300);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [state]);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') {
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        localStorage.setItem('remora_data', JSON.stringify(latestState.current));
      }
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

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
