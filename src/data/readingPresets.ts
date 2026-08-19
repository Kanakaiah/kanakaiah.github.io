import type { UserSettings } from '../types/models';

/**
 * Named starting points for how much apparatus the chapter reader shows, so the common
 * cases are one tap instead of three. The preset is not stored: it's derived by matching
 * the toggles, which means changing any toggle simply reads as "Custom" — there's no
 * saved label that can drift out of sync with what's actually on screen.
 */
export interface ReadingDisplay {
  showSectionHeadings: boolean;
  showVerseNumbers: boolean;
  showParagraphMarks: boolean;
  showCrossRefMarkers: boolean;
}

export type ReadingPreset = 'study' | 'reading' | 'clean' | 'custom';

export const READING_PRESETS: Record<Exclude<ReadingPreset, 'custom'>, ReadingDisplay> = {
  // Everything the text carries — the reader's long-standing behavior, and the default.
  study: { showSectionHeadings: true, showVerseNumbers: true, showParagraphMarks: true, showCrossRefMarkers: true },
  // Keeps your place, drops the paragraph pilcrows.
  reading: { showSectionHeadings: true, showVerseNumbers: true, showParagraphMarks: false, showCrossRefMarkers: false },
  // Headings only, so the text reads as prose.
  clean: { showSectionHeadings: true, showVerseNumbers: false, showParagraphMarks: false, showCrossRefMarkers: false },
};

export const READING_PRESET_LABELS: Record<ReadingPreset, string> = {
  study: 'Study',
  reading: 'Reading',
  clean: 'Clean',
  custom: 'Custom',
};

/** Settings default to on, matching how the reader behaved before these existed. */
export function readingDisplay(settings: UserSettings): ReadingDisplay {
  return {
    showSectionHeadings: settings.showSectionHeadings !== false,
    showVerseNumbers: settings.showVerseNumbers !== false,
    showParagraphMarks: settings.showParagraphMarks !== false,
    showCrossRefMarkers: settings.showCrossRefMarkers !== false,
  };
}

export function activePreset(settings: UserSettings): ReadingPreset {
  const current = readingDisplay(settings);

  for (const [name, preset] of Object.entries(READING_PRESETS)) {
    const matches = (Object.keys(preset) as (keyof ReadingDisplay)[]).every(k => preset[k] === current[k]);
    if (matches) return name as ReadingPreset;
  }

  return 'custom';
}
