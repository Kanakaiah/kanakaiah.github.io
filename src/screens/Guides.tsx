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
             <div className="flex flex-col gap-8">
               {activeGuide.sections.map((sec: any, i: number) => (
                 <div key={i} className="flex flex-col gap-3">
                   <h2 className="text-xl font-bold text-accent-light border-b border-glass-border pb-2 inline-block">
                     {sec.title}
                   </h2>
                   <div className="flex flex-col gap-2 pl-4 border-l-2 border-accent/30">
                     {sec.items.map((item: any, j: number) => (
                       <div key={j} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-1">
                         <span className="font-bold text-primary min-w-[140px]">{item.ref}</span>
                         <span className="text-secondary text-sm">{item.desc}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
          )}

          {activeGuide.type === 'book-guide' && activeGuide.blocks && (
            <div className="flex flex-col gap-6">
              
              <div className="bg-background rounded-xl p-4 border border-glass-border flex flex-col items-center gap-3">
                <span className="text-xs uppercase tracking-widest text-muted font-bold">Structure Formula</span>
                <div className="text-2xl font-heading font-bold text-accent-light tracking-[0.2em]">
                  {activeGuide.structureFormula}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {activeGuide.blocks.map((block: any, i: number) => (
                  <div key={i} className="flex gap-4 items-start group">
                    <div className="w-16 h-16 rounded-2xl bg-accent/10 flex flex-col items-center justify-center border border-accent/20 flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                      <span className="text-[10px] text-accent font-bold uppercase tracking-wider mb-0.5">Ch</span>
                      <span className="font-heading font-bold text-primary text-lg leading-none">{block.chapters}</span>
                    </div>
                    <div className="pt-1.5 flex flex-col gap-1">
                      <h3 className="font-bold text-primary tracking-wide">{block.label}</h3>
                      <p className="text-secondary text-sm leading-relaxed">{block.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {activeGuide.keyThemes && (
                <div className="mt-4 pt-6 border-t border-glass-border flex flex-col gap-3">
                  <h3 className="font-bold text-accent-light text-sm uppercase tracking-wider">Key Themes</h3>
                  <div className="flex flex-wrap gap-2">
                    {activeGuide.keyThemes.map((theme: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-glass-bg border border-glass-border text-sm font-medium text-secondary">
                        {theme}
                      </span>
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
