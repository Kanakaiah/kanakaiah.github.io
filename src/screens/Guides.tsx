import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, BookOpen, Globe, Headphones, PlayCircle, Radio, Search, ChevronLeft, ArrowLeft, X } from 'lucide-react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
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

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

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
import { useApp } from '../context/AppContext';
const DISTRIBUTION_COLORS = [
  { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-l-amber-500' },
  { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-l-blue-500' },
  { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-l-emerald-500' },
  { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-l-orange-500' },
  { bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-l-indigo-500' },
  { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-l-slate-500' },
  { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-l-pink-500' },
];


const ChapterAnchorCard = ({ anchor, guideId }: { anchor: any, guideId: string }) => {
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
    const path = readerPath(guideId, anchor.ch);
    if (path) navigate(path);
  };

  return (
    <a
      id={`chapter-anchor-${anchor.ch}`}
      href={bibleUrl || undefined}
      onClick={handleRead}
      // Without an href the anchor drops out of the tab order, so put it back — the
      // click handler is what actually opens the chapter either way.
      role={bibleUrl ? undefined : 'button'}
      tabIndex={bibleUrl ? undefined : 0}
      className="group flex flex-col bg-card border border-card-border rounded-lg overflow-hidden hover:border-card-border-hover transition-colors"
    >
      {/* Plate */}
      <div className="relative aspect-[4/3] bg-card-elevated overflow-hidden">
        {!imgErr ? (
          <img
            src={imgPath}
            alt={anchor.word}
            onError={() => setImgErr(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-heading font-bold text-muted/25">{anchor.ch}</span>
          </div>
        )}
        <span className="absolute top-3 left-3 w-8 h-8 rounded-full bg-background/90 border border-card-border flex items-center justify-center font-bold text-sm text-primary">
          {anchor.ch}
        </span>
      </div>

      {/* Caption */}
      <div className="p-5 flex flex-col gap-1.5">
        <span className="font-heading font-semibold uppercase tracking-wide text-xs text-accent">{anchor.word}</span>
        <p className="text-sm text-secondary italic font-serif leading-relaxed">{anchor.scene}</p>
      </div>
    </a>
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
}> = ({ isOpen, selectedId, onSelect, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background animate-[fadeIn_0.2s_ease-out]">
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

              rows.push(
                <React.Fragment key={`row-${i}`}>
                  <button
                    onClick={() => { if (ot) onSelect(ot.id); }}
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
                    onClick={() => { if (nt) onSelect(nt.id); }}
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
            }
            return rows;
          })()}
        </div>
      </div>
    </div>
  );
};

export const Guides: React.FC = () => {
  // Read-only now — the screen's own state lives in the path; query params are only
  // inspected to redirect links written before that was true.
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOTExpanded, setIsOTExpanded] = useState(true);
  const [isNTExpanded, setIsNTExpanded] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [studyOriginalWordRef, setStudyOriginalWordRef] = useState<{ book: number; chapter: number; verse: number } | null>(null);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const { guideId, ref: readerRefParam } = useParams();
  const navigate = useNavigate();

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
            description: description
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
              className="absolute left-5 sm:left-8 top-1 p-2 -ml-2 rounded-full hover:bg-card-hover transition-colors z-10"
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

            <button
              onClick={() => setIsIndexModalOpen(true)}
              className="flex items-center gap-1 text-xs font-bold text-muted uppercase tracking-wider hover:text-primary transition-colors border border-card-border rounded-md px-3 py-1.5"
            >
              INDEX
            </button>

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
              onClick={() => setActiveGuideId(
                activeGuide.type === 'book-guide'
                  ? (OT_BOOKS.some(b => b.id === activeGuide.id) ? BIBLE_BROWSER_OT : BIBLE_BROWSER_NT)
                  : null
              )}
              className="absolute left-5 sm:left-8 top-1 p-2 -ml-2 rounded-full hover:bg-card-hover transition-colors z-10"
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

        <div className="flex flex-col gap-4 mb-2">
          <div className="flex items-center justify-between gap-4">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1 text-[0.8125rem] font-medium flex-wrap">
              <button
                onClick={() => setActiveGuideId(null)}
                className="text-accent hover:text-accent-hover transition-colors"
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
                      className="text-accent hover:text-accent-hover transition-colors"
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
              <div className="flex flex-col items-center mb-2 mt-2">
                <div className="text-[0.625rem] uppercase tracking-[0.2em] font-bold text-muted text-center">
                  NARRATIVE ARCHITECTURE · {activeGuide.chapters || 28} CHAPTERS
                </div>
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
                const isVerseBased = activeGuide.chapters === 1 && activeGuide.blocks.length > 1;
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

                    {/* Bar chart */}
                    <div className="flex w-full h-14 rounded-md overflow-hidden shadow-sm">
                      {activeGuide.blocks.map((block: any, i: number) => {
                         const [start, end] = String(block.chapters).split(/[-–]/).map(Number);
                         const count = (end || start) - start + 1;
                         const widthPercent = (count / totalUnits) * 100;
                         const color = DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length];
                         return (
                           <button
                             key={i}
                             onClick={() => handleScrollToChapter(scrollTarget(start))}
                             className={`${color.bg} flex flex-col items-center justify-center border-r border-background/20 last:border-0 hover:opacity-80 transition-opacity focus:outline-none`}
                             style={{ width: `${widthPercent}%` }}
                             title={`Scroll to ${unitWord} ${start}`}
                           >
                             <span className="font-bold text-white/90 text-sm">{block.chapters.replace('–', '-')}</span>
                             <span className="text-white/70 text-[0.625rem]">{count}{unitLabel}</span>
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
                const isVerseBased = activeGuide.chapters === 1 && activeGuide.blocks.length > 1;
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
                  <h3 className="font-bold text-accent-light text-sm uppercase tracking-[0.15em]">One-Word Chapter Anchors</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeGuide.anchors.map((anchor: any) => (
                      <ChapterAnchorCard key={`${activeGuide.id}-${anchor.ch}`} anchor={anchor} guideId={activeGuide.id} />
                    ))}
                  </div>
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
            <div className="pt-6 border-t border-card-border flex flex-col gap-4">
              <h3 className="font-bold text-sm uppercase tracking-[0.15em]" style={{ color: 'var(--accent-light)' }}>Memory Sentence</h3>
              <MemorySentence sentence={activeGuide.memorySentence} anchors={activeGuide.anchors} />
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
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-card-hover text-secondary hover:text-primary"
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
              className="flex items-center gap-1 text-xs font-bold text-muted uppercase tracking-wider hover:text-primary transition-colors border border-card-border rounded-md px-3 py-1.5"
            >
              INDEX
            </button>

            <button
              onClick={handleNextBook}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-card-hover text-secondary hover:text-primary"
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
        />
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

      <div className="relative mt-2">
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
                const books = OT_BOOKS.filter(b => b.section === section && b.name.toLowerCase().includes(searchQuery.toLowerCase()));
                if (!books.length) return null;
                return (
                  <div key={section} className="flex flex-col gap-3">
                    <button 
                      onClick={() => toggleSection(section)}
                      className="flex items-center justify-between border-b border-card-border pb-1 w-full text-left group hover:border-accent/50 transition-colors"
                    >
                      <p className="text-[0.6875rem] font-bold text-accent uppercase tracking-widest">{section}</p>
                      {collapsedSections[section] ? (
                        <ChevronRight className="w-3.5 h-3.5 text-accent opacity-70 group-hover:opacity-100" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-accent opacity-70 group-hover:opacity-100" />
                      )}
                    </button>
                    {!collapsedSections[section] && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {books.map(book => (
                          <BookCard key={book.id} book={book} onClick={() => setActiveGuideId(book.id)} />
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
                const books = NT_BOOKS.filter(b => b.section === section && b.name.toLowerCase().includes(searchQuery.toLowerCase()));
                if (!books.length) return null;
                return (
                  <div key={section} className="flex flex-col gap-3">
                    <button 
                      onClick={() => toggleSection(section)}
                      className="flex items-center justify-between border-b border-card-border pb-1 w-full text-left group hover:border-accent/50 transition-colors"
                    >
                      <p className="text-[0.6875rem] font-bold text-accent uppercase tracking-widest">{section}</p>
                      {collapsedSections[section] ? (
                        <ChevronRight className="w-3.5 h-3.5 text-accent opacity-70 group-hover:opacity-100" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-accent opacity-70 group-hover:opacity-100" />
                      )}
                    </button>
                    {!collapsedSections[section] && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {books.map(book => (
                          <BookCard key={book.id} book={book} onClick={() => setActiveGuideId(book.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Study resources, grouped by their own category ── */}
        {Object.entries(filteredCategories).map(([category, guides]) => (
          <div key={category} className="flex flex-col gap-3">
            {/* Every one of these groups used to render the words "Study Resources",
                so the page repeated one heading eight times over eight different sets
                of cards, with nothing to say why they were separate. */}
            <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-muted ml-1">
              {category}
              <span className="ml-2 text-muted/60 font-normal">{guides.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {guides.map((guide: any) => (
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
    </div>
  );
};
