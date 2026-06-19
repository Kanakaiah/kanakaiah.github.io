import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Type, Plus, Minus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { NT_BOOKS } from '../../data/ntBooks';
import { useApp } from '../../context/AppContext';

interface ChapterReaderProps {
  bookId: string;
  chapter: number;
  bookTitle: string;
  onClose: () => void;
}

const BOLLS_NT_MAP: Record<string, number> = {
  matthew: 40,
  mark: 41,
  luke: 42,
  john: 43,
  acts: 44,
  romans: 45,
  '1corinthians': 46,
  '2corinthians': 47,
  galatians: 48,
  ephesians: 49,
  philippians: 50,
  colossians: 51,
  '1thessalonians': 52,
  '2thessalonians': 53,
  '1timothy': 54,
  '2timothy': 55,
  titus: 56,
  philemon: 57,
  hebrews: 58,
  james: 59,
  '1peter': 60,
  '2peter': 61,
  '1john': 62,
  '2john': 63,
  '3john': 64,
  jude: 65,
  revelation: 66,
};

interface Verse {
  pk: number;
  verse: number;
  text: string;
}

export function ChapterReader({ bookId, chapter, bookTitle, onClose }: ChapterReaderProps) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setSearchParams] = useSearchParams();
  const [showOptions, setShowOptions] = useState(false);
  const { state, dispatch } = useApp();

  const lastScrollY = useRef(0);
  const [isNavHidden, setIsNavHidden] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 50) {
      setIsNavHidden(true);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsNavHidden(false);
    }
    lastScrollY.current = currentScrollY;
  };

  // Compute prev/next labels for the navigation bar
  const bookIndex = NT_BOOKS.findIndex(b => b.id === bookId);
  const currentBook = bookIndex !== -1 ? NT_BOOKS[bookIndex] : null;

  let prevLabel: string | null = null;
  let nextLabel: string | null = null;

  if (currentBook) {
    if (chapter > 1) {
      prevLabel = `${bookTitle} ${chapter - 1}`;
    } else if (bookIndex > 0) {
      const prev = NT_BOOKS[bookIndex - 1];
      prevLabel = `${prev.name} ${prev.chapters}`;
    }

    if (chapter < currentBook.chapters) {
      nextLabel = `${bookTitle} ${chapter + 1}`;
    } else if (bookIndex < NT_BOOKS.length - 1) {
      nextLabel = `${NT_BOOKS[bookIndex + 1].name} 1`;
    }
  }

  const handleNextChapter = () => {
    const bookIndex = NT_BOOKS.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return;
    const currentBook = NT_BOOKS[bookIndex];
    
    if (chapter < currentBook.chapters) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerChapter', (chapter + 1).toString());
        return next;
      });
    } else if (bookIndex < NT_BOOKS.length - 1) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerBook', NT_BOOKS[bookIndex + 1].id);
        next.set('readerChapter', '1');
        return next;
      });
    }
  };

  const handlePrevChapter = () => {
    const bookIndex = NT_BOOKS.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return;
    
    if (chapter > 1) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerChapter', (chapter - 1).toString());
        return next;
      });
    } else if (bookIndex > 0) {
      const prevBook = NT_BOOKS[bookIndex - 1];
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerBook', prevBook.id);
        next.set('readerChapter', prevBook.chapters.toString());
        return next;
      });
    }
  };

  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null);
  const [touchEndPos, setTouchEndPos] = useState<{x: number, y: number} | null>(null);

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
        handleNextChapter();
      } else {
        handlePrevChapter();
      }
    }
  };

  useEffect(() => {
    const fetchChapter = async () => {
      setLoading(true);
      setError(null);
      try {
        const bollsId = BOLLS_NT_MAP[bookId];
        if (!bollsId) {
          throw new Error('Book not found in Bible API map.');
        }

        const res = await fetch(`https://bolls.life/get-text/LSB/${bollsId}/${chapter}/`);
        if (!res.ok) {
          throw new Error('Failed to fetch chapter text.');
        }
        
        const data: Verse[] = await res.json();
        setVerses(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading the chapter.');
      } finally {
        setLoading(false);
      }
    };

    fetchChapter();
  }, [bookId, chapter]);

  const buildChapterHtml = () => {
    let html = '';
    
    // The chapter title is already shown in the sticky header, no need to duplicate it here.

    verses.forEach((v) => {
      let text = v.text;
      
      if (state.settings.bionicReading) {
        text = text.split(' ').map(word => {
          if (word.length <= 1) return `<b>${word}</b>`;
          if (word.length <= 3) return `<b>${word.substring(0, 1)}</b>${word.substring(1)}`;
          const half = Math.ceil(word.length / 2);
          return `<b>${word.substring(0, half)}</b>${word.substring(half)}`;
        }).join(' ');
      }
      
      // Extract section headings (<S> or <b>)
      let heading = '';
      text = text.replace(/<S[^>]*>(.*?)<\/S>|<b[^>]*>(.*?)<\/b>/gi, (_, sMatch, bMatch) => {
        const hText = sMatch || bMatch;
        heading += `<div class="mt-10 first-of-type:mt-0 mb-3 text-[1.375rem] font-bold tracking-tight text-primary font-heading italic leading-snug break-words w-full block">${hText}</div>`;
        return '';
      });

      // Extract paragraph breaks and forcefully strip all block tags to ensure inline rendering
      let hasP = false;
      text = text.replace(/<\/?(p|br|div)[^>]*>/gi, (match) => {
        if (!match.startsWith('</')) hasP = true;
        return '';
      });

      // Append in correct order
      if (heading) {
        html += heading;
      } else if (hasP) {
        // Visual paragraph break only if there is no heading
        html += `<div class="w-full h-4"></div>`; 
      }

      // Add verse number and text
      html += `<span class="inline"><sup class="text-[0.6875rem] font-sans font-normal text-muted ml-1 mr-1.5 relative -top-[0.4em] select-none">${v.verse}</sup><span class="inline">${text}</span> </span>`;
    });

    return html;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl animate-in fade-in duration-300"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="flex-1 overflow-y-auto overscroll-y-contain px-5 py-6"
        onScroll={handleScroll}
      >
        
        <div className="max-w-2xl mx-auto w-full mb-10 mt-2 relative flex items-start justify-between">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-glass-bg transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-secondary" />
          </button>
          <div className="flex flex-col items-center justify-center pt-1">
            <h2 className="text-4xl font-bold tracking-tight text-primary font-heading mb-2">
              {bookTitle} {chapter}
            </h2>
            <span className="text-[0.6875rem] font-bold text-accent tracking-widest uppercase bg-accent/10 px-2.5 py-0.5 rounded-full">
              LSB Translation
            </span>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`p-2 -mr-2 rounded-full transition-colors ${showOptions ? 'bg-glass-bg text-primary' : 'hover:bg-glass-bg text-secondary'}`}
              title="Reading Options"
            >
              <Type className="w-5 h-5" />
            </button>
            
            {showOptions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 bg-card-elevated border border-glass-border rounded-2xl shadow-2xl z-50 overflow-hidden p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">Text Size</span>
                    <div className="flex items-center gap-2 bg-card border border-card-border rounded-xl p-1">
                      <button 
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontSize: parseFloat(Math.max(0.85, state.settings.fontSize - 0.15).toFixed(2)) }})}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-glass-bg text-secondary hover:text-primary transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold w-8 text-center">{state.settings.fontSize.toFixed(2)}</span>
                      <button 
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontSize: parseFloat(Math.min(1.45, state.settings.fontSize + 0.15).toFixed(2)) }})}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-glass-bg text-secondary hover:text-primary transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="h-[1px] bg-card-border w-full" />
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <span className="text-sm font-bold text-primary block">Bionic Reading</span>
                      <span className="text-[0.625rem] text-secondary">Bold first letters</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.settings.bionicReading}
                      onChange={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { bionicReading: !state.settings.bionicReading }})}
                      className="w-4 h-4 accent-accent"
                    />
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-secondary">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <p className="text-sm font-medium">Loading scripture...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-red-400">
            <p>{error}</p>
            <button 
              onClick={onClose}
              className="px-4 py-2 mt-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto pb-32 select-text">
            <div 
              className="text-[20px] leading-[1.7] text-primary/95 font-sans tracking-[-0.01em] [&>div:first-child]:mt-0"
              dangerouslySetInnerHTML={{ __html: buildChapterHtml() }}
            />
          </div>
        )}
      </div>

      {/* Bottom Chapter Navigation Bar */}
      {!loading && !error && (
        <div className={`absolute bottom-0 left-0 w-full bg-background/80 backdrop-blur-xl z-10 transition-transform duration-300 ease-in-out ${isNavHidden ? 'translate-y-full' : 'translate-y-0'}`}>
          <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
            <button
              onClick={handlePrevChapter}
              disabled={!prevLabel}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-glass-bg text-secondary hover:text-primary"
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[120px]">{prevLabel || 'Start'}</span>
            </button>

            <span className="text-xs font-bold text-muted uppercase tracking-wider">
              Ch {chapter}
            </span>

            <button
              onClick={handleNextChapter}
              disabled={!nextLabel}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-glass-bg text-secondary hover:text-primary"
            >
              <span className="truncate max-w-[120px]">{nextLabel || 'End'}</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
