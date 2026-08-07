import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, BookOpen, Globe, Headphones, PlayCircle, Radio, Search, ChevronLeft, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { NT_STUDY_GUIDES } from '../data/guides';
import { OT_STUDY_GUIDES } from '../data/otGuides';
import { NT_BOOKS, NT_SECTIONS } from '../data/ntBooks';
import { OT_BOOKS, OT_SECTIONS } from '../data/otBooks';
import { BibleBrowser, BookCard } from '../components/guides/BibleBrowser';
import { ChapterReader } from '../components/guides/ChapterReader';
import { MemorySentence } from '../components/guides/MemorySentence';
import { RecordCards } from '../components/guides/RecordCards';
import { OriginalWordModal } from '../components/OriginalWordModal';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

// Special sentinel IDs
const BIBLE_BROWSER_NT = '__bible-browser-nt__';
const BIBLE_BROWSER_OT = '__bible-browser-ot__';

import { BOOK_SHORT } from '../data/bibleMap';
const DISTRIBUTION_COLORS = [
  { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-l-amber-500' },
  { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-l-blue-500' },
  { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-l-emerald-500' },
  { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-l-orange-500' },
  { bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-l-indigo-500' },
  { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-l-slate-500' },
  { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-l-pink-500' },
];


const YOUVERSION_NT_ABBR: Record<string, string> = {
  "matthew": "MAT", "mark": "MRK", "luke": "LUK", "john": "JHN", "acts": "ACT",
  "romans": "ROM", "1corinthians": "1CO", "2corinthians": "2CO", "galatians": "GAL",
  "ephesians": "EPH", "philippians": "PHP", "colossians": "COL", "1thessalonians": "1TH",
  "2thessalonians": "2TH", "1timothy": "1TI", "2timothy": "2TI", "titus": "TIT",
  "philemon": "PHM", "hebrews": "HEB", "james": "JAS", "1peter": "1PE", "2peter": "2PE",
  "1john": "1JN", "2john": "2JN", "3john": "3JN", "jude": "JUD", "revelation": "REV"
};

const ChapterAnchorCard = ({ anchor, guideId }: { anchor: any, guideId: string }) => {
  const [imgErr, setImgErr] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const imgPath = `/chapters/${guideId}/ch${anchor.ch}.png`;

  useEffect(() => {
    setImgErr(false);
  }, [imgPath]);

  const bookAbbr = YOUVERSION_NT_ABBR[guideId] || 'JHN';
  const bibleUrl = `https://www.bible.com/bible/3345/${bookAbbr}.${anchor.ch}.LSB`;

  const handleRead = (e: React.MouseEvent) => {
    e.preventDefault();
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('readerBook', guideId);
      next.set('readerChapter', anchor.ch.toString());
      return next;
    });
  };

  return (
    <a
      id={`chapter-anchor-${anchor.ch}`}
      href={bibleUrl}
      onClick={handleRead}
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

export const Guides: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOTExpanded, setIsOTExpanded] = useState(true);
  const [isNTExpanded, setIsNTExpanded] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [studyOriginalWordRef, setStudyOriginalWordRef] = useState<{ book: number; chapter: number; verse: number } | null>(null);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const activeGuideId = searchParams.get('guide');
  const readerBook = searchParams.get('readerBook');
  const readerChapter = searchParams.get('readerChapter');
  const setActiveGuideId = (id: string | null) => {
    if (id) {
      setSearchParams({ guide: id });
    } else {
      setSearchParams({});
    }
  };

  const handleScrollToChapter = (ch: number) => {
    const el = document.getElementById(`chapter-anchor-${ch}`);
    if (el) {
      // Scroll the element slightly into view so it's not hidden by potential fixed headers
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null);
  const [touchEndPos, setTouchEndPos] = useState<{x: number, y: number} | null>(null);
  
  const lastScrollY = useRef(0);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [isIndexModalOpen, setIsIndexModalOpen] = useState(false);

  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll-container');
    if (!scrollContainer) return;

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      const currentScrollY = target.scrollTop;
      
      if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 50) {
        setIsNavHidden(true);
      } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
        setIsNavHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

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

  // ── In-App Reader view ─────────────────────────────────────────────────────
  if (readerBook && readerChapter) {
    return (
      <>
        {studyOriginalWordRef && (
          <OriginalWordModal 
            verseRef={studyOriginalWordRef} 
            onClose={() => setStudyOriginalWordRef(null)} 
            onNavigateToVerse={(bookId, chapter, verse) => {
              setStudyOriginalWordRef(null);
              setSearchParams(prev => {
                const next = new URLSearchParams(prev);
                next.set('readerBook', bookId);
                next.set('readerChapter', chapter.toString());
                return next;
              });
              setTimeout(() => {
                const el = document.getElementById('verse-' + verse);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 500);
            }}
          />
        )}
        <ChapterReader
          bookId={readerBook}
          chapter={parseInt(readerChapter, 10)}
          bookTitle={ALL_BOOKS.find((b) => b.id === readerBook)?.name || activeGuide?.title || 'Book'}
          onStudyOriginalWord={setStudyOriginalWordRef}
          onClose={() => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.delete('readerBook');
              next.delete('readerChapter');
              return next;
            });
          }}
        />
      </>
    );
  }

  // ── BibleBrowser view ──────────────────────────────────────────────────────
  if (activeGuideId === BIBLE_BROWSER_NT || activeGuideId === BIBLE_BROWSER_OT) {
    return (
      <div 
        className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-[fadeIn_0.3s_ease-out]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <BibleBrowser
          initialTestament={activeGuideId === BIBLE_BROWSER_NT ? 'NT' : 'OT'}
          onOpenGuide={(guideId) => setActiveGuideId(guideId)}
          onBack={() => setActiveGuideId(null)}
        />
      </div>
    );
  }

  // ── Individual guide detail view ───────────────────────────────────────────
  if (activeGuide) {
    return (
      <div 
        className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-24 animate-[fadeIn_0.3s_ease-out]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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

            {/* Close Button */}
            <button 
              onClick={() => setActiveGuideId(null)}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-card border border-card-border text-muted hover:text-primary hover:bg-card-hover transition-colors shadow-sm flex-shrink-0"
              aria-label="Close Guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {activeGuide.type !== 'book-guide' && (
            <div>
              <h1 className="text-3xl font-bold font-heading text-primary flex items-center gap-2">
                <span className="text-3xl">{activeGuide.icon}</span> {activeGuide.title}
              </h1>
              <p className="text-secondary text-sm font-medium mt-1">{activeGuide.subtitle}</p>
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

              {/* Header section replacing the old one */}
              <div className="flex flex-col items-center mb-2 mt-2">
                <h1 className="text-4xl sm:text-5xl font-bold font-heading text-primary mb-3 text-center">
                  {activeGuide.title}
                </h1>
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
                      <div
                        key={i}
                        className="rounded-lg p-4 bg-card-elevated border border-card-border"
                        style={{
                          borderLeft: '2px solid var(--accent-light)',
                        }}
                      >
                        <p className="font-bold text-primary mb-1.5 text-sm">{kv.ref}</p>
                        {kv.text && <p className="text-lg text-secondary italic font-serif mb-1.5 leading-relaxed">"{kv.text}"</p>}
                        {kv.theme && <p className="text-[0.6875rem] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-light)' }}>{kv.theme}</p>}
                      </div>
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

        <div className={`
          fixed bottom-0 left-0 right-0 lg:left-64
          bg-card border-t border-card-border
          z-40 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isNavHidden ? 'translate-y-full' : 'translate-y-0'}
        `}>
          <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3 pb-safe">
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

        {/* ── Index Modal ── */}
        {isIndexModalOpen && (
          <div className="fixed inset-0 z-[70] flex flex-col bg-background animate-[fadeIn_0.2s_ease-out]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
              <button
                onClick={() => setIsIndexModalOpen(false)}
                className="p-2 -ml-2 rounded-md hover:bg-card-hover transition-colors"
              >
                <X className="w-5 h-5 text-secondary" />
              </button>
              <span className="text-sm font-bold text-primary tracking-wide">Bible Books</span>
              <div className="w-9" />
            </div>

            {/* Book list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 pb-32">
              {/* Column headers */}
              <div className="grid grid-cols-2 mb-2">
                <span className="text-right pr-4 text-[10px] font-bold text-muted uppercase tracking-widest">Old Testament</span>
                <span className="text-left pl-4 text-[10px] font-bold text-muted uppercase tracking-widest">New Testament</span>
              </div>

              {/* Book rows */}
              <div className="grid grid-cols-2">
                {(() => {
                  const rows: React.ReactNode[] = [];
                  const maxLen = Math.max(OT_BOOKS.length, NT_BOOKS.length);

                  for (let i = 0; i < maxLen; i++) {
                    const ot = i < OT_BOOKS.length ? OT_BOOKS[i] : null;
                    const nt = i < NT_BOOKS.length ? NT_BOOKS[i] : null;
                    const isOtSelected = ot?.id === activeGuideId;
                    const isNtSelected = nt?.id === activeGuideId;

                    rows.push(
                      <React.Fragment key={`row-${i}`}>
                        <button
                          onClick={() => {
                            if (ot) {
                              setActiveGuideId(ot.id);
                              setIsIndexModalOpen(false);
                            }
                          }}
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
                          onClick={() => {
                            if (nt) {
                              setActiveGuideId(nt.id);
                              setIsIndexModalOpen(false);
                            }
                          }}
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

      <div className="relative mt-2">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-muted" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search books..."
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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

        {/* ── Reference guides & others ── */}
        {Object.entries(categories).map(([category, guides]) => (
          <div key={category} className="flex flex-col gap-3">
            <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-muted ml-1">
              Study Resources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  {guide.tier && (
                    <span className="hidden sm:inline-block px-2 py-1 rounded text-[0.625rem] font-bold bg-accent/10 text-accent uppercase tracking-wider">
                      Tier {guide.tier}
                    </span>
                  )}
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
