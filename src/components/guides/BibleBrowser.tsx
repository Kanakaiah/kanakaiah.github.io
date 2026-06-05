import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Lock } from 'lucide-react';
import { NT_BOOKS, NT_SECTIONS } from '../../data/ntBooks';
import type { NTBook } from '../../data/ntBooks';
import { NT_STUDY_GUIDES } from '../../data/guides';

// ─── Book Card ────────────────────────────────────────────────────────────────

const BookCard: React.FC<{ book: NTBook; onClick: () => void }> = ({ book, onClick }) => {
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl h-40 text-left focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl shadow-md"
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

      {/* Dark overlay — heavier on left for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20" />
      {/* Extra bottom fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

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

      {/* Bottom-right — chapter count */}
      <div className="absolute bottom-3 right-4">
        <span className="text-white/50 text-xs font-medium">{book.chapters} chapters</span>
      </div>

      {/* Left — all text overlaid on image */}
      <div className="absolute inset-0 flex flex-col justify-center pl-5 pr-32 gap-1">
        <span className="text-[11px] font-black tracking-[0.2em] text-sky-300 uppercase">{book.keyWord}</span>
        <h3 className="text-white font-heading font-bold text-2xl leading-tight">{book.name}</h3>
        <p className="text-white/70 text-sm italic leading-snug">{book.subtitle}</p>
      </div>
    </button>
  );
};

// ─── Chapter View ─────────────────────────────────────────────────────────────

const ChapterView: React.FC<{
  book: NTBook;
  onBack: () => void;
  onSelectGuide: (guideId: string) => void;
}> = ({ book, onBack, onSelectGuide }) => {
  const [imgErr, setImgErr] = useState(false);
  const guide: any = NT_STUDY_GUIDES.find((g: any) => g.id === book.id && g.type === 'book-guide');

  return (
    <div className="flex flex-col gap-5 animate-[fadeIn_0.25s_ease-out]">

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl h-44">
        {!imgErr ? (
          <img src={book.image} alt={book.name} onError={() => setImgErr(true)} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>

        {/* Book identity */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.2em] text-sky-300 uppercase mb-0.5">{book.keyWord}</p>
              <h2 className="text-2xl font-bold font-heading text-white leading-none">{book.name}</h2>
              <p className="text-white/70 text-sm italic mt-1">{book.subtitle}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[9px] font-black tracking-widest text-amber-300 uppercase">{book.themeWord}</p>
              <p className="text-white/50 text-xs">{book.chapters} chapters</p>
            </div>
          </div>
        </div>
      </div>

      {/* Structure blocks */}
      {guide?.blocks && (
        <div className="bg-glass-bg border border-glass-border rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs font-bold text-muted uppercase tracking-widest">Book Structure</p>
          {guide.structureFormula && (
            <p className="text-xs text-muted font-mono">{guide.structureFormula}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-1">
            {guide.blocks.map((block: any, i: number) => (
              <div key={i} className="flex flex-col bg-accent/10 border border-accent/20 rounded-xl px-3 py-2">
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{block.label}</span>
                <span className="text-xs text-muted mt-0.5">Ch. {block.chapters}</span>
                {block.description && <span className="text-[10px] text-secondary mt-0.5">{block.description}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapter grid */}
      <div>
        <p className="text-xs font-bold text-muted uppercase tracking-widest mb-3">
          {guide ? 'Chapters — click any to open guide' : 'Chapters'}
        </p>
        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map(ch => {
            const anchor = guide?.anchors?.find((a: any) => a.ch === ch);
            return (
              <button
                key={ch}
                onClick={() => guide && onSelectGuide(book.id)}
                title={anchor ? `${anchor.word} — ${anchor.scene}` : `Chapter ${ch}`}
                disabled={!guide}
                className={`relative flex flex-col items-center justify-center rounded-xl py-2 px-1 border transition-all duration-150
                  ${anchor
                    ? 'bg-accent/10 border-accent/30 hover:bg-accent/20 hover:border-accent/60 cursor-pointer hover:scale-105'
                    : guide
                    ? 'bg-glass-bg border-glass-border hover:bg-glass-bg-hover cursor-pointer'
                    : 'bg-glass-bg border-glass-border opacity-60 cursor-default'
                  }`}
              >
                <span className="text-sm font-bold text-primary">{ch}</span>
                {anchor && (
                  <span className="text-[8px] font-bold text-accent uppercase tracking-wide mt-0.5 truncate w-full text-center">{anchor.word}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Open full guide CTA */}
      {guide ? (
        <button
          onClick={() => onSelectGuide(book.id)}
          className="flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-all hover:shadow-lg hover:scale-[1.01]"
        >
          <BookOpen className="w-4 h-4" />
          Open Full Chapter Guide
        </button>
      ) : (
        <div className="flex items-center gap-3 py-3 px-4 rounded-2xl bg-glass-bg border border-glass-border text-secondary text-sm">
          <Lock className="w-4 h-4 flex-shrink-0 text-muted" />
          <span>Detailed chapter guide for <strong className="text-primary">{book.name}</strong> is coming soon.</span>
        </div>
      )}

      {/* Key verses */}
      {guide?.keyVerses && (
        <div className="bg-glass-bg border border-glass-border rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-xs font-bold text-muted uppercase tracking-widest">Key Verses</p>
          {guide.keyVerses.map((kv: any, i: number) => (
            <div key={i} className="flex gap-3 items-start border-l-2 border-accent/40 pl-3">
              <div>
                <span className="font-bold text-accent text-sm block">{kv.ref}</span>
                <span className="text-secondary text-sm italic">{kv.theme}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Memory sentence */}
      {guide?.memorySentence && (
        <div className="bg-glass-bg border border-glass-border rounded-2xl p-4">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Memory Sentence</p>
          <p className="text-primary text-sm leading-relaxed italic">{guide.memorySentence}</p>
        </div>
      )}
    </div>
  );
};

// ─── Main BibleBrowser ────────────────────────────────────────────────────────

interface BibleBrowserProps {
  onOpenGuide: (guideId: string) => void;
  onBack: () => void;
}

type View = 'testament-select' | 'book-grid' | 'chapter-view';

export const BibleBrowser: React.FC<BibleBrowserProps> = ({ onOpenGuide, onBack }) => {
  const [testament, setTestament] = useState<'OT' | 'NT' | null>(null);
  const [selectedBook, setSelectedBook] = useState<NTBook | null>(null);
  const [view, setView] = useState<View>('testament-select');

  const handleSelectTestament = (t: 'OT' | 'NT') => {
    setTestament(t);
    setView('book-grid');
  };

  const handleSelectBook = (book: NTBook) => {
    setSelectedBook(book);
    setView('chapter-view');
  };

  const handleBackFromChapters = () => {
    setSelectedBook(null);
    setView('book-grid');
  };

  const handleBackFromGrid = () => {
    setTestament(null);
    setView('testament-select');
  };

  return (
    <div className="flex flex-col gap-5 w-full animate-[fadeIn_0.25s_ease-out]">

      {/* ── Testament Select ────────────────────────────────────────────────── */}
      {view === 'testament-select' && (
        <>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-glass-bg border border-glass-border hover:bg-glass-bg-hover transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-xl font-bold font-heading text-primary">Bible Browser</h2>
              <p className="text-secondary text-sm">Choose a testament to explore</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {/* OT Card */}
            <button
              onClick={() => handleSelectTestament('OT')}
              className="group relative overflow-hidden rounded-3xl p-8 border border-glass-border bg-glass-bg hover:bg-glass-bg-hover transition-all duration-200 hover:scale-[1.02] text-left shadow-md"
            >
              <div className="text-5xl mb-4">📜</div>
              <h3 className="text-2xl font-bold font-heading text-primary">Old Testament</h3>
              <p className="text-secondary text-sm mt-1">39 books · Genesis to Malachi</p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
                Coming Soon
              </div>
            </button>

            {/* NT Card */}
            <button
              onClick={() => handleSelectTestament('NT')}
              className="group relative overflow-hidden rounded-3xl p-8 border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-all duration-200 hover:scale-[1.02] text-left shadow-md"
            >
              <div className="text-5xl mb-4">✝️</div>
              <h3 className="text-2xl font-bold font-heading text-primary">New Testament</h3>
              <p className="text-secondary text-sm mt-1">27 books · Matthew to Revelation</p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-bold uppercase tracking-wider">
                Explore Now →
              </div>
            </button>
          </div>
        </>
      )}

      {/* ── NT Book Grid ─────────────────────────────────────────────────────── */}
      {view === 'book-grid' && testament === 'NT' && (
        <>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackFromGrid}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-glass-bg border border-glass-border hover:bg-glass-bg-hover transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-xl font-bold font-heading text-primary">New Testament</h2>
              <p className="text-secondary text-sm">27 books — tap any to explore</p>
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
          <div className="flex items-center gap-3">
            <button onClick={handleBackFromGrid} className="w-9 h-9 rounded-full flex items-center justify-center bg-glass-bg border border-glass-border hover:bg-glass-bg-hover transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold font-heading text-primary">Old Testament</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="text-6xl">📜</div>
            <h3 className="text-2xl font-bold font-heading text-primary">Coming Soon</h3>
            <p className="text-secondary max-w-xs text-sm">Old Testament book guides with visual chapter maps are being crafted. Check back soon!</p>
          </div>
        </>
      )}

      {/* ── Chapter View ─────────────────────────────────────────────────────── */}
      {view === 'chapter-view' && selectedBook && (
        <ChapterView
          book={selectedBook}
          onBack={handleBackFromChapters}
          onSelectGuide={onOpenGuide}
        />
      )}
    </div>
  );
};
