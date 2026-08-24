import React, { useState } from 'react';
import { Search, Check } from 'lucide-react';
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
      className="group flex flex-col w-full overflow-hidden rounded-lg text-left bg-card focus:outline-none focus:ring-2 focus:ring-accent transition-colors duration-150 border border-card-border hover:border-card-border-hover"
    >
      {/* Plate — mirrors ChapterAnchorCard's image treatment (Guides.tsx) so a book's
          illustration reads the same way its own chapters' do: art on top, caption below
          on the card's normal background, rather than text overlaid on the image. */}
      <div className="relative h-56 bg-card-elevated overflow-hidden">
        {!imgLoaded && !imgErr && (
          <div className="absolute inset-0 skeleton" />
        )}

        {!imgErr ? (
          <img
            src={book.image}
            alt={book.name}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgErr(true); setImgLoaded(true); }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-heading font-black opacity-10 select-none tracking-widest text-muted">{book.themeWord.charAt(0)}</span>
          </div>
        )}

        {/* Single badge — guide indicator, the only thing that still sits on the image */}
        {book.hasGuide && (
          <div className="absolute top-3 right-3 bg-black/60 px-2.5 py-1 rounded-md flex items-center gap-1">
            <Check className="w-2.5 h-2.5 text-white" />
            <span className="text-[0.625rem] font-bold text-white uppercase tracking-wide">Guide</span>
          </div>
        )}
      </div>

      {/* Caption — title, subtitle, and the meta line, all off the image now */}
      <div className="p-5 flex flex-col gap-1.5">
        <span className="font-heading font-semibold uppercase tracking-wide text-xs text-accent">{book.keyWord} · {book.themeWord} · {book.chapters} chapters</span>
        <h3 className="text-primary font-heading font-semibold text-2xl leading-tight">{book.name}</h3>
        <p className="text-secondary text-sm italic font-serif leading-snug">{book.subtitle}</p>
      </div>
    </button>
  );
};

// ─── Main BibleBrowser ────────────────────────────────────────────────────────

interface BibleBrowserProps {
  onOpenGuide: (guideId: string) => void;
  initialTestament?: 'OT' | 'NT';
}

type View = 'book-grid';

export const BibleBrowser: React.FC<BibleBrowserProps> = ({ onOpenGuide, initialTestament }) => {
  // Derived from the prop, not seeded into state: useState only reads its initial
  // value on mount, so once the host gained a testament switcher this component kept
  // rendering the testament it first mounted with — the header would say "New
  // Testament" while the page still listed all 39 Old Testament books. Nothing here
  // ever set it, so there was no reason for it to be state in the first place.
  const testament: 'OT' | 'NT' = initialTestament ?? 'NT';
  const [view] = useState<View>('book-grid');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectBook = (book: Book) => {
    onOpenGuide(book.id);
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
      {/* The back link and the "New/Old Testament" title used to live here; both are
          now in the host's fixed header, so they stay put instead of scrolling away
          and aren't rendered twice. Only the count caption remains for context. */}
      <div className="flex flex-col gap-4 mb-2">
        <p className="text-secondary text-sm">
          {testament === 'NT' ? '27 books' : '39 books'} — tap any to explore
        </p>

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
            className="w-full bg-card border border-card-border rounded-md pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors text-primary placeholder:text-muted shadow-sm"
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
              <p className="text-xs font-bold text-muted uppercase tracking-widest border-b border-card-border pb-1">
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
                <div className="flex items-center gap-2 border-b border-card-border pb-1">
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
                <div className="flex items-center gap-2 border-b border-card-border pb-1">
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
