import React, { useState, useEffect } from 'react';
import { ArrowRight, Loader2, BookOpen } from 'lucide-react';
import { NT_BOOKS } from '../data/ntBooks';
import { OT_BOOKS } from '../data/otBooks';
import { BIBLE_VERSION_LABELS } from '../data/bibleMap';
import { useApp } from '../context/AppContext';
import { fetchVerseText } from '../utils/verseText';
import { isHebrewStrongs, strongsNumberPart } from '../utils/strongs';
import { Modal } from './ui/Modal';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

// What each occurrence looks like in the reader's own version, once asked for.
interface TranslatedVerse {
  version: string;
  loading: boolean;
  text?: string;
  error?: boolean;
}

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
  const { state } = useApp();
  const bibleVersion = state.settings.bibleVersion || 'LSB';
  const versionLabel = BIBLE_VERSION_LABELS[bibleVersion] || bibleVersion;

  // Keyed by "book-chapter-verse". The search itself has to stay on the KJV — it is the
  // only edition bolls tags with Strong's numbers, and those tags are what both locate
  // the occurrences and mark which English word renders the lemma. So the reader's
  // version is offered per verse instead, on request: a common word like H430 runs to
  // thousands of occurrences, and eagerly fetching a chapter for each would be a flood.
  const [translated, setTranslated] = useState<Record<string, TranslatedVerse>>({});

  // A version switch invalidates anything already shown in the previous one.
  useEffect(() => { setTranslated({}); }, [bibleVersion]);

  const showInSelectedVersion = async (occ: Occurrence) => {
    const key = `${occ.book}-${occ.chapter}-${occ.verse}`;
    if (translated[key]?.loading || translated[key]?.text) return;

    setTranslated(prev => ({ ...prev, [key]: { version: bibleVersion, loading: true } }));
    try {
      const text = await fetchVerseText(bibleVersion, {
        bookId: '',
        bollsId: occ.book,
        chapter: occ.chapter,
        verses: [occ.verse],
      });
      setTranslated(prev => ({ ...prev, [key]: { version: bibleVersion, loading: false, text } }));
    } catch {
      setTranslated(prev => ({ ...prev, [key]: { version: bibleVersion, loading: false, error: true } }));
    }
  };

  // G5547 -> 'G' is NT, 'H' is OT. Normalized because a reference arriving from a
  // dictionary cross-link is zero-padded (H02584), and the KJV tags it gets searched
  // against are not.
  const isOldTestament = isHebrewStrongs(strongsNumber);
  const numberPart = strongsNumberPart(strongsNumber);

  useEffect(() => {
    let mounted = true;

    const fetchOccurrences = async () => {
      setLoading(true);
      setError(null);
      try {
        // Searches for the Strong's tag itself (<S>746</S>), exact and whole-word.
        // A bare-number, fuzzy search — which this used to do — now matches nothing
        // useful on bolls: it scores against the English text and comes back either
        // empty or full of verses that don't contain the number at all.
        const query = encodeURIComponent(`<S>${numberPart}</S>`);
        const res = await fetch(`https://bolls.life/search/KJV/?search=${query}&match_case=true&match_whole=true`);
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

  // Process HTML safely
  const createMarkup = (html: string) => {
    // 0. Normalize the highlight wrapper. bolls marks the hit as <mark><S>746</S></mark>
    // now, but used to nest it the other way round; accept either so a future flip back
    // doesn't silently drop the highlight.
    let processed = html.replace(/<mark>\s*<S>(\d+)<\/S>\s*<\/mark>/g, '<S><mark>$1</mark></S>');

    // 1. Find occurrences where the Strong's number is marked.
    // We match the preceding English word, any whitespace/punctuation, and the marked <S> tag.
    processed = processed.replace(/([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF'-]+)([^a-zA-Z]*?)<S><mark>\d+<\/mark><\/S>/g, '<span class="text-accent bg-accent/20 px-1 rounded font-medium">$1</span>$2');
    
    // 2. Strip all Strong's numbers completely (e.g. <S>1234</S>) so they don't clutter the text.
    // We do NOT use the 'i' flag here because we don't want to accidentally match <span...> tags.
    processed = processed.replace(/<S>.*?<\/S>/g, '');
    
    // 3. Remove translator supplied formatting tags to keep the text clean
    processed = processed.replace(/<sup[^>]*>(.*?)<\/sup>/gi, '$1');
    processed = processed.replace(/<i[^>]*>(.*?)<\/i>/gi, '$1');
    
    return { __html: processed };
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="fullscreen"
      zIndexClass="z-[70]"
      icon={<BookOpen className="w-5 h-5 text-accent" />}
      title="Word Occurrences"
      subtitle={`${lemma} (${strongsNumber}) — ${loading ? '...' : occurrences.length} verses`}
    >
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
              // bolls numbers books 1-66 in canonical order, which is exactly the order
              // of OT_BOOKS followed by NT_BOOKS — so the number indexes straight in.
              const book = ALL_BOOKS[occ.book - 1];
              const bookName = book?.name || `Book ${occ.book}`;
              const bookIdForNav = book?.id || '';
              const translation = translated[`${occ.book}-${occ.chapter}-${occ.verse}`];

              return (
                <div 
                  key={occ.pk || idx}
                  className="bg-card-elevated border border-card-border rounded-md p-5 hover:border-accent/30 transition-colors"
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
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted">KJV</span>
                    {!translation && (
                      <button
                        onClick={() => showInSelectedVersion(occ)}
                        className="text-[0.625rem] font-bold uppercase tracking-wider text-accent hover:text-accent-light transition-colors"
                      >
                        Show in {versionLabel}
                      </button>
                    )}
                    {translation?.loading && (
                      <span className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-muted">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {versionLabel}
                      </span>
                    )}
                    {translation?.error && (
                      <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted">
                        {versionLabel} unavailable
                      </span>
                    )}
                  </div>
                  {translation?.text && (
                    <div className="mt-3 pt-3 border-t border-card-border">
                      <p className="text-lg text-secondary leading-relaxed font-serif">{translation.text}</p>
                      <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted">
                        {BIBLE_VERSION_LABELS[translation.version] || translation.version}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
