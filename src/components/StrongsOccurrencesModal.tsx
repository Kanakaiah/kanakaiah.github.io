import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2, BookOpen } from 'lucide-react';
import { NT_BOOKS } from '../data/ntBooks';
import { OT_BOOKS } from '../data/otBooks';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

interface StrongsOccurrencesModalProps {
  strongsNumber: string; // e.g. "G5547" or "H7225"
  lemma: string;
  onClose: () => void;
  onNavigateToVerse: (bookId: string, chapter: number, verse: number) => void;
}

interface Occurrence {
  pk: number;
  translation: string;
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

export const StrongsOccurrencesModal: React.FC<StrongsOccurrencesModalProps> = ({ 
  strongsNumber, 
  lemma,
  onClose, 
  onNavigateToVerse 
}) => {
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // G5547 -> 'G' is NT, 'H' is OT
  const isOldTestament = strongsNumber.startsWith('H');
  const numberPart = strongsNumber.replace(/[^0-9]/g, '');

  useEffect(() => {
    let mounted = true;

    const fetchOccurrences = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all search results for this number
        const res = await fetch(`https://bolls.life/search/KJV/?search=${numberPart}&match_case=false&match_whole=false`);
        if (!res.ok) throw new Error('Failed to fetch occurrences');
        
        let data: Occurrence[] = await res.json();
        
        // Filter out results from the wrong testament
        data = data.filter(item => {
          if (isOldTestament) return item.book <= 39;
          return item.book >= 40;
        });

        if (mounted) {
          setOccurrences(data);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'An error occurred while fetching occurrences.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchOccurrences();

    return () => {
      mounted = false;
    };
  }, [strongsNumber, numberPart, isOldTestament]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Process HTML safely
  const createMarkup = (html: string) => {
    // We can replace the <mark> tags to look like our accent color
    let processed = html.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '<span class="text-accent bg-accent/20 px-1 rounded font-medium">$1</span>');
    // Strip bolls specific tags like <S> completely so they don't show up, but keep content
    processed = processed.replace(/<S[^>]*>(.*?)<\/S>/gi, '$1');
    // Also remove translator supplied italics tags (<i> or <sup>)
    processed = processed.replace(/<sup[^>]*>(.*?)<\/sup>/gi, '$1');
    processed = processed.replace(/<i[^>]*>(.*?)<\/i>/gi, '$1');
    return { __html: processed };
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background/95 backdrop-blur-xl animate-in fade-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-5 py-4 relative bg-card/80 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-glass-border to-transparent" />
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-accent" />
          <div>
            <h2 className="text-lg font-bold text-primary">Word Occurrences</h2>
            <p className="text-sm text-secondary font-serif">
              {lemma} ({strongsNumber}) - {loading ? '...' : occurrences.length} Verses
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
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
            <p className="text-sm text-secondary">Searching entire Bible...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        ) : occurrences.length === 0 ? (
          <div className="text-center text-secondary py-16 px-4">
            <p>No occurrences found for this word.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-20">
            {occurrences.map((occ, idx) => {
              const book = ALL_BOOKS.find(b => b.id === (ALL_BOOKS[occ.book - 1]?.id));
              const bookName = book?.name || `Book ${occ.book}`;
              const bookIdForNav = book?.id || '';

              return (
                <div 
                  key={occ.pk || idx}
                  className="bg-card-elevated border border-card-border rounded-xl p-5 hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-card-border pb-3">
                    <h4 className="font-bold text-primary">
                      {bookName} {occ.chapter}:{occ.verse}
                    </h4>
                    <button
                      onClick={() => onNavigateToVerse(bookIdForNav, occ.chapter, occ.verse)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-light transition-colors py-1 px-2.5 rounded-full bg-accent/10 hover:bg-accent/20"
                    >
                      Read Chapter
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p 
                    className="text-lg text-secondary leading-relaxed font-serif"
                    dangerouslySetInnerHTML={createMarkup(occ.text)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
