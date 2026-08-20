/**
 * How the study resources are grouped on the Bible index.
 *
 * The categories carried by the guides themselves aren't the same kind of thing —
 * "Methodology" is a purpose, "Word Studies" is a subject, "Reference" is a form — so
 * eight sibling headings asked the reader to work out the axis for themselves. These
 * sections group them by what someone came to do, and the categories survive as
 * sub-headings inside.
 *
 * A category that appears in no section still gets shown, under "More", so data added
 * later can never silently vanish from the page.
 */
export interface GuideGroup {
  /** Sub-heading. Omitted when a section holds a single group. */
  label?: string;
  categories: string[];
}

export interface GuideSection {
  id: string;
  title: string;
  blurb: string;
  /** Further reading is the largest group and the least often what you came for. */
  defaultOpen: boolean;
  groups: GuideGroup[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'how-to-study',
    title: 'How to study',
    blurb: 'Methods and checklists for working through a passage',
    defaultOpen: true,
    groups: [{ categories: ['Methodology'] }],
  },
  {
    id: 'studies',
    title: 'Studies',
    blurb: 'Prepared paths through a theme, a book, or a stretch of history',
    defaultOpen: true,
    groups: [
      { label: 'By theme', categories: ['Topical Studies', 'Thematic Guides'] },
      { label: 'By book', categories: ['Book Studies'] },
      { label: 'Timelines & maps', categories: ['Historical Timelines'] },
      { label: 'Words & names', categories: ['Word Studies'] },
      { label: 'Memory chains', categories: ['Memory Chains'] },
    ],
  },
  {
    id: 'further-reading',
    title: 'Further reading',
    blurb: 'Commentary series and the people behind them',
    defaultOpen: false,
    groups: [{ categories: ['Reference'] }],
  },
];

/** Every category any section claims, for spotting the ones none of them do. */
export const SECTIONED_CATEGORIES = new Set(
  GUIDE_SECTIONS.flatMap(s => s.groups.flatMap(g => g.categories))
);
