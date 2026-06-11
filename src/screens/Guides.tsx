import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, BookOpen, Globe, Headphones, PlayCircle, Radio } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { NT_STUDY_GUIDES } from '../data/guides';
import { NT_BOOKS } from '../data/ntBooks';
import { BibleBrowser } from '../components/guides/BibleBrowser';
import { ChapterReader } from '../components/guides/ChapterReader';

// Special sentinel IDs
const BIBLE_BROWSER_NT = '__bible-browser-nt__';
const BIBLE_BROWSER_OT = '__bible-browser-ot__';

const DISTRIBUTION_COLORS = [
  { bg: 'bg-[#dfab55]', text: 'text-[#dfab55]', border: 'border-l-[#dfab55]' },
  { bg: 'bg-[#4e7cc2]', text: 'text-[#4e7cc2]', border: 'border-l-[#4e7cc2]' },
  { bg: 'bg-[#49a274]', text: 'text-[#49a274]', border: 'border-l-[#49a274]' },
  { bg: 'bg-[#cc6c4d]', text: 'text-[#cc6c4d]', border: 'border-l-[#cc6c4d]' },
  { bg: 'bg-[#7873df]', text: 'text-[#7873df]', border: 'border-l-[#7873df]' },
  { bg: 'bg-[#98968f]', text: 'text-[#98968f]', border: 'border-l-[#98968f]' },
  { bg: 'bg-[#d95d8e]', text: 'text-[#d95d8e]', border: 'border-l-[#d95d8e]' },
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
      href={bibleUrl}
      onClick={handleRead}
      className={`relative bg-[#222222] rounded-2xl flex flex-col gap-3 hover:-translate-y-1 transition-all overflow-hidden min-h-[240px] group cursor-pointer ${!imgErr ? 'border-0 shadow-xl shadow-black/20' : 'border border-[#333333] hover:bg-[#2a2a2a] shadow-sm'}`}
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
          <span className={`font-heading font-black tracking-widest uppercase text-sm px-4 py-2 rounded-full border transition-colors shadow-sm ${!imgErr ? 'text-white bg-black/60 backdrop-blur-md border-white/20 group-hover:border-accent/50' : 'text-primary bg-black/40 border-[#333333] group-hover:border-accent/50'}`}>
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

  const activeGuide: any = useMemo(() => {
    if (!activeGuideId || activeGuideId === BIBLE_BROWSER_NT || activeGuideId === BIBLE_BROWSER_OT) return null;
    
    // Check if we have a hand-written guide
    const existingGuide = NT_STUDY_GUIDES.find((g: any) => g.id === activeGuideId);
    if (existingGuide) return existingGuide;

    // Otherwise check if it's an NT book and generate a placeholder
    const book = NT_BOOKS.find(b => b.id === activeGuideId);
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
    NT_STUDY_GUIDES.forEach((g: any) => {
      // Skip book-guide entries from the category listing — they live in BibleBrowser
      if (g.type === 'book-guide') return;
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
        bookTitle={NT_BOOKS.find((b) => b.id === readerBook)?.name || activeGuide?.title || 'Book'}
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
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pt-4 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex flex-col gap-4 mb-2">
          <button
            onClick={() => {
              // If it was a book-guide opened from BibleBrowser, go back to browser
              if (activeGuide.type === 'book-guide') {
                setActiveGuideId(BIBLE_BROWSER_NT);
              } else {
                setActiveGuideId(null);
              }
            }}
            className="flex items-center gap-1 -ml-2 text-accent hover:text-accent-hover transition-colors font-medium text-[15px] self-start"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{activeGuide.type === 'book-guide' ? 'Bible Books' : 'Guides'}</span>
          </button>
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
                     <h2 className="text-xl font-bold text-accent-light border-b border-[#333333] pb-2 inline-block">
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
                               <th key={hi} className="p-3 border-b border-[#333333] font-bold text-primary bg-[#2a2a2a]">{h}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody>
                           {sec.table.rows.map((row: string[], ri: number) => (
                             <tr key={ri} className="border-b border-[#333333]/50 hover:bg-[#222222] transition-colors">
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
                         <div key={ei} className="bg-[#222222] border border-[#333333] rounded-xl p-5 flex flex-col gap-3 shadow-sm">
                           <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border-b border-[#333333]/50 pb-3">
                             <span className="font-bold text-accent px-3 py-1 bg-accent/10 rounded-full text-xs uppercase tracking-wider">{entry.rank}</span>
                             <span className="font-heading font-bold text-lg text-primary">{entry.person}</span>
                             <span className="text-sm font-bold text-muted sm:ml-auto">{entry.reference}</span>
                           </div>
                           <p className="text-primary italic leading-relaxed border-l-2 border-accent/40 pl-4 my-1">"{entry.quote}"</p>
                           {entry.note && <p className="text-secondary text-sm">{entry.note}</p>}
                           {entry.resources && entry.resources.length > 0 && (
                             <div className="flex flex-wrap gap-2 mt-1 pt-2 border-t border-[#333333]/30">
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
                     <div className="bg-[#222222] border-l-4 border-l-accent rounded-r-xl p-5 mt-4">
                       <p className="font-bold text-primary mb-1">{sec.keyVerse.ref}</p>
                       <p className="text-secondary italic">"{sec.keyVerse.text}"</p>
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
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted text-center">
                  NARRATIVE ARCHITECTURE · {activeGuide.chapters || 28} CHAPTERS
                </div>
              </div>

              {/* CHAPTER DISTRIBUTION */}
              <div className="flex flex-col mb-4 px-2">
                <h3 className="text-center text-[10px] uppercase tracking-[0.2em] font-bold text-secondary mb-4">
                  Chapter Distribution
                </h3>
                
                {/* Bar chart */}
                <div className="flex w-full h-14 rounded-md overflow-hidden shadow-sm">
                  {activeGuide.blocks.map((block: any, i: number) => {
                     const [start, end] = block.chapters.split('–').map(Number);
                     const totalChapters = activeGuide.chapters || 28;
                     const count = (end || start) - start + 1;
                     const widthPercent = (count / totalChapters) * 100;
                     const color = DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length];
                     return (
                       <div 
                         key={i} 
                         className={`${color.bg} flex flex-col items-center justify-center border-r border-background/20 last:border-0`}
                         style={{ width: `${widthPercent}%` }}
                       >
                         <span className="font-bold text-white/90 text-sm">{block.chapters.replace('–', '-')}</span>
                         <span className="text-white/70 text-[10px]">{count}ch</span>
                       </div>
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
                       const [start, end] = block.chapters.split('–').map(Number);
                       const count = (end || start) - start + 1;
                       chaptersBefore += count;
                       return (
                         <div 
                           key={i} 
                           className="absolute text-[11px] text-muted font-medium"
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
                  
                  const [start, end] = block.chapters.split('–').map(Number);
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
                    <div 
                      key={i}
                      className="flex rounded-xl overflow-hidden bg-[#222222] border border-[#333333]/40 hover:bg-[#2a2a2a] transition-colors min-h-[80px]"
                    >
                      <div className={`w-[72px] flex-shrink-0 flex flex-col items-center justify-center border-l-4 ${color.border} border-r border-r-glass-border/30`}>
                         <span className="text-[10px] uppercase font-bold text-muted tracking-widest mb-0.5">CH</span>
                         <span className={`text-xl font-bold ${color.text} font-heading leading-none`}>{block.chapters.replace('–', '-')}</span>
                      </div>
                      
                      <div className="flex-1 p-4 flex justify-between items-center gap-4">
                        <div className="flex flex-col gap-1 min-w-0">
                           <span className="text-[9px] uppercase tracking-widest text-muted font-bold">SECTION {String(i+1).padStart(2, '0')}</span>
                           <h3 className={`text-lg font-heading font-bold ${color.text} truncate`}>{labelTitleCase}</h3>
                           <p className="text-[13px] text-secondary italic truncate">{cleanDesc}</p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 flex-shrink-0 self-stretch justify-between py-0.5">
                          {isDiscourse ? (
                             <span className="text-[9px] font-bold uppercase tracking-widest text-sky-300 bg-sky-900/40 border border-sky-700/50 px-2 py-0.5 rounded-full">
                               DISCOURSE
                             </span>
                          ) : <div />}
                          <span className="text-[11px] text-muted font-medium mt-auto">{percent}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FOOTER FORMULA */}
              {activeGuide.structureFormula && (
                <div className="mt-8 mb-4 text-center text-[10px] uppercase tracking-[0.2em] font-bold text-muted">
                  FIVE MOSAIC DISCOURSES · {activeGuide.structureFormula.replace(/→/g, '->')}
                </div>
              )}

              {activeGuide.anchors && (
                <div className="mt-4 pt-6 border-t border-[#333333] flex flex-col gap-5">
                  <h3 className="font-bold text-accent-light text-sm uppercase tracking-[0.15em]">One-Word Chapter Anchors</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeGuide.anchors.map((anchor: any, i: number) => (
                      <ChapterAnchorCard key={i} anchor={anchor} guideId={activeGuide.id} />
                    ))}
                  </div>
                </div>
              )}

              {activeGuide.memorySentence && (
                <div className="mt-2 pt-6 border-t border-[#333333] flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm uppercase tracking-[0.15em]" style={{ color: 'var(--accent-light)' }}>Memory Sentence</h3>
                    <span className="text-[10px] text-muted tracking-normal px-2 py-1 rounded hidden sm:block" style={{ backgroundColor: '#222222' }}>Read 3-4 times to lock flow</span>
                  </div>
                  <div 
                    className="rounded-2xl p-5"
                    style={{ 
                      backgroundColor: '#222222', 
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
                <div className="mt-2 pt-6 border-t border-[#333333] flex flex-col gap-4">
                  <h3 className="font-bold text-sm uppercase tracking-[0.15em]" style={{ color: 'var(--accent-light)' }}>Key Verses</h3>
                  <div className="flex flex-col gap-3">
                    {activeGuide.keyVerses.map((kv: any, i: number) => (
                      <div 
                        key={i} 
                        className="rounded-2xl p-4 transition-all duration-300"
                        style={{ 
                          backgroundColor: '#222222', 
                          borderLeft: '3px solid var(--accent-light)',
                        }}
                      >
                        <p className="font-bold text-primary mb-1.5 text-sm">{kv.ref}</p>
                        {kv.text && <p className="text-secondary italic mb-1.5 text-sm leading-relaxed">"{kv.text}"</p>}
                        {kv.theme && <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-light)' }}>{kv.theme}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    );
  }

  // ── Main listing view ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pt-4">
      <div className="hidden lg:block mb-2">
        <h1 className="text-3xl font-heading font-bold text-primary">Study Guides</h1>
      </div>

      <div className="flex flex-col gap-8 pb-12">

        {/* ── Bible Books — OT / NT inline ── */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-muted ml-1">Bible Books</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* OT Card */}
            <button
              onClick={() => setActiveGuideId(BIBLE_BROWSER_OT)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-[#222222] border border-[#333333] hover:bg-[#2a2a2a] hover:border-accent/40 transition-all text-left group shadow-sm"
            >
              <div className="text-2xl">📜</div>
              <div className="flex-1 flex flex-col min-w-0">
                <span className="font-bold text-primary truncate">Old Testament</span>
                <span className="text-xs text-secondary">39 books · Genesis to Malachi</span>
              </div>
              <span className="hidden sm:inline-block px-2 py-1 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 uppercase tracking-wider">
                Soon
              </span>
              <ChevronRight className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
            </button>

            {/* NT Card */}
            <button
              onClick={() => setActiveGuideId(BIBLE_BROWSER_NT)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-accent/5 border border-accent/30 hover:bg-accent/10 hover:border-accent/60 transition-all text-left group shadow-sm"
            >
              <div className="text-2xl">✝️</div>
              <div className="flex-1 flex flex-col min-w-0">
                <span className="font-bold text-primary truncate">New Testament</span>
                <span className="text-xs text-secondary">27 books · Matthew to Revelation</span>
              </div>
              <span className="hidden sm:inline-block px-2 py-1 rounded text-[10px] font-bold bg-accent/10 text-accent uppercase tracking-wider">
                Explore
              </span>
              <ChevronRight className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
            </button>
          </div>
        </div>

        {/* ── Reference guides & others ── */}
        {Object.entries(categories).map(([category, guides]) => (
          <div key={category} className="flex flex-col gap-3">
            <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-muted ml-1">
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {guides.map((guide: any) => (
                <button
                  key={guide.id}
                  onClick={() => setActiveGuideId(guide.id)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-[#222222] border border-[#333333] hover:bg-[#2a2a2a] hover:border-accent/40 transition-all text-left group shadow-sm"
                >
                  <div className="text-2xl">{guide.icon}</div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <span className="font-bold text-primary truncate">{guide.title}</span>
                    <span className="text-xs text-secondary">{guide.subtitle}</span>
                  </div>
                  {guide.tier && (
                    <span className="hidden sm:inline-block px-2 py-1 rounded text-[10px] font-bold bg-accent/10 text-accent uppercase tracking-wider">
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
