import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, BookOpen, Globe, Headphones, PlayCircle, Radio, Search, ChevronLeft, ArrowLeft, X, Eye, EyeOff, ListChecks, Check } from 'lucide-react';
import { useSearchParams, useNavigate, useParams, useLocation } from 'react-router-dom';
import { guidePath, parseReaderRef, readerPath, readerPathFromLegacyParams } from '../utils/readerRoute';
import { NT_STUDY_GUIDES } from '../data/guides';
import { OT_STUDY_GUIDES } from '../data/otGuides';
import { NT_BOOKS, NT_SECTIONS } from '../data/ntBooks';
import { OT_BOOKS, OT_SECTIONS } from '../data/otBooks';
import { BibleBrowser, BookCard } from '../components/guides/BibleBrowser';
import { ChapterReader } from '../components/guides/ChapterReader';
import { MemorySentence } from '../components/guides/MemorySentence';
import { KeyVerseCard } from '../components/guides/KeyVerseCard';
import { RecordCards } from '../components/guides/RecordCards';
import { OriginalWordModal } from '../components/OriginalWordModal';
import { ChainDrill, type ChainAnchor } from '../components/practice/ChainDrill';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

const DEFAULT_CHAPTER_SM2 = { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() };

// The same four grades, in the same order, with the same words every other recall
// surface in the app uses. Scores are 1/3/4/5: anything below 3 is a lapse in
// evaluateSM2, so "Hard" has to be 3 to mean what the word means.
const ANCHOR_GRADES: { score: number; label: string; className: string }[] = [
  { score: 1, label: 'Blank', className: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20' },
  { score: 3, label: 'Hard', className: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20' },
  { score: 4, label: 'Good', className: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20' },
  { score: 5, label: 'Easy', className: 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20' },
];

// The index used to filter on book.name alone, so typing "burning bush" or
// "beginning" — the exact mnemonic vocabulary this app teaches — turned up
// nothing here even though the testament browser one level down already matched
// it. Same fields, same order, as BibleBrowser.tsx's own search, plus subtitle.
function matchesBookSearch(book: { name: string; themeWord: string; keyWord: string; subtitle: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [book.name, book.themeWord, book.keyWord, book.subtitle].some(field => field.toLowerCase().includes(q));
}

// Special sentinel IDs
const BIBLE_BROWSER_NT = '__bible-browser-nt__';
const BIBLE_BROWSER_OT = '__bible-browser-ot__';

// The two testament browsers are views, not guides, so they get readable slugs rather
// than the internal sentinels showing up in the address bar.
const BROWSER_ID_TO_SLUG: Record<string, string> = {
  [BIBLE_BROWSER_NT]: 'new-testament',
  [BIBLE_BROWSER_OT]: 'old-testament',
};
const BROWSER_SLUG_TO_ID: Record<string, string> = {
  'new-testament': BIBLE_BROWSER_NT,
  'old-testament': BIBLE_BROWSER_OT,
};

import { BOOK_SHORT, youVersionChapterUrl } from '../data/bibleMap';
import { GUIDE_SECTIONS, SECTIONED_CATEGORIES } from '../data/guideSections';
import { DISTRIBUTION_COLORS, divisionForSection } from '../data/palette';
import { useApp } from '../context/AppContext';
import { useMastery, masteryOf, type BookMasteryCounts } from '../utils/mastery';
import { useFocusTrap } from '../utils/useFocusTrap';
import { chapterProgressKey, blockProgressKey } from '../types/models';
import type { ChapterProgress } from '../types/models';
import { evaluateSM2, formatInterval, isDue } from '../utils/sm2';
import { buildReviewEvent } from '../utils/reviewLog';


// Defaults to the plate and the chapter number only — the word and scene (and the
// "after X · before Y" chain position) wait for a tap, or for the grid's "Reveal
// all" toggle. The plate used to carry the answer underneath it permanently, which
// meant fifty (Genesis) or a hundred and fifty (Psalms) free answers on a page that
// was supposed to be testing recall. A book with no chapter art yet (18 of 66) falls
// back to the same large-numeral placeholder either way, which still works as a
// prompt — there's simply no image to blur/reveal for those.
const ChapterAnchorCard = ({
  anchor, guideId, revealed, onReveal, prevWord, nextWord, graded, onGrade,
}: {
  anchor: any;
  guideId: string;
  revealed: boolean;
  onReveal: () => void;
  prevWord?: string | null;
  nextWord?: string | null;
  /** Set once this chapter has been graded *on this pass* — carries the resulting
   * interval so the collapsed row can say when it comes back. Deliberately not read
   * from chapterProgress: a book worked through last week should open as a full grid
   * of prompts again, not as fifty pre-collapsed rows. */
  graded?: { score: number; interval: number };
  onGrade: (score: number) => void;
}) => {
  const [imgErr, setImgErr] = useState(false);
  const navigate = useNavigate();
  const { state } = useApp();
  const imgPath = `/chapters/${guideId}/ch${anchor.ch}.png`;

  useEffect(() => {
    setImgErr(false);
  }, [imgPath]);

  // Only a real fallback destination for a card that opens in a new tab or gets its
  // link copied — an ordinary click is handled below and never leaves the app. Null
  // for topical guides, which are not a book of the Bible and so have nowhere to point.
  const bibleUrl = youVersionChapterUrl(guideId, anchor.ch, state.settings.bibleVersion || 'LSB');

  const handleRead = (e: React.MouseEvent) => {
    e.preventDefault();
    // An unrevealed card's primary tap reveals it, the same "ask first" rule the
    // reader's own header chip follows — reading the chapter is one tap further,
    // via the now-visible caption below, rather than the card's whole surface.
    if (!revealed) {
      onReveal();
      return;
    }
    const path = readerPath(guideId, anchor.ch);
    if (path) navigate(path);
  };


  // Graded on this pass — the card gives up its plate and becomes a one-line receipt.
  // A fifty-card Genesis page (or a hundred-and-fifty-card Psalms one) is otherwise an
  // undifferentiated wall that looks identical after an hour's work as it did at the
  // start; collapsing finished cards is what turns the grid into a work surface that
  // visibly empties.
  if (graded) {
    return (
      <a
        id={`chapter-anchor-${anchor.ch}`}
        href={bibleUrl || undefined}
        onClick={handleRead}
        role={bibleUrl ? undefined : 'button'}
        tabIndex={bibleUrl ? undefined : 0}
        className="flex items-center justify-between gap-3 bg-card border border-card-border rounded-lg px-3 py-2.5 hover:border-card-border-hover transition-colors"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="w-6 h-6 rounded-full bg-card-elevated flex items-center justify-center text-[0.625rem] font-bold text-muted tabular-nums flex-shrink-0">
            {anchor.ch}
          </span>
          <span className="font-heading font-semibold uppercase tracking-wide text-[0.6875rem] text-secondary truncate">
            {anchor.word}
          </span>
        </span>
        <span className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[0.625rem] text-muted tabular-nums">
            next in {formatInterval(graded.interval)}
          </span>
          <Check className={`w-3.5 h-3.5 ${graded.score < 3 ? 'text-red-400' : 'text-green-500'}`} />
        </span>
      </a>
    );
  }

  return (
    <div
      id={`chapter-anchor-${anchor.ch}`}
      className="group flex flex-col bg-card border border-card-border rounded-lg overflow-hidden hover:border-card-border-hover transition-colors"
    >
    <a
      href={revealed ? (bibleUrl || undefined) : undefined}
      onClick={handleRead}
      // Without an href the anchor drops out of the tab order, so put it back — the
      // click handler is what actually opens the chapter either way.
      role={bibleUrl ? undefined : 'button'}
      tabIndex={bibleUrl ? undefined : 0}
      aria-label={revealed ? undefined : `Chapter ${anchor.ch} — tap to reveal its anchor`}
      className="flex flex-col"
    >
      {/* Plate */}
      <div className="relative aspect-[4/3] bg-card-elevated overflow-hidden">
        {!imgErr ? (
          <img
            src={imgPath}
            alt={revealed ? anchor.word : `Chapter ${anchor.ch}`}
            loading="lazy"
            onError={() => setImgErr(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-[filter] duration-200 ${revealed ? '' : 'blur-[10px] scale-105'}`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-heading font-bold text-muted/25">{anchor.ch}</span>
          </div>
        )}
        <span className="absolute top-3 left-3 w-8 h-8 rounded-full bg-background/90 border border-card-border flex items-center justify-center font-bold text-sm text-primary">
          {anchor.ch}
        </span>
        {!revealed && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/10">
            <span className="text-[0.625rem] font-bold uppercase tracking-widest text-white bg-black/50 px-2.5 py-1 rounded-full">Tap to reveal</span>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="p-5 flex flex-col gap-1.5 min-h-[92px] justify-center">
        {revealed ? (
          <>
            <span className="font-heading font-semibold uppercase tracking-wide text-xs text-accent">{anchor.word}</span>
            <p className="text-sm text-secondary italic font-serif leading-relaxed">{anchor.scene}</p>
            {(prevWord || nextWord) && (
              <p className="text-[0.6875rem] text-muted mt-1 truncate">
                {prevWord ? <>after <span className="font-semibold">{prevWord}</span></> : null}
                {prevWord && nextWord ? ' · ' : null}
                {nextWord ? <>before <span className="font-semibold">{nextWord}</span></> : null}
              </p>
            )}
          </>
        ) : (
          <span className="text-sm text-muted italic">What anchors chapter {anchor.ch}?</span>
        )}
      </div>
    </a>

    {/* Grading. This grid was already the right retrieval task — a cold, correctly
        prompted, properly withheld cued recall, fifty of them per book — and it
        recorded none of it: revealedAnchors was plain component state, discarded on
        unmount. The interaction, the art, the prompt copy and the layout all already
        existed; only the dispatch was missing. Sits outside the <a> above rather than
        inside it so these are not interactive elements nested in a link. */}
    {revealed && !graded && (
      <div className="px-3 pb-3 pt-1 grid grid-cols-4 gap-1.5 border-t border-card-border/60">
        {ANCHOR_GRADES.map(g => (
          <button
            key={g.score}
            onClick={() => onGrade(g.score)}
            className={`py-2.5 flex items-center justify-center rounded-md border transition-colors active:scale-95 ${g.className}`}
            aria-label={`${g.label} — chapter ${anchor.ch}`}
          >
            {/* No interval preview, matching every other grade strip. Printing what each
                grade buys turns "did you remember it?" into a choice between a short wait
                and a long one, and nothing here verifies the answer. */}
            <span className="text-[0.6875rem] font-bold leading-tight">{g.label}</span>
          </button>
        ))}
      </div>
    )}
    </div>
  );
};

// Full two-column Bible book index. Extracted from the book-guide view so the Bible
// landing page's bottom bar can open the same one, rather than the two levels
// offering different ways to jump between books.
const BibleIndexModal: React.FC<{
  isOpen: boolean;
  selectedId: string | null;
  onSelect: (bookId: string) => void;
  onClose: () => void;
  mastery: Record<string, BookMasteryCounts>;
}> = ({ isOpen, selectedId, onSelect, onClose, mastery }) => {
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);
  // Above the early return, because hooks cannot be conditional. This overlay was a
  // bare fixed div: Escape did nothing, the page behind it still scrolled, and nothing
  // announced a dialog. It is the most-opened list in the app — three screens reach it.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Bible books index"
      className="fixed inset-0 z-[70] flex flex-col bg-background animate-[fadeIn_0.2s_ease-out]"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-md hover:bg-card-hover transition-colors"
          aria-label="Close index"
        >
          <X className="w-5 h-5 text-secondary" />
        </button>
        <span className="text-sm font-bold text-primary tracking-wide">Bible Books</span>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-32">
        <div className="grid grid-cols-2 mb-2">
          <span className="text-right pr-4 text-[10px] font-bold text-muted uppercase tracking-widest">Old Testament</span>
          <span className="text-left pl-4 text-[10px] font-bold text-muted uppercase tracking-widest">New Testament</span>
        </div>

        <div className="grid grid-cols-2">
          {(() => {
            const rows: React.ReactNode[] = [];
            const maxLen = Math.max(OT_BOOKS.length, NT_BOOKS.length);

            for (let i = 0; i < maxLen; i++) {
              const ot = i < OT_BOOKS.length ? OT_BOOKS[i] : null;
              const nt = i < NT_BOOKS.length ? NT_BOOKS[i] : null;
              const isOtSelected = ot?.id === selectedId;
              const isNtSelected = nt?.id === selectedId;

              // Theme word alongside the name, tinted by division, plus a mastery
              // dot — this modal opens from three screens (the book page, the
              // testament browser, and the reader's own navigator), so it's the
              // most-seen list of book names in the app. It used to be pure
              // lookup: 66 names and nothing else, the one place in the product
              // least likely to teach anything despite being seen the most.
              const otDivision = ot ? divisionForSection(ot.section) : null;
              const ntDivision = nt ? divisionForSection(nt.section) : null;
              const otMastery = ot ? mastery[ot.id] : undefined;
              const ntMastery = nt ? mastery[nt.id] : undefined;

              rows.push(
                <React.Fragment key={`row-${i}`}>
                  <button
                    onClick={() => { if (ot) onSelect(ot.id); }}
                    className={`flex items-center justify-end gap-1.5 pr-4 py-2 transition-colors ${
                      isOtSelected
                        ? 'text-accent bg-accent/10 rounded-r-lg'
                        : ot ? 'text-secondary hover:text-primary' : 'pointer-events-none'
                    }`}
                    disabled={!ot}
                  >
                    {ot && (
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${otMastery && otMastery.secure > 0 ? otDivision!.color.bg : 'bg-card-border'}`} aria-hidden="true" />
                    )}
                    <span className="flex flex-col items-end min-w-0">
                      <span className={`text-[15px] leading-tight ${isOtSelected ? 'font-bold' : 'font-medium'}`}>{ot ? (BOOK_SHORT[ot.id] || ot.name) : ''}</span>
                      {ot && <span className={`text-[0.625rem] leading-tight truncate max-w-[110px] ${otDivision!.color.text} opacity-80`}>{ot.themeWord}</span>}
                    </span>
                  </button>
                  <button
                    onClick={() => { if (nt) onSelect(nt.id); }}
                    className={`flex items-center justify-start gap-1.5 pl-4 py-2 transition-colors ${
                      isNtSelected
                        ? 'text-accent bg-accent/10 rounded-l-lg'
                        : nt ? 'text-secondary hover:text-primary' : 'pointer-events-none'
                    }`}
                    disabled={!nt}
                  >
                    <span className="flex flex-col items-start min-w-0">
                      <span className={`text-[15px] leading-tight ${isNtSelected ? 'font-bold' : 'font-medium'}`}>{nt ? (BOOK_SHORT[nt.id] || nt.name) : ''}</span>
                      {nt && <span className={`text-[0.625rem] leading-tight truncate max-w-[110px] ${ntDivision!.color.text} opacity-80`}>{nt.themeWord}</span>}
                    </span>
                    {nt && (
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ntMastery && ntMastery.secure > 0 ? ntDivision!.color.bg : 'bg-card-border'}`} aria-hidden="true" />
                    )}
                  </button>
                </React.Fragment>
              );
            }
            return rows;
          })()}
        </div>
      </div>
    </div>
  );
};

export const Guides: React.FC = () => {
  const { state, dispatch } = useApp();
  // Read-only now — the screen's own state lives in the path; query params are only
  // inspected to redirect links written before that was true.
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections2, setCollapsedSections2] = useState<Record<string, boolean>>(
    () => Object.fromEntries(GUIDE_SECTIONS.filter(s => !s.defaultOpen).map(s => [s.id, true]))
  );
  const [isOTExpanded, setIsOTExpanded] = useState(true);
  const [isNTExpanded, setIsNTExpanded] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [studyOriginalWordRef, setStudyOriginalWordRef] = useState<{ book: number; chapter: number; verse: number } | null>(null);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Chapter-anchor grid state: which chapters have been tapped open this visit, a
  // page-level "reveal all" that bypasses the per-card gate without discarding it
  // (toggling it back off returns to whatever was individually revealed), and which
  // of the book's blocks are collapsed. All three reset when the active guide
  // changes, in the same effect below.
  const [revealedAnchors, setRevealedAnchors] = useState<Set<number>>(new Set());
  const [showAllAnchors, setShowAllAnchors] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<number>>(new Set());
  // Chapters graded during this visit, mapped to the interval the grade earned, so a
  // finished card can collapse to a receipt. Visit-scoped rather than read back out of
  // chapterProgress: returning to a book you worked through last week should present a
  // full grid of prompts again, not fifty rows of answers.
  const [gradedAnchors, setGradedAnchors] = useState<Map<number, { score: number; interval: number }>>(new Map());
  // Which block's chain drill is open, if any. blockIndex is the block's position in
  // the book, which is what its BlockProgress record is keyed by.
  const [drillBlock, setDrillBlock] = useState<{ label: string; blockIndex: number; anchors: ChainAnchor[] } | null>(null);

  // "Covers only" — drops every book card's name/subtitle/key word on the index,
  // leaving art and theme word, so browsing becomes a recognition pass instead of
  // a lookup list. One piece of UI state; BookCard already knows how to render
  // either way (see coversOnly there).
  const [coversOnlyMode, setCoversOnlyMode] = useState(false);
  const mastery = useMastery(ALL_BOOKS);
  
  const { guideId, ref: readerRefParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const readerRef = useMemo(() => parseReaderRef(readerRefParam), [readerRefParam]);
  const activeGuideId = guideId ? (BROWSER_SLUG_TO_ID[guideId] || guideId) : null;

  const setActiveGuideId = (id: string | null) => {
    if (!id) {
      navigate('/guides');
      return;
    }
    navigate(guidePath(BROWSER_ID_TO_SLUG[id] || id));
  };

  // Links made before the reader had its own route — bookmarks, shares, anything still
  // in someone's history — carry ?guide=/?readerBook=. Translate rather than 404 them.
  useEffect(() => {
    const legacyReader = readerPathFromLegacyParams(searchParams);
    if (legacyReader) {
      navigate(legacyReader, { replace: true });
      return;
    }
    const legacyGuide = searchParams.get('guide');
    if (legacyGuide) {
      navigate(guidePath(BROWSER_ID_TO_SLUG[legacyGuide] || legacyGuide), { replace: true });
    }
  }, [searchParams, navigate]);

  const handleScrollToChapter = (ch: number) => {
    const el = document.getElementById(`chapter-anchor-${ch}`);
    if (el) {
      // Scroll the element slightly into view so it's not hidden by potential fixed headers
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null);
  const [touchEndPos, setTouchEndPos] = useState<{x: number, y: number} | null>(null);
  
  const [isIndexModalOpen, setIsIndexModalOpen] = useState(false);

  // Chrome (fixed header + bottom book-nav) visibility. Tap-to-toggle, matching
  // ChapterReader exactly: a tap on empty space toggles it, a tap on anything
  // interactive always reveals (never hides) so expanding a section doesn't feel
  // like it also yanked the navigation away. This replaces a scroll-direction
  // auto-hide, which made the identical gesture behave differently here than in
  // the reader the page links straight into.
  const [chromeVisible, setChromeVisible] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const handleGuideContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [role="button"]')) {
      setChromeVisible(true);
    } else {
      setChromeVisible(v => !v);
    }
  };

  // Reorient after navigating to a different guide, regardless of whether the
  // chrome happened to be hidden beforehand.
  useEffect(() => {
    setChromeVisible(true);
  }, [activeGuideId]);

  // A new book starts with every anchor hidden again — leaving them revealed would
  // mean the very first visit to a book you'd already worked through looked exactly
  // like the "answers already showing" behavior this was built to replace.
  useEffect(() => {
    setRevealedAnchors(new Set());
    setShowAllAnchors(false);
    setCollapsedBlocks(new Set());
    setGradedAnchors(new Map());
  }, [activeGuideId]);

  // Writes the grid's retrieval to the same ChapterProgress record the anchor drill,
  // the reader's end-of-chapter card and the shape meter all read from — so working
  // down a book's grid now moves the same numbers a drill session does, instead of
  // being the app's largest source of discarded evidence.
  const handleGradeAnchor = (bookId: string, chapter: number, score: number) => {
    const key = chapterProgressKey(bookId, chapter);
    const existing = state.chapterProgress[key];
    const { newSM2, newStatus } = evaluateSM2(existing?.sm2 || DEFAULT_CHAPTER_SM2, score);
    const updated: ChapterProgress = {
      ...(existing || { readCount: 0, lastReadDate: null }),
      bookId,
      chapter,
      sm2: newSM2,
      status: newStatus,
      attempts: (existing?.attempts || 0) + 1,
      lastScore: score,
      lastAttemptDate: new Date().toISOString(),
      readCount: existing?.readCount || 0,
      lastReadDate: existing?.lastReadDate || null,
    };
    dispatch({ type: 'GRADE_CHAPTER_PROGRESS', payload: updated });
    // The grid is the highest-volume retrieval surface in the app — fifty cold, properly
    // withheld cued recalls per book, and more anchors graded here in one sitting than a
    // drill session produces in a week. Leaving it out of the review history would have
    // biased every retention number toward the small, deliberate sessions and away from
    // the way anchors are actually learned.
    dispatch({
      type: 'RECORD_REVIEW',
      payload: buildReviewEvent({
        itemKind: 'anchor', itemId: key, gradeSubmitted: score,
        before: existing?.sm2, after: newSM2,
        // The plate is blurred and the word withheld until tapped, and the prompt names
        // the chapter — the same cold number→word question the session asks.
        mode: 'reveal', cueLevel: 0, direction: 'n2w',
      }),
    });
    if (state.settings.streakIncludesChapters !== false) {
      dispatch({ type: 'RECORD_ACTIVITY' });
    }
    setGradedAnchors(prev => new Map(prev).set(chapter, { score, interval: newSM2.interval }));
  };

  // Sticky block ribbon — a thin bar under the fixed header naming whichever block
  // (Primeval, Abraham, Jacob, Joseph…) the reader has scrolled into, so position
  // inside a long anchor grid survives the scroll the same way the section heading
  // does one level up in the testament browser. Tracked by comparing each block
  // header's position against the scroll container as it scrolls, rather than an
  // IntersectionObserver: the "current" block is whichever header has most
  // recently passed the fixed-header's bottom edge, which a simple "last header
  // above the line" scan expresses more directly than an observer's enter/exit
  // events would.
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const blockHeaderRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Keep the content's top padding in sync with the fixed header's real rendered
  // height — it varies with the book title wrapping and with the safe-area inset,
  // so a hardcoded value would either clip the title or leave a gap.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [activeGuideId]);

  // Scroll to top when switching books
  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [activeGuideId]);

  // Arriving here from the Dashboard's "due for review" list — jump straight to
  // the Memory Sentence instead of leaving the reader to scroll past the whole
  // chapter-anchor grid to find it.
  useEffect(() => {
    if (!(location.state as any)?.scrollToMemorySentence) return;
    const el = document.getElementById('memory-sentence-section');
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [activeGuideId, location.state, location.pathname, navigate]);

  const { prevBook, nextBook } = useMemo(() => {
    if (!activeGuideId || activeGuideId === BIBLE_BROWSER_NT || activeGuideId === BIBLE_BROWSER_OT) {
      return { prevBook: null, nextBook: null };
    }
    const currentIndex = ALL_BOOKS.findIndex(b => b.id === activeGuideId);
    if (currentIndex === -1) return { prevBook: null, nextBook: null };
    return {
      prevBook: ALL_BOOKS[(currentIndex - 1 + ALL_BOOKS.length) % ALL_BOOKS.length],
      nextBook: ALL_BOOKS[(currentIndex + 1) % ALL_BOOKS.length]
    };
  }, [activeGuideId]);

  const handlePrevBook = () => { if (prevBook) setActiveGuideId(prevBook.id); };
  const handleNextBook = () => { if (nextBook) setActiveGuideId(nextBook.id); };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndPos(null);
    setTouchStartPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchEnd = () => {
    if (!touchStartPos || !touchEndPos) return;
    const distanceX = touchStartPos.x - touchEndPos.x;
    const distanceY = touchStartPos.y - touchEndPos.y;
    const minSwipeDistance = 50;

    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
        // Swipe left (drag finger left) -> Next
        handleNextBook();
      } else {
        // Swipe right (drag finger right) -> Previous
        handlePrevBook();
      }
    }
  };

  const activeGuide: any = useMemo(() => {
    if (!activeGuideId || activeGuideId === BIBLE_BROWSER_NT || activeGuideId === BIBLE_BROWSER_OT) return null;
    
    const book = ALL_BOOKS.find(b => b.id === activeGuideId);
    const existingGuide = [...OT_STUDY_GUIDES, ...NT_STUDY_GUIDES].find((g: any) => g.id === activeGuideId);
    
    if (existingGuide) {
      const merged: any = { ...existingGuide };
      if (!merged.type) merged.type = 'book-guide';
      if (!merged.title && book) merged.title = book.name;
      if (!merged.subtitle && book) merged.subtitle = book.subtitle;
      if (!merged.icon) merged.icon = '📖';
      if (!merged.chapters && book) merged.chapters = book.chapters;

      if (!merged.blocks && merged.architecture) {
        merged.blocks = merged.architecture.map((arch: any) => {
          const start = arch.chapters[0];
          const end = arch.chapters[1];
          const unit = arch.unit;
          
          let label = arch.name;
          let description = '';
          const match = arch.name.match(/^(.*?)\s*\((.*?)\)$/);
          if (match) {
            label = match[1].trim();
            description = match[2].trim();
          }
          
          return {
            chapters: start === end ? `${start}` : `${start}–${end}`,
            label: label,
            description: description,
            unit
          };
        });
      }
      return merged;
    }

    if (book) {
      return {
        id: book.id,
        type: 'book-guide',
        title: book.name,
        subtitle: book.subtitle,
        icon: '📖', // generic icon
        sections: [
          {
            heading: "Guide Coming Soon",
            description: `We are currently crafting the study guide for ${book.name}. Check back soon!`
          }
        ]
      };
    }
    
    return null;
  }, [activeGuideId]);

  // The anchor grid, partitioned under the book's own blocks (Primeval, Abraham,
  // Jacob, Joseph — the same four the distribution bar above already draws) instead
  // of one flat run. Fifty cards become four sets of about twelve; a hundred and
  // fifty (Psalms) become five sets of thirty. Chunking is the mnemonic device the
  // block data was already carrying and the grid wasn't using.
  //
  // Single-chapter books (Obadiah, Philemon, Jude, 2–3 John) reuse the same
  // isVerseBased test the distribution bar and section list below use — their
  // blocks are verse ranges inside one chapter, not chapter ranges, so grouping the
  // (single) anchor by them would either produce one empty group or misattribute
  // it. Those books, and any guide with no blocks at all, get one ungrouped run.
  const anchorGroups: { block: any; colorIndex: number; anchors: any[] }[] = useMemo(() => {
    if (!activeGuide?.anchors?.length) return [];
    const isVerseBased = activeGuide.blocks?.some((b: any) => b.unit === 'verse')
      || (activeGuide.chapters === 1 && activeGuide.blocks?.length > 1);
    if (!activeGuide.blocks?.length || isVerseBased) {
      return [{ block: null, colorIndex: 0, anchors: activeGuide.anchors }];
    }
    return activeGuide.blocks
      .map((block: any, i: number) => {
        const [start, end] = String(block.chapters).split(/[-–]/).map(Number);
        const rangeEnd = end || start;
        const anchors = activeGuide.anchors.filter((a: any) => Number(a.ch) >= start && Number(a.ch) <= rangeEnd);
        return { block, colorIndex: i, anchors };
      })
      .filter((g: any) => g.anchors.length > 0);
  }, [activeGuide]);

  // Sticky block ribbon tracking — the "current" block is whichever header has most
  // recently passed the fixed header's bottom edge, found by comparing each block
  // header's position against the scroll container as it scrolls (a simple "last
  // header above the line" scan, rather than an IntersectionObserver's enter/exit
  // events, which would need more bookkeeping to express the same "most recent"
  // rule). See the activeBlockIndex/blockHeaderRefs declarations above.
  useEffect(() => {
    const scrollEl = document.getElementById('main-scroll-container');
    if (!scrollEl || anchorGroups.length < 2) {
      setActiveBlockIndex(null);
      return;
    }

    const RIBBON_LINE = 12; // px of slack below the fixed header before a block "counts"
    const updateActiveBlock = () => {
      const containerTop = scrollEl.getBoundingClientRect().top;
      const line = containerTop + headerHeight + RIBBON_LINE;
      let current: number | null = null;
      for (const [index, el] of blockHeaderRefs.current) {
        if (el.getBoundingClientRect().top <= line) {
          if (current === null || index > current) current = index;
        }
      }
      setActiveBlockIndex(current);
    };

    updateActiveBlock();
    scrollEl.addEventListener('scroll', updateActiveBlock, { passive: true });
    return () => scrollEl.removeEventListener('scroll', updateActiveBlock);
  }, [anchorGroups, headerHeight, activeGuideId]);

  // "after LADDER · before STICKS" on each revealed card — the book's own chain,
  // looked up against the whole (ungrouped) anchor order so it stays correct across
  // a block boundary, not just within the group a card happens to render in.
  const anchorNeighbors = useMemo(() => {
    const map = new Map<number, { prev: string | null; next: string | null }>();
    const arr = activeGuide?.anchors;
    if (!arr) return map;
    arr.forEach((a: any, i: number) => {
      map.set(Number(a.ch), {
        prev: i > 0 ? arr[i - 1].word : null,
        next: i < arr.length - 1 ? arr[i + 1].word : null,
      });
    });
    return map;
  }, [activeGuide]);

  const categories = useMemo(() => {
    const map: Record<string, any[]> = {};
    [...OT_STUDY_GUIDES, ...NT_STUDY_GUIDES].forEach((g: any) => {
      // Skip book-guide entries from the category listing — they live in BibleBrowser
      if (g.type === 'book-guide' || (!g.type && ALL_BOOKS.some(b => b.id === g.id))) return;
      const cat = g.category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(g);
    });
    return map;
  }, []);

  // Searching only ever filtered book names, so typing "prayer" or "Romans" turned up
  // nothing among the forty study resources. Matches title, subtitle and category, and
  // a group that matches nothing drops out rather than showing an empty heading.
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;

    const matched: Record<string, any[]> = {};
    for (const [category, guides] of Object.entries(categories)) {
      const hits = guides.filter((g: any) =>
        [g.title, g.subtitle, category].some(field => (field || '').toLowerCase().includes(query))
      );
      if (hits.length) matched[category] = hits;
    }
    return matched;
  }, [categories, searchQuery]);

  // Categories arranged into the three sections, dropping anything the current search
  // emptied out. A category no section claims lands under "More" rather than vanishing.
  const resourceSections = useMemo(() => {
    const claimed = GUIDE_SECTIONS.map(section => ({
      ...section,
      groups: section.groups
        .map(group => ({
          label: group.label,
          guides: group.categories.flatMap(c => filteredCategories[c] || []),
        }))
        .filter(group => group.guides.length),
    }));

    const unclaimed = Object.entries(filteredCategories)
      .filter(([category]) => !SECTIONED_CATEGORIES.has(category))
      .map(([label, guides]) => ({ label, guides }));

    if (unclaimed.length) {
      claimed.push({
        id: 'more', title: 'More', blurb: 'Everything else', defaultOpen: true, groups: unclaimed,
      });
    }

    return claimed.filter(section => section.groups.length);
  }, [filteredCategories]);

  // ── In-App Reader view ─────────────────────────────────────────────────────
  if (readerRef) {
    return (
      <>
        {studyOriginalWordRef && (
          <OriginalWordModal
            verseRef={studyOriginalWordRef}
            onClose={() => setStudyOriginalWordRef(null)}
            onNavigateToVerse={(bookId, chapter, verse) => {
              setStudyOriginalWordRef(null);
              const path = readerPath(bookId, chapter, verse);
              if (path) navigate(path);
            }}
          />
        )}
        <ChapterReader
          bookId={readerRef.bookId}
          chapter={readerRef.chapter}
          initialVerse={readerRef.verse}
          bookTitle={ALL_BOOKS.find((b) => b.id === readerRef.bookId)?.name || activeGuide?.title || 'Book'}
          onStudyOriginalWord={setStudyOriginalWordRef}
          // Closing lands on the book's own guide page. Previously this dropped the
          // reader params and kept whatever ?guide= happened to be set, which was
          // already updated to follow the book being read.
          onClose={() => navigate(guidePath(readerRef.bookId))}
        />
      </>
    );
  }

  // ── BibleBrowser view ──────────────────────────────────────────────────────
  if (activeGuideId === BIBLE_BROWSER_NT || activeGuideId === BIBLE_BROWSER_OT) {
    const isNT = activeGuideId === BIBLE_BROWSER_NT;
    return (
      <div
        className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-24 animate-[fadeIn_0.3s_ease-out]"
        style={{ paddingTop: headerHeight ? `${headerHeight + 16}px` : 'calc(env(safe-area-inset-top, 0px) + 5rem)' }}
        onClick={handleGuideContentClick}
      >
        {/* Fixed header — same shape, transition and tap-to-toggle state as the book
            page and the chapter reader. */}
        <div
          ref={headerRef}
          className={`fixed top-0 left-0 right-0 z-40 bg-background border-b border-card-border/60 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${chromeVisible ? 'translate-y-0' : '-translate-y-full'}`}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >
          <div className="max-w-4xl mx-auto w-full px-5 sm:px-8 pb-3 relative">
            <button
              onClick={() => setActiveGuideId(null)}
              className="absolute left-5 sm:left-8 top-1 p-2 -ml-2 rounded-full hover:bg-card-hover transition-colors z-10 relative after:absolute after:-inset-[2px] after:content-['']"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6 text-secondary" />
            </button>
            <div className="flex flex-col items-center justify-center pt-1">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary font-heading text-center px-12 leading-tight line-clamp-2">
                {isNT ? 'New Testament' : 'Old Testament'}
              </h2>
            </div>
          </div>
        </div>

        <BibleBrowser
          initialTestament={isNT ? 'NT' : 'OT'}
          onOpenGuide={(guideId) => setActiveGuideId(guideId)}
        />

        {/* Bottom bar — the testament switcher is this level's equivalent of the
            book page's prev/next book and the reader's prev/next chapter, with the
            current one disabled the same way the reader disables "Start" on
            Genesis 1. Centre opens the same index modal the book page uses. */}
        <div className={`
          fixed bottom-0 left-0 right-0
          bg-card border-t border-card-border
          z-40 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${chromeVisible ? 'translate-y-0' : 'translate-y-full'}
        `}>
          <div className="max-w-4xl mx-auto flex items-center justify-between px-5 sm:px-8 py-3 pb-safe">
            <button
              onClick={() => setActiveGuideId(BIBLE_BROWSER_OT)}
              disabled={!isNT}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-hover text-secondary hover:text-primary"
              aria-label="Old Testament"
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:block">Old Testament</span>
              <span className="sm:hidden">OT</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsIndexModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold text-muted uppercase tracking-wider hover:text-primary transition-colors border border-card-border rounded-md px-3 py-1.5 relative after:absolute after:-inset-y-2 after:inset-x-0 after:content-['']"
              >
                INDEX
              </button>
              {/* A testament sweep — every chapter of every book in this list, in
                  order — via AnchorDrill's sweepBookIds, the same slot every other
                  screen's bottom bar puts its most useful action in. */}
              <button
                onClick={() => navigate('/practice', { state: { subject: 'anchor', sweepBookIds: (isNT ? NT_BOOKS : OT_BOOKS).map(b => b.id) } })}
                title={`Test me on these ${isNT ? NT_BOOKS.length : OT_BOOKS.length}`}
                className="flex items-center gap-1 text-xs font-bold text-accent uppercase tracking-wider hover:text-accent-hover transition-colors border border-card-border hover:border-accent/40 rounded-md px-3 py-1.5"
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Test Me</span>
              </button>
            </div>

            <button
              onClick={() => setActiveGuideId(BIBLE_BROWSER_NT)}
              disabled={isNT}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-hover text-secondary hover:text-primary"
              aria-label="New Testament"
            >
              <span className="hidden sm:block">New Testament</span>
              <span className="sm:hidden">NT</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>
        </div>

        <BibleIndexModal
          isOpen={isIndexModalOpen}
          selectedId={activeGuideId}
          onSelect={(id) => { setActiveGuideId(id); setIsIndexModalOpen(false); }}
          onClose={() => setIsIndexModalOpen(false)}
          mastery={mastery}
        />
      </div>
    );
  }

  // ── Individual guide detail view ───────────────────────────────────────────
  if (activeGuide) {
    return (
      <div
        className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-24 animate-[fadeIn_0.3s_ease-out]"
        // Clears the fixed header below, measured rather than hardcoded. The fallback
        // matches what the header renders to before the ResizeObserver first fires.
        style={{ paddingTop: headerHeight ? `${headerHeight + 16}px` : 'calc(env(safe-area-inset-top, 0px) + 5rem)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleGuideContentClick}
      >
        {/* Fixed header — mirrors ChapterReader's: back arrow at the left, centred
            title, same slide-away transition driven by the same tap-to-toggle state.
            Safe as a fixed child of the animated wrapper because fadeIn animates
            opacity only; a transform would make this element position against the
            wrapper instead of the viewport. */}
        <div
          ref={headerRef}
          className={`fixed top-0 left-0 right-0 z-40 bg-background border-b border-card-border/60 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${chromeVisible ? 'translate-y-0' : '-translate-y-full'}`}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >
          <div className="max-w-4xl mx-auto w-full px-5 sm:px-8 pb-3 relative">
            <button
              // Back goes back. This sent every book guide to the testament browser —
              // a screen most readers arrive at a book without ever having seen, since
              // the index and search both jump straight to the book — so "back" landed
              // somewhere they had never been. History is the honest answer when there
              // is one; the testament browser stays the fallback for a cold deep link.
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else setActiveGuideId(
                  activeGuide.type === 'book-guide'
                    ? (OT_BOOKS.some(b => b.id === activeGuide.id) ? BIBLE_BROWSER_OT : BIBLE_BROWSER_NT)
                    : null
                );
              }}
              className="absolute left-5 sm:left-8 top-1 p-2 -ml-2 rounded-full hover:bg-card-hover transition-colors z-10 relative after:absolute after:-inset-[2px] after:content-['']"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6 text-secondary" />
            </button>
            <div className="flex flex-col items-center justify-center pt-1">
              {/* Wraps rather than truncating, and steps down a size for long titles.
                  Every book name is ≤15 characters so they keep the reader's large
                  display size; only topical guide titles ("The Roman Road to
                  Salvation", 27 chars) shrink, which is what stops them being cut off
                  by an ellipsis on a phone. The header's height is measured, so the
                  content padding follows whichever size/line count results. */}
              <h2 className={`font-bold tracking-tight text-primary font-heading text-center px-12 leading-tight line-clamp-2 ${
                activeGuide.title.length > 18 ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl'
              }`}>
                {activeGuide.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Sticky block ribbon — names whichever anchor block (Primeval, Abraham…)
            is currently scrolled into view, so position inside a long grid survives
            the scroll. Pinned just under the fixed header above, and only rendered
            once activeBlockIndex has something to say (null below the grid, or on a
            book with too few blocks to bother tracking — see the effect that sets
            it). Slides with the same chrome-visibility state as everything else. */}
        {activeBlockIndex !== null && activeGuide.blocks?.[activeBlockIndex] && (() => {
          const block = activeGuide.blocks[activeBlockIndex];
          const color = DISTRIBUTION_COLORS[activeBlockIndex % DISTRIBUTION_COLORS.length];
          return (
            <div
              className={`fixed left-0 right-0 z-30 flex justify-center transition-[transform,top] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${chromeVisible ? 'translate-y-0' : '-translate-y-full'}`}
              style={{ top: headerHeight }}
            >
              <div className={`max-w-2xl w-full mx-5 sm:mx-8 -mt-px px-3 py-1.5 rounded-b-md border-x border-b border-card-border bg-card-elevated flex items-center gap-2 shadow-sm`}>
                <span className={`w-2 h-2 rounded-full ${color.bg} flex-shrink-0`} />
                <span className={`text-[0.6875rem] font-bold uppercase tracking-widest ${color.text}`}>{block.label}</span>
                <span className="text-[0.6875rem] text-muted">· {block.chapters}</span>
              </div>
            </div>
          );
        })()}

        <div className="flex flex-col gap-4 mb-2">
          <div className="flex items-center justify-between gap-4">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1 text-[0.8125rem] font-medium flex-wrap">
              <button
                onClick={() => setActiveGuideId(null)}
                className="text-accent hover:text-accent-hover transition-colors relative after:absolute after:-inset-y-3 after:inset-x-0 after:content-['']"
              >
                Bible
              </button>
              {activeGuide.type === 'book-guide' && (() => {
                const isOT = OT_BOOKS.some(b => b.id === activeGuide.id);
                return (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                    <button
                      onClick={() => setActiveGuideId(isOT ? BIBLE_BROWSER_OT : BIBLE_BROWSER_NT)}
                      className="text-accent hover:text-accent-hover transition-colors relative after:absolute after:-inset-y-3 after:inset-x-0 after:content-['']"
                    >
                      {isOT ? 'Old Testament' : 'New Testament'}
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                    <span className="text-primary font-bold">{activeGuide.title}</span>
                  </>
                );
              })()}
              {activeGuide.type !== 'book-guide' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  <span className="text-primary font-bold">{activeGuide.title}</span>
                </>
              )}
            </div>

            {/* The old X lived here; the fixed header's back arrow replaces it, and
                the breadcrumb above still offers the jump straight back to "Bible". */}
          </div>
          {/* Title now lives in the fixed header — only the icon and subtitle remain,
              so it isn't printed twice on screen. */}
          {activeGuide.type !== 'book-guide' && activeGuide.subtitle && (
            <div className="flex items-center gap-2">
              <span className="text-2xl">{activeGuide.icon}</span>
              <p className="text-secondary text-sm font-medium">{activeGuide.subtitle}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-8">

          {/* ── Reference guide ── */}
          {activeGuide.type === 'reference' && activeGuide.sections && (
             <div className="flex flex-col gap-10">
               {activeGuide.sections.map((sec: any, i: number) => (
                 <div key={i} className="flex flex-col gap-4">
                   {sec.heading && (
                     <h2 className="text-xl font-bold text-accent-light border-b border-card-border pb-2 inline-block">
                       {sec.heading}
                     </h2>
                   )}
                   {sec.description && (
                     <p className="text-secondary leading-relaxed">{sec.description}</p>
                   )}

                   {sec.table && (
                     <RecordCards headers={sec.table.headers} rows={sec.table.rows} />
                   )}

                   {sec.entries && (
                     <div className="flex flex-col gap-4 mt-2">
                       {sec.entries.map((entry: any, ei: number) => (
                         <div key={ei} className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-3">
                           <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border-b border-card-border pb-3">
                             <span className="font-bold text-accent text-xs uppercase tracking-wider">{entry.rank}</span>
                             <span className="font-heading font-bold text-lg text-primary">{entry.person}</span>
                             <span className="text-sm font-bold text-muted sm:ml-auto">{entry.reference}</span>
                           </div>
                           <p className="text-lg text-primary italic font-serif leading-relaxed border-l-2 border-accent/40 pl-4 my-1">"{entry.quote}"</p>
                           {entry.note && <p className="text-secondary text-sm">{entry.note}</p>}
                           {entry.resources && entry.resources.length > 0 && (
                             <div className="flex flex-wrap gap-2 mt-1 pt-2 border-t border-card-border/30">
                               {entry.resources.map((res: any, ri: number) => {
                                 const Icon = res.type === 'book' ? BookOpen :
                                              res.type === 'audio' ? Headphones :
                                              res.type === 'youtube' ? PlayCircle :
                                              res.type === 'podcast' ? Radio :
                                              Globe;
                                 const colorClass = res.type === 'book'
                                   ? 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                                   : res.type === 'audio'
                                   ? 'text-purple-400 bg-purple-400/10 border-purple-400/20 hover:bg-purple-400/20'
                                   : res.type === 'youtube'
                                   ? 'text-red-500 bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                                   : res.type === 'podcast'
                                   ? 'text-rose-400 bg-rose-400/10 border-rose-400/20 hover:bg-rose-400/20'
                                   : 'text-sky-400 bg-sky-400/10 border-sky-400/20 hover:bg-sky-400/20';
                                 return (
                                   <a
                                     key={ri}
                                     href={res.url}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${colorClass}`}
                                   >
                                     <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                     <span className="truncate max-w-[200px]">{res.title}</span>
                                   </a>
                                 );
                               })}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   )}

                   {sec.note && (
                     <div className="border-l-2 border-accent/40 pl-4 py-1 mt-2">
                       <p className="text-sm text-secondary leading-relaxed"><strong className="text-accent-light">Note:</strong> {sec.note}</p>
                     </div>
                   )}

                   {sec.keyVerse && (
                     <div className="bg-card border-l-2 border-l-accent rounded-r-md p-5 mt-4">
                       <p className="font-bold text-primary mb-1">{sec.keyVerse.ref}</p>
                       <p className="text-lg text-secondary italic font-serif">"{sec.keyVerse.text}"</p>
                     </div>
                   )}
                 </div>
               ))}
             </div>
          )}

          {/* ── Book guide placeholder (no chapter architecture authored yet) ── */}
          {activeGuide.type === 'book-guide' && !activeGuide.blocks && (
            <div className="flex flex-col items-center text-center gap-3 py-16">
              <span className="text-4xl">{activeGuide.icon}</span>
              <h1 className="text-3xl font-heading font-bold text-primary">{activeGuide.title}</h1>
              {activeGuide.subtitle && <p className="text-secondary">{activeGuide.subtitle}</p>}
              {activeGuide.sections?.map((sec: any, i: number) => (
                <div key={i} className="max-w-md mt-4">
                  {sec.heading && <h2 className="text-lg font-heading font-semibold text-primary mb-2">{sec.heading}</h2>}
                  {sec.description && <p className="text-secondary leading-relaxed">{sec.description}</p>}
                </div>
              ))}
            </div>
          )}

          {/* ── Book guide ── */}
          {activeGuide.type === 'book-guide' && activeGuide.blocks && (
            <div className="flex flex-col gap-6">

              {/* Book title moved to the fixed header above; this keeps only the
                  architecture caption so the name isn't rendered twice. */}
              <div className="flex flex-col items-center mb-2 mt-2 gap-1.5">
                <div className="text-[0.625rem] uppercase tracking-[0.2em] font-bold text-muted text-center">
                  NARRATIVE ARCHITECTURE · {activeGuide.chapters || 28} CHAPTERS
                </div>
                {/* The book's shape in four or five numbers — authored on 44 of the
                    66 guides and, until now, never rendered anywhere. */}
                {activeGuide.structureFormula && (
                  <div className="font-heading font-bold text-accent-light text-lg tracking-wide">
                    {activeGuide.structureFormula}
                  </div>
                )}
                {/* A jump straight to the one control on this page that actually
                    tests recall, offered up here rather than only at the bottom of
                    a fifty- (or a hundred-and-fifty-) card scroll. */}
                {activeGuide.memorySentence && (
                  <button
                    onClick={() => document.getElementById('memory-sentence-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="text-[0.6875rem] font-bold uppercase tracking-wider text-accent hover:text-accent-hover transition-colors mt-1"
                  >
                    Jump to Memory Sentence ↓
                  </button>
                )}
              </div>

              {/* CHAPTER DISTRIBUTION */}
              {(() => {
                // Single-chapter books (Obadiah, Philemon, Jude, 2-3 John) have nothing
                // to subdivide by chapter, so their blocks' "chapters" field is actually
                // a verse range within that one chapter (e.g. "8-16"). Dividing those by
                // activeGuide.chapters (always 1 here) blew percentages up past 700% and
                // pushed the bar chart, its tick labels, and the section cards' percent
                // readouts far off the right edge of the screen. The true total is the
                // sum of the blocks' own verse counts, not the book's chapter count.
                const isVerseBased = activeGuide.blocks.some((b: any) => b.unit === 'verse')
                  || (activeGuide.chapters === 1 && activeGuide.blocks.length > 1);
                const totalUnits = isVerseBased
                  ? activeGuide.blocks.reduce((sum: number, b: any) => {
                      const [s, e] = String(b.chapters).split(/[-–]/).map(Number);
                      return sum + ((e || s) - s + 1);
                    }, 0)
                  : (activeGuide.chapters || 28);
                const unitLabel = isVerseBased ? 'v' : 'ch';
                const unitWord = isVerseBased ? 'verse' : 'chapter';
                // For a single-chapter book there's only one chapter-anchor element on
                // the page (id="chapter-anchor-1") — jump there instead of treating a
                // verse number as if it were a chapter number to scroll to.
                const scrollTarget = (start: number) => isVerseBased ? 1 : start;

                return (
                  <div className="flex flex-col mb-4 px-2">
                    <h3 className="text-center text-[0.625rem] uppercase tracking-[0.2em] font-bold text-secondary mb-4">
                      {isVerseBased ? 'Verse Distribution' : 'Chapter Distribution'}
                    </h3>

                    {/* Bar chart — each segment now carries a fill for the share of
                        its own chapters graded secure (repetition >= 6, the same
                        threshold the shape meter and book cards read from), on top
                        of the block-identity color it already had. Skipped for
                        verse-based single-chapter books: their "segments" are verse
                        ranges inside one chapter, and chapter-granularity mastery
                        doesn't decompose across them. */}
                    <div className="flex w-full h-14 rounded-md overflow-hidden shadow-sm">
                      {activeGuide.blocks.map((block: any, i: number) => {
                         const [start, end] = String(block.chapters).split(/[-–]/).map(Number);
                         const count = (end || start) - start + 1;
                         const widthPercent = (count / totalUnits) * 100;
                         const color = DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length];
                         let securePercent = 0;
                         if (!isVerseBased) {
                           let secure = 0;
                           for (let ch = start; ch <= (end || start); ch++) {
                             if (masteryOf(state.chapterProgress[chapterProgressKey(activeGuide.id, ch)]) === 'secure') secure++;
                           }
                           securePercent = (secure / count) * 100;
                         }
                         return (
                           <button
                             key={i}
                             onClick={() => handleScrollToChapter(scrollTarget(start))}
                             className={`${color.bg} relative flex flex-col items-center justify-center border-r border-background/20 last:border-0 hover:opacity-80 transition-opacity focus:outline-none overflow-hidden`}
                             style={{ width: `${widthPercent}%` }}
                             title={`Scroll to ${unitWord} ${start}${securePercent > 0 ? ` — ${Math.round(securePercent)}% secure` : ''}`}
                           >
                             {securePercent > 0 && (
                               <div
                                 className="absolute inset-x-0 bottom-0 bg-white/25"
                                 style={{ height: `${securePercent}%` }}
                                 aria-hidden="true"
                               />
                             )}
                             <span className="relative font-bold text-white/90 text-sm">{block.chapters.replace('–', '-')}</span>
                             <span className="relative text-white/70 text-[0.625rem]">{count}{unitLabel}</span>
                           </button>
                         );
                      })}
                    </div>

                    {/* Ticks below the bar chart */}
                    <div className="flex w-full mt-2 relative h-4">
                      {(() => {
                         let unitsBefore = 0;
                         return activeGuide.blocks.map((block: any, i: number) => {
                           const leftPercent = (unitsBefore / totalUnits) * 100;
                           const [start, end] = String(block.chapters).split(/[-–]/).map(Number);
                           const count = (end || start) - start + 1;
                           unitsBefore += count;
                           return (
                             <div
                               key={i}
                               className="absolute text-[0.6875rem] text-muted font-medium"
                               style={{ left: `${leftPercent}%` }}
                             >
                               {start}
                             </div>
                           );
                         });
                      })()}
                    </div>
                  </div>
                );
              })()}

              {/* SECTION LIST */}
              {(() => {
                const isVerseBased = activeGuide.blocks.some((b: any) => b.unit === 'verse')
                  || (activeGuide.chapters === 1 && activeGuide.blocks.length > 1);
                const totalUnits = isVerseBased
                  ? activeGuide.blocks.reduce((sum: number, b: any) => {
                      const [s, e] = String(b.chapters).split(/[-–]/).map(Number);
                      return sum + ((e || s) - s + 1);
                    }, 0)
                  : (activeGuide.chapters || 28);

                return (
              <div className="flex flex-col gap-3">
                {activeGuide.blocks.map((block: any, i: number) => {
                  const color = DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length];

                  const isDiscourse = block.description.toLowerCase().includes('sermon');
                  const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                  const labelTitleCase = toTitleCase(block.label)
                    .replace('1', 'I').replace('2', 'II').replace('3', 'III')
                    .replace('4', 'IV').replace('5', 'V');

                  const [start, end] = String(block.chapters).split(/[-–]/).map(Number);
                  const count = (end || start) - start + 1;
                  const percent = ((count / totalUnits) * 100).toFixed(1) + '%';

                  let cleanDesc = block.description;
                  if (isDiscourse) {
                    cleanDesc = cleanDesc.replace(/Sermon \d+:\s*/i, '');
                    if (!cleanDesc.toLowerCase().includes('discourse') && cleanDesc.toLowerCase() !== 'sermon on the mount') {
                         cleanDesc += ' discourse';
                    }
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleScrollToChapter(isVerseBased ? 1 : start)}
                      className="w-full text-left flex rounded-lg overflow-hidden bg-card border border-card-border hover:bg-card-hover transition-colors min-h-[80px]"
                    >
                      <div className={`w-[72px] flex-shrink-0 flex flex-col items-center justify-center border-l-4 ${color.border} border-r border-r-card-border`}>
                         <span className="text-[0.625rem] uppercase font-bold text-muted tracking-widest mb-0.5">{isVerseBased ? 'V' : 'CH'}</span>
                         <span className={`text-xl font-bold ${color.text} font-heading leading-none`}>{block.chapters.replace('–', '-')}</span>
                      </div>
                      
                      <div className="flex-1 p-4 flex justify-between items-center gap-4">
                        <div className="flex flex-col gap-1 min-w-0">
                           <span className="text-[9px] uppercase tracking-widest text-muted font-bold">SECTION {String(i+1).padStart(2, '0')}</span>
                           <h3 className={`text-lg font-heading font-bold ${color.text} truncate`}>{labelTitleCase}</h3>
                           <p className="text-[0.8125rem] text-secondary italic truncate">{cleanDesc}</p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 flex-shrink-0 self-stretch justify-between py-0.5">
                          {isDiscourse ? (
                             <span className="text-[9px] font-bold uppercase tracking-widest text-sky-300 bg-sky-900/40 border border-sky-700/50 px-2 py-0.5 rounded-full">
                               DISCOURSE
                             </span>
                          ) : <div />}
                          <span className="text-[0.6875rem] text-muted font-medium mt-auto">{percent}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
                );
              })()}

              {activeGuide.anchors && (
                <div className="mt-4 pt-6 border-t border-card-border flex flex-col gap-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-accent-light text-sm uppercase tracking-[0.15em]">One-Word Chapter Anchors</h3>
                    <button
                      onClick={() => setShowAllAnchors(v => !v)}
                      className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-accent hover:text-accent-hover transition-colors relative after:absolute after:-inset-y-3 after:inset-x-0 after:content-['']"
                    >
                      {showAllAnchors ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showAllAnchors ? 'Hide all' : 'Reveal all'}
                    </button>
                  </div>

                  {anchorGroups.map(({ block, colorIndex, anchors }) => {
                    const color = DISTRIBUTION_COLORS[colorIndex % DISTRIBUTION_COLORS.length];
                    const isCollapsed = collapsedBlocks.has(colorIndex);
                    const revealedInBlock = anchors.filter((a: any) => showAllAnchors || revealedAnchors.has(Number(a.ch))).length;

                    return (
                      <div key={colorIndex} className="flex flex-col gap-3">
                        {/* Grouped only when the book actually has more than one block
                            (anchorGroups collapses single-chapter/no-block guides into
                            one ungrouped run with block === null) — an ungrouped run
                            skips this header entirely. */}
                        {block && (
                          <div
                            ref={el => { if (el) blockHeaderRefs.current.set(colorIndex, el); else blockHeaderRefs.current.delete(colorIndex); }}
                            className={`flex items-center gap-2 border-l-4 ${color.border} pl-3 py-1`}
                          >
                            <button
                              onClick={() => setCollapsedBlocks(prev => {
                                const next = new Set(prev);
                                if (next.has(colorIndex)) next.delete(colorIndex); else next.add(colorIndex);
                                return next;
                              })}
                              className="flex-1 flex items-center justify-between gap-2 text-left"
                            >
                              <span className={`font-heading font-bold text-sm ${color.text}`}>
                                {block.label} <span className="text-muted font-normal">· {block.chapters}</span>
                              </span>
                              <span className="flex items-center gap-2 text-[0.625rem] text-muted font-medium tabular-nums">
                                {revealedInBlock}/{anchors.length}
                                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </span>
                            </button>
                            {anchors.length > 1 && (() => {
                              // Chain state, shown where the chain is. blockProgress was
                              // written by the drill and read by nothing, so a block you
                              // had run five times looked identical to one you had never
                              // opened — and there was no way to see a chain was due.
                              const chain = state.blockProgress[blockProgressKey(activeGuide.id, colorIndex)];
                              const chainDue = chain && isDue(chain.sm2);
                              return (
                              <button
                                onClick={() => setDrillBlock({ label: block.label, blockIndex: colorIndex, anchors })}
                                title={chain
                                  ? `Chain last run at ${Math.round(chain.lastAccuracy * 100)}%${chainDue ? ' — due now' : ''}`
                                  : `Drill the ${block.label} chain`}
                                className={`flex-shrink-0 text-[0.625rem] font-bold uppercase tracking-wider rounded-md px-2 py-1 transition-colors border ${
                                  chainDue
                                    ? 'text-accent border-accent/50 bg-accent/10'
                                    : 'text-muted hover:text-accent border-card-border hover:border-accent/40'
                                }`}
                              >
                                {chain
                                  ? chainDue ? 'Chain due' : `Chain ${Math.round(chain.lastAccuracy * 100)}%`
                                  : 'Drill'}
                              </button>
                              );
                            })()}
                          </div>
                        )}

                        {!isCollapsed && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {anchors.map((anchor: any) => {
                              const ch = Number(anchor.ch);
                              const neighbors = anchorNeighbors.get(ch);
                              return (
                                <ChapterAnchorCard
                                  key={`${activeGuide.id}-${anchor.ch}`}
                                  anchor={anchor}
                                  guideId={activeGuide.id}
                                  revealed={showAllAnchors || revealedAnchors.has(ch)}
                                  onReveal={() => setRevealedAnchors(prev => new Set(prev).add(ch))}
                                  prevWord={neighbors?.prev}
                                  nextWord={neighbors?.next}
                                  graded={gradedAnchors.get(ch)}
                                  onGrade={(score) => handleGradeAnchor(activeGuide.id, ch, score)}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeGuide.keyVerses && (
                <div className="mt-2 pt-6 border-t border-card-border flex flex-col gap-4">
                  <h3 className="font-bold text-sm uppercase tracking-[0.15em]" style={{ color: 'var(--accent-light)' }}>Key Verses</h3>
                  <div className="flex flex-col gap-3">
                    {activeGuide.keyVerses.map((kv: any, i: number) => (
                      <KeyVerseCard key={`${activeGuide.id}-${kv.ref}-${i}`} verse={kv} bookId={activeGuide.id} />
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Memory Sentence — not gated to book-guide type. Reference/topical
              guides (Roman Road, Names of God, etc.) carry the same hand-written
              memorySentence field but have no chapter architecture, so this has
              to live outside the type-specific blocks above to reach them. */}
          {activeGuide.memorySentence && (
            <div id="memory-sentence-section" className="pt-6 border-t border-card-border flex flex-col gap-4">
              <h3 className="font-bold text-sm uppercase tracking-[0.15em]" style={{ color: 'var(--accent-light)' }}>Memory Sentence</h3>
              <MemorySentence sentence={activeGuide.memorySentence} anchors={activeGuide.anchors} guideId={activeGuide.id} />
            </div>
          )}

        </div>

        {/* Bottom book navigation — same fixed bar, transition and toggle state as
            the reader's chapter bar. left-64 was dropped: the desktop sidebar is
            hidden on guide pages (isFullscreenView in AppLayout), so offsetting for
            it left a dead 256px strip the bar refused to span. */}
        <div className={`
          fixed bottom-0 left-0 right-0
          bg-card border-t border-card-border
          z-40 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${chromeVisible ? 'translate-y-0' : 'translate-y-full'}
        `}>
          <div className="max-w-4xl mx-auto flex items-center justify-between px-5 sm:px-8 py-3 pb-safe">
            <button
              onClick={handlePrevBook}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-card-hover text-secondary hover:text-primary relative after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']"
              title={prevBook?.name || ''}
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:block truncate max-w-[120px]">{prevBook?.name}</span>
              <span className="sm:hidden truncate max-w-[80px]">
                {prevBook ? (prevBook.name.length <= 4 ? prevBook.name : (prevBook.name.startsWith('1 ') || prevBook.name.startsWith('2 ') || prevBook.name.startsWith('3 ') ? prevBook.name.substring(0, 5).replace(' ', '') : prevBook.name.substring(0, 3))) : ''}
              </span>
            </button>

            <button
              onClick={() => setIsIndexModalOpen(true)}
              className="flex items-center gap-1 text-xs font-bold text-muted uppercase tracking-wider hover:text-primary transition-colors border border-card-border rounded-md px-3 py-1.5 relative after:absolute after:-inset-y-2 after:inset-x-0 after:content-['']"
            >
              INDEX
            </button>

            <button
              onClick={handleNextBook}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-card-hover text-secondary hover:text-primary relative after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']"
              title={nextBook?.name || ''}
            >
              <span className="hidden sm:block truncate max-w-[120px]">{nextBook?.name}</span>
              <span className="sm:hidden truncate max-w-[80px]">
                {nextBook ? (nextBook.name.length <= 4 ? nextBook.name : (nextBook.name.startsWith('1 ') || nextBook.name.startsWith('2 ') || nextBook.name.startsWith('3 ') ? nextBook.name.substring(0, 5).replace(' ', '') : nextBook.name.substring(0, 3))) : ''}
              </span>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* Shared with the Bible landing page — defined as BibleIndexModal above. */}
        <BibleIndexModal
          isOpen={isIndexModalOpen}
          selectedId={activeGuideId}
          onSelect={(id) => { setActiveGuideId(id); setIsIndexModalOpen(false); }}
          onClose={() => setIsIndexModalOpen(false)}
          mastery={mastery}
        />

        {drillBlock && (
          <ChainDrill
            bookId={activeGuide.id}
            blockIndex={drillBlock.blockIndex}
            label={drillBlock.label}
            anchors={drillBlock.anchors}
            onClose={() => setDrillBlock(null)}
          />
        )}
      </div>
    );
  }

  // ── Main listing view ──────────────────────────────────────────────────────
  return (
    <div 
      className="flex flex-col gap-6 max-w-4xl mx-auto w-full pt-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
    >
      <div className="hidden lg:block mb-2">
        <h1 className="text-3xl font-heading font-bold text-primary">Bible</h1>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-muted" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search books and study resources..."
            className="w-full bg-card border border-card-border rounded-md pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors text-primary placeholder:text-muted shadow-sm"
          />
        </div>
        {/* A recognition pass through the same grid: art and theme word only, name
            withheld until tapped through to the book itself. */}
        <button
          onClick={() => setCoversOnlyMode(v => !v)}
          title={coversOnlyMode ? 'Show book names' : 'Hide book names — covers only'}
          aria-pressed={coversOnlyMode}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 rounded-md border text-xs font-bold uppercase tracking-wide transition-colors ${
            coversOnlyMode ? 'border-accent text-accent bg-accent/10' : 'border-card-border text-muted hover:text-primary hover:border-card-border-hover'
          }`}
        >
          {coversOnlyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="hidden sm:inline">Covers only</span>
        </button>
      </div>

      <div className="flex flex-col gap-8 pb-12">
        {/* ── Bible Books — OT ── */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => setIsOTExpanded(!isOTExpanded)}
            className="flex items-center justify-between py-2 border-b border-card-border/50 group"
          >
            <h2 className="text-sm uppercase tracking-[0.15em] font-bold text-muted group-hover:text-primary transition-colors flex items-center gap-2">
              <span className="text-xl">📜</span> Old Testament
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[0.625rem] font-bold text-muted uppercase tracking-wider bg-card-elevated px-2 py-0.5 rounded">39 Books</span>
              {isOTExpanded ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
            </div>
          </button>
          
          {isOTExpanded && (
            <div className="flex flex-col gap-6 animate-[fadeIn_0.2s_ease-out]">
              {OT_SECTIONS.map(section => {
                const books = OT_BOOKS.filter(b => b.section === section && matchesBookSearch(b, searchQuery));
                if (!books.length) return null;
                const division = divisionForSection(section);
                return (
                  <div key={section} className="flex flex-col gap-3">
                    <button
                      onClick={() => toggleSection(section)}
                      className="flex items-center justify-between border-b border-card-border pb-1 w-full text-left group hover:border-accent/50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${division.color.bg}`} aria-hidden="true" />
                        <p className={`text-[0.6875rem] font-bold uppercase tracking-widest ${division.color.text}`}>{section}</p>
                      </span>
                      {collapsedSections[section] ? (
                        <ChevronRight className="w-3.5 h-3.5 text-accent opacity-70 group-hover:opacity-100" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-accent opacity-70 group-hover:opacity-100" />
                      )}
                    </button>
                    {!collapsedSections[section] && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {books.map(book => (
                          <BookCard key={book.id} book={book} onClick={() => setActiveGuideId(book.id)} mastery={mastery[book.id]} coversOnly={coversOnlyMode} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Bible Books — NT ── */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => setIsNTExpanded(!isNTExpanded)}
            className="flex items-center justify-between py-2 border-b border-card-border/50 group"
          >
            <h2 className="text-sm uppercase tracking-[0.15em] font-bold text-muted group-hover:text-primary transition-colors flex items-center gap-2">
              <span className="text-xl">✝️</span> New Testament
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[0.625rem] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded">27 Books</span>
              {isNTExpanded ? <ChevronDown className="w-4 h-4 text-accent" /> : <ChevronRight className="w-4 h-4 text-accent" />}
            </div>
          </button>
          
          {isNTExpanded && (
            <div className="flex flex-col gap-6 animate-[fadeIn_0.2s_ease-out]">
              {NT_SECTIONS.map(section => {
                const books = NT_BOOKS.filter(b => b.section === section && matchesBookSearch(b, searchQuery));
                if (!books.length) return null;
                const division = divisionForSection(section);
                return (
                  <div key={section} className="flex flex-col gap-3">
                    <button
                      onClick={() => toggleSection(section)}
                      className="flex items-center justify-between border-b border-card-border pb-1 w-full text-left group hover:border-accent/50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${division.color.bg}`} aria-hidden="true" />
                        <p className={`text-[0.6875rem] font-bold uppercase tracking-widest ${division.color.text}`}>{section}</p>
                      </span>
                      {collapsedSections[section] ? (
                        <ChevronRight className="w-3.5 h-3.5 text-accent opacity-70 group-hover:opacity-100" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-accent opacity-70 group-hover:opacity-100" />
                      )}
                    </button>
                    {!collapsedSections[section] && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {books.map(book => (
                          <BookCard key={book.id} book={book} onClick={() => setActiveGuideId(book.id)} mastery={mastery[book.id]} coversOnly={coversOnlyMode} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Study resources ── */}
        {resourceSections.map(section => {
          // A search that matched something should show it, not leave the reader to
          // expand a collapsed section to find out.
          const isCollapsed = !searchQuery.trim() && collapsedSections2[section.id];
          const total = section.groups.reduce((sum, g) => sum + g.guides.length, 0);

          return (
            <div key={section.id} className="flex flex-col gap-3">
              <button
                onClick={() => setCollapsedSections2(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                className="flex items-center justify-between group px-1"
              >
                <div className="flex flex-col items-start">
                  <h2 className="text-sm uppercase tracking-[0.15em] font-bold text-muted group-hover:text-primary transition-colors flex items-center gap-2">
                    {section.title}
                    <span className="text-muted/60 font-normal normal-case tracking-normal">{total}</span>
                  </h2>
                  <span className="text-xs text-secondary normal-case tracking-normal">{section.blurb}</span>
                </div>
                {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
              </button>

              {!isCollapsed && section.groups.map((group, gi) => (
                <div key={group.label || gi} className="flex flex-col gap-2">
                  {/* Skipped when a section holds one group — the section heading has
                      already said what these are. */}
                  {group.label && section.groups.length > 1 && (
                    <h3 className="text-[0.6875rem] uppercase tracking-[0.15em] font-bold text-muted/70 ml-1">
                      {group.label}
                    </h3>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.guides.map((guide: any) => (
                      <button
                        key={guide.id}
                        onClick={() => setActiveGuideId(guide.id)}
                        className="flex items-center gap-4 p-4 rounded-lg bg-card border border-card-border hover:border-accent/40 transition-colors text-left group"
                      >
                        <div className="text-2xl">{guide.icon}</div>
                        <div className="flex-1 flex flex-col min-w-0">
                          <span className="font-heading font-bold text-primary text-lg truncate">{guide.title}</span>
                          <span className="text-xs text-secondary">{guide.subtitle}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
