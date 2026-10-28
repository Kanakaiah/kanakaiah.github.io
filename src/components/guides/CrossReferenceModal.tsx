import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpen,
  Copy,
  Check,
  Loader2,
  Layers,
  Languages,
  Filter,
} from 'lucide-react';
import { OT_BOOKS } from '../../data/otBooks';
import { NT_BOOKS } from '../../data/ntBooks';
import { BIBLE_VERSION_LABELS } from '../../data/bibleMap';
import { getBookName } from '../../utils/localization';
import {
  CrossReferenceIndex,
  OriginalWordsIndex,
  loadCrossReferenceIndex,
  loadOriginalWordsIndex,
  getCrossReferenceIndexIfLoaded,
  getOriginalWordsIndexIfLoaded,
  toVerseIndex,
  fromVerseIndex,
  isValidVerseIndex,
  formatVerseIndexRange,
  collectConnections,
  groupConnectionsByBook,
  landingNote,
  GENRES,
  VERSE_GENRES,
  type Connection,
  type LandingNote,
} from '../../utils/verseConnections';
import { fetchPassageRangeSnippet, type PassageSnippetResult } from '../../utils/verseText';
import { useApp } from '../../context/AppContext';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

const INITIAL_ITEMS = 40;
const INITIAL_WORDS = 6;

interface CrossReferenceModalProps {
  verseRefs: string[];
  onClose: () => void;
  onNavigateToVerse: (bookId: string, chapter: number, verse: number, fromRef: string) => void;
  crossRefIndex?: CrossReferenceIndex | null;
  /** Optional initial section to scroll to (e.g. 'same-word' when opened via Study Words). */
  initialSection?: 'references' | 'referenced-by' | 'same-word';
}

function parseRefToVidRange(verseRefs: string[]): { startVid: number; endVid: number; initialFromRef: string } | null {
  if (!verseRefs || verseRefs.length === 0) return null;
  const vids: number[] = [];
  for (const raw of verseRefs) {
    const m = raw.trim().match(/^(.+?)\s+(\d+):(\d+)(?:[-–](\d+))?$/);
    if (!m) continue;
    const bookPart = m[1].trim().toLowerCase();
    const book = ALL_BOOKS.find(
      b => b.id === bookPart || b.name.toLowerCase() === bookPart || b.id === bookPart.replace(/\s+/g, '')
    );
    if (!book) continue;
    const ch = parseInt(m[2], 10);
    const vStart = parseInt(m[3], 10);
    const vEnd = m[4] ? parseInt(m[4], 10) : vStart;
    for (let v = vStart; v <= vEnd; v++) {
      const vid = toVerseIndex(book.id, ch, v);
      if (vid !== null) vids.push(vid);
    }
  }
  if (vids.length === 0) return null;
  vids.sort((a, b) => a - b);
  return {
    startVid: vids[0],
    endVid: vids[vids.length - 1],
    initialFromRef: verseRefs[0],
  };
}

function describeNote(
  note: LandingNote,
  localizeBook: (bookId: string, defaultName: string) => string
): string {
  switch (note.kind) {
    case 'range':
      return `to ${formatVerseIndexRange(note.start, note.end, localizeBook)}`;
    case 'from-verse':
      return `from v. ${note.verse}`;
    case 'to-verse':
      return `to v. ${note.verse}`;
  }
}

/**
 * Lazy-loaded inline verse snippet for a single verse or range of verses (up to 12 verses,
 * matching `ConnectionText` in `trekhleb/bible-cross-references`).
 */
const PassageSnippet: React.FC<{
  version: string;
  startVid: number;
  endVid: number;
  localizeBook: (bookId: string, defaultName: string) => string;
  className?: string;
}> = ({ version, startVid, endVid, localizeBook, className }) => {
  const [snippet, setSnippet] = useState<PassageSnippetResult | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setSnippet(null);
    setError(false);

    fetchPassageRangeSnippet(version, startVid, endVid, 12)
      .then(res => {
        if (active) setSnippet(res);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, [version, startVid, endVid]);

  if (error) {
    return <span className="text-xs text-muted italic">Unable to load verse text.</span>;
  }

  if (!snippet) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading…
      </span>
    );
  }

  if (startVid === endVid) {
    const text = snippet.verses[0]?.text;
    return (
      <span className={className || 'text-base sm:text-[17px] text-primary/95 leading-relaxed block'}>
        {text || <span className="italic text-muted">Omitted in this translation.</span>}
      </span>
    );
  }

  const first = snippet.verses[0];
  return (
    <span className={className || 'text-base sm:text-[17px] text-primary/95 leading-relaxed block'}>
      {snippet.verses.map(v => {
        const coord = fromVerseIndex(v.vid);
        const mark =
          v.bollsId !== first.bollsId
            ? `${localizeBook(coord.bookId, coord.bookName)} ${v.chapter}:${v.verse}`
            : v.chapter !== first.chapter
              ? `${v.chapter}:${v.verse}`
              : `${v.verse}`;
        return (
          <Fragment key={v.vid}>
            <sup className="text-[0.65em] font-bold text-muted mr-1 select-none">{mark}</sup>
            {v.text}{' '}
          </Fragment>
        );
      })}
      {snippet.moreCount > 0 && (
        <span className="text-xs font-semibold text-accent ml-1">
          + {snippet.moreCount} more {snippet.moreCount === 1 ? 'verse' : 'verses'}
        </span>
      )}
    </span>
  );
};

/**
 * Sticky collapsible section header band modeled after `PanelSection` in `trekhleb/bible-cross-references`.
 */
const PanelSection: React.FC<{
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  count?: number;
  trailing?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ id, icon, title, description, count, trailing, defaultOpen = true, children }) => {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`remora_panel_${id}`);
      if (saved !== null) return saved === '1';
    } catch {
      // ignore
    }
    return defaultOpen;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(`remora_panel_${id}`, next ? '1' : '0');
    } catch {
      // ignore
    }
  };

  return (
    <section id={`panel-section-${id}`} className="border-t border-card-border">
      <h3 className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-card-border/60">
        <button
          type="button"
          aria-expanded={open}
          onClick={toggle}
          className="w-full flex items-center gap-2.5 px-5 py-3 text-left hover:bg-card-hover/60 transition-colors"
        >
          <span className="text-accent flex-shrink-0">{icon}</span>
          <span className="font-bold text-base text-primary tracking-tight">{title}</span>
          <span className="text-sm text-muted truncate flex-1">{description}</span>
          {trailing}
          {count !== undefined && (
            <span className="text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-card-elevated border border-card-border text-secondary">
              {count.toLocaleString()}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted transition-transform duration-200 flex-shrink-0 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      </h3>
      {open && <div className="divide-y divide-card-border/40">{children}</div>}
    </section>
  );
};

export const CrossReferenceModal: React.FC<CrossReferenceModalProps> = ({
  verseRefs,
  onClose,
  onNavigateToVerse,
  crossRefIndex: propCrossRefIndex,
  initialSection,
}) => {
  const { state } = useApp();
  const bibleVersion = state.settings.bibleVersion || 'LSB';
  const versionLabel = BIBLE_VERSION_LABELS[bibleVersion] || bibleVersion;

  const initialRange = useMemo(() => parseRefToVidRange(verseRefs), [verseRefs]);
  const [focusRange, setFocusRange] = useState<{ startVid: number; endVid: number }>(() =>
    initialRange ? { startVid: initialRange.startVid, endVid: initialRange.endVid } : { startVid: 0, endVid: 0 }
  );

  // Sync if prop changes
  useEffect(() => {
    if (initialRange) {
      setFocusRange({ startVid: initialRange.startVid, endVid: initialRange.endVid });
    }
  }, [initialRange]);

  const [xrefIndex, setXrefIndex] = useState<CrossReferenceIndex | null>(
    propCrossRefIndex ?? getCrossReferenceIndexIfLoaded()
  );
  const [wordsIndex, setWordsIndex] = useState<OriginalWordsIndex | null>(
    getOriginalWordsIndexIfLoaded()
  );
  const [loadingIndex, setLoadingIndex] = useState<boolean>(!xrefIndex);
  const [error, setError] = useState<string | null>(null);

  // Vote filter: default >= 4 votes (matching trekhleb DEFAULT_LINK_FILTER), toggleable to All (-Infinity)
  const [minVotes, setMinVotes] = useState<number>(4);

  // Pagination & expansion states reset when focused passage changes
  const [outLimit, setOutLimit] = useState<number>(INITIAL_ITEMS);
  const [inLimit, setInLimit] = useState<number>(INITIAL_ITEMS);
  const [wordsExpanded, setWordsExpanded] = useState<boolean>(false);
  const [openWordIndex, setOpenWordIndex] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOutLimit(INITIAL_ITEMS);
    setInLimit(INITIAL_ITEMS);
    setWordsExpanded(false);
    setOpenWordIndex(null);
    if (scrollRef.current && !initialSection) {
      scrollRef.current.scrollTop = 0;
    }
  }, [focusRange.startVid, focusRange.endVid, initialSection]);

  useEffect(() => {
    let active = true;
    if (!xrefIndex) {
      setLoadingIndex(true);
      loadCrossReferenceIndex()
        .then(loaded => {
          if (active) {
            setXrefIndex(loaded);
            setLoadingIndex(false);
          }
        })
        .catch(err => {
          if (active) {
            setError(err.message || 'Failed to load cross-references.');
            setLoadingIndex(false);
          }
        });
    }
    if (!wordsIndex) {
      loadOriginalWordsIndex()
        .then(loaded => {
          if (active) setWordsIndex(loaded);
        })
        .catch(() => {
          // Non-fatal: words section simply remains hidden if offline and uncached
        });
    }
    return () => {
      active = false;
    };
  }, [xrefIndex, wordsIndex]);

  // Scroll to initialSection if requested (e.g., 'same-word')
  useEffect(() => {
    if (!initialSection || loadingIndex) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`panel-section-${initialSection}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(timer);
  }, [initialSection, loadingIndex, wordsIndex]);

  // Escape key closes modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const localizeBook = (bookId: string, defaultName: string) =>
    getBookName(bookId, defaultName, bibleVersion);

  const startCoord = fromVerseIndex(focusRange.startVid);
  const isSingleVerse = focusRange.startVid === focusRange.endVid;
  const titleRef = formatVerseIndexRange(focusRange.startVid, focusRange.endVid, localizeBook);

  const prevVid = isValidVerseIndex(focusRange.startVid - 1) ? focusRange.startVid - 1 : null;
  const nextVid = isValidVerseIndex(focusRange.endVid + 1) ? focusRange.endVid + 1 : null;

  const connections = useMemo(() => {
    if (!xrefIndex) return { outgoing: [], incoming: [] };
    return collectConnections(xrefIndex, focusRange.startVid, focusRange.endVid, minVotes);
  }, [xrefIndex, focusRange.startVid, focusRange.endVid, minVotes]);

  const allConnections = useMemo(
    () => [...connections.outgoing, ...connections.incoming],
    [connections]
  );

  // Genre breakdown
  const genreCounts = useMemo(() => {
    const counts = new Array<number>(GENRES.length).fill(0);
    for (const conn of allConnections) {
      const g = VERSE_GENRES[conn.otherStart] ?? 0;
      counts[g] = (counts[g] ?? 0) + 1;
    }
    const max = Math.max(1, ...counts);
    const present = GENRES.filter(g => (counts[g.ordinal] ?? 0) > 0);
    return { counts, max, present };
  }, [allConnections]);

  // Original words for single focused verse
  const originalWords = useMemo(() => {
    if (!wordsIndex || !isSingleVerse) return [];
    return wordsIndex.wordsOf(focusRange.startVid);
  }, [wordsIndex, isSingleVerse, focusRange.startVid]);

  const handleCopyPassage = async (startVid: number, endVid: number, key: string) => {
    try {
      const snippet = await fetchPassageRangeSnippet(bibleVersion, startVid, endVid, 30);
      const text = snippet.verses.map(v => v.text).filter(Boolean).join(' ');
      const refStr = formatVerseIndexRange(startVid, endVid, localizeBook);
      await navigator.clipboard.writeText(`"${text}"\n— ${refStr} (${versionLabel})`);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 1600);
    } catch {
      // ignore
    }
  };

  const fromRefString = initialRange?.initialFromRef || `${startCoord.bookName.toLowerCase()} ${startCoord.chapter}:${startCoord.verse}`;

  const renderConnectionSection = (
    id: 'references' | 'referenced-by',
    icon: React.ReactNode,
    title: string,
    description: string,
    list: readonly Connection[],
    limit: number,
    setLimit: (n: number) => void
  ) => {
    const visible = list.slice(0, limit);
    const groups = groupConnectionsByBook(visible);

    return (
      <PanelSection
        id={id}
        icon={icon}
        title={title}
        description={description}
        count={list.length}
        defaultOpen={true}
      >
        {list.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted italic">None at this vote filter.</p>
        ) : (
          groups.map(group => {
            const localizedBookName = localizeBook(group.bookId, group.bookName);
            return (
              <div
                key={`${group.bollsId}-${group.connections[0]?.otherStart}`}
                className="py-2"
              >
                {/* Book group header */}
                <div className="px-5 py-2 flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-secondary bg-card/40">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.genre.hex }}
                  />
                  <span>{localizedBookName}</span>
                  <span className="text-muted font-semibold tabular-nums ml-auto">
                    {group.connections.length}
                  </span>
                </div>

                <div className="divide-y divide-card-border/30">
                  {group.connections.map(conn => {
                    const note = landingNote(conn, !isSingleVerse);
                    const reference = formatVerseIndexRange(
                      conn.otherStart,
                      conn.otherEnd,
                      localizeBook
                    );
                    const targetCoord = fromVerseIndex(conn.otherStart);
                    const itemKey = `${conn.link.id}-${conn.direction}`;

                    return (
                      <div
                        key={itemKey}
                        className="group px-5 py-3.5 hover:bg-card-hover/50 transition-colors flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFocusRange({ startVid: conn.otherStart, endVid: conn.otherStart })
                            }
                            className="flex items-baseline gap-2 text-left group/ref focus:outline-none"
                            title="Inspect this verse's connections"
                          >
                            <span className="font-bold text-base text-accent group-hover/ref:underline">
                              {reference}
                            </span>
                            {note !== null && (
                              <span className="text-sm text-muted">
                                {describeNote(note, localizeBook)}
                              </span>
                            )}
                          </button>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyPassage(conn.otherStart, conn.otherEnd, itemKey)
                              }
                              className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-card-elevated transition-colors"
                              title={`Copy ${reference}`}
                              aria-label={`Copy ${reference}`}
                            >
                              {copiedKey === itemKey ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onNavigateToVerse(
                                  targetCoord.bookId,
                                  targetCoord.chapter,
                                  targetCoord.verse,
                                  fromRefString
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs sm:text-sm font-semibold text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
                              title={`Open ${reference} in chapter reader`}
                            >
                              <BookOpen className="w-4 h-4" />
                              <span className="hidden sm:inline">Read</span>
                            </button>
                          </div>
                        </div>

                        <div
                          onClick={() =>
                            onNavigateToVerse(
                              targetCoord.bookId,
                              targetCoord.chapter,
                              targetCoord.verse,
                              fromRefString
                            )
                          }
                          className="cursor-pointer"
                        >
                          <PassageSnippet
                            version={bibleVersion}
                            startVid={conn.otherStart}
                            endVid={conn.otherEnd}
                            localizeBook={localizeBook}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {list.length > limit && (
          <div className="px-5 py-3">
            <button
              type="button"
              onClick={() => setLimit(list.length)}
              className="w-full py-2 px-4 rounded-md bg-card-elevated hover:bg-card-hover border border-card-border text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
            >
              Show all {list.length.toLocaleString()}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </PanelSection>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Verse connections for ${titleRef}`}
      className="fixed inset-0 z-[70] flex flex-col bg-background animate-[fadeIn_0.2s_ease-out]"
    >
      {/* Header */}
      <header
        className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-card-border bg-card/80 backdrop-blur-md flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.875rem)' }}
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-widest text-muted mb-0.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: startCoord.genre.hex }}
            />
            <span className="truncate">
              {startCoord.genre.label} · {startCoord.isOldTestament ? 'Old Testament' : 'New Testament'}
            </span>
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-primary tracking-tight truncate">
              {titleRef}
            </h2>
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {versionLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Vote threshold filter toggle */}
          <button
            type="button"
            onClick={() => setMinVotes(prev => (prev === 4 ? -Infinity : 4))}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold border transition-colors ${
              minVotes === 4
                ? 'border-card-border bg-card-elevated text-secondary hover:text-primary'
                : 'border-accent/40 bg-accent/15 text-accent'
            }`}
            title={
              minVotes === 4
                ? 'Showing links with ≥ 4 community votes (tap to show all links)'
                : 'Showing all links including low-voted ones (tap to filter ≥ 4 votes)'
            }
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{minVotes === 4 ? '≥ 4 votes' : 'All votes'}</span>
          </button>

          {/* Previous verse */}
          <button
            type="button"
            disabled={prevVid === null}
            onClick={() => prevVid !== null && setFocusRange({ startVid: prevVid, endVid: prevVid })}
            className="p-2 rounded-md text-secondary hover:text-primary hover:bg-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous verse"
            aria-label="Previous verse"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Next verse */}
          <button
            type="button"
            disabled={nextVid === null}
            onClick={() => nextVid !== null && setFocusRange({ startVid: nextVid, endVid: nextVid })}
            className="p-2 rounded-md text-secondary hover:text-primary hover:bg-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next verse"
            aria-label="Next verse"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 rounded-md text-secondary hover:text-primary hover:bg-card-hover transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Scrollable Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto max-w-3xl w-full mx-auto pb-16">
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-500/10 text-red-400 text-sm border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {loadingIndex ? (
          <div className="py-20 flex flex-col items-center justify-center text-secondary">
            <Loader2 className="w-6 h-6 animate-spin mb-3 text-accent" />
            <p className="text-sm">Loading 344,799 cross-references…</p>
          </div>
        ) : (
          <>
            {/* Focused Verse Quote Box */}
            <div className="px-5 py-4 bg-card/30">
              <div className="flex items-start justify-between gap-3">
                <PassageSnippet
                  version={bibleVersion}
                  startVid={focusRange.startVid}
                  endVid={focusRange.endVid}
                  localizeBook={localizeBook}
                  className="text-lg sm:text-xl text-primary leading-relaxed font-serif flex-1"
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyPassage(focusRange.startVid, focusRange.endVid, 'focused')
                    }
                    className="p-2 rounded-md text-muted hover:text-primary hover:bg-card-elevated transition-colors"
                    title={`Copy ${titleRef}`}
                    aria-label={`Copy ${titleRef}`}
                  >
                    {copiedKey === 'focused' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToVerse(
                        startCoord.bookId,
                        startCoord.chapter,
                        startCoord.verse,
                        fromRefString
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent/10 hover:bg-accent/20 text-accent text-xs font-bold transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Read in context
                  </button>
                </div>
              </div>
            </div>

            {/* 1. Connects to (Genre Breakdown) */}
            {allConnections.length > 0 && (
              <PanelSection
                id="connects-to"
                icon={<Layers className="w-4 h-4" />}
                title="Connects to"
                description={
                  genreCounts.present.length === 1
                    ? '1 genre'
                    : `${genreCounts.present.length} genres`
                }
                count={allConnections.length}
                defaultOpen={false}
                trailing={
                  <span
                    className="flex h-2 w-24 sm:w-32 rounded-full overflow-hidden bg-card-elevated mr-1"
                    aria-hidden="true"
                  >
                    {genreCounts.present.map(g => (
                      <span
                        key={g.id}
                        style={{
                          flexGrow: genreCounts.counts[g.ordinal] ?? 0,
                          backgroundColor: g.hex,
                        }}
                      />
                    ))}
                  </span>
                }
              >
                <div className="px-5 py-3.5 flex flex-col gap-2">
                  {genreCounts.present.map(g => {
                    const c = genreCounts.counts[g.ordinal] ?? 0;
                    const pct = Math.max((c / genreCounts.max) * 100, 2);
                    return (
                      <div key={g.id} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-xs">
                        <span className="text-secondary font-medium truncate">{g.label}</span>
                        <div className="h-2 rounded-full bg-card-elevated overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: g.hex }}
                          />
                        </div>
                        <span className="text-right font-bold tabular-nums text-muted">{c}</span>
                      </div>
                    );
                  })}
                </div>
              </PanelSection>
            )}

            {/* 2. -> References (Outgoing) */}
            {renderConnectionSection(
              'references',
              <ArrowUpRight className="w-4 h-4" />,
              'References',
              'where this passage points',
              connections.outgoing,
              outLimit,
              setOutLimit
            )}

            {/* 3. <- Referenced by (Incoming) */}
            {renderConnectionSection(
              'referenced-by',
              <ArrowDownLeft className="w-4 h-4" />,
              'Referenced by',
              'passages that point here',
              connections.incoming,
              inLimit,
              setInLimit
            )}

            {/* 4. Same Hebrew / Greek word (STEPBible) */}
            {isSingleVerse && originalWords.length > 0 && (
              <>
                <PanelSection
                  id="same-word"
                  icon={<Languages className="w-4 h-4" />}
                  title={`Same ${startCoord.isOldTestament ? 'Hebrew' : 'Greek'} word`}
                  description="where else it is used"
                  count={originalWords.length}
                  defaultOpen={true}
                >
                  <div className="divide-y divide-card-border/40">
                    {(wordsExpanded
                      ? originalWords
                      : originalWords.slice(0, INITIAL_WORDS)
                    ).map(word => {
                      const isOpen = openWordIndex === word.index;
                      const wordVerses = isOpen && wordsIndex ? wordsIndex.versesOf(word.index) : [];

                      return (
                        <div key={word.strongs} className="flex flex-col">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => setOpenWordIndex(isOpen ? null : word.index)}
                            className="w-full px-5 py-3.5 text-left hover:bg-card-hover/50 transition-colors flex flex-col gap-1"
                          >
                            <div className="flex items-center gap-2.5">
                              <strong
                                lang={startCoord.isOldTestament ? 'he' : 'el'}
                                className="text-lg font-bold text-primary"
                              >
                                {word.lemma}
                              </strong>
                              <span className="text-sm text-muted italic">
                                {word.transliteration}
                              </span>
                              <span className="text-xs font-mono text-muted/70">
                                {word.strongs}
                              </span>
                              <span className="ml-auto text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-card-elevated border border-card-border text-secondary">
                                {word.verseCount}
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 text-muted transition-transform duration-200 ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                            <span className="text-base text-secondary">{word.gloss}</span>
                          </button>

                          {isOpen && (
                            <div className="bg-card/50 border-t border-card-border/40 divide-y divide-card-border/30 pl-4">
                              {wordVerses.map(otherVid => {
                                const otherCoord = fromVerseIndex(otherVid);
                                const otherRef = formatVerseIndexRange(
                                  otherVid,
                                  otherVid,
                                  localizeBook
                                );
                                const isCurrent = otherVid === focusRange.startVid;

                                return (
                                  <div
                                    key={otherVid}
                                    className={`px-4 py-3 flex flex-col gap-1.5 transition-colors ${
                                      isCurrent ? 'bg-accent/10' : 'hover:bg-card-hover/40'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setFocusRange({ startVid: otherVid, endVid: otherVid })
                                        }
                                        className="font-bold text-sm sm:text-base text-accent hover:underline text-left"
                                      >
                                        {otherRef}
                                        {isCurrent && (
                                          <span className="ml-2 text-xs uppercase tracking-wider text-muted font-semibold">
                                            (current)
                                          </span>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onNavigateToVerse(
                                            otherCoord.bookId,
                                            otherCoord.chapter,
                                            otherCoord.verse,
                                            fromRefString
                                          )
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
                                      >
                                        <BookOpen className="w-3.5 h-3.5" />
                                        Read
                                      </button>
                                    </div>
                                    <div
                                      onClick={() =>
                                        onNavigateToVerse(
                                          otherCoord.bookId,
                                          otherCoord.chapter,
                                          otherCoord.verse,
                                          fromRefString
                                        )
                                      }
                                      className="cursor-pointer"
                                    >
                                      <PassageSnippet
                                        version={bibleVersion}
                                        startVid={otherVid}
                                        endVid={otherVid}
                                        localizeBook={localizeBook}
                                        className="text-base text-primary/90 leading-relaxed block"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {!wordsExpanded && originalWords.length > INITIAL_WORDS && (
                      <div className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => setWordsExpanded(true)}
                          className="w-full py-2 px-4 rounded-md bg-card-elevated hover:bg-card-hover border border-card-border text-xs font-bold text-secondary hover:text-primary transition-colors"
                        >
                          Show {originalWords.length - INITIAL_WORDS} more
                        </button>
                      </div>
                    )}
                  </div>
                </PanelSection>

                {/* Required STEP Bible CC BY 4.0 Attribution */}
                <p className="px-5 py-3 text-[11px] text-muted leading-relaxed border-t border-card-border/40">
                  Words:{' '}
                  <a
                    href="https://www.stepbible.org"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-secondary"
                  >
                    STEP Bible
                  </a>{' '}
                  (
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-secondary"
                  >
                    CC BY 4.0
                  </a>
                  ), based on work at Tyndale House, Cambridge; reduced to dictionary forms. Words
                  used in more than {wordsIndex?.maxVerses ?? 100} verses are left out.
                </p>
              </>
            )}

            {/* OpenBible.info Credit Footer */}
            <p className="px-5 py-3 text-[11px] text-muted leading-relaxed border-t border-card-border/40">
              Links:{' '}
              <a
                href="https://www.openbible.info/labs/cross-references/"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-secondary"
              >
                OpenBible.info
              </a>{' '}
              (
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-secondary"
              >
                CC BY 4.0
              </a>
              ), from the Treasury of Scripture Knowledge.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
