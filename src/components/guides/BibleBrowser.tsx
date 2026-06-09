import React, { useState } from 'react';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { NT_BOOKS, NT_SECTIONS } from '../../data/ntBooks';
import type { NTBook } from '../../data/ntBooks';

// ─── Book Card ────────────────────────────────────────────────────────────────

const BookCard: React.FC<{ book: NTBook; onClick: () => void }> = ({ book, onClick }) => {
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl h-56 text-left focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl shadow-md"
    >
      {/* Full-bleed background image */}
      {!imgErr ? (
        <img
          src={book.image}
          alt={book.name}
          onError={() => setImgErr(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center">
          <span className="text-6xl font-black opacity-10 select-none tracking-widest">{book.themeWord.charAt(0)}</span>
        </div>
      )}

      {/* Subtle bottom fade for text legibility — keeping top 60% of image crystal clear */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Top-right — theme word badge */}
      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm border border-white/20 px-2.5 py-1 rounded-full">
        <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">{book.themeWord}</span>
      </div>

      {/* Top-left — guide badge */}
      {book.hasGuide && (
        <div className="absolute top-3 left-3 bg-accent/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
          <span className="text-[10px] font-bold text-white uppercase tracking-wide">Guide ✓</span>
        </div>
      )}

      {/* Bottom-right — chapter count styled like theme word badge */}
      <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm border border-white/20 px-2.5 py-1 rounded-full">
        <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">{book.chapters}</span>
      </div>

      {/* Bottom — all text overlaid on image */}
      <div className="absolute inset-0 flex flex-col justify-end pl-5 pr-32 pb-5 gap-1">
        <span className="text-[11px] font-black tracking-[0.2em] text-sky-300 uppercase">{book.keyWord}</span>
        <h3 className="text-white font-heading font-bold text-2xl leading-tight">{book.name}</h3>
        <p className="text-white/70 text-sm italic leading-snug">{book.subtitle}</p>
      </div>
    </button>
  );
};

// ─── Main BibleBrowser ────────────────────────────────────────────────────────

interface BibleBrowserProps {
  onOpenGuide: (guideId: string) => void;
  onBack: () => void;
  initialTestament?: 'OT' | 'NT';
}

type View = 'book-grid';

export const BibleBrowser: React.FC<BibleBrowserProps> = ({ onOpenGuide, onBack, initialTestament }) => {
  const [testament] = useState<'OT' | 'NT' | null>(initialTestament ?? 'NT');
  const [view] = useState<View>('book-grid');

  const handleSelectBook = (book: NTBook) => {
    onOpenGuide(book.id);
  };

  const handleBackFromGrid = () => {
    onBack();
  };

  return (
    <div className="flex flex-col gap-5 w-full animate-[fadeIn_0.25s_ease-out]">

      {/* ── NT Book Grid ─────────────────────────────────────────────────────── */}
      {view === 'book-grid' && testament === 'NT' && (
        <>
          <div className="flex flex-col gap-4 mb-2">
            <button
              onClick={handleBackFromGrid}
              className="flex items-center gap-1 -ml-2 text-accent hover:text-accent-hover transition-colors font-medium text-[15px] self-start"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Guides</span>
            </button>
            <div>
              <h2 className="text-3xl font-bold font-heading text-primary">New Testament</h2>
              <p className="text-secondary text-sm mt-1">27 books — tap any to explore</p>
            </div>
          </div>

          {NT_SECTIONS.map(section => {
            const books = NT_BOOKS.filter(b => b.section === section);
            if (!books.length) return null;
            return (
              <div key={section} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-glass-border pb-1">
                  <p className="text-xs font-bold text-muted uppercase tracking-widest">{section}</p>
                  <span className="text-[10px] text-muted">· {books.length} book{books.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {books.map(book => (
                    <BookCard key={book.id} book={book} onClick={() => handleSelectBook(book)} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── OT Coming Soon ───────────────────────────────────────────────────── */}
      {view === 'book-grid' && testament === 'OT' && (
        <>
          <div className="flex flex-col gap-4 mb-2">
            <button onClick={handleBackFromGrid} className="flex items-center gap-1 -ml-2 text-accent hover:text-accent-hover transition-colors font-medium text-[15px] self-start">
              <ChevronLeft className="w-5 h-5" />
              <span>Guides</span>
            </button>
            <h2 className="text-3xl font-bold font-heading text-primary">Old Testament</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="text-6xl">📜</div>
            <h3 className="text-2xl font-bold font-heading text-primary">Coming Soon</h3>
            <p className="text-secondary max-w-xs text-sm">Old Testament book guides with visual chapter maps are being crafted. Check back soon!</p>
          </div>
        </>
      )}

    </div>
  );
};
