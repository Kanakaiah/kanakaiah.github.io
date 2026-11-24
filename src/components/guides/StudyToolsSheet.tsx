import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Globe, Headphones, PlayCircle, Radio } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { PENTATEUCH_COMMENTARIES } from '../../data/pentateuchCommentaries';
import { HISTORICAL_COMMENTARIES } from '../../data/historicalCommentaries';
import { WISDOM_COMMENTARIES } from '../../data/wisdomCommentaries';
import { MAJOR_PROPHETS_COMMENTARIES } from '../../data/majorProphetsCommentaries';
import { MINOR_PROPHETS_COMMENTARIES } from '../../data/minorProphetsCommentaries';
import { GOSPELS_COMMENTARIES } from '../../data/gospelsCommentaries';
import { ACTS_COMMENTARIES } from '../../data/actsCommentaries';
import { PAULINE_COMMENTARIES } from '../../data/paulineCommentaries';
import { GENERAL_EPISTLES_COMMENTARIES } from '../../data/generalEpistlesCommentaries';
import { REVELATION_COMMENTARIES } from '../../data/revelationCommentaries';
import { PREACHERS_GUIDE } from '../../data/preachers';

export interface ResourceLink {
  type?: string;
  title: string;
  url: string;
}

export interface StudyEntry {
  rank: string;
  person: string;
  reference?: string;
  quote: string;
  note?: string;
  resources?: ResourceLink[];
}

export interface StudySection {
  heading: string;
  description?: string;
  entries?: StudyEntry[];
  note?: string;
  keyVerse?: { ref: string; text: string };
}

export interface CommentarySeries {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  sections: StudySection[];
}

interface SeriesEntry {
  series: CommentarySeries;
  bookIds: string[];
}

const SERIES_CATALOG: SeriesEntry[] = [
  {
    series: PENTATEUCH_COMMENTARIES as CommentarySeries,
    bookIds: ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy'],
  },
  {
    series: HISTORICAL_COMMENTARIES as CommentarySeries,
    bookIds: [
      'joshua', 'judges', 'ruth', '1samuel', '2samuel', '1kings', '2kings',
      '1chronicles', '2chronicles', 'ezra', 'nehemiah', 'esther',
    ],
  },
  {
    series: WISDOM_COMMENTARIES as CommentarySeries,
    bookIds: ['job', 'psalms', 'proverbs', 'ecclesiastes', 'songofsolomon'],
  },
  {
    series: MAJOR_PROPHETS_COMMENTARIES as CommentarySeries,
    bookIds: ['isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel'],
  },
  {
    series: MINOR_PROPHETS_COMMENTARIES as CommentarySeries,
    bookIds: [
      'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum',
      'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
    ],
  },
  {
    series: GOSPELS_COMMENTARIES as CommentarySeries,
    bookIds: ['matthew', 'mark', 'luke', 'john'],
  },
  {
    series: ACTS_COMMENTARIES as CommentarySeries,
    bookIds: ['acts'],
  },
  {
    series: PAULINE_COMMENTARIES as CommentarySeries,
    bookIds: [
      'romans', '1corinthians', '2corinthians', 'galatians', 'ephesians',
      'philippians', 'colossians', '1thessalonians', '2thessalonians',
      '1timothy', '2timothy', 'titus', 'philemon',
    ],
  },
  {
    series: GENERAL_EPISTLES_COMMENTARIES as CommentarySeries,
    bookIds: ['hebrews', 'james', '1peter', '2peter', '1john', '2john', '3john', 'jude'],
  },
  {
    series: REVELATION_COMMENTARIES as CommentarySeries,
    bookIds: ['revelation'],
  },
];

export function getCommentarySeriesForBook(bookId?: string | null): SeriesEntry | null {
  if (!bookId) return null;
  return SERIES_CATALOG.find((entry) => entry.bookIds.includes(bookId)) || null;
}

export function hasCommentaryForBook(bookId?: string | null): boolean {
  return getCommentarySeriesForBook(bookId) !== null;
}

function sectionMatchesBook(heading: string, bookName?: string | null): boolean {
  if (!bookName) return true;
  const h = heading.toLowerCase();
  const name = bookName.toLowerCase();
  if (h.includes(name)) return true;
  if (name === 'psalms' && h.includes('psalm')) return true;
  if (name === 'song of solomon' && (h.includes('song') || h.includes('canticles'))) return true;
  return false;
}

function ResourceIcon({ type }: { type?: string }) {
  if (type === 'book') return <BookOpen className="h-3.5 w-3.5 shrink-0" />;
  if (type === 'audio') return <Headphones className="h-3.5 w-3.5 shrink-0" />;
  if (type === 'youtube') return <PlayCircle className="h-3.5 w-3.5 shrink-0" />;
  if (type === 'podcast') return <Radio className="h-3.5 w-3.5 shrink-0" />;
  return <Globe className="h-3.5 w-3.5 shrink-0" />;
}

function resourceTone(type?: string): string {
  if (type === 'book') return 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20';
  if (type === 'audio') return 'text-purple-400 bg-purple-400/10 border-purple-400/20 hover:bg-purple-400/20';
  if (type === 'youtube') return 'text-red-500 bg-red-500/10 border-red-500/20 hover:bg-red-500/20';
  if (type === 'podcast') return 'text-rose-400 bg-rose-400/10 border-rose-400/20 hover:bg-rose-400/20';
  return 'text-sky-400 bg-sky-400/10 border-sky-400/20 hover:bg-sky-400/20';
}

interface CommentaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookId?: string | null;
  bookName?: string | null;
}

/**
 * Interactive modal sheet browsing scholarly commentary series, defaulting to
 * the current book's series and filtering to that book when requested.
 */
export const CommentaryModal: React.FC<CommentaryModalProps> = ({
  isOpen,
  onClose,
  bookId,
  bookName,
}) => {
  const defaultEntry = useMemo(
    () => getCommentarySeriesForBook(bookId) || SERIES_CATALOG[0],
    [bookId],
  );
  const [selectedSeriesId, setSelectedSeriesId] = useState(defaultEntry.series.id);
  const [filterToBook, setFilterToBook] = useState(Boolean(bookId && bookName));

  useEffect(() => {
    if (isOpen) {
      setSelectedSeriesId(defaultEntry.series.id);
      setFilterToBook(Boolean(bookId && bookName && defaultEntry.bookIds.includes(bookId)));
    }
  }, [isOpen, defaultEntry, bookId, bookName]);

  const currentEntry =
    SERIES_CATALOG.find((e) => e.series.id === selectedSeriesId) || defaultEntry;
  const canFilter = Boolean(bookId && bookName && currentEntry.bookIds.includes(bookId));

  const visibleSections = useMemo(() => {
    if (!filterToBook || !canFilter) return currentEntry.series.sections;
    const filtered = currentEntry.series.sections.filter((s) =>
      sectionMatchesBook(s.heading, bookName),
    );
    return filtered.length > 0 ? filtered : currentEntry.series.sections;
  }, [currentEntry, filterToBook, canFilter, bookName]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      size="lg"
      title="Commentary"
      subtitle={currentEntry.series.title}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SERIES_CATALOG.map(({ series }) => {
            const active = series.id === currentEntry.series.id;
            const shortTitle = series.title
              .replace(/\s*Commentary Series$/i, '')
              .trim();
            return (
              <button
                key={series.id}
                type="button"
                onClick={() => {
                  setSelectedSeriesId(series.id);
                  setFilterToBook(false);
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 min-h-[36px] rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-card-border bg-card-elevated text-secondary hover:text-primary'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                {shortTitle}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">
            {filterToBook && canFilter
              ? `Scholarly guides for ${bookName}`
              : currentEntry.series.subtitle}
          </p>
          {canFilter && bookName && (
            <button
              type="button"
              onClick={() => setFilterToBook((v) => !v)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                filterToBook
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-card-border bg-card-elevated text-secondary hover:text-primary'
              }`}
            >
              Only {bookName}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {visibleSections.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No commentary entries available for this section.
            </p>
          ) : (
            visibleSections.map((sec, si) => (
              <div key={si} className="flex flex-col gap-3">
                <div className="border-b border-card-border pb-1.5">
                  <h3 className="font-heading text-base font-bold text-primary">
                    {sec.heading}
                  </h3>
                  {sec.description && (
                    <p className="mt-0.5 text-xs text-secondary">{sec.description}</p>
                  )}
                </div>

                {sec.entries?.map((entry, ei) => (
                  <div
                    key={ei}
                    className="flex flex-col gap-2 rounded-xl border border-card-border bg-card-elevated/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="rounded bg-accent/15 px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider text-accent">
                          {entry.rank}
                        </span>
                        <span className="font-heading text-sm font-bold text-primary">
                          {entry.person}
                        </span>
                      </div>
                      {entry.reference && (
                        <span className="text-xs font-semibold text-muted">
                          {entry.reference}
                        </span>
                      )}
                    </div>
                    <p className="border-l-2 border-accent/40 pl-3 font-serif text-sm italic leading-relaxed text-primary">
                      "{entry.quote}"
                    </p>
                    {entry.note && (
                      <p className="text-xs leading-relaxed text-secondary">{entry.note}</p>
                    )}
                    {entry.resources && entry.resources.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {entry.resources.map((res, ri) => (
                          <a
                            key={ri}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${resourceTone(res.type)}`}
                          >
                            <ResourceIcon type={res.type} />
                            <span className="max-w-[200px] truncate">{res.title}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {sec.note && (
                  <p className="border-l-2 border-accent/40 pl-3 text-xs leading-relaxed text-secondary">
                    <strong className="text-accent">Note:</strong> {sec.note}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

interface TheologiansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Interactive modal sheet showcasing preachers and theologians across church eras.
 */
export const TheologiansModal: React.FC<TheologiansModalProps> = ({ isOpen, onClose }) => {
  const eras = PREACHERS_GUIDE.sections || [];
  const [selectedEra, setSelectedEra] = useState(0);
  const currentEra = eras[selectedEra] || eras[0];

  useEffect(() => {
    if (isOpen) setSelectedEra(0);
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      size="lg"
      title="Preachers & theologians"
      subtitle="Major figures across church history"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {eras.map((era, index) => {
            const active = index === selectedEra;
            return (
              <button
                key={era.heading}
                type="button"
                onClick={() => setSelectedEra(index)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-card-border bg-card-elevated text-secondary hover:text-primary'
                }`}
              >
                {era.heading}
              </button>
            );
          })}
        </div>

        {currentEra?.description && (
          <p className="text-xs text-muted">{currentEra.description}</p>
        )}

        <div className="flex flex-col gap-3">
          {currentEra?.entries?.map((entry, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-2 rounded-xl border border-card-border bg-card-elevated/60 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-heading text-base font-bold text-primary">
                  {entry.person}
                </h4>
                <span className="text-xs font-semibold text-accent">{entry.rank}</span>
              </div>
              {entry.reference && (
                <p className="text-xs font-medium text-muted">{entry.reference}</p>
              )}
              <p className="text-sm leading-relaxed text-secondary">{entry.quote}</p>
              {entry.resources && entry.resources.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1">
                  {entry.resources.map((res, ri) => (
                    <a
                      key={ri}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-lg border border-card-border bg-card px-3 py-2 text-xs font-semibold text-accent hover:border-accent/50 transition-colors"
                    >
                      <span className="truncate">{res.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
