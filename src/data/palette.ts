// Shared colour vocabulary for the Bible's shape — used anywhere a book, chapter
// block, or canon division needs a consistent tint: the book guide's chapter
// distribution bar, the Bible index and testament browser, the shape meter, and
// the book index modal. One palette so "amber" means the same thing everywhere a
// reader sees it, rather than each screen picking its own.

export interface SwatchColors {
  bg: string;
  text: string;
  border: string;
}

// Per-block colours within a single book's chapter distribution — cycled, not tied
// to any particular meaning. Previously lived inline in Guides.tsx.
export const DISTRIBUTION_COLORS: SwatchColors[] = [
  { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-l-amber-500' },
  { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-l-blue-500' },
  { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-l-emerald-500' },
  { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-l-orange-500' },
  { bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-l-indigo-500' },
  { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-l-slate-500' },
  { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-l-pink-500' },
];

export interface Division {
  id: string;
  label: string;
  /** The book-section strings (OT_SECTIONS / NT_SECTIONS) folded into this division. */
  sections: string[];
  color: SwatchColors;
}

// Fourteen book sections (5 OT + 9 NT) is too many colours to hold in memory — the
// point of a division colour is that a reader can eventually recognize it on sight,
// which needs a small, stable set. Seven divisions is small enough to learn and
// still tracks a meaningful shape of the canon.
export const DIVISIONS: Division[] = [
  { id: 'law', label: 'Law', sections: ['Pentateuch'], color: { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500' } },
  { id: 'history', label: 'History', sections: ['Historical Books'], color: { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' } },
  { id: 'wisdom', label: 'Wisdom', sections: ['Wisdom Literature'], color: { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500' } },
  { id: 'prophets', label: 'Prophets', sections: ['Major Prophets', 'Minor Prophets'], color: { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500' } },
  { id: 'gospels-acts', label: 'Gospels & Acts', sections: ['Gospels', 'Acts'], color: { bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500' } },
  { id: 'epistles', label: 'Epistles', sections: ['Paul — Major', 'Paul — Minor', 'Pastorals', 'General Epistles', "John's Letters", 'Last Stand'], color: { bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500' } },
  { id: 'apocalypse', label: 'Apocalypse', sections: ['Apocalypse'], color: { bg: 'bg-violet-500', text: 'text-violet-500', border: 'border-violet-500' } },
];

const SECTION_TO_DIVISION: Record<string, Division> = Object.fromEntries(
  DIVISIONS.flatMap(div => div.sections.map(section => [section, div]))
);

const FALLBACK_DIVISION: Division = DIVISIONS[0];

/** The division a book's own `section` field falls under. Falls back to Law's
 * colour (never surfaced — every current section is mapped) rather than throwing,
 * so a future section added to otBooks/ntBooks degrades instead of crashing. */
export function divisionForSection(section: string): Division {
  return SECTION_TO_DIVISION[section] || FALLBACK_DIVISION;
}
