import React, { useState } from 'react';
import { ChevronLeft, Search, Check } from 'lucide-react';
import { NT_BOOKS, NT_SECTIONS, type NTBook } from '../../data/ntBooks';
import { OT_BOOKS, OT_SECTIONS, type OTBook } from '../../data/otBooks';

type Book = NTBook | OTBook;

// ─── Book Card ────────────────────────────────────────────────────────────────

export const BookCard: React.FC<{ book: Book; onClick: () => void }> = ({ book, onClick }) => {
  const [imgErr, setImgErr] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl h-56 text-left focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl shadow-md"
    >
      {/* Skeleton shimmer shown while image is loading */}
      {!imgLoaded && !imgErr && (
        <div className="absolute inset-0 skeleton" />
      )}

      {/* Full-bleed background image with fade-in on load */}
      {!imgErr ? (
        <img
          src={book.image}
          alt={book.name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => { setImgErr(true); setImgLoaded(true); }}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
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
        <span className="text-[0.625rem] font-black tracking-widest text-amber-300 uppercase">{book.themeWord}</span>
      </div>

      {/* Top-left — guide badge with proper Check icon */}
      {book.hasGuide && (
        <div className="absolute top-3 left-3 bg-accent/80 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
          <Check className="w-2.5 h-2.5 text-white" />
          <span className="text-[0.625rem] font-bold text-white uppercase tracking-wide">Guide</span>
        </div>
      )}

      {/* Bottom-right — chapter count with "chs" label */}
      <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm border border-white/20 px-2.5 py-1 rounded-full">
        <span className="text-[0.625rem] font-black tracking-widest text-amber-300 uppercase">{book.chapters} chs</span>
      </div>

      {/* Bottom — all text overlaid on image */}
      <div className="absolute inset-0 flex flex-col justify-end pl-5 pr-32 pb-5 gap-1">
        <span className="text-[0.6875rem] font-black tracking-[0.2em] text-sky-300 uppercase">{book.keyWord}</span>
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
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectBook = (book: Book) => {
    onOpenGuide(book.id);
  };

  const handleBackFromGrid = () => {
    onBack();
  };

  const ALL_BOOKS: Book[] = [...OT_BOOKS, ...NT_BOOKS];
  const isSearching = searchQuery.trim().length > 0;

  // When searching, merge both testaments and filter across all books
  const searchResults = isSearching
    ? ALL_BOOKS.filter(b => {
        const q = searchQuery.toLowerCase();
        return b.name.toLowerCase().includes(q) || b.themeWord.toLowerCase().includes(q) || b.keyWord.toLowerCase().includes(q);
      })
    : [];

  return (
    <div className="flex flex-col gap-5 w-full animate-[fadeIn_0.25s_ease-out]">

      {/* ── Shared Search Bar (always visible at top) ─────────────────── */}
      <div className="flex flex-col gap-4 mb-2">
        <button
          onClick={handleBackFromGrid}
          className="flex items-center gap-1 -ml-2 text-accent hover:text-accent-hover transition-colors font-medium text-[0.9375rem] self-start"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Guides</span>
        </button>
        <div>
          <h2 className="text-3xl font-bold font-heading text-primary">
            {testament === 'NT' ? 'New Testament' : 'Old Testament'}
          </h2>
          <p className="text-secondary text-sm mt-1">
            {testament === 'NT' ? '27 books' : '39 books'} — tap any to explore
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-muted" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all 66 books..."
            className="w-full bg-card border border-card-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all text-primary placeholder:text-muted shadow-sm"
          />
        </div>
      </div>

      {/* ── Cross-Testament Search Results ───────────────────────────── */}
      {isSearching && (
        <>
          {searchResults.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No books found for "{searchQuery}"</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-muted uppercase tracking-widest border-b border-glass-border pb-1">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} across all books
              </p>
              <div className="flex flex-col gap-2">
                {searchResults.map(book => (
                  <BookCard key={book.id} book={book} onClick={() => handleSelectBook(book)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── NT Book Grid ─────────────────────────────────────────────────────── */}
      {!isSearching && view === 'book-grid' && testament === 'NT' && (
        <>
          {NT_SECTIONS.map(section => {
            const q = searchQuery.toLowerCase();
            const books = NT_BOOKS.filter(b => b.section === section && (b.name.toLowerCase().includes(q) || b.themeWord.toLowerCase().includes(q) || b.keyWord.toLowerCase().includes(q)));
            if (!books.length) return null;
            return (
              <div key={section} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-glass-border pb-1">
                  <p className="text-xs font-bold text-muted uppercase tracking-widest">{section}</p>
                  <span className="text-[0.625rem] text-muted">· {books.length} book{books.length !== 1 ? 's' : ''}</span>
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

      {/* ── OT Book Grid ─────────────────────────────────────────────────────── */}
      {!isSearching && view === 'book-grid' && testament === 'OT' && (
        <>
          {OT_SECTIONS.map(section => {
            const q = searchQuery.toLowerCase();
            const books = OT_BOOKS.filter(b => b.section === section && (b.name.toLowerCase().includes(q) || b.themeWord.toLowerCase().includes(q) || b.keyWord.toLowerCase().includes(q)));
            if (!books.length) return null;
            return (
              <div key={section} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-glass-border pb-1">
                  <p className="text-xs font-bold text-muted uppercase tracking-widest">{section}</p>
                  <span className="text-[0.625rem] text-muted">· {books.length} book{books.length !== 1 ? 's' : ''}</span>
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

    </div>
  );
};
