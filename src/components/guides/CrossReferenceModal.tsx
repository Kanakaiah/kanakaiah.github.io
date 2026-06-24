import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2, BookOpen } from 'lucide-react';
import { NT_BOOKS } from '../../data/ntBooks';
import { OT_BOOKS } from '../../data/otBooks';
import { BOLLS_BIBLE_MAP } from './ChapterReader';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

interface CrossReferenceModalProps {
  verseRef: string; // e.g. "genesis 1:1"
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

export const CrossReferenceModal: React.FC<CrossReferenceModalProps> = ({ verseRef, onClose, onNavigateToVerse }) => {
  const [refs, setRefs] = useState<CrossRefData[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadRefs = async () => {
      setLoadingRefs(true);
      try {
        const res = await fetch('/data/cross_references.json');
        if (!res.ok) throw new Error('Failed to load cross references database');
        
        const data = await res.json();
        const related = data[verseRef.toLowerCase()] || [];

        if (related.length === 0) {
          if (mounted) {
            setRefs([]);
            setLoadingRefs(false);
          }
          return;
        }

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

        if (mounted) setRefs(parsedRefs);

        // Fetch verse texts concurrently but in batches with retries
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
                  setRefs(prev => prev.map(p => p.refStr === r.refStr ? { ...p, text: cleanText, loading: false } : p));
                }
                return; // Success, exit retry loop
              } else {
                throw new Error('Verse not found');
              }
            } catch (err: any) {
              if (retries === 0) {
                if (mounted) {
                  setRefs(prev => prev.map(p => p.refStr === r.refStr ? { ...p, error: err.message, loading: false } : p));
                }
              } else {
                retries--;
                await new Promise(res => setTimeout(res, 1000)); // wait 1s before retry
              }
            }
          }
        };

        // Process in batches of 4 to avoid hitting Bolls Life rate limits (HTTP 429 Too Many Requests)
        const batchSize = 4;
        for (let i = 0; i < parsedRefs.length; i += batchSize) {
          const batch = parsedRefs.slice(i, i + batchSize);
          await Promise.all(batch.map(fetchVerse));
          await new Promise(res => setTimeout(res, 250)); // stagger batches
        }
        
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoadingRefs(false);
      }
    };

    loadRefs();

    return () => { mounted = false; };
  }, [verseRef]);

  const capitalize = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-card text-card-foreground sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 flex flex-col max-h-[85vh] rounded-t-2xl sm:rounded-b-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Cross References</h2>
              <p className="text-sm text-muted-foreground">{capitalize(verseRef)}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}

          {!error && loadingRefs && refs.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-accent" />
              <p>Finding related verses...</p>
            </div>
          )}

          {!error && !loadingRefs && refs.length === 0 && (
            <div className="py-12 text-center text-muted-foreground px-4">
              <p>No cross-references available for this verse in the offline dataset.</p>
            </div>
          )}

          {refs.map((r, i) => {
            const bookInfo = ALL_BOOKS.find(b => b.name.toLowerCase() === r.bookName.toLowerCase() || b.id === r.bookName.toLowerCase());
            
            return (
              <div key={i} className="group relative bg-muted/20 border border-border rounded-xl p-4 transition-colors hover:bg-muted/40">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-accent flex items-center gap-2">
                    {bookInfo?.name || capitalize(r.bookName)} {r.chapter}:{r.verse}
                  </h3>
                  <button 
                    onClick={() => {
                      if (bookInfo) {
                        onNavigateToVerse(bookInfo.id, r.chapter, r.verse);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-background border border-border text-xs font-medium hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    Read chapter
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                
                {r.loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading text...
                  </div>
                ) : r.error ? (
                  <p className="text-sm text-destructive">{r.error}</p>
                ) : (
                  <p className="text-sm leading-relaxed text-foreground/90">{r.text}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
