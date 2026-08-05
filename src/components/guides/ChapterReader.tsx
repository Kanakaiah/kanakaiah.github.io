import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Loader2, Type, Plus, Minus, X, Copy, Trash2, BookOpen, RotateCw } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { NT_BOOKS } from '../../data/ntBooks';
import { OT_BOOKS } from '../../data/otBooks';
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

// bolls.life's translation code doubles as the display label for LSB/NLT, but NASB
// specifically means the 1995 edition here — spell that out so it isn't mistaken for
// a different NASB printing.
const BIBLE_VERSION_LABELS: Record<string, string> = {
  LSB: 'LSB',
  NASB: 'NASB95',
  NLT: 'NLT',
};

const BIBLE_VERSION_OPTIONS: { value: 'LSB' | 'NASB' | 'NLT'; label: string }[] = [
  { value: 'LSB', label: 'Legacy Standard Bible (LSB)' },
  { value: 'NASB', label: 'New American Standard Bible 1995 (NASB95)' },
  { value: 'NLT', label: 'New Living Translation (NLT)' },
];

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
  onClose: () => void;
  onStudyOriginalWord?: (verseRef: { book: number; chapter: number; verse: number }) => void;
}

import { BOLLS_BIBLE_MAP, BOOK_SHORT } from '../../data/bibleMap';

interface Verse {
  pk: number;
  verse: number;
  text: string;
}

export function ChapterReader({ bookId, chapter, bookTitle, onClose, onStudyOriginalWord }: ChapterReaderProps) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightVerse = searchParams.get('highlightVerse');
  const returnBook = searchParams.get('returnBook');
  const returnChapter = searchParams.get('returnChapter');
  const returnVerse = searchParams.get('returnVerse');
  const navigate = useNavigate();
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
    const observer = new ResizeObserver((entries) => {
      setHeaderHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
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
    
    if (chapter < currentBook.chapters) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerChapter', (chapter + 1).toString());
        return next;
      });
    } else if (bookIndex < ALL_BOOKS.length - 1) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerBook', ALL_BOOKS[bookIndex + 1].id);
        next.set('readerChapter', '1');
        return next;
      });
    }
  };

  const handlePrevChapter = () => {
    const bookIndex = ALL_BOOKS.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return;
    
    if (chapter > 1) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerChapter', (chapter - 1).toString());
        return next;
      });
    } else if (bookIndex > 0) {
      const prevBook = ALL_BOOKS[bookIndex - 1];
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerBook', prevBook.id);
        next.set('readerChapter', prevBook.chapters.toString());
        return next;
      });
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
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('readerBook', targetBookId);
      next.set('readerChapter', targetChapter.toString());
      // Also update the guide param so closing the reader lands on the correct book's page
      if (next.has('guide')) {
        next.set('guide', targetBookId);
      }
      return next;
    }, { replace: true });
    setShowNavigator(false);
    setShowVersionPicker(false);
  };

  useEffect(() => {
    if (cachedCrossRefs) {
      setCrossRefMap(cachedCrossRefs);
      return;
    }
    let mounted = true;
    fetch('/data/cross_references.json')
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

    const fetchChapter = async () => {
      setLoading(true);
      setError(null);
      try {
        const bollsId = BOLLS_BIBLE_MAP[bookId];
        if (!bollsId) {
          throw new Error('Book not found in Bible API map.');
        }

        const res = await fetch(`https://bolls.life/get-text/${bibleVersion}/${bollsId}/${chapter}/`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error('Failed to fetch chapter text.');
        }

        const data: Verse[] = await res.json();
        if (cancelled) return;
        setVerses(data);
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

  useEffect(() => {
    if (verses.length > 0 && highlightVerse && !loading) {
      setTimeout(() => {
        const el = document.querySelector(`[data-verse="${highlightVerse}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a temporary highlight effect (light green)
          el.classList.add('bg-green-500/30', 'transition-colors', 'duration-1000');
          setTimeout(() => {
            el.classList.remove('bg-green-500/30');
          }, 2500);
        }
      }, 300);
    }
  }, [verses, highlightVerse, loading]);

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
    
    // The chapter title is already shown in the sticky header, no need to duplicate it here.

    const bollsId = BOLLS_BIBLE_MAP[bookId];
    let quoteLevel = 0; // Track quote nesting across verses

    verses.forEach((v) => {
      let text = v.text;
      
      // === Fix #5 & #2: Extract section headings (<b>) BEFORE OT quote processing ===
      // This prevents heading text from confusing the quote-level tracker.
      // Only <b> tags exist in the API (no <S>, <h1-6>, or <div> headings).
      let heading = '';
      text = text.replace(/<b>(.*?)<\/b>/gi, (_, hText) => {
        heading += `<div class="mt-10 first-of-type:mt-0 mb-4 text-[1.2em] font-bold tracking-tight text-accent-light font-heading italic leading-snug break-words w-full block">${hText}</div>`;
        return '';
      });

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
      
      let extraClass = '';
      if (isSelected) {
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
        chapterBreaks ? chapterBreaks.includes(v.verse) : (!!heading || hasLeadingBr)
      );
      const pilcrowHtml = isParagraphStart ? `<span class="text-accent/40 font-sans mr-0.5 select-none pointer-events-none">¶ </span>` : '';
      const verseNumClass = isParagraphStart ? 'font-bold text-foreground' : 'font-normal text-muted';

      const bookIndex = ALL_BOOKS.findIndex(b => b.id === bookId) + 1;
      const ariaLabel = `Verse ${v.verse}${isSelected ? ', selected' : ''}${inLibrary ? ', in your library' : ''}`;
      html += `<span class="inline verse-span cursor-pointer transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${extraClass}" data-verse="${v.verse}" data-verse-ref="${bookIndex}-${chapter}-${v.verse}" tabindex="0" role="button" aria-pressed="${isSelected}" aria-label="${ariaLabel}">${pilcrowHtml}<sup class="text-[0.55em] ${verseNumClass} ml-0.5 mr-1.5 relative -top-[0.4em] select-none pointer-events-none">${v.verse}</sup><span class="inline pointer-events-none">${text}</span> </span>`;
    });

    return html;
  }, [verses, selectedVerses, memorizedVerses, state.settings.bionicReading, bookId, chapter, paragraphBreaks]);

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
      if (isSelected) {
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
  }, [kjvVerses, strongsDict, parseKjvStrongs, selectedVerses, memorizedVerses]);

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

  const hasRefs = !crossRefMap || selectedVerses.some(v => {
    const refs = crossRefMap[`${bookTitle.toLowerCase()} ${chapter}:${v}`];
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
        className="flex-1 overflow-y-auto overscroll-y-contain px-5 pb-6"
        style={{ paddingTop: headerHeight ? `${headerHeight + 16}px` : 'calc(env(safe-area-inset-top, 0px) + 6rem)' }}
        onScroll={handleScroll}
        onClick={handleContentClick}
      >

        {loading ? (
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
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
            <div className="max-w-2xl mx-auto pb-32 select-text" onClick={handleAlphaClick} onKeyDown={handleAlphaKeyDown}>
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
            <div className="max-w-2xl mx-auto pb-32 select-text" onClick={handleVerseClick} onKeyDown={handleVerseKeyDown}>
              <div
                className={`tracking-[-0.01em] text-primary/95 [&>div:first-child]:mt-0 ${
                  state.settings.fontFamily === 'serif' ? 'font-serif' :
                  state.settings.fontFamily === 'hyper' ? 'font-hyper tracking-normal' :
                  'font-sans'
                }`}
                style={{
                  fontSize: `${1.25 * (state.settings.fontSize || 1)}rem`,
                  lineHeight: `${1.9 * (state.settings.fontSize || 1)}rem`
                }}
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
      {!loading && !error && selectedVerses.length === 0 && !(returnBook && returnChapter) && (
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
          onClose={() => setShowCrossReferences(null)}
          onNavigateToVerse={(navBookId, ch, v) => {
            setShowCrossReferences(null);
            setSelectedVerses([]); // Ensure we drop the previous selection so the toast disappears!
            
            let originalBook = bookId;
            let originalChapter = chapter.toString();
            let originalVerse = '';

            if (showCrossReferences && showCrossReferences.length > 0) {
               const match = showCrossReferences[0].match(/^(\d?\s*[a-zA-Z]+)\s+(\d+):(\d+)$/);
               if (match) {
                 const bName = match[1].toLowerCase().trim();
                 const foundBook = ALL_BOOKS.find(b => b.name.toLowerCase() === bName || b.id === bName);
                 if (foundBook) {
                   originalBook = foundBook.id;
                 }
                 originalChapter = match[2];
                 originalVerse = match[3];
               } else {
                 const refParts = showCrossReferences[0].split(':');
                 if (refParts.length > 1) {
                   originalVerse = refParts[1];
                 }
               }
            }

            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.set('readerBook', navBookId);
              next.set('readerChapter', ch.toString());
              next.set('highlightVerse', v.toString());
              next.set('returnBook', originalBook);
              next.set('returnChapter', originalChapter);
              if (originalVerse) {
                next.set('returnVerse', originalVerse);
              }
              return next;
            }, { replace: true });

            if (navBookId === bookId && ch === chapter) {
              setTimeout(() => {
                const el = document.querySelector(`[data-verse="${v}"]`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('bg-green-500/30', 'transition-colors', 'duration-1000');
                  setTimeout(() => el.classList.remove('bg-green-500/30'), 2500);
                }
              }, 200);
            }
          }}
        />
      )}

      {returnBook && returnChapter && selectedVerses.length === 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-8 pt-6 px-4 pointer-events-none animate-[fadeScaleIn_0.2s_ease-out] bg-gradient-to-t from-background via-background/80 to-transparent"
        >
          <div className="bg-card-elevated border border-card-border text-primary shadow-md rounded-full px-5 py-3.5 flex items-center gap-4 pointer-events-auto">
            <button 
              onClick={() => {
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.set('readerBook', returnBook);
                  next.set('readerChapter', returnChapter);
                  next.delete('returnBook');
                  next.delete('returnChapter');
                  next.delete('returnVerse');
                  next.delete('highlightVerse');
                  if (returnVerse) {
                    next.set('highlightVerse', returnVerse);
                  }
                  return next;
                }, { replace: true });
                
                // If returning to same chapter, manually scroll
                if (returnBook === bookId && returnChapter === chapter.toString()) {
                  setTimeout(() => {
                    const el = document.querySelector(`[data-verse="${returnVerse}"]`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('bg-green-500/30', 'transition-colors', 'duration-1000');
                      setTimeout(() => el.classList.remove('bg-green-500/30'), 2500);
                    }
                  }, 200);
                }
              }}
              className="text-[15px] font-medium transition-colors flex items-center gap-2 hover:text-accent"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" /> Go back to <span className="font-bold">{ALL_BOOKS.find(b => b.id === returnBook)?.name || returnBook} {returnChapter}:{returnVerse || ''}</span>
            </button>

            {returnVerse && (
              <>
                <div className="w-[1px] h-4 bg-card-border" />
                <button
                  onClick={() => {
                    const bookName = ALL_BOOKS.find(b => b.id === returnBook)?.name.toLowerCase() || returnBook;
                    setShowCrossReferences([`${bookName} ${returnChapter}:${returnVerse}`]);
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
              onClick={() => {
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.delete('returnBook');
                  next.delete('returnChapter');
                  next.delete('returnVerse');
                  return next;
                }, { replace: true });
              }}
              className="p-1 -mr-2 -my-2 rounded-full hover:bg-card-hover transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-[18px] h-[18px] opacity-80" />
            </button>
          </div>
        </div>
      )}

      {wordPopup && (
        <WordPopup
          word={wordPopup.word}
          strongsNumber={wordPopup.strongsNumber}
          definition={wordPopup.definition}
          onClose={() => setWordPopup(null)}
          onViewOccurrences={(strongsNumber) => {
            setViewingOccurrences(strongsNumber);
          }}
        />
      )}

      {viewingOccurrences && strongsDict[viewingOccurrences] && (
        <StrongsOccurrencesModal
          strongsNumber={viewingOccurrences}
          lemma={strongsDict[viewingOccurrences].lemma}
          onClose={() => setViewingOccurrences(null)}
          onNavigateToVerse={(navBookId, ch, v) => {
            setViewingOccurrences(null);
            setWordPopup(null);
            
            // Navigate to the verse in the reader
            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.set('readerBook', navBookId);
              next.set('readerChapter', ch.toString());
              next.set('highlightVerse', v.toString());
              return next;
            }, { replace: true });

            if (navBookId === bookId && ch === chapter) {
              setTimeout(() => {
                const el = document.querySelector(`[data-verse="${v}"]`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('bg-green-500/30', 'transition-colors', 'duration-1000');
                  setTimeout(() => el.classList.remove('bg-green-500/30'), 2500);
                }
              }, 200);
            }
          }}
        />
      )}
    </div>
  );
};
