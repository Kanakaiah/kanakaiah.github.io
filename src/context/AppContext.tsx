import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { UserSettings, Verse, AppState } from '../types/models';
import { SEED_VERSES } from '../data/seed';

// --- INITIAL STATE ---
const initialState: AppState = {
  verses: SEED_VERSES,
  streak: 0,
  lastActiveDate: null,
  theme: "nebula",
  sortOrder: "smart",
  hasSeeded100: false,
  settings: {
    ttsEnabled: false,
    notificationsEnabled: false,
    recallMasking: false,
    bionicReading: false,
    fontSize: 1
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
  | { type: 'UPDATE_STREAK'; payload: { streak: number, lastActiveDate: string } };

// --- REDUCER ---
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload };
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
    case 'HYDRATE_VERSES':
      return {
        ...state,
        verses: [...state.verses, ...action.payload]
      };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_SORT_ORDER':
      return { ...state, sortOrder: action.payload };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'UPDATE_STREAK':
      return { ...state, streak: action.payload.streak, lastActiveDate: action.payload.lastActiveDate };
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

// --- PROVIDER ---
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('remora_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Basic schema validation
        if (parsed && Array.isArray(parsed.verses)) {
          dispatch({ type: 'HYDRATE', payload: parsed as AppState });
        }
      }
    } catch (e) {
      console.error("Failed to parse local storage", e);
    }
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    localStorage.setItem('remora_data', JSON.stringify(state));
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', state.theme);
    // Apply global font scale by adjusting the root HTML font size (scales all rem units)
    document.documentElement.style.fontSize = `${(state.settings.fontSize || 1) * 100}%`;
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
