import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2, BookOpen } from 'lucide-react';
import { NT_BOOKS } from '../../data/ntBooks';
import { OT_BOOKS } from '../../data/otBooks';
import { BOLLS_BIBLE_MAP } from './ChapterReader';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

interface CrossReferenceModalProps {
  verseRefs: string[];
  onClose: () => void;
  onNavigateToVerse: (bookId: string, chapter: number, verse: number) => void;
}

interface CrossRefData {
  refStr: string;
  bookName: string;
  chapter: number;
  verse: number;
  text?: string;
  loading: boolean;
  error?: string;
}

interface VerseGroup {
  parentRef: string;
  refs: CrossRefData[];
}

export const CrossReferenceModal: React.FC<CrossReferenceModalProps> = ({ verseRefs, onClose, onNavigateToVerse }) => {
  const [groups, setGroups] = useState<VerseGroup[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const capitalize = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  useEffect(() => {
    let mounted = true;

    const loadRefs = async () => {
      setLoadingRefs(true);
      try {
        const res = await fetch('/data/cross_references.json');
        if (!res.ok) throw new Error('Failed to load cross references database');
        
        const data = await res.json();
        
        const verseGroups: VerseGroup[] = [];
        const allParsedRefs: CrossRefData[] = [];

        for (const vRef of verseRefs) {
          const related = data[vRef.toLowerCase()] || [];
          const parsedRefs = related.map((ref: string) => {
            const match = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
            if (match) {
              return {
                refStr: ref,
                bookName: match[1],
                chapter: parseInt(match[2], 10),
                verse: parseInt(match[3], 10),
                loading: true
              };
            }
            return null;
          }).filter(Boolean) as CrossRefData[];

          verseGroups.push({ parentRef: vRef, refs: parsedRefs });
          allParsedRefs.push(...parsedRefs);
        }

        if (mounted) setGroups(verseGroups);

        if (allParsedRefs.length === 0) {
          if (mounted) setLoadingRefs(false);
          return;
        }

        const fetchVerse = async (r: CrossRefData) => {
          let retries = 2;
          while (retries >= 0) {
            try {
              const book = ALL_BOOKS.find(b => b.name.toLowerCase() === r.bookName.toLowerCase() || b.id === r.bookName.toLowerCase());
              if (!book) throw new Error('Book not found');
              const bollsId = BOLLS_BIBLE_MAP[book.id];
              
              const apiRes = await fetch(`https://bolls.life/get-text/LSB/${bollsId}/${r.chapter}/`);
              if (!apiRes.ok) throw new Error('Failed to fetch text');
              const chapterData = await apiRes.json();
              
              const verseData = chapterData.find((v: any) => v.verse === r.verse);
              if (verseData) {
                const cleanText = verseData.text
                  .replace(/<b\b[^>]*>.*?<\/b>/gi, '')
                  .replace(/<h[1-6]\b[^>]*>.*?<\/h[1-6]>/gi, '')
                  .replace(/<div\b[^>]*class="[^"]*heading[^"]*"[^>]*>.*?<\/div>/gi, '')
                  .replace(/<br\s*\/?>/gi, ' ')
                  .replace(/<\/p>/gi, ' ')
                  .replace(/<[^>]*>/g, '')
                  .trim();
                
                if (mounted) {
                  setGroups(prev => prev.map(g => ({
                    ...g,
                    refs: g.refs.map(p => p.refStr === r.refStr ? { ...p, text: cleanText, loading: false } : p)
                  })));
                }
                return;
              } else {
                throw new Error('Verse not found');
              }
            } catch (err: any) {
              if (retries === 0) {
                if (mounted) {
                  setGroups(prev => prev.map(g => ({
                    ...g,
                    refs: g.refs.map(p => p.refStr === r.refStr ? { ...p, error: err.message, loading: false } : p)
                  })));
                }
              } else {
                retries--;
                await new Promise(res => setTimeout(res, 1000));
              }
            }
          }
        };

        const seen = new Set<string>();
        const uniqueRefs: CrossRefData[] = [];
        for (const r of allParsedRefs) {
          if (!seen.has(r.refStr)) {
            seen.add(r.refStr);
            uniqueRefs.push(r);
          }
        }

        const batchSize = 4;
        for (let i = 0; i < uniqueRefs.length; i += batchSize) {
          const batch = uniqueRefs.slice(i, i + batchSize);
          await Promise.all(batch.map(fetchVerse));
          await new Promise(res => setTimeout(res, 250));
        }
        
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoadingRefs(false);
      }
    };

    loadRefs();

    return () => { mounted = false; };
  }, [verseRefs]);

  const totalRefs = groups.reduce((sum, g) => sum + g.refs.length, 0);
  const isMultiVerse = verseRefs.length > 1;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background/60 backdrop-blur-xl animate-in fade-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 relative">
        {/* Modern gradient border under header */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-glass-border to-transparent" />
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-accent" />
          <div>
            <h2 className="text-base font-bold text-primary">Cross References</h2>
            <p className="text-xs text-secondary">
              {isMultiVerse 
                ? `${verseRefs.length} verses · ${totalRefs} references`
                : capitalize(verseRefs[0])
              }
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 -mr-2 rounded-full hover:bg-glass-bg transition-colors"
        >
          <X className="w-5 h-5 text-secondary" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-500/10 text-red-400 text-sm border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {!error && loadingRefs && totalRefs === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-secondary">
            <Loader2 className="w-6 h-6 animate-spin mb-3 text-accent" />
            <p className="text-sm">Finding related verses...</p>
          </div>
        )}

        {!error && !loadingRefs && totalRefs === 0 && (
          <div className="py-16 text-center text-secondary px-6">
            <p className="text-sm">No cross-references available.</p>
          </div>
        )}

        {groups.map((group, gi) => {
          if (group.refs.length === 0) return null;
          
          return (
            <div key={gi}>
              {/* Parent verse section header — shown when multi-verse */}
              {isMultiVerse && (
                <div className="sticky top-0 z-10 px-5 py-3 bg-accent/10 backdrop-blur-md border-b border-accent/20 border-l-4 border-l-accent flex items-center justify-between">
                  <span className="text-sm font-bold text-accent">
                    {capitalize(group.parentRef)}
                  </span>
                  <span className="text-[10px] font-bold text-accent/60 bg-accent/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {group.refs.length} {group.refs.length === 1 ? 'ref' : 'refs'}
                  </span>
                </div>
              )}

              {/* Refs list */}
              {group.refs.map((r, i) => {
                const bookInfo = ALL_BOOKS.find(b => b.name.toLowerCase() === r.bookName.toLowerCase() || b.id === r.bookName.toLowerCase());
                
                return (
                  <div 
                    key={`${gi}-${i}`} 
                    className="px-5 py-3 relative active:bg-glass-bg transition-colors"
                    onClick={() => {
                      if (bookInfo) {
                        onNavigateToVerse(bookInfo.id, r.chapter, r.verse);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="font-bold text-accent text-sm">
                        {bookInfo?.name || capitalize(r.bookName)} {r.chapter}:{r.verse}
                      </h3>
                      <ArrowRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                    </div>
                    
                    {r.loading ? (
                      <div className="flex items-center gap-2 text-xs text-secondary animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                      </div>
                    ) : r.error ? (
                      <p className="text-xs text-red-400">{r.error}</p>
                    ) : (
                      <p className="text-sm leading-snug text-primary/80">{r.text}</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
