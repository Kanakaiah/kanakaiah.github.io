import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { NT_BOOKS } from '../../data/ntBooks';

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
      <div className="flex-1 overflow-y-auto overscroll-y-contain px-5 py-6">
        
        <div className="max-w-2xl mx-auto w-full mb-10 mt-2 relative">
          <button
            onClick={onClose}
            className="absolute left-0 top-0 p-2 -ml-2 rounded-full hover:bg-glass-bg transition-colors"
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
          <div className="max-w-2xl mx-auto pb-24 select-text">
            <div 
              className="text-[20px] leading-[1.7] text-primary/95 font-sans tracking-[-0.01em] [&>div:first-child]:mt-0"
              dangerouslySetInnerHTML={{ __html: buildChapterHtml() }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
