import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, BookOpen, Globe, Headphones, PlayCircle, Radio, Search, ChevronLeft } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { NT_STUDY_GUIDES } from '../data/guides';
import { OT_STUDY_GUIDES } from '../data/otGuides';
import { NT_BOOKS, NT_SECTIONS } from '../data/ntBooks';
import { OT_BOOKS, OT_SECTIONS } from '../data/otBooks';
import { BibleBrowser, BookCard } from '../components/guides/BibleBrowser';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
import { ChapterReader } from '../components/guides/ChapterReader';

// Special sentinel IDs
const BIBLE_BROWSER_NT = '__bible-browser-nt__';
const BIBLE_BROWSER_OT = '__bible-browser-ot__';

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
      className={`relative bg-card rounded-2xl flex flex-col gap-3 hover:-translate-y-1 transition-all overflow-hidden min-h-[240px] group cursor-pointer ${!imgErr ? 'border-0 shadow-xl shadow-black/20' : 'border border-card-border hover:bg-card-hover shadow-sm'}`}
    >
      
      {!imgErr && (
        <img 
          src={imgPath} 
          alt={anchor.word} 
          onError={() => setImgErr(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className={`absolute inset-0 ${!imgErr ? 'bg-gradient-to-t from-black/70 via-black/30 to-transparent' : ''}`} />

      {/* Content over image */}
      <div className="relative z-10 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shadow-inner ${!imgErr ? 'bg-black/50 backdrop-blur-md border border-white/20 text-white' : 'bg-accent/20 text-accent'}`}>
            {anchor.ch}
          </span>
          <span className={`font-heading font-black tracking-widest uppercase text-sm px-4 py-2 rounded-full border transition-colors shadow-sm ${!imgErr ? 'text-white bg-black/60 backdrop-blur-md border-white/20 group-hover:border-accent/50' : 'text-primary bg-black/40 border-card-border group-hover:border-accent/50'}`}>
            {anchor.word}
          </span>
        </div>
        <p className={`text-base leading-relaxed mt-auto pt-4 font-medium ${!imgErr ? 'text-white/90 drop-shadow-md' : 'text-secondary'}`}>
          {anchor.scene}
        </p>
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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 50) {
        setIsNavHidden(true);
      } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
        setIsNavHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrevBook = () => {
    if (activeGuideId && activeGuideId !== BIBLE_BROWSER_NT && activeGuideId !== BIBLE_BROWSER_OT) {
      const currentIndex = ALL_BOOKS.findIndex(b => b.id === activeGuideId);
      if (currentIndex !== -1) {
        const prevIndex = (currentIndex - 1 + ALL_BOOKS.length) % ALL_BOOKS.length;
        setActiveGuideId(ALL_BOOKS[prevIndex].id);
      }
    }
  };

  const handleNextBook = () => {
    if (activeGuideId && activeGuideId !== BIBLE_BROWSER_NT && activeGuideId !== BIBLE_BROWSER_OT) {
      const currentIndex = ALL_BOOKS.findIndex(b => b.id === activeGuideId);
      if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % ALL_BOOKS.length;
        setActiveGuideId(ALL_BOOKS[nextIndex].id);
      }
    }
  };

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
          return {
            chapters: start === end ? `${start}` : `${start}–${end}`,
            label: arch.name,
            description: ''
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
      <ChapterReader
        bookId={readerBook}
        chapter={parseInt(readerChapter, 10)}
        bookTitle={ALL_BOOKS.find((b) => b.id === readerBook)?.name || activeGuide?.title || 'Book'}
        onClose={() => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('readerBook');
            next.delete('readerChapter');
            return next;
          });
        }}
      />
    );
  }

  // ── BibleBrowser view ──────────────────────────────────────────────────────
  if (activeGuideId === BIBLE_BROWSER_NT || activeGuideId === BIBLE_BROWSER_OT) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pt-4 animate-[fadeIn_0.3s_ease-out]">
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
        className="flex flex-col gap-6 max-w-4xl mx-auto w-full pt-4 pb-24 animate-[fadeIn_0.3s_ease-out]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-col gap-4 mb-2">
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
                     <div className="overflow-x-auto mt-2">
                       <table className="w-full text-left text-sm border-collapse">
                         <thead>
                           <tr>
                             {sec.table.headers.map((h: string, hi: number) => (
                               <th key={hi} className="p-3 border-b border-card-border font-bold text-primary bg-card-elevated">{h}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody>
                           {sec.table.rows.map((row: string[], ri: number) => (
                             <tr key={ri} className="border-b border-card-border/50 hover:bg-card transition-colors">
                               {row.map((cell: string, ci: number) => (
                                 <td key={ci} className="p-3 text-secondary">{cell}</td>
                               ))}
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   )}

                   {sec.entries && (
                     <div className="flex flex-col gap-4 mt-2">
                       {sec.entries.map((entry: any, ei: number) => (
                         <div key={ei} className="bg-card border border-card-border rounded-xl p-5 flex flex-col gap-3 shadow-sm">
                           <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border-b border-card-border/50 pb-3">
                             <span className="font-bold text-accent px-3 py-1 bg-accent/10 rounded-full text-xs uppercase tracking-wider">{entry.rank}</span>
                             <span className="font-heading font-bold text-lg text-primary">{entry.person}</span>
                             <span className="text-sm font-bold text-muted sm:ml-auto">{entry.reference}</span>
                           </div>
                           <p className="text-lg text-primary italic leading-relaxed border-l-2 border-accent/40 pl-4 my-1">"{entry.quote}"</p>
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
                                     className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${colorClass}`}
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
                     <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mt-2">
                       <p className="text-sm text-secondary leading-relaxed"><strong className="text-accent-light">Note:</strong> {sec.note}</p>
                     </div>
                   )}

                   {sec.keyVerse && (
                     <div className="bg-card border-l-4 border-l-accent rounded-r-xl p-5 mt-4">
                       <p className="font-bold text-primary mb-1">{sec.keyVerse.ref}</p>
                       <p className="text-lg text-secondary italic">"{sec.keyVerse.text}"</p>
                     </div>
                   )}
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
              <div className="flex flex-col mb-4 px-2">
                <h3 className="text-center text-[0.625rem] uppercase tracking-[0.2em] font-bold text-secondary mb-4">
                  Chapter Distribution
                </h3>
                
                {/* Bar chart */}
                <div className="flex w-full h-14 rounded-md overflow-hidden shadow-sm">
                  {activeGuide.blocks.map((block: any, i: number) => {
                     const [start, end] = String(block.chapters).split(/[-–]/).map(Number);
                     const totalChapters = activeGuide.chapters || 28;
                     const count = (end || start) - start + 1;
                     const widthPercent = (count / totalChapters) * 100;
                     const color = DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length];
                     return (
                       <button 
                         key={i} 
                         onClick={() => handleScrollToChapter(start)}
                         className={`${color.bg} flex flex-col items-center justify-center border-r border-background/20 last:border-0 hover:opacity-80 transition-opacity focus:outline-none`}
                         style={{ width: `${widthPercent}%` }}
                         title={`Scroll to chapter ${start}`}
                       >
                         <span className="font-bold text-white/90 text-sm">{block.chapters.replace('–', '-')}</span>
                         <span className="text-white/70 text-[0.625rem]">{count}ch</span>
                       </button>
                     );
                  })}
                </div>
                
                {/* Ticks below the bar chart */}
                <div className="flex w-full mt-2 relative h-4">
                  {(() => {
                     let chaptersBefore = 0;
                     const totalChapters = activeGuide.chapters || 28;
                     return activeGuide.blocks.map((block: any, i: number) => {
                       const leftPercent = (chaptersBefore / totalChapters) * 100;
                       const [start, end] = String(block.chapters).split(/[-–]/).map(Number);
                       const count = (end || start) - start + 1;
                       chaptersBefore += count;
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

              {/* SECTION LIST */}
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
                  const totalChapters = activeGuide.chapters || 28;
                  const percent = ((count / totalChapters) * 100).toFixed(1) + '%';
                  
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
                      onClick={() => handleScrollToChapter(start)}
                      className="w-full text-left flex rounded-xl overflow-hidden bg-card border border-card-border/40 hover:bg-card-hover transition-colors min-h-[80px]"
                    >
                      <div className={`w-[72px] flex-shrink-0 flex flex-col items-center justify-center border-l-4 ${color.border} border-r border-r-glass-border/30`}>
                         <span className="text-[0.625rem] uppercase font-bold text-muted tracking-widest mb-0.5">CH</span>
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

              {activeGuide.anchors && (
                <div className="mt-4 pt-6 border-t border-card-border flex flex-col gap-5">
                  <h3 className="font-bold text-accent-light text-sm uppercase tracking-[0.15em]">One-Word Chapter Anchors</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeGuide.anchors.map((anchor: any, i: number) => (
                      <ChapterAnchorCard key={i} anchor={anchor} guideId={activeGuide.id} />
                    ))}
                  </div>
                </div>
              )}

              {activeGuide.memorySentence && (
                <div className="mt-2 pt-6 border-t border-card-border flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm uppercase tracking-[0.15em]" style={{ color: 'var(--accent-light)' }}>Memory Sentence</h3>
                    <span className="text-[0.625rem] text-muted tracking-normal px-2 py-1 rounded hidden sm:block bg-card-elevated border border-card-border">Read 3-4 times to lock flow</span>
                  </div>
                  <div 
                    className="rounded-2xl p-5 bg-card-elevated border border-card-border/50"
                    style={{ 
                      borderLeft: '3px solid var(--accent-light)',
                    }}
                  >
                    <p
                      className="text-base leading-relaxed text-secondary"
                      dangerouslySetInnerHTML={{
                        __html: activeGuide.memorySentence.replace(/\b([A-Z]{2,}(?:'S)?)\b/g, '<strong class="text-orange-400 font-bold">$1</strong>')
                      }}
                    />
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
                        className="rounded-2xl p-4 transition-all duration-300 bg-card-elevated border border-card-border/50"
                        style={{ 
                          borderLeft: '3px solid var(--accent-light)',
                        }}
                      >
                        <p className="font-bold text-primary mb-1.5 text-sm">{kv.ref}</p>
                        {kv.text && <p className="text-lg text-secondary italic mb-1.5 leading-relaxed">"{kv.text}"</p>}
                        {kv.theme && <p className="text-[0.6875rem] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-light)' }}>{kv.theme}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        <div className={`fixed bottom-0 left-0 right-0 p-4 pb-safe bg-background/80 backdrop-blur-xl z-40 lg:ml-64 transition-transform duration-300 ease-in-out ${isNavHidden ? 'translate-y-full' : 'translate-y-0'}`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button onClick={handlePrevBook} className="p-3 text-secondary hover:text-primary transition-colors hover:bg-white/5 rounded-xl">
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <button 
              onClick={() => setActiveGuideId(null)}
              className="flex flex-col items-center group px-4 py-2 hover:bg-white/5 rounded-xl transition-colors"
            >
              <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:text-accent transition-colors">
                <BookOpen className="w-4 h-4 mr-1 opacity-70" />
                Index
              </span>
            </button>

            <button onClick={handleNextBook} className="p-3 text-secondary hover:text-primary transition-colors hover:bg-white/5 rounded-xl">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main listing view ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pt-4">
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
          className="w-full bg-card border border-card-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all text-primary placeholder:text-muted shadow-sm"
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
                      className="flex items-center justify-between border-b border-glass-border pb-1 w-full text-left group hover:border-accent/50 transition-colors"
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
                      className="flex items-center justify-between border-b border-glass-border pb-1 w-full text-left group hover:border-accent/50 transition-colors"
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
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-card-border hover:bg-card-hover hover:border-accent/40 transition-all text-left group shadow-sm"
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
