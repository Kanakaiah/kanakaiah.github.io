import React, { useState, useMemo } from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { NT_STUDY_GUIDES } from '../data/guides';

export const Guides: React.FC = () => {
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);

  const activeGuide = useMemo(() => {
    return NT_STUDY_GUIDES.find((g: any) => g.id === activeGuideId);
  }, [activeGuideId]);

  const categories = useMemo(() => {
    const map: Record<string, any[]> = {};
    NT_STUDY_GUIDES.forEach((g: any) => {
      const cat = g.category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(g);
    });
    return map;
  }, []);

  if (activeGuide) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pt-4 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveGuideId(null)}
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

        <div className="bg-glass-bg border border-glass-border rounded-3xl p-6 lg:p-10 shadow-sm flex flex-col gap-8">
          
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
                <div className="mt-4 pt-6 border-t border-glass-border flex flex-col gap-4">
                  <h3 className="font-bold text-accent-light text-sm uppercase tracking-[0.15em]">One-Word Chapter Anchors</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="p-3 border-b border-glass-border font-bold text-primary bg-glass-bg-hover w-16">Ch</th>
                          <th className="p-3 border-b border-glass-border font-bold text-primary bg-glass-bg-hover w-32">Word</th>
                          <th className="p-3 border-b border-glass-border font-bold text-primary bg-glass-bg-hover">Scene</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeGuide.anchors.map((anchor: any, i: number) => (
                          <tr key={i} className="border-b border-glass-border/50 hover:bg-glass-bg transition-colors">
                            <td className="p-3 text-muted font-bold whitespace-nowrap">{anchor.ch}</td>
                            <td className="p-3 font-bold text-accent-light whitespace-nowrap">{anchor.word}</td>
                            <td className="p-3 text-secondary leading-relaxed min-w-[250px]">{anchor.scene}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pt-4">
      <div className="hidden lg:block mb-2">
        <h1 className="text-3xl font-heading font-bold text-primary">Study Guides</h1>
      </div>

      <div className="flex flex-col gap-8 pb-12">
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
