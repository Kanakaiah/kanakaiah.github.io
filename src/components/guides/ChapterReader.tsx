import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Loader2, Type, Plus, Minus, X, Copy, Trash2, BookOpen, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NT_BOOKS } from '../../data/ntBooks';
import { OT_BOOKS } from '../../data/otBooks';
import { CROSS_REFS_URL } from '../../data/crossRefsUrl';
import { CrossReferenceModal } from './CrossReferenceModal';
import { WordPopup } from '../WordPopup';
import { StrongsOccurrencesModal } from '../StrongsOccurrencesModal';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import otQuotesData from '../../data/otQuotes.json';

// --- Module-level caching for performance ---
const otQuotes = otQuotesData as Record<string, Record<string, number[]>>;
let cachedCrossRefs: Record<string, string[]> | null = null;
// bookId -> chapter number (as string) -> verse numbers that start a new paragraph.
// Sourced from NASB95 (via API.Bible), which shares the LSB's paragraph structure closely
// enough to use directly — verified against Blue Letter Bible's LSB markers for John 3
// (exact match). Poetic books have no entries here (poetry has no real "paragraph" unit at
// the USX level) and fall back to the heading/<br/> heuristic below.
let cachedParagraphBreaks: Record<string, Record<string, number[]>> | null = null;
const cachedStrongsDicts: Record<string, Record<string, StrongsDefinition>> = {};

// Common function words that should NOT be underlined in α mode
const SKIP_WORDS = new Set([
  'the','a','an','and','or','but','for','nor','so','yet','in','on','at','to','of',
  'by','is','am','are','was','were','be','been','being','has','had','have','do',
  'did','does','it','its','he','she','him','her','his','they','them','their','we',
  'us','our','you','your','i','my','me','if','not','no','that','this','these',
  'those','with','from','as','into','than','which','who','whom','whose','what',
  'shall','will','may','can','would','could','should','might','must','up','out',
  'then','there','here','when','where','how','why','all','also','even','own',
  'about','after','before','between','both','each','every','more','most','much',
  'other','over','same','some','such','through','under','upon','very','now',
  'only','still','just','also','too','again','o','oh','lo','unto'
]);

// fontSize is a raw multiplier (0.85–1.45); surface it as a size label instead
// of the internal number so "1.15" doesn't leak into the reading-options UI.
const FONT_SIZE_LABELS = (size: number): string => {
  if (size <= 0.90) return 'XS';
  if (size <= 1.05) return 'S';
  if (size <= 1.20) return 'M';
  if (size <= 1.35) return 'L';
  return 'XL';
};

const BIBLE_VERSION_OPTIONS: { value: 'LSB' | 'NASB' | 'NLT'; label: string }[] = [
  { value: 'LSB', label: 'Legacy Standard Bible (LSB)' },
  { value: 'NASB', label: 'New American Standard Bible 1995 (NASB95)' },
  { value: 'NLT', label: 'New Living Translation (NLT)' },
];

// Parses a "book chapter:verse" reference string (e.g. "genesis 1:1", or a multi-word
// book like "song of solomon 3:1") into a resolved book id. Anchored on the trailing
// "chapter:verse" so everything before it is treated as the book name regardless of
// how many words it has — the previous single-word-only regex silently failed to
// match multi-word books.
function parseVerseRefString(refStr: string): { bookId: string; chapter: number; verse: number } | null {
  const match = refStr.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!match) return null;
  const bookName = match[1].trim().toLowerCase();
  const foundBook = ALL_BOOKS.find(b => b.name.toLowerCase() === bookName || b.id === bookName);
  if (!foundBook) return null;
  return { bookId: foundBook.id, chapter: parseInt(match[2], 10), verse: parseInt(match[3], 10) };
}

// Comfortable reading measure for the Bible text column. Expressed in `ch` rather
// than a fixed px/rem cap so it tracks the reader's own font-size setting: 52
// zero-widths measures out to ~60 rendered characters per line (comfortably inside
// the classic 45-75 range) at *every* size step. A fixed cap can't do that — the
// previous max-w-2xl (672px) ran ~75 characters at the smallest text size and only
// ~36 at the largest. At the default size this resolves to ≈671px, i.e. visually
// identical to the old cap, so phones and desktop are unchanged; it's the extreme
// font-size settings that get materially better. min() keeps it from exceeding the
// width actually available on a narrow screen.
const READING_MEASURE = 'min(100%, 52ch)';

// Cross-reference "back" navigation, and the reader's position, used to live in URL
// query params. Both have moved: the trail is in-memory state (pendingHighlight /
// returnStack) so a stale trail can't resurface after a reload, and the position is the
// path itself (/bible/HAB.1). Nothing here has to carry unrelated query keys forward
// any more, so the pruning that guarded against that is gone with them.

interface StrongsDefinition {
  lemma: string;
  xlit?: string;
  pron?: string;
  strongs_def: string;
  kjv_def: string;
  derivation?: string;
  pos?: string;
}

interface ParsedStrongsWord {
  english: string;
  strongs: string | null;
}

interface ChapterReaderProps {
  bookId: string;
  chapter: number;
  bookTitle: string;
  /** Verse from a /bible/HAB.1.4 style link — scrolled to and flashed on arrival. */
  initialVerse?: number;
  onClose: () => void;
  onStudyOriginalWord?: (verseRef: { book: number; chapter: number; verse: number }) => void;
}

import { BOLLS_BIBLE_MAP, BOOK_SHORT, BIBLE_VERSION_LABELS, normalizeCrossRefKey } from '../../data/bibleMap';
import { readerPath } from '../../utils/readerRoute';
import { readingDisplay } from '../../data/readingPresets';

interface Verse {
  pk: number;
  verse: number;
  text: string;
}

// bolls.life ships section headings (as <b> tags inside the verse text) only in its LSB
// edition — its NASB95 and NLT chapters carry no headings at all. Pulls the LSB's out of
// a chapter so they can be shown above the matching verse in those versions; headings
// always sit at a verse boundary, so they land on the same verse in any translation.
function extractHeadings(verses: Verse[]): Record<number, string[]> {
  const byVerse: Record<number, string[]> = {};

  for (const v of verses) {
    const headings = Array.from(v.text.matchAll(/<b>(.*?)<\/b>/gi))
      .map(m => m[1].trim())
      .filter(Boolean);
    if (headings.length) byVerse[v.verse] = headings;
  }

  return byVerse;
}

const HEADING_CLASSES = 'mt-10 first-of-type:mt-0 mb-4 text-[1.2em] font-bold tracking-tight text-accent-light font-heading italic leading-snug break-words w-full block';

// Borrowed headings get a small LSB tag: the wording is the LSB's editorial choice, and
// the NLT in particular words and places its own headings quite differently, so they
// shouldn't read as the publisher's.
function renderHeading(text: string, borrowed = false): string {
  const tag = borrowed
    ? '<span class="ml-2 align-middle text-[0.55em] font-bold tracking-widest text-muted uppercase not-italic">LSB</span>'
    : '';
  return `<div class="${HEADING_CLASSES}">${text}${tag}</div>`;
}

export function ChapterReader({ bookId, chapter, bookTitle, initialVerse, onClose, onStudyOriginalWord }: ChapterReaderProps) {
  const [verses, setVerses] = useState<Verse[]>([]);
  // LSB headings for the loaded chapter, kept separate from `verses` so they never leak
  // into copied or memorized text. Null when reading the LSB itself (its own headings
  // are already inline) or when the extra request failed.
  const [borrowedHeadings, setBorrowedHeadings] = useState<Record<number, string[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // A single verse to scroll-to and briefly flash once its chapter is loaded and on
  // screen. Component state (not a URL param) so it's fully under our control — every
  // consumer below is required to set it explicitly, and it's consumed (cleared) the
  // instant it fires, so it can never resurface during later, unrelated navigation the
  // way a lingering URL param could.
  const [pendingHighlight, setPendingHighlight] = useState<{ book: string; chapter: number; verse: number } | null>(null);
  // The verse currently flashing green, if any. Baked directly into the html-building
  // memo below (alongside the selected/memorized/paragraph classes) instead of being
  // applied via an out-of-band `el.classList.add(...)` DOM mutation — that used to be
  // silently wiped whenever the memo recomputed for an unrelated reason (e.g. the
  // one-time paragraphBreaks fetch resolving) mid-flash, since dangerouslySetInnerHTML
  // replaces the whole subtree wholesale. Being real state, it now survives any such
  // recompute automatically.
  const [flashVerse, setFlashVerse] = useState<number | null>(null);
  // Cross-reference "back" trail — a real stack (push on every cross-reference jump,
  // pop on "Go back"), not a single slot, so jumping through several cross-references
  // in a row doesn't silently discard earlier stops. Cleared on any navigation that
  // isn't itself a cross-reference jump or a "Go back" (Next/Prev/Navigator), so a
  // stale trail can't reappear pointing somewhere that no longer makes sense.
  const [returnStack, setReturnStack] = useState<{ book: string; chapter: number; verse: number }[]>([]);
  // Set only when the current cross-reference session was opened via the return pill's
  // own "Refs" peek (viewing references *for the return target*, without actually
  // navigating there). In that case the verse-group a clicked reference came from is
  // the peeked verse, not the user's actual physical position — pushing that as the
  // "source" would duplicate the stack's current top instead of recording where the
  // user really was, e.g. "Go back" from the new verse would land back on the same
  // peeked verse a second time instead of returning to the chapter they'd actually
  // been reading.
  const [crossRefPeekSource, setCrossRefPeekSource] = useState<{ book: string; chapter: number } | null>(null);
  const navigate = useNavigate();

  // Every move between chapters goes through here. `replace` for jumps that shouldn't
  // become their own history entry (cross-references, the book navigator, "go back"),
  // push for the ordinary next/previous walk so the browser's back button retraces it.
  const goToChapter = (targetBookId: string, targetChapter: number, replace = false) => {
    const path = readerPath(targetBookId, targetChapter);
    if (path) navigate(path, { replace });
  };
  const [showOptions, setShowOptions] = useState(false);
  const [showCrossReferences, setShowCrossReferences] = useState<string[] | null>(null);
  const [crossRefMap, setCrossRefMap] = useState<Record<string, string[]> | null>(cachedCrossRefs);
  const [paragraphBreaks, setParagraphBreaks] = useState<Record<string, Record<string, number[]>> | null>(cachedParagraphBreaks);
  const { state, dispatch } = useApp();
  const bibleVersion = state.settings.bibleVersion || 'LSB';
  const { showToast } = useToast();
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [navigatorBook, setNavigatorBook] = useState(bookId);
  const chapterGridRef = useRef<HTMLDivElement>(null);
  const [retryCount, setRetryCount] = useState(0);
  // Which "book-chapter" the current `verses` state actually holds data for. A ref, not
  // state: it must be visible to the pendingHighlight effect below within the *same*
  // commit that a chapter change starts a new fetch, and sibling effects in one commit
  // still see each other's pre-update state snapshot — only a ref mutates in place in
  // time for that. See the fetch effect and the pendingHighlight effect for how this
  // prevents a cross-chapter jump from flashing against the outgoing chapter's verses.
  const versesChapterRef = useRef<string>('');
  // Marks which pendingHighlight object has already been scheduled to fire, so the
  // highlight effect can recognize "already handled" without nulling pendingHighlight
  // state (see that effect for why nulling it causes a self-cancellation bug).
  const consumedHighlightRef = useRef<{ book: string; chapter: number; verse: number } | null>(null);
  const [alphaDiscovered, setAlphaDiscovered] = useState(() => {
    try { return localStorage.getItem('remora_alpha_discovered') === '1'; } catch { return true; }
  });

  // Alpha mode state
  const [alphaMode, setAlphaMode] = useState(false);
  const [kjvVerses, setKjvVerses] = useState<Verse[]>([]);
  const [strongsDict, setStrongsDict] = useState<Record<string, StrongsDefinition>>({});
  const [alphaDictLoaded, setAlphaDictLoaded] = useState(false);
  const [alphaLoading, setAlphaLoading] = useState(false);
  const [wordPopup, setWordPopup] = useState<{ word: string; strongsNumber: string; definition: StrongsDefinition } | null>(null);
  const [viewingOccurrences, setViewingOccurrences] = useState<string | null>(null);

  const [scrollProgress, setScrollProgress] = useState(0);

  // Chrome (top header + bottom nav) visibility — tap-to-toggle, replacing the
  // old scroll-direction heuristic. Visible on entry/navigation for orientation;
  // a tap on empty space toggles it, a tap on a verse/word always reveals it
  // (never hides it) so selecting/looking up a word never feels like it also
  // yanked the chrome away.
  const [chromeVisible, setChromeVisible] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const revealChrome = useCallback(() => setChromeVisible(true), []);
  const toggleChrome = useCallback(() => setChromeVisible(v => !v), []);

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isMeaningfulTap = !!target.closest('.verse-span, .alpha-word, .alpha-verse-span, button, a');
    if (isMeaningfulTap) {
      revealChrome();
    } else {
      toggleChrome();
    }
  };

  // Reorient the reader after any navigation (button, swipe, or jump-to),
  // regardless of whether chrome happened to be hidden beforehand.
  useEffect(() => {
    setChromeVisible(true);
  }, [bookId, chapter]);

  // Keep the scroll container's top padding in sync with the fixed header's
  // actual rendered height (varies slightly with the translation badge text),
  // so verse 1 never starts out hidden underneath it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    // getBoundingClientRect (not ResizeObserver's contentRect) — contentRect
    // excludes the element's own padding, which here includes
    // env(safe-area-inset-top): on an iPhone with a notch/Dynamic Island that's
    // 47-59px alone, so contentRect undercounted the header's true height by
    // that much and left the first line or two of verse 1 hidden underneath it.
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const totalHeight = target.scrollHeight - target.clientHeight;
    if (totalHeight > 0) {
      setScrollProgress((target.scrollTop / totalHeight) * 100);
    }
  };

  // Compute prev/next labels for the navigation bar
  const bookIndex = ALL_BOOKS.findIndex(b => b.id === bookId);
  const currentBook = bookIndex !== -1 ? ALL_BOOKS[bookIndex] : null;

  let prevLabel: string | null = null;
  let prevAbbrLabel: string | null = null;
  let nextLabel: string | null = null;
  let nextAbbrLabel: string | null = null;

  const getAbbr = (name: string) => {
    if (name.length <= 4) return name;
    if (name.startsWith('1 ') || name.startsWith('2 ') || name.startsWith('3 ')) {
      return name.substring(0, 5).replace(' ', '');
    }
    return name.substring(0, 3);
  };

  if (currentBook) {
    if (chapter > 1) {
      prevLabel = `${bookTitle} ${chapter - 1}`;
      prevAbbrLabel = `${getAbbr(bookTitle)} ${chapter - 1}`;
    } else if (bookIndex > 0) {
      const prev = ALL_BOOKS[bookIndex - 1];
      prevLabel = `${prev.name} ${prev.chapters}`;
      prevAbbrLabel = `${getAbbr(prev.name)} ${prev.chapters}`;
    }

    if (chapter < currentBook.chapters) {
      nextLabel = `${bookTitle} ${chapter + 1}`;
      nextAbbrLabel = `${getAbbr(bookTitle)} ${chapter + 1}`;
    } else if (bookIndex < ALL_BOOKS.length - 1) {
      nextLabel = `${ALL_BOOKS[bookIndex + 1].name} 1`;
      nextAbbrLabel = `${getAbbr(ALL_BOOKS[bookIndex + 1].name)} 1`;
    }
  }

  const handleNextChapter = () => {
    const bookIndex = ALL_BOOKS.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return;
    const currentBook = ALL_BOOKS[bookIndex];
    // Normal navigation invalidates any cross-reference "back" trail and pending
    // highlight — otherwise either could resurface later pointing somewhere that no
    // longer relates to how the reader actually got to the new chapter.
    setReturnStack([]);
    setPendingHighlight(null);
    setCrossRefPeekSource(null);

    if (chapter < currentBook.chapters) {
      goToChapter(bookId, chapter + 1);
    } else if (bookIndex < ALL_BOOKS.length - 1) {
      goToChapter(ALL_BOOKS[bookIndex + 1].id, 1);
    }
  };

  const handlePrevChapter = () => {
    const bookIndex = ALL_BOOKS.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return;
    setReturnStack([]);
    setPendingHighlight(null);
    setCrossRefPeekSource(null);

    if (chapter > 1) {
      goToChapter(bookId, chapter - 1);
    } else if (bookIndex > 0) {
      const prevBook = ALL_BOOKS[bookIndex - 1];
      goToChapter(prevBook.id, prevBook.chapters);
    }
  };

  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null);
  const [touchEndPos, setTouchEndPos] = useState<{x: number, y: number} | null>(null);

  // Any of these overlays sit on top of the reader as React children, so their
  // touch events bubble up to the swipe handlers below unless explicitly guarded —
  // otherwise swiping inside e.g. the chapter navigator silently changes the chapter underneath it.
  const isOverlayOpen = showOptions || showNavigator || !!showCrossReferences || showAddOptions || !!wordPopup || !!viewingOccurrences;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isOverlayOpen) return;
    setTouchEndPos(null);
    setTouchStartPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isOverlayOpen) return;
    setTouchEndPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchEnd = () => {
    if (isOverlayOpen || !touchStartPos || !touchEndPos) return;
    const distanceX = touchStartPos.x - touchEndPos.x;
    const distanceY = touchStartPos.y - touchEndPos.y;
    const minSwipeDistance = 50;

    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
        handleNextChapter();
      } else {
        handlePrevChapter();
      }
    }
  };

  const handleNavigate = (targetBookId: string, targetChapter: number) => {
    setReturnStack([]);
    setPendingHighlight(null);
    setCrossRefPeekSource(null);
    goToChapter(targetBookId, targetChapter, true);
    setShowNavigator(false);
    setShowVersionPicker(false);
  };

  useEffect(() => {
    if (cachedCrossRefs) {
      setCrossRefMap(cachedCrossRefs);
      return;
    }
    let mounted = true;
    fetch(CROSS_REFS_URL)
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          cachedCrossRefs = data;
          setCrossRefMap(data);
        }
      })
      .catch(console.error);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (cachedParagraphBreaks) {
      setParagraphBreaks(cachedParagraphBreaks);
      return;
    }
    let mounted = true;
    fetch('/data/paragraph_breaks.json')
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          cachedParagraphBreaks = data;
          setParagraphBreaks(data);
        }
      })
      .catch(console.error);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (showNavigator && chapterGridRef.current) {
      setTimeout(() => {
        chapterGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [navigatorBook, showNavigator]);

  useEffect(() => {
    // Guards against React StrictMode's dev-only double-invoke of effects (mount ->
    // cleanup -> mount again): the first invocation's fetch gets aborted by the
    // cleanup below almost immediately, which would otherwise be indistinguishable
    // from a real 15s timeout and incorrectly flash an error before the second,
    // real invocation's fetch even has a chance to resolve.
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    // Cleared synchronously (before any await) so it's already invalidated by the time
    // the pendingHighlight effect below runs later in this same commit.
    versesChapterRef.current = '';

    const fetchChapter = async () => {
      setLoading(true);
      setError(null);
      try {
        const bollsId = BOLLS_BIBLE_MAP[bookId];
        if (!bollsId) {
          throw new Error('Book not found in Bible API map.');
        }

        const fetchVersion = async (version: string): Promise<Verse[]> => {
          const res = await fetch(`https://bolls.life/get-text/${version}/${bollsId}/${chapter}/`, { signal: controller.signal });
          if (!res.ok) {
            throw new Error('Failed to fetch chapter text.');
          }
          return res.json();
        };

        // Requested in parallel, so a version without its own headings costs the slower
        // of the two round trips rather than their sum. A failed LSB request only costs
        // the headings — the chapter itself still renders.
        const [data, lsbData] = await Promise.all([
          fetchVersion(bibleVersion),
          bibleVersion === 'LSB' ? Promise.resolve(null) : fetchVersion('LSB').catch(() => null),
        ]);

        if (cancelled) return;
        setVerses(data);
        setBorrowedHeadings(lsbData ? extractHeadings(lsbData) : null);
        versesChapterRef.current = `${bookId}-${chapter}`;
        setSelectedVerses([]); // Clear any previous selection when loading a new chapter
      } catch (err: any) {
        if (cancelled) return;
        if (err.name === 'AbortError') {
          setError('This is taking longer than expected. Check your connection and try again.');
        } else {
          setError(err.message || 'An error occurred while loading the chapter.');
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    };

    fetchChapter();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [bookId, chapter, retryCount, bibleVersion]);

  // A link that names a verse (/bible/HAB.1.4) hands it to the same highlight machinery
  // cross-references use, which already knows to wait until that chapter is really on
  // screen. This is what the old ?highlightVerse= param was meant to do; nothing read it.
  useEffect(() => {
    if (initialVerse) {
      setPendingHighlight({ book: bookId, chapter, verse: initialVerse });
    }
  }, [bookId, chapter, initialVerse]);

  // Single home for every "jump to a verse and flash it" request in this component
  // (cross-references, Strong's occurrences, "Go back"). Waits until the *target*
  // chapter is actually the one loaded and on screen before doing anything — without
  // that guard, a cross-chapter jump could transiently fire against the previous
  // chapter's still-mounted DOM in the render before the new chapter's fetch resolves,
  // consuming the request before the correct chapter ever got its highlight.
  //
  // Checks versesChapterRef, self-contained against pendingHighlight's own book/chapter
  // (not bookId/chapter props): on the very render where bookId/chapter change, the
  // fetch effect above (which runs first in the same commit) resets versesChapterRef
  // synchronously, so it's visible immediately to this effect within the same commit —
  // but bookId/chapter props themselves may lag pendingHighlight by a render (this
  // router wraps navigation in React.startTransition), so gating on versesChapterRef
  // alone avoids depending on that timing relationship ever holding.
  //
  // "One-shot" consumption is tracked via consumedHighlightRef, not by nulling
  // pendingHighlight state: pendingHighlight is in this effect's own dependency array,
  // so calling setPendingHighlight(null) from inside it triggers this same effect's
  // cleanup on the very next render — which clearTimeout'd the 300ms flash before it
  // ever fired, silently swallowing every cross-reference-jump highlight. Comparing
  // against a ref instead avoids that self-cancellation entirely.
  useEffect(() => {
    if (!pendingHighlight) return;
    if (pendingHighlight === consumedHighlightRef.current) return; // already scheduled
    if (versesChapterRef.current !== `${pendingHighlight.book}-${pendingHighlight.chapter}`) return;

    consumedHighlightRef.current = pendingHighlight;
    const targetVerse = pendingHighlight.verse;

    const timeoutId = setTimeout(() => {
      // Driven by state (flashVerse), not an imperative el.classList mutation: the
      // verse spans are rendered via dangerouslySetInnerHTML, and a direct DOM mutation
      // there gets silently wiped the instant that html memo recomputes for *any*
      // unrelated reason (e.g. the one-time paragraphBreaks fetch resolving) — which
      // was the actual cause of the flash intermittently not appearing at all. Baking
      // flashVerse into the same memo that already decides selected/memorized styling
      // means it's regenerated correctly on every recompute instead of being an
      // out-of-band mutation those recomputes can clobber.
      setFlashVerse(targetVerse);
      setTimeout(() => setFlashVerse(prev => (prev === targetVerse ? null : prev)), 4000);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [pendingHighlight, verses, loading]);

  // Scrolls the flashing verse into view once it actually exists in the DOM — separate
  // from the effect above because the html memo (and therefore the real data-verse
  // element) only regenerates *after* setFlashVerse's render commits, so scrollIntoView
  // has to run in its own effect keyed on flashVerse, not inline in the same tick.
  //
  // verse 0 is the "peeked from the return pill" sentinel (see crossRefPeekSource) —
  // it means "somewhere in this chapter, exact position not tracked," not a real verse
  // number, so `[data-verse="0"]` never matches anything. That used to make "Go back"
  // to one of these stops a complete no-op — no scroll, no visible feedback at all,
  // especially confusing when the target chapter is also the one already on screen.
  // Falling back to the first verse in the chapter gives it a sensible, visible target.
  useEffect(() => {
    if (flashVerse === null) return;
    const selector = flashVerse === 0 ? '.verse-span, .alpha-verse-span' : `[data-verse="${flashVerse}"]`;
    const el = document.querySelector(selector);
    el?.scrollIntoView({ behavior: 'smooth', block: flashVerse === 0 ? 'start' : 'center' });
  }, [flashVerse]);

  const memorizedVerses = useMemo(() => {
    const memSet = new Set<number>();
    const prefix = `${bookTitle} ${chapter}:`;
    state.verses.forEach(v => {
      if (v.ref.startsWith(prefix)) {
        const versePart = v.ref.substring(prefix.length);
        if (versePart.includes('-')) {
          const [start, end] = versePart.split('-').map(n => parseInt(n, 10));
          for (let i = start; i <= end; i++) memSet.add(i);
        } else if (versePart.includes(',')) {
          versePart.split(',').forEach(n => memSet.add(parseInt(n, 10)));
        } else {
          memSet.add(parseInt(versePart, 10));
        }
      }
    });
    return memSet;
  }, [state.verses, bookTitle, chapter]);

  const toggleVerseSelection = useCallback((verseNum: number) => {
    setSelectedVerses(prev =>
      prev.includes(verseNum)
        ? prev.filter(v => v !== verseNum)
        : [...prev, verseNum].sort((a, b) => a - b)
    );
  }, []);

  const handleVerseClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // The marker sits inside the verse span, so it has to be claimed first or the tap
    // would just toggle selection like any other part of the verse.
    const marker = target.closest('.xref-marker');
    if (marker) {
      const markerVerse = marker.getAttribute('data-xref-verse');
      if (markerVerse) {
        setCrossRefPeekSource(null);
        setShowCrossReferences([`${bookTitle.toLowerCase()} ${chapter}:${markerVerse}`]);
        return;
      }
    }

    const verseSpan = target.closest('.verse-span');
    if (verseSpan) {
      const verseNumStr = verseSpan.getAttribute('data-verse');
      if (verseNumStr) toggleVerseSelection(parseInt(verseNumStr, 10));
    }
  };

  const handleVerseKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target as HTMLElement;
    const verseSpan = target.closest('.verse-span');
    if (verseSpan) {
      e.preventDefault();
      const verseNumStr = verseSpan.getAttribute('data-verse');
      if (verseNumStr) toggleVerseSelection(parseInt(verseNumStr, 10));
    }
  };

  const handleAddClick = () => {
    if (selectedVerses.length > 1) {
      setShowAddOptions(true);
    } else {
      executeAdd('individual');
    }
  };

  const executeAdd = (mode: 'individual' | 'combined') => {
    let addedCount = 0;
    let skippedCount = 0;
    
    if (mode === 'individual') {
      selectedVerses.forEach(verseNum => {
        const v = verses.find(x => x.verse === verseNum);
        if (v) {
          const cleanText = v.text
            .replace(/<b>.*?<\/b>/gi, '')       // Remove section headings
            .replace(/<br\s*\/?>/gi, '\n')       // Line breaks → newlines
            .replace(/<[^>]+>/g, '')              // Strip remaining tags (<i>, etc.)
            .replace(/([a-z][.?!;:,])([A-Z])/g, '$1 $2')
            .replace(/[ \t]+/g, ' ')
            .trim();
          const ref = `${bookTitle} ${chapter}:${verseNum}`;
          
          if (state.verses.some(verse => verse.ref === ref)) {
            skippedCount++;
            return;
          }
          
          dispatch({
            type: 'ADD_VERSE',
            payload: {
              id: crypto.randomUUID(),
              ref: ref,
              text: cleanText,
              translation: bibleVersion,
              addedDate: new Date().toISOString(),
              status: 'learning',
              sm2: { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() },
              streak: 0,
              attempts: 0
            }
          });
          addedCount++;
        }
      });
    } else {
      // Group contiguous verses
      const sorted = [...selectedVerses].sort((a, b) => a - b);
      if (sorted.length === 0) return;
      
      const groups: number[][] = [];
      let currentGroup = [sorted[0]];
      
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i-1] + 1) {
          currentGroup.push(sorted[i]);
        } else {
          groups.push(currentGroup);
          currentGroup = [sorted[i]];
        }
      }
      groups.push(currentGroup);
      
      groups.forEach(group => {
        const textParts: string[] = [];
        group.forEach(verseNum => {
          const v = verses.find(x => x.verse === verseNum);
          if (v) {
            textParts.push(
              v.text
                .replace(/<b>.*?<\/b>/gi, '')       // Remove section headings
                .replace(/<br\s*\/?>/gi, '\n')       // Line breaks → newlines
                .replace(/<[^>]+>/g, '')              // Strip remaining tags (<i>, etc.)
                .replace(/([a-z][.?!;:,])([A-Z])/g, '$1 $2')
                .replace(/[ \t]+/g, ' ')
                .trim()
            );
          }
        });
        
        const combinedText = textParts.join(' ');
        const refStr = group.length === 1 ? `${group[0]}` : `${group[0]}-${group[group.length - 1]}`;
        const ref = `${bookTitle} ${chapter}:${refStr}`;
        
        if (state.verses.some(verse => verse.ref === ref)) {
          skippedCount++;
          return;
        }
        
        dispatch({
          type: 'ADD_VERSE',
          payload: {
            id: crypto.randomUUID(),
            ref: ref,
            text: combinedText,
            translation: bibleVersion,
            addedDate: new Date().toISOString(),
            status: 'learning',
            sm2: { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() },
            streak: 0,
            attempts: 0
          }
        });
        addedCount++;
      });
    }
    
    const actionObj = {
      label: 'Go to Library',
      onClick: () => {
        setTimeout(() => {
          onClose();
          navigate(`/?search=${encodeURIComponent(bookTitle + ' ' + chapter + ':')}`);
        }, 300);
      }
    };
    
    if (addedCount > 0 && skippedCount > 0) {
      showToast(`Added ${addedCount} ${addedCount === 1 ? 'entry' : 'entries'} (${skippedCount} skipped as duplicate)`, 'success', actionObj);
    } else if (addedCount > 0) {
      showToast(`Added ${addedCount} ${addedCount === 1 ? 'entry' : 'entries'} to your library!`, 'success', actionObj);
    } else if (skippedCount > 0) {
      showToast(`${skippedCount} ${skippedCount === 1 ? 'entry' : 'entries'} already in your library!`, 'info', actionObj);
    }
    
    setSelectedVerses([]);
    setShowAddOptions(false);
  };

  const handleDeleteSelected = () => {
    const prefix = `${bookTitle} ${chapter}:`;
    
    // Find all verses in the library that overlap with the selected verses
    const versesToDelete = state.verses.filter(v => {
      if (!v.ref.startsWith(prefix)) return false;
      const versePart = v.ref.substring(prefix.length);
      let memSet = new Set<number>();
      if (versePart.includes('-')) {
        const [start, end] = versePart.split('-').map(n => parseInt(n, 10));
        for (let i = start; i <= end; i++) memSet.add(i);
      } else if (versePart.includes(',')) {
        versePart.split(',').forEach(n => memSet.add(parseInt(n, 10)));
      } else {
        memSet.add(parseInt(versePart, 10));
      }
      
      return selectedVerses.some(sv => memSet.has(sv));
    });

    if (versesToDelete.length > 0) {
      versesToDelete.forEach(v => {
        dispatch({ type: 'DELETE_VERSE', payload: v.id });
      });
      showToast(`Removed ${versesToDelete.length} ${versesToDelete.length === 1 ? 'entry' : 'entries'} from your library.`, 'success');
    }
    
    setSelectedVerses([]);
    setShowAddOptions(false);
  };

  const handleCopySelected = () => {
    if (selectedVerses.length === 0) return;

    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const textParts: string[] = [];
    
    sorted.forEach(verseNum => {
      const v = verses.find(x => x.verse === verseNum);
      if (v) {
        const plainText = v.text
          .replace(/<b>.*?<\/b>/gi, '')       // Remove section headings
          .replace(/<br\s*\/?>/gi, '\n')       // Line breaks → newlines
          .replace(/<[^>]+>/g, '')              // Strip remaining tags (<i>, etc.)
          .replace(/([a-z][.?!;:,])([A-Z])/g, '$1 $2')
          .replace(/[ \t]+/g, ' ')
          .trim();
        textParts.push(plainText);
      }
    });

    const combinedText = textParts.join(' ');
    
    // Format the reference
    let refStr = '';
    const isContiguous = sorted.length > 1 && (sorted[sorted.length - 1] - sorted[0] === sorted.length - 1);
    
    if (sorted.length === 1) {
      refStr = `${sorted[0]}`;
    } else if (isContiguous) {
      refStr = `${sorted[0]}-${sorted[sorted.length - 1]}`;
    } else {
      refStr = sorted.join(',');
    }

    const finalString = `'${combinedText}'\n\n${bookTitle} ${chapter}:${refStr} (${BIBLE_VERSION_LABELS[bibleVersion] || bibleVersion})`;

    navigator.clipboard.writeText(finalString).then(() => {
      showToast('Copied to clipboard!', 'success');
      setSelectedVerses([]);
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  const chapterHtml = useMemo(() => {
    let html = '';
    const display = readingDisplay(state.settings);
    
    // The chapter title is already shown in the sticky header, no need to duplicate it here.

    const bollsId = BOLLS_BIBLE_MAP[bookId];
    let quoteLevel = 0; // Track quote nesting across verses

    verses.forEach((v) => {
      let text = v.text;
      
      // === Fix #5 & #2: Extract section headings (<b>) BEFORE OT quote processing ===
      // This prevents heading text from confusing the quote-level tracker.
      // Only <b> tags exist in the API (no <S>, <h1-6>, or <div> headings).
      // Extracted even when hidden: the <b> has to come out of the verse text either
      // way, and whether a heading exists still marks a paragraph start below.
      let heading = '';
      let hasHeading = false;
      text = text.replace(/<b>(.*?)<\/b>/gi, (_, hText) => {
        hasHeading = true;
        if (display.showSectionHeadings) heading += renderHeading(hText);
        return '';
      });

      // NASB95 and NLT carry no headings of their own, so the LSB's stand in here.
      // Guarded on the version having produced none itself, so a version that does
      // ship headings can never end up showing two at the same verse.
      if (!hasHeading && borrowedHeadings) {
        for (const borrowed of borrowedHeadings[v.verse] || []) {
          hasHeading = true;
          if (display.showSectionHeadings) heading += renderHeading(borrowed, true);
        }
      }

      // === Fix #3: Strip leading AND trailing <br/> tags ===
      // Leading <br/> after heading extraction would strand the verse number on its own line.
      // Trailing <br/> would add unwanted whitespace.
      const hasLeadingBr = /^\s*<br\s*\/?>/i.test(text);
      
      text = text.replace(/^(?:\s*<br\s*\/?>\s*)+/gi, '');
      text = text.replace(/(?:\s*<br\s*\/?>\s*)+$/gi, '');

      // === OT Quote uppercasing (now runs after headings are safely removed) ===
      const isOtQuoteVerse = otQuotes[bollsId]?.[chapter]?.includes(v.verse);
      if (isOtQuoteVerse) {
        // Split by quote characters. 
        // We use lookarounds for the right single quote \u2019 so we don't accidentally split on apostrophes (like "Abraham's")
        let parts = text.split(/([\u201c\u201d\u2018\u2019]|(?<!\w)\u2019|\u2019(?!\w))/);
        let newText = '';

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!part) continue; // skip empty strings from split

          if (part === '"') {
            if (quoteLevel > 0) quoteLevel--; else quoteLevel++;
            newText += part;
          } else if (part === '\u201c' || part === '\u2018') {
            quoteLevel++;
            newText += part;
          } else if (part === '\u201d' || part === '\u2019') {
            quoteLevel = Math.max(0, quoteLevel - 1);
            newText += part;
          } else {
            // It's text content. If we're inside a quote, uppercase it.
            if (quoteLevel > 0 && part.trim().length > 0) {
              newText += `<span class="uppercase">${part}</span>`;
            } else {
              newText += part;
            }
          }
        }
        text = newText;
      } else {
        // If we exit an OT quote block, reset the quote level to prevent bleeding into non-OT verses
        quoteLevel = 0;
      }
      
      // === Fix #4: Parse Psalm titles (robust) ===
      let psalmTitle = '';
      if (bookId === 'psalms' && v.verse === 1) {
        const titleMatch = text.match(/^([\s\S]*?[a-z]\.)([A-Z][\s\S]*)$/);
        if (titleMatch) {
          psalmTitle = `<div class="text-sm font-medium text-muted italic mb-2 tracking-wide leading-relaxed">${titleMatch[1]}</div>`;
          text = titleMatch[2]; // The rest of the verse
        }
      }
      
      // Fix missing spaces after punctuation globally in the text (like "Of David.Yahweh")
      text = text.replace(/([a-z][.?!;:,])([A-Z])/g, '$1 $2');

      // === Fix #1: Style <i> tags as translator-supplied words ===
      // The LSB uses <i> to mark words added by the translator for English readability.
      // Render them with reduced opacity so readers can distinguish original from supplied text.
      text = text.replace(/<i>(.*?)<\/i>/gi, '<span class="opacity-60 italic">$1</span>');

      // Apply Bionic Reading safely (only to text outside HTML tags)
      if (state.settings.bionicReading) {
        text = text.replace(/([a-zA-Z\u00C0-\u024F]+)(?![^<]*>)/g, (word) => {
          if (word.length <= 1) return `<strong class="font-bold">${word}</strong>`;
          if (word.length <= 3) return `<strong class="font-bold">${word.substring(0, 1)}</strong>${word.substring(1)}`;
          const half = Math.ceil(word.length / 2);
          return `<strong class="font-bold">${word.substring(0, half)}</strong>${word.substring(half)}`;
        });
      }

      // Append in correct order
      if (heading) {
        html += heading;
      }

      if (psalmTitle) {
        html += psalmTitle;
      }

      // Add verse number and text
      const inLibrary = memorizedVerses.has(v.verse);
      const isSelected = selectedVerses.includes(v.verse);
      
      // Flash takes priority over — and replaces, rather than layers on top of — the
      // selected/library background: two classes touching the same CSS property
      // (background-color) get resolved by their position in Tailwind's *generated*
      // stylesheet, not by string/DOM order, so layering risked losing the flash
      // unpredictably against an already-memorized verse's gold background. Only one
      // background class is ever emitted per verse now, so there's nothing to conflict.
      let extraClass = '';
      if (v.verse === flashVerse) {
        extraClass = 'bg-green-500/30 rounded px-1 -mx-1 transition-colors duration-1000';
      } else if (isSelected) {
        extraClass = 'bg-accent/20 text-primary rounded px-1 -mx-1';
      } else if (inLibrary) {
        extraClass = 'bg-gold/25 rounded px-1 -mx-1';
      }

      // Prefer the real paragraph-break dataset (sourced from NASB95) when we have it for
      // this chapter; fall back to the heading/<br/> heuristic otherwise (mainly poetry,
      // where paragraph breaks aren't meaningful at the verse level). Either way, never mark
      // the chapter's very first verse — it's trivially a "new paragraph" already, and
      // marking it is redundant with the section heading (matches Blue Letter Bible's own
      // convention, which never shows a paragraph mark on a chapter's opening verse).
      const chapterBreaks = paragraphBreaks?.[bookId]?.[String(chapter)];
      const isFirstVerseOfChapter = verses.length > 0 && v.verse === verses[0].verse;
      const isParagraphStart = !isFirstVerseOfChapter && (
        chapterBreaks ? chapterBreaks.includes(v.verse) : (hasHeading || hasLeadingBr)
      );
      const pilcrowHtml = isParagraphStart && display.showParagraphMarks
        ? `<span class="text-accent/40 font-sans mr-0.5 select-none pointer-events-none">¶ </span>`
        : '';
      const verseNumClass = isParagraphStart ? 'font-bold text-foreground' : 'font-normal text-muted';
      // Hidden verse numbers leave the verse span itself intact, so tapping to select,
      // copy or memorize still works exactly the same on prose-only reading.
      // A verse's cross-references were invisible until you selected it and noticed the
      // "Refs" action, so the only way to find them was to already suspect they existed.
      // This marks the verses that have any, the way a print Bible does.
      const hasCrossRefs = !!crossRefMap?.[normalizeCrossRefKey(`${bookTitle} ${chapter}:${v.verse}`)]?.length;
      const crossRefMarker = hasCrossRefs && display.showCrossRefMarkers
        ? `<sup class="xref-marker text-[0.5em] text-accent/70 hover:text-accent ml-0.5 cursor-pointer align-super transition-colors" data-xref-verse="${v.verse}" role="button" tabindex="0" aria-label="Cross references for verse ${v.verse}">✻</sup>`
        : '';
      const verseNumHtml = display.showVerseNumbers
        ? `<sup class="text-[0.55em] ${verseNumClass} ml-0.5 mr-1.5 relative -top-[0.4em] select-none pointer-events-none">${v.verse}</sup>`
        : '';

      const bookIndex = ALL_BOOKS.findIndex(b => b.id === bookId) + 1;
      const ariaLabel = `Verse ${v.verse}${isSelected ? ', selected' : ''}${inLibrary ? ', in your library' : ''}`;
      html += `<span class="inline verse-span cursor-pointer transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${extraClass}" data-verse="${v.verse}" data-verse-ref="${bookIndex}-${chapter}-${v.verse}" tabindex="0" role="button" aria-pressed="${isSelected}" aria-label="${ariaLabel}">${pilcrowHtml}${verseNumHtml}<span class="inline pointer-events-none">${text}</span>${crossRefMarker} </span>`;
    });

    return html;
  }, [verses, borrowedHeadings, selectedVerses, memorizedVerses, state.settings.bionicReading,
      state.settings.showSectionHeadings, state.settings.showVerseNumbers, state.settings.showParagraphMarks,
      state.settings.showCrossRefMarkers, crossRefMap, bookTitle,
      bookId, chapter, paragraphBreaks, flashVerse]);

  // === ALPHA MODE: Fetch KJV + dictionary when toggled ===
  const isOldTestament = (ALL_BOOKS.findIndex(b => b.id === bookId) + 1) <= 39;

  useEffect(() => {
    if (!alphaMode) return;
    let mounted = true;

    const fetchAlphaData = async () => {
      setAlphaLoading(true);
      try {
        const bollsId = BOLLS_BIBLE_MAP[bookId];
        if (!bollsId) return;

        // Fetch KJV chapter (has Strong's tags)
        const kjvRes = await fetch(`https://bolls.life/get-text/KJV/${bollsId}/${chapter}/`);
        if (kjvRes.ok) {
          const kjvData: Verse[] = await kjvRes.json();
          if (mounted) setKjvVerses(kjvData);
        }

        // Load dictionary if not already loaded
        if (!alphaDictLoaded) {
          const dictKey = isOldTestament ? 'hebrew' : 'greek';
          if (cachedStrongsDicts[dictKey]) {
             if (mounted) {
               setStrongsDict(cachedStrongsDicts[dictKey]);
               setAlphaDictLoaded(true);
             }
          } else {
            const dictUrl = isOldTestament ? '/strongs-hebrew.json' : '/strongs-greek.json';
            const dictRes = await fetch(dictUrl);
            if (dictRes.ok) {
              const dictData = await dictRes.json();
              cachedStrongsDicts[dictKey] = dictData;
              if (mounted) {
                setStrongsDict(dictData);
                setAlphaDictLoaded(true);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load alpha mode data:', err);
      } finally {
        if (mounted) setAlphaLoading(false);
      }
    };

    fetchAlphaData();
    return () => { mounted = false; };
  }, [alphaMode, bookId, chapter, isOldTestament, alphaDictLoaded]);

  // Reset dictionary loaded state when switching testaments
  useEffect(() => {
    setAlphaDictLoaded(false);
  }, [isOldTestament]);

  // Parse KJV text with Strong's numbers into word-strongs pairs
  const parseKjvStrongs = useCallback((html: string): ParsedStrongsWord[] => {
    const cleanHtml = html.replace(/<sup\b[^>]*>.*?<\/sup>/gi, '');
    // `[^<]*` (zero-or-more, not one-or-more) — a verse can open with a <S> tag that has
    // no preceding English word at all (untranslated connectors like Greek δέ), or carry
    // back-to-back tags separated only by whitespace. With `+`, the regex couldn't match
    // zero characters before such a tag and instead slipped into matching the tag's own
    // "S>1234" / "/S>" delimiters as if they were English text, leaking that literal
    // garbage into the rendered verse.
    const regex = /([^<]*)(?:<S>(\d+)<\/S>)?/g;
    let match;
    const words: ParsedStrongsWord[] = [];

    while ((match = regex.exec(cleanHtml)) !== null) {
      // `*` can produce a zero-length match (e.g. at the end of the string), which never
      // advances lastIndex on its own — exec() would return the same empty match forever.
      if (match[0].length === 0) {
        regex.lastIndex++;
        continue;
      }

      let englishText = match[1].trim();
      const strongsNumber = match[2];

      if (!englishText && !strongsNumber) continue;

      // Keep entries with a Strong's number even when there's no attached English word
      // (e.g. a mild Greek connective like δέ that the KJV translators left implicit) —
      // otherwise that original-language word simply vanishes with no trace at all.
      if (englishText || strongsNumber) {
        const formattedStrongs = strongsNumber ? `${isOldTestament ? 'H' : 'G'}${strongsNumber}` : null;
        words.push({
          english: englishText,
          strongs: formattedStrongs
        });
      }
    }

    return words;
  }, [isOldTestament]);

  // Build alpha mode HTML with clickable underlined words. Verse-level selection
  // (for Add/Copy/Refs) stays wired to the same verse numbers as normal mode —
  // those actions read from the already-loaded `verses` array (in whichever Bible
  // version is selected) regardless of alpha mode being KJV-based, so selection
  // works identically in both modes.
  const alphaHtml = useMemo(() => {
    if (kjvVerses.length === 0) return '';
    let html = '';

    kjvVerses.forEach((v) => {
      const parsed = parseKjvStrongs(v.text);
      let verseHtml = '';

      parsed.forEach((pw) => {
        const hasDefinition = pw.strongs && strongsDict[pw.strongs];
        const isUntranslated = hasDefinition && !pw.english.trim();

        if (isUntranslated) {
          // Present in the original language but not rendered as its own word in the
          // KJV (e.g. a mild Greek connective like δέ, left implicit by the
          // translators). Show a small discoverable marker instead of silently
          // dropping the word — it's still a real word in the original text.
          verseHtml += `<span class="alpha-word inline-block w-[0.3em] h-[0.3em] rounded-full bg-accent/50 hover:bg-accent align-middle mx-[3px] cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" data-strongs="${pw.strongs}" data-word="" tabindex="0" role="button" aria-label="Untranslated word in the original language — tap to view"></span> `;
        } else if (hasDefinition) {
          const tokens = pw.english.split(/(\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b)/);

          tokens.forEach(token => {
             const wordLower = token.toLowerCase();
             // Only underline if it's a word and not in the SKIP_WORDS list
             if (/^[a-z]/.test(wordLower) && !SKIP_WORDS.has(wordLower)) {
               verseHtml += `<span class="underline decoration-accent/40 decoration-1 underline-offset-4 cursor-pointer hover:text-accent hover:decoration-accent transition-colors alpha-word focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded" data-strongs="${pw.strongs}" data-word="${token}" tabindex="0" role="button" aria-label="Look up ${token}">${token}</span>`;
             } else {
               verseHtml += token;
             }
          });
          verseHtml += ' '; // Add space between parsed blocks
        } else {
          verseHtml += `${pw.english} `;
        }
      });

      const inLibrary = memorizedVerses.has(v.verse);
      const isSelected = selectedVerses.includes(v.verse);
      let extraClass = '';
      if (v.verse === flashVerse) {
        extraClass = 'bg-green-500/30 rounded px-1 -mx-1 transition-colors duration-1000';
      } else if (isSelected) {
        extraClass = 'bg-accent/20 text-primary rounded px-1 -mx-1';
      } else if (inLibrary) {
        extraClass = 'bg-gold/25 rounded px-1 -mx-1';
      }
      const ariaLabel = `Verse ${v.verse}${isSelected ? ', selected' : ''}${inLibrary ? ', in your library' : ''}`;

      // No role="button" here — this wrapper contains nested interactive word
      // spans, and a button can't nest other interactive controls. It's still
      // focusable and Enter/Space-toggleable via handleAlphaKeyDown.
      html += `<span class="inline alpha-verse-span cursor-pointer transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${extraClass}" data-verse="${v.verse}" tabindex="0" aria-label="${ariaLabel}"><sup class="text-[0.55em] font-normal text-muted ml-0.5 mr-1.5 relative -top-[0.4em] select-none pointer-events-none">${v.verse}</sup><span class="inline">${verseHtml.trim()}</span> </span>`;
    });

    return html;
  }, [kjvVerses, strongsDict, parseKjvStrongs, selectedVerses, memorizedVerses, flashVerse]);

  // Handle clicks on alpha-mode words and verse wrappers
  const handleAlphaClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const wordSpan = target.closest('.alpha-word') as HTMLElement | null;
    if (wordSpan) {
      e.stopPropagation();
      const strongsNumber = wordSpan.getAttribute('data-strongs');
      // Untranslated-word markers carry an empty data-word (no KJV text to show) —
      // fall back to the lemma so the popup still has a meaningful title.
      const rawWord = wordSpan.getAttribute('data-word') || '';
      if (strongsNumber) {
        const definition = strongsDict[strongsNumber];
        const displayWord = rawWord || definition?.lemma || strongsNumber;
        if (definition) {
          setWordPopup({ word: displayWord, strongsNumber, definition });
        } else if (alphaLoading) {
          // Dictionary still loading — show a transient loading popup
          setWordPopup({
            word: displayWord,
            strongsNumber,
            definition: {
              lemma: '…',
              strongs_def: 'Loading definition…',
              kjv_def: '',
            }
          });
        }
        // else: no entry in dict, silent (word has no Strongs number)
      }
      return;
    }
    const verseSpan = target.closest('.alpha-verse-span');
    if (verseSpan) {
      const verseNumStr = verseSpan.getAttribute('data-verse');
      if (verseNumStr) toggleVerseSelection(parseInt(verseNumStr, 10));
    }
  };

  const handleAlphaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target as HTMLElement;
    const wordSpan = target.closest('.alpha-word') as HTMLElement | null;
    if (wordSpan) {
      e.preventDefault();
      e.stopPropagation();
      const strongsNumber = wordSpan.getAttribute('data-strongs');
      const rawWord = wordSpan.getAttribute('data-word') || '';
      if (strongsNumber) {
        const definition = strongsDict[strongsNumber];
        const displayWord = rawWord || definition?.lemma || strongsNumber;
        if (definition) {
          setWordPopup({ word: displayWord, strongsNumber, definition });
        } else if (alphaLoading) {
          setWordPopup({ word: displayWord, strongsNumber, definition: { lemma: '…', strongs_def: 'Loading definition…', kjv_def: '' } });
        }
      }
      return;
    }
    const verseSpan = target.closest('.alpha-verse-span');
    if (verseSpan) {
      e.preventDefault();
      const verseNumStr = verseSpan.getAttribute('data-verse');
      if (verseNumStr) toggleVerseSelection(parseInt(verseNumStr, 10));
    }
  };

  // Jumping to an occurrence: close whatever is open, load that chapter, and flash the
  // verse. Shared by both places a Strong's occurrence list can be opened from — the
  // word popup's cross-references and the reader's own "View all occurrences".
  const navigateToOccurrence = (navBookId: string, ch: number, v: number) => {
    setViewingOccurrences(null);
    setWordPopup(null);

    setPendingHighlight({ book: navBookId, chapter: ch, verse: v });
    goToChapter(navBookId, ch, true);
  };

  const hasRefs = !crossRefMap || selectedVerses.some(v => {
    const refs = crossRefMap[normalizeCrossRefKey(`${bookTitle} ${chapter}:${v}`)];
    return refs && refs.length > 0;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background animate-[fadeIn_0.2s_ease-out]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reading Progress Bar */}
      <div
        className="reading-progress"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Fixed header — tap-to-toggle chrome, same trigger as the bottom nav below */}
      <div
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-30 bg-background border-b border-card-border/60 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${chromeVisible ? 'translate-y-0' : '-translate-y-full'}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <div className="max-w-2xl mx-auto w-full px-5 pb-3 relative">
          <button
            onClick={onClose}
            className="absolute left-0 top-1 p-2 -ml-2 rounded-full hover:bg-card-hover transition-colors z-10"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-secondary" />
          </button>
          <div className="flex flex-col items-center justify-center pt-1">
            <h2 className="text-4xl font-bold tracking-tight text-primary font-heading mb-2">
              {bookTitle} {chapter}
            </h2>
            <span className={`text-[0.6875rem] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full transition-colors ${
              alphaMode 
                ? 'text-yellow-300 bg-yellow-500/15' 
                : 'text-accent bg-accent/10'
            }`}>
              {alphaMode ? 'KJV + Original Words' : `${BIBLE_VERSION_LABELS[bibleVersion] || bibleVersion} Translation`}
            </span>
          </div>
          
          <div className="absolute right-0 top-1 flex items-center gap-1">
            <button
              onClick={() => {
                setAlphaMode(!alphaMode);
                if (!alphaDiscovered) {
                  setAlphaDiscovered(true);
                  try { localStorage.setItem('remora_alpha_discovered', '1'); } catch { /* private browsing */ }
                }
              }}
              className={`relative p-2 rounded-full transition-colors font-serif text-lg leading-none ${alphaMode ? 'bg-accent text-white' : 'hover:bg-card-hover text-secondary'}`}
              title={alphaMode ? `Switch to ${BIBLE_VERSION_LABELS[bibleVersion] || bibleVersion} reading mode` : 'Show original Greek/Hebrew words'}
              aria-label={alphaMode ? `Switch to ${BIBLE_VERSION_LABELS[bibleVersion] || bibleVersion} reading mode` : 'Show original Greek and Hebrew words'}
            >
              α
              {!alphaDiscovered && !alphaMode && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent animate-pulse pointer-events-none" />
              )}
            </button>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`p-2 -mr-2 rounded-full transition-colors ${showOptions ? 'bg-card-hover text-primary' : 'hover:bg-card-hover text-secondary'}`}
              title="Reading Options"
              aria-label="Reading options"
            >
              <Type className="w-5 h-5" />
            </button>

            {showOptions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 bg-card-elevated border border-card-border rounded-lg shadow-md z-50 overflow-hidden p-4 flex flex-col gap-4 animate-[fadeScaleIn_0.15s_ease-out]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">Text Size</span>
                    <div className="flex items-center gap-2 bg-card border border-card-border rounded-md p-1">
                      <button
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontSize: parseFloat(Math.max(0.85, state.settings.fontSize - 0.15).toFixed(2)) }})}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-card-hover text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={state.settings.fontSize <= 0.85}
                        aria-label="Decrease text size"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold min-w-8 px-1 text-center">{FONT_SIZE_LABELS(state.settings.fontSize)}</span>
                      <button
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontSize: parseFloat(Math.min(1.45, state.settings.fontSize + 0.15).toFixed(2)) }})}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-card-hover text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={state.settings.fontSize >= 1.45}
                        aria-label="Increase text size"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-card-border w-full" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">Font</span>
                    <div className="flex items-center bg-card border border-card-border rounded-md p-1 gap-1">
                      <button
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontFamily: 'sans' }})}
                        className={`px-2 py-1 text-xs font-sans rounded-md transition-colors ${(!state.settings.fontFamily || state.settings.fontFamily === 'sans') ? 'bg-accent text-white font-bold' : 'text-secondary hover:text-primary hover:bg-card-hover'}`}
                      >
                        Inter
                      </button>
                      <button
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontFamily: 'serif' }})}
                        className={`px-2 py-1 text-xs font-serif rounded-md transition-colors ${state.settings.fontFamily === 'serif' ? 'bg-accent text-white font-bold' : 'text-secondary hover:text-primary hover:bg-card-hover'}`}
                      >
                        Merriweather
                      </button>
                      <button
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontFamily: 'hyper' }})}
                        className={`px-2 py-1 text-xs font-hyper rounded-md transition-colors ${state.settings.fontFamily === 'hyper' ? 'bg-accent text-white font-bold' : 'text-secondary hover:text-primary hover:bg-card-hover'}`}
                      >
                        Atkinson
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-card-border w-full" />
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <span className="text-sm font-bold text-primary block">Bionic Reading</span>
                      <span className="text-[0.625rem] text-secondary">Bold first letters</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.settings.bionicReading}
                      onChange={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { bionicReading: !state.settings.bionicReading }})}
                      className="w-4 h-4 accent-accent"
                    />
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        // Side padding steps up through the foldable range: an unfolded foldable sits
        // around 670-840px, where the reading measure alone doesn't bind, so without
        // this the text would run edge-to-edge with only a phone's 20px gutter.
        className="flex-1 overflow-y-auto overscroll-y-contain px-5 sm:px-8 md:px-12 pb-6"
        style={{ paddingTop: headerHeight ? `${headerHeight + 16}px` : 'calc(env(safe-area-inset-top, 0px) + 6rem)' }}
        onScroll={handleScroll}
        onClick={handleContentClick}
      >

        {loading ? (
          <div
            className="mx-auto flex flex-col gap-6"
            // Same font-size context as the real column so the skeleton occupies the
            // identical width and the text doesn't jump sideways when it loads in.
            style={{ fontSize: `${1.25 * (state.settings.fontSize || 1)}rem`, maxWidth: READING_MEASURE }}
          >
            <div className="h-4 w-32 skeleton mb-4 mt-8" />
            <div className="flex flex-col gap-3">
              <div className="h-6 w-full skeleton" />
              <div className="h-6 w-11/12 skeleton" />
              <div className="h-6 w-full skeleton" />
              <div className="h-6 w-5/6 skeleton" />
            </div>
            <div className="h-4 w-24 skeleton mt-6 mb-2" />
            <div className="flex flex-col gap-3">
              <div className="h-6 w-full skeleton" />
              <div className="h-6 w-4/5 skeleton" />
              <div className="h-6 w-full skeleton" />
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <div className="h-6 w-11/12 skeleton" />
              <div className="h-6 w-full skeleton" />
              <div className="h-6 w-2/3 skeleton" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-red-400 px-6 text-center">
            <p>{error}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setRetryCount(c => c + 1)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" /> Try Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-md border border-card-border hover:bg-card-hover transition-colors text-secondary"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          alphaMode ? (
            /* Alpha mode: KJV with clickable underlined words */
            <div
              className="mx-auto pb-32 select-text"
              style={{ fontSize: `${1.25 * (state.settings.fontSize || 1)}rem`, maxWidth: READING_MEASURE }}
              onClick={handleAlphaClick}
              onKeyDown={handleAlphaKeyDown}
            >
              {alphaLoading ? (
                <div className="flex flex-col items-center justify-center h-[30vh] gap-3 text-secondary">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  <p className="text-sm font-medium">Loading original language data...</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 px-3 py-2 bg-accent/5 border border-accent/10 rounded-md">
                    <p className="text-xs text-secondary text-center">Tap any <span className="underline decoration-accent/40 underline-offset-2">underlined word</span> to see its original {isOldTestament ? 'Hebrew' : 'Greek'} meaning</p>
                  </div>
                  <div
                    className={`tracking-[-0.01em] text-primary/95 ${
                      state.settings.fontFamily === 'serif' ? 'font-serif' :
                      state.settings.fontFamily === 'hyper' ? 'font-hyper tracking-normal' :
                      'font-sans'
                    }`}
                    style={{
                      fontSize: `${1.25 * (state.settings.fontSize || 1)}rem`,
                      lineHeight: `${1.9 * (state.settings.fontSize || 1)}rem`
                    }}
                    dangerouslySetInnerHTML={{ __html: alphaHtml }}
                  />
                </>
              )}
            </div>
          ) : (
            /* Normal reading mode (selected Bible version) */
            <div
              className={`mx-auto pb-32 select-text ${
                state.settings.fontFamily === 'serif' ? 'font-serif' :
                state.settings.fontFamily === 'hyper' ? 'font-hyper' :
                'font-sans'
              }`}
              // fontSize lives on this wrapper (not the inner div) so the `ch` unit in
              // READING_MEASURE resolves against the reader's actual text size.
              style={{ fontSize: `${1.25 * (state.settings.fontSize || 1)}rem`, maxWidth: READING_MEASURE }}
              onClick={handleVerseClick}
              onKeyDown={handleVerseKeyDown}
            >
              <div
                className={`tracking-[-0.01em] text-primary/95 [&>div:first-child]:mt-0 ${
                  state.settings.fontFamily === 'hyper' ? 'tracking-normal' : ''
                }`}
                style={{ lineHeight: `${1.9 * (state.settings.fontSize || 1)}rem` }}
                dangerouslySetInnerHTML={{ __html: chapterHtml }}
              />
            </div>
          )
        )}
      </div>

      {/* Floating Action Bar for Selected Verses */}
      {selectedVerses.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-[fadeScaleIn_0.2s_ease-out] px-3 pb-3 sm:pb-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)' }}>
          <div className="bg-accent text-white rounded-lg shadow-md max-w-md mx-auto overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-bold text-sm">
                {selectedVerses.length} {selectedVerses.length === 1 ? 'verse' : 'verses'} selected
              </span>
              <button
                onClick={() => setSelectedVerses([])}
                className="p-1 rounded-md hover:bg-white/20 transition-colors"
                title="Cancel Selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
              <button
                onClick={handleCopySelected}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md font-bold text-sm transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>

              {selectedVerses.length === 1 && onStudyOriginalWord && (
                <button
                  onClick={() => {
                    const bookIndex = ALL_BOOKS.findIndex(b => b.id === bookId) + 1;
                    onStudyOriginalWord({ book: bookIndex, chapter, verse: selectedVerses[0] });
                    setSelectedVerses([]);
                  }}
                  className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md font-bold text-sm transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Study Words
                </button>
              )}

              {hasRefs && (
                <button
                  onClick={() => {
                    const sorted = [...selectedVerses].sort((a, b) => a - b);
                    setCrossRefPeekSource(null); // this is the reader's real position, not a peek
                    setShowCrossReferences(sorted.map(v => `${bookTitle.toLowerCase()} ${chapter}:${v}`));
                  }}
                  className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md font-bold text-sm transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Refs
                </button>
              )}
              {selectedVerses.every(v => memorizedVerses.has(v)) ? (
                <button
                  onClick={handleDeleteSelected}
                  className="bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md font-bold text-sm transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              ) : (
                <button
                  onClick={handleAddClick}
                  className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md font-bold text-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Options Modal */}
      {showAddOptions && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-card-elevated border border-card-border rounded-lg shadow-md p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-primary mb-2">How to add?</h3>
            <p className="text-sm text-secondary mb-6">You have selected {selectedVerses.length} verses. Would you like to add them as individual verses or combine consecutive verses into single entries?</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => executeAdd('combined')}
                className="w-full py-3 px-4 bg-accent text-white font-bold rounded-md hover:bg-accent-hover transition-colors flex flex-col items-start"
              >
                <span>Combine Consecutive</span>
                <span className="text-xs font-normal text-white/70 mt-0.5">e.g. 1:3-5 and 1:7</span>
              </button>

              <button
                onClick={() => executeAdd('individual')}
                className="w-full py-3 px-4 bg-card border border-card-border text-primary font-bold rounded-md hover:bg-card-hover transition-colors flex flex-col items-start"
              >
                <span>Individual Verses</span>
                <span className="text-xs font-normal text-secondary mt-0.5">Add {selectedVerses.length} separate entries</span>
              </button>
              
              <button 
                onClick={() => setShowAddOptions(false)}
                className="w-full py-2 mt-2 text-sm font-bold text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Chapter Navigation Bar — hidden while the "Go back to..." return
          pill is showing (below), since both are fixed to the bottom edge and
          would otherwise stack on top of each other. */}
      {!loading && !error && selectedVerses.length === 0 && returnStack.length === 0 && (
        <div className={`fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-10 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${chromeVisible ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
            <button
              onClick={handlePrevChapter}
              disabled={!prevLabel}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-hover text-secondary hover:text-primary"
              aria-label={prevLabel ? `Previous: ${prevLabel}` : 'No previous chapter'}
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:block truncate max-w-[120px]">{prevLabel || 'Start'}</span>
              <span className="sm:hidden truncate max-w-[80px]">{prevAbbrLabel || 'Start'}</span>
            </button>

            <button
              onClick={() => { setNavigatorBook(bookId); setShowNavigator(true); }}
              className="flex items-center gap-1 text-xs font-bold text-muted uppercase tracking-wider hover:text-primary transition-colors border border-card-border rounded-md px-3 py-1.5"
              aria-label="Jump to a different book or chapter"
            >
              Ch {chapter}
              <ChevronDown className="w-3 h-3" />
            </button>

            <button
              onClick={handleNextChapter}
              disabled={!nextLabel}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-hover text-secondary hover:text-primary"
              aria-label={nextLabel ? `Next: ${nextLabel}` : 'No next chapter'}
            >
              <span className="hidden sm:block truncate max-w-[120px]">{nextLabel || 'End'}</span>
              <span className="sm:hidden truncate max-w-[80px]">{nextAbbrLabel || 'End'}</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Book/Chapter Navigator */}
      {showNavigator && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-background animate-[fadeIn_0.2s_ease-out]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
            <button
              onClick={() => { setShowNavigator(false); setShowVersionPicker(false); }}
              className="p-2 -ml-2 rounded-md hover:bg-card-hover transition-colors"
              aria-label="Close navigator"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
            <span className="text-sm font-bold text-primary tracking-wide">Go to...</span>
            <div className="relative">
              <button
                onClick={() => setShowVersionPicker(v => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold text-secondary hover:text-primary hover:bg-card-hover transition-colors border border-card-border"
                aria-label="Change Bible version"
                title="Change Bible version"
              >
                {BIBLE_VERSION_LABELS[bibleVersion] || bibleVersion}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showVersionPicker && (
                <>
                  <div className="fixed inset-0 z-[74]" onClick={() => setShowVersionPicker(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-card-elevated border border-card-border rounded-lg shadow-md z-[75] overflow-hidden animate-[fadeScaleIn_0.15s_ease-out]">
                    {BIBLE_VERSION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          dispatch({ type: 'UPDATE_SETTINGS', payload: { bibleVersion: opt.value } });
                          setShowVersionPicker(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-card-hover ${
                          bibleVersion === opt.value ? 'text-accent font-bold bg-accent/10' : 'text-primary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Book list */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {/* Column headers */}
            <div className="grid grid-cols-2 mb-2">
              <span className="text-right pr-4 text-[10px] font-bold text-muted uppercase tracking-widest">Old Testament</span>
              <span className="text-left pl-4 text-[10px] font-bold text-muted uppercase tracking-widest">New Testament</span>
            </div>

            {/* Book rows with inline chapter grid */}
            <div className="grid grid-cols-2">
              {(() => {
                const rows: React.ReactNode[] = [];
                const maxLen = Math.max(OT_BOOKS.length, NT_BOOKS.length);
                const selectedBookData = ALL_BOOKS.find(b => b.id === navigatorBook);

                for (let i = 0; i < maxLen; i++) {
                  const ot = i < OT_BOOKS.length ? OT_BOOKS[i] : null;
                  const nt = i < NT_BOOKS.length ? NT_BOOKS[i] : null;
                  const isOtSelected = ot?.id === navigatorBook;
                  const isNtSelected = nt?.id === navigatorBook;

                  rows.push(
                    <React.Fragment key={`row-${i}`}>
                      <button
                        onClick={() => ot && setNavigatorBook(ot.id)}
                        className={`text-right pr-4 py-2 text-[15px] transition-colors ${
                          isOtSelected
                            ? 'text-accent font-bold bg-accent/10 rounded-r-lg'
                            : ot ? 'text-secondary hover:text-primary' : 'pointer-events-none'
                        }`}
                        disabled={!ot}
                      >
                        {ot ? (BOOK_SHORT[ot.id] || ot.name) : ''}
                      </button>
                      <button
                        onClick={() => nt && setNavigatorBook(nt.id)}
                        className={`text-left pl-4 py-2 text-[15px] font-medium transition-colors ${
                          isNtSelected
                            ? 'text-accent font-bold bg-accent/10 rounded-l-lg'
                            : nt ? 'text-secondary hover:text-primary' : 'pointer-events-none'
                        }`}
                        disabled={!nt}
                      >
                        {nt ? (BOOK_SHORT[nt.id] || nt.name) : ''}
                      </button>
                    </React.Fragment>
                  );

                  {/* Full-width chapter grid if this row's book is selected */}
                  if ((isOtSelected || isNtSelected) && selectedBookData) {
                    rows.push(
                      <div
                        key="chapter-grid"
                        ref={chapterGridRef}
                        className="py-3 px-2 border-y border-card-border my-1"
                        style={{ gridColumn: '1 / -1' }}
                      >
                        <div className="grid grid-cols-7 gap-1.5 max-w-xs mx-auto">
                          {Array.from({ length: selectedBookData.chapters }, (_, j) => j + 1).map(ch => {
                            const isCurrent = navigatorBook === bookId && ch === chapter;
                            return (
                              <button
                                key={ch}
                                onClick={() => handleNavigate(navigatorBook, ch)}
                                className={`aspect-square rounded-md text-base font-bold transition-colors flex items-center justify-center ${
                                  isCurrent
                                    ? 'bg-accent text-white'
                                    : 'text-secondary hover:bg-card-hover hover:text-primary'
                                }`}
                              >
                                {ch}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                }

                return rows;
              })()}
            </div>
          </div>
        </div>
      )}

      {showCrossReferences && (
        <CrossReferenceModal
          verseRefs={showCrossReferences}
          crossRefMap={crossRefMap}
          onClose={() => {
            setShowCrossReferences(null);
            setCrossRefPeekSource(null);
          }}
          onNavigateToVerse={(navBookId, ch, v, fromRef) => {
            setShowCrossReferences(null);
            setSelectedVerses([]); // Ensure we drop the previous selection so the toast disappears!

            // A peek (opened via the return pill's own "Refs") is re-browsing the list
            // belonging to the verse that's already the top of the trail — picking a
            // different entry from it is lateral movement within that same exploration,
            // not a new hop away from somewhere. So the trail is left untouched and
            // "back" keeps meaning the original source verse. Pushing here instead
            // (as this used to) both inflated the trail depth and recorded the user's
            // current chapter as a "stop", producing a pill offering to send them back
            // to the very chapter they were already reading.
            const isPeek = !!crossRefPeekSource;
            setCrossRefPeekSource(null);

            if (!isPeek) {
              // fromRef is the exact verse-group this reference was listed under — always
              // correct even when several verses were selected together (previously this
              // fell back to "the first selected verse" regardless of which group's
              // reference was actually clicked).
              const parsed = parseVerseRefString(fromRef);
              const sourceEntry = parsed
                ? { book: parsed.bookId, chapter: parsed.chapter, verse: parsed.verse }
                : { book: bookId, chapter, verse: 0 }; // best-effort fallback; shouldn't normally happen

              // Never record a "stop" for a jump that doesn't actually go anywhere —
              // landing on the verse you're already reading would otherwise leave a
              // trail entry pointing at the current position.
              const isSelfJump = sourceEntry.book === navBookId && sourceEntry.chapter === ch && sourceEntry.verse === v;
              if (!isSelfJump) setReturnStack(prev => [...prev, sourceEntry]);
            }

            setPendingHighlight({ book: navBookId, chapter: ch, verse: v });

            goToChapter(navBookId, ch, true);
          }}
        />
      )}

      {returnStack.length > 0 && selectedVerses.length === 0 && (() => {
        const topReturn = returnStack[returnStack.length - 1];
        const topReturnBookName = ALL_BOOKS.find(b => b.id === topReturn.book)?.name || topReturn.book;
        return (
          <div
            className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-8 pt-6 px-4 pointer-events-none animate-[fadeScaleIn_0.2s_ease-out] bg-gradient-to-t from-background via-background/80 to-transparent"
          >
            <div className="bg-card-elevated border border-card-border text-primary shadow-md rounded-full px-5 py-3.5 flex items-center gap-4 pointer-events-auto">
              <button
                onClick={() => {
                  // Pop, not clear — a deeper trail (e.g. two cross-reference jumps in a
                  // row) still has an older stop to offer after this one.
                  setReturnStack(prev => prev.slice(0, -1));
                  setPendingHighlight({ book: topReturn.book, chapter: topReturn.chapter, verse: topReturn.verse });
                  goToChapter(topReturn.book, topReturn.chapter, true);
                }}
                className="text-[15px] font-medium transition-colors flex items-center gap-2 hover:text-accent"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
                {/* verse 0 means "somewhere in this chapter, exact position not tracked"
                    — worded as "top of" rather than silently dropping the verse suffix,
                    so it doesn't read as a no-op return to the chapter the user may
                    already be standing in. Only reachable now via the rare
                    parseVerseRefString fallback, since peeks no longer push a stop. */}
                {topReturn.verse > 0 ? (
                  <>Go back to <span className="font-bold">{topReturnBookName} {topReturn.chapter}:{topReturn.verse}</span></>
                ) : (
                  <>Go back to top of <span className="font-bold">{topReturnBookName} {topReturn.chapter}</span></>
                )}
                {/* Counts the stops *beyond* the one already named above, so the number
                    never double-counts what the user can already read in the label —
                    "· 1 more" means one further step back after this one. The old
                    "· N stops" showed the whole trail depth including the named target,
                    which read as if there were more history than there actually was. */}
                {returnStack.length > 1 && (
                  <span className="text-xs text-muted font-normal">· {returnStack.length - 1} more</span>
                )}
              </button>

              {topReturn.verse > 0 && (
                <>
                  <div className="w-[1px] h-4 bg-card-border" />
                  <button
                    onClick={() => {
                      setCrossRefPeekSource({ book: bookId, chapter });
                      setShowCrossReferences([`${topReturnBookName.toLowerCase()} ${topReturn.chapter}:${topReturn.verse}`]);
                    }}
                    className="text-[15px] font-medium transition-colors flex items-center gap-2 hover:text-accent"
                    title="View references for original verse"
                  >
                    <BookOpen className="w-4 h-4" /> Refs
                  </button>
                </>
              )}

              <div className="w-[1px] h-4 bg-card-border" />

              <button
                onClick={() => setReturnStack([])}
                className="p-1 -mr-2 -my-2 rounded-full hover:bg-card-hover transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-[18px] h-[18px] opacity-80" />
              </button>
            </div>
          </div>
        );
      })()}

      {wordPopup && (
        <WordPopup
          word={wordPopup.word}
          strongsNumber={wordPopup.strongsNumber}
          definition={wordPopup.definition}
          onClose={() => setWordPopup(null)}
          onViewOccurrences={(strongsNumber) => {
            setViewingOccurrences(strongsNumber);
          }}
          // The popup opens its own occurrences modal for cross-reference clicks, which
          // needs the same handler as the one below — without it, "Read Chapter" there
          // silently does nothing.
          onNavigateToVerse={navigateToOccurrence}
        />
      )}

      {viewingOccurrences && strongsDict[viewingOccurrences] && (
        <StrongsOccurrencesModal
          strongsNumber={viewingOccurrences}
          lemma={strongsDict[viewingOccurrences].lemma}
          onClose={() => setViewingOccurrences(null)}
          onNavigateToVerse={navigateToOccurrence}
        />
      )}
    </div>
  );
};
