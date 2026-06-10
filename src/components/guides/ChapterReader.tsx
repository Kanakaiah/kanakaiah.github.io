import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';

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
    
    // Add centered chapter title to match YouVersion
    html += `
      <div class="w-full text-center mt-2 mb-8">
        <h1 class="text-[15px] font-bold tracking-[0.1em] uppercase text-primary">
          ${bookTitle} ${chapter}
        </h1>
        <div class="h-px bg-glass-border w-full mt-8"></div>
      </div>
    `;

    verses.forEach((v) => {
      let text = v.text;
      
      // Extract section headings
      let heading = '';
      text = text.replace(/<S>(.*?)<\/S>/g, (_, match) => {
        heading = `<div class="mt-10 mb-4 text-[22px] font-bold tracking-tight text-primary font-heading italic leading-snug">${match}</div>`;
        return '';
      });

      // Extract paragraph breaks
      let hasP = false;
      text = text.replace(/<p>/g, () => {
        hasP = true;
        return '';
      });

      // Append in correct order
      if (heading) {
        html += heading;
      }
      
      if (hasP) {
        // Visual paragraph break
        html += `<div class="w-full h-5"></div>`; 
      }

      // Add verse number and text
      html += `<span class="inline"><sup class="text-[12px] text-accent/80 font-bold ml-1.5 mr-1.5 relative -top-[0.4em] select-none">${v.verse}</sup><span class="inline">${text}</span> </span>`;
    });

    return html;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="sticky top-0 z-10 p-4 pb-0 bg-background/80 backdrop-blur-md border-b border-glass-border">
        <div className="flex items-center gap-3 pb-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-glass-bg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-secondary" />
          </button>
          <div className="flex items-baseline gap-2">
            <h2 className="text-[20px] font-bold tracking-tight text-primary font-heading">
              {bookTitle} {chapter}
            </h2>
            <span className="text-[11px] font-bold text-accent tracking-widest uppercase bg-accent/10 px-2 py-0.5 rounded-full">
              LSB
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-y-contain px-5 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-secondary">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <p className="text-sm font-medium">Loading scripture...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-red-400">
            <p>{error}</p>
            <button 
              onClick={onClose}
              className="px-4 py-2 mt-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto pb-24 pt-4">
            <div 
              className="text-[19px] leading-[1.8] text-primary/90 font-sans tracking-[-0.01em]"
              dangerouslySetInnerHTML={{ __html: buildChapterHtml() }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
