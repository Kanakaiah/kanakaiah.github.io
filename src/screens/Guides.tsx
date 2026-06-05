import React, { useState, useMemo } from 'react';
import { ChevronRight, ArrowLeft, BookOpen, Globe, Headphones, PlayCircle, Radio } from 'lucide-react';
import { NT_STUDY_GUIDES } from '../data/guides';
import { NT_BOOKS } from '../data/ntBooks';
import { BibleBrowser } from '../components/guides/BibleBrowser';

// Special sentinel IDs
const BIBLE_BROWSER_NT = '__bible-browser-nt__';
const BIBLE_BROWSER_OT = '__bible-browser-ot__';

const ChapterAnchorCard = ({ anchor, guideId }: { anchor: any, guideId: string }) => {
  const [imgErr, setImgErr] = useState(false);
  const imgPath = `/chapters/${guideId}/ch${anchor.ch}.png`;

  return (
    <div className="relative bg-glass-bg border border-glass-border rounded-2xl flex flex-col gap-3 hover:bg-glass-bg-hover hover:-translate-y-1 transition-all shadow-sm group overflow-hidden min-h-[160px]">
      
      {!imgErr && (
        <img 
          src={imgPath} 
          alt={anchor.word} 
          onError={() => setImgErr(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className={`absolute inset-0 ${!imgErr ? 'bg-gradient-to-t from-black/90 via-black/50 to-black/20' : ''}`} />

      {/* Content over image */}
      <div className="relative z-10 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shadow-inner ${!imgErr ? 'bg-black/50 backdrop-blur-md border border-white/20 text-white' : 'bg-accent/20 text-accent'}`}>
            {anchor.ch}
          </span>
          <span className={`font-heading font-black tracking-widest uppercase text-sm px-4 py-2 rounded-full border transition-colors shadow-sm ${!imgErr ? 'text-white bg-black/60 backdrop-blur-md border-white/20 group-hover:border-accent/50' : 'text-primary bg-black/40 border-glass-border group-hover:border-accent/50'}`}>
            {anchor.word}
          </span>
        </div>
        <p className={`text-base leading-relaxed mt-auto pt-4 font-medium ${!imgErr ? 'text-white/90 drop-shadow-md' : 'text-secondary'}`}>
          {anchor.scene}
        </p>
      </div>
    </div>
  );
};

export const Guides: React.FC = () => {
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);

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
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              // If it was a book-guide opened from BibleBrowser, go back to browser
              if (activeGuide.type === 'book-guide') {
                setActiveGuideId(BIBLE_BROWSER_NT);
              } else {
                setActiveGuideId(null);
              }
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-glass-bg border border-glass-border hover:bg-glass-bg-hover transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold font-heading text-primary flex items-center gap-2">
              <span className="text-3xl">{activeGuide.icon}</span> {activeGuide.title}
            </h1>
            <p className="text-secondary text-sm font-medium">{activeGuide.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-col gap-8">

          {/* ── Reference guide ── */}
          {activeGuide.type === 'reference' && activeGuide.sections && (
             <div className="flex flex-col gap-10">
               {activeGuide.sections.map((sec: any, i: number) => (
                 <div key={i} className="flex flex-col gap-4">
                   {sec.heading && (
                     <h2 className="text-xl font-bold text-accent-light border-b border-glass-border pb-2 inline-block">
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
                               <th key={hi} className="p-3 border-b border-glass-border font-bold text-primary bg-glass-bg-hover">{h}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody>
                           {sec.table.rows.map((row: string[], ri: number) => (
                             <tr key={ri} className="border-b border-glass-border/50 hover:bg-glass-bg transition-colors">
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
                         <div key={ei} className="bg-glass-bg border border-glass-border rounded-xl p-5 flex flex-col gap-3 shadow-sm">
                           <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border-b border-glass-border/50 pb-3">
                             <span className="font-bold text-accent px-3 py-1 bg-accent/10 rounded-full text-xs uppercase tracking-wider">{entry.rank}</span>
                             <span className="font-heading font-bold text-lg text-primary">{entry.person}</span>
                             <span className="text-sm font-bold text-muted sm:ml-auto">{entry.reference}</span>
                           </div>
                           <p className="text-primary italic leading-relaxed border-l-2 border-accent/40 pl-4 my-1">"{entry.quote}"</p>
                           {entry.note && <p className="text-secondary text-sm">{entry.note}</p>}
                           {entry.resources && entry.resources.length > 0 && (
                             <div className="flex flex-wrap gap-2 mt-1 pt-2 border-t border-glass-border/30">
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
                     <div className="bg-glass-bg border-l-4 border-l-accent rounded-r-xl p-5 mt-4">
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
            <div className="flex flex-col gap-8">

              <div className="bg-glass-bg rounded-2xl p-6 border border-glass-border flex flex-col items-center gap-4 text-center">
                <span className="text-xs uppercase tracking-[0.2em] text-muted font-bold">Structure Overview</span>
                <div className="text-3xl font-heading font-bold text-accent-light tracking-widest">
                  {activeGuide.structureFormula}
                </div>
              </div>

              <div className="flex flex-col gap-5">
                {activeGuide.blocks.map((block: any, i: number) => (
                  <div key={i} className="flex gap-4 items-start group">
                    <div className="w-16 h-16 rounded-2xl bg-glass-bg flex flex-col items-center justify-center border border-glass-border flex-shrink-0 shadow-sm">
                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">Ch</span>
                      <span className="font-heading font-bold text-primary text-lg leading-none">{block.chapters}</span>
                    </div>
                    <div className="pt-2 flex flex-col gap-1">
                      <h3 className="font-bold text-primary tracking-wide text-lg">{block.label}</h3>
                      <p className="text-secondary leading-relaxed">{block.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {activeGuide.anchors && (
                <div className="mt-4 pt-6 border-t border-glass-border flex flex-col gap-5">
                  <h3 className="font-bold text-accent-light text-sm uppercase tracking-[0.15em]">One-Word Chapter Anchors</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {activeGuide.anchors.map((anchor: any, i: number) => (
                      <ChapterAnchorCard key={i} anchor={anchor} guideId={activeGuide.id} />
                    ))}
                  </div>
                </div>
              )}

              {activeGuide.memorySentence && (
                <div className="mt-2 pt-6 border-t border-glass-border flex flex-col gap-4">
                  <h3 className="font-bold text-accent-light text-sm uppercase tracking-[0.15em] flex items-center justify-between">
                    <span>Memory Sentence</span>
                    <span className="text-[10px] text-muted tracking-normal bg-glass-bg px-2 py-1 rounded hidden sm:block">Read 3-4 times to lock flow</span>
                  </h3>
                  <div className="bg-glass-bg border border-glass-border rounded-xl p-6 shadow-sm">
                    <p
                      className="text-lg leading-relaxed text-secondary"
                      dangerouslySetInnerHTML={{
                        __html: activeGuide.memorySentence.replace(/\b([A-Z]{2,}(?:'S)?)\b/g, '<strong class="text-accent-light font-bold">$1</strong>')
                      }}
                    />
                  </div>
                </div>
              )}

              {activeGuide.keyVerses && (
                <div className="mt-2 pt-6 border-t border-glass-border flex flex-col gap-4">
                  <h3 className="font-bold text-accent-light text-sm uppercase tracking-[0.15em]">Key Verses</h3>
                  <div className="flex flex-col gap-3">
                    {activeGuide.keyVerses.map((kv: any, i: number) => (
                      <div key={i} className="bg-glass-bg border border-glass-border rounded-xl p-5 shadow-sm">
                        <p className="font-bold text-primary mb-2 text-sm">{kv.ref}</p>
                        {kv.text && <p className="text-secondary italic mb-2">"{kv.text}"</p>}
                        {kv.theme && <p className="text-xs font-bold text-accent uppercase tracking-wider">{kv.theme}</p>}
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
              className="flex items-center gap-4 p-4 rounded-2xl bg-glass-bg border border-glass-border hover:bg-glass-bg-hover hover:border-accent/40 transition-all text-left group shadow-sm"
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
                  className="flex items-center gap-4 p-4 rounded-2xl bg-glass-bg border border-glass-border hover:bg-glass-bg-hover hover:border-accent/40 transition-all text-left group shadow-sm"
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
