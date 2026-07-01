import { useState, useEffect } from 'react';
import { X, Loader2, BookOpen } from 'lucide-react';
import { OT_BOOKS } from '../data/otBooks';
import { NT_BOOKS } from '../data/ntBooks';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

interface OriginalWordModalProps {
  verseRef: { book: number; chapter: number; verse: number };
  onClose: () => void;
}

interface StrongsDefinition {
  lemma: string;
  xlit?: string;
  pron?: string;
  strongs_def: string;
  kjv_def: string;
  derivation?: string;
}

interface ParsedWord {
  english: string;
  strongs: string | null;
}

export function OriginalWordModal({ verseRef, onClose }: OriginalWordModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<ParsedWord[]>([]);
  const [dictionary, setDictionary] = useState<Record<string, StrongsDefinition>>({});

  const isOldTestament = verseRef.book <= 39;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // 1. Fetch KJV Chapter (which has Strong's embedded)
        const chapterRes = await fetch(`https://bolls.life/get-text/KJV/${verseRef.book}/${verseRef.chapter}/`);
        if (!chapterRes.ok) throw new Error('Failed to fetch KJV text for Strongs mapping');
        const chapterData = await chapterRes.json();
        
        // Find our specific verse
        const verseData = chapterData.find((v: any) => v.verse === verseRef.verse);
        if (!verseData) throw new Error('Verse not found in KJV text');

        // Parse HTML tags `<S>H1234</S>` and words
        const parsedWords = parseKjvStrongs(verseData.text, isOldTestament);
        setWords(parsedWords);

        // 2. Fetch the corresponding dictionary
        const dictUrl = isOldTestament ? '/strongs-hebrew.json' : '/strongs-greek.json';
        const dictRes = await fetch(dictUrl);
        if (!dictRes.ok) throw new Error('Failed to load Strongs dictionary. (Are the JSON files in the public directory?)');
        const dictData = await dictRes.json();
        setDictionary(dictData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [verseRef.book, verseRef.chapter, verseRef.verse, isOldTestament]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const bookName = ALL_BOOKS.find(b => b.id === (ALL_BOOKS[verseRef.book - 1]?.id))?.name || `Book ${verseRef.book}`;
  const fullVerse = words.map(w => w.english).join(' ');
  
  // Create an array with unique suffix keys for duplicate words so they render properly
  const studyWords = words.filter(w => w.strongs && dictionary[w.strongs]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur-xl animate-in fade-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-5 py-4 relative bg-card/80"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-glass-border to-transparent" />
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-accent" />
          <div>
            <h2 className="text-lg font-bold text-primary">Original Words</h2>
            <p className="text-sm text-secondary">
              {bookName} {verseRef.chapter}:{verseRef.verse}
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
      <div className="flex-1 overflow-y-auto pb-12">
        {error && (
          <div className="mx-5 mt-4 p-4 bg-red-900/20 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-secondary">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-accent" />
            <p className="text-sm">Loading original text and dictionaries...</p>
          </div>
        ) : !error && (
          <>
            {/* Full Verse Context */}
            <div className="px-6 py-5 bg-accent/5 border-b border-accent/10 mb-2">
              <p className="text-lg font-serif text-primary leading-relaxed">
                {fullVerse}
              </p>
            </div>

            {/* List of Definitions */}
            <div className="flex flex-col">
              {studyWords.length === 0 ? (
                <div className="py-16 text-center text-secondary px-6">
                  <p className="text-sm">No original word definitions found for this verse.</p>
                </div>
              ) : (
                studyWords.map((w, i) => {
                  const def = dictionary[w.strongs!];
                  return (
                    <div key={`${w.strongs}-${i}`} className="px-5 py-6 border-b border-glass-border last:border-b-0">
                      <div className="flex items-end justify-between mb-4">
                        <div className="flex-1 pr-4">
                          <span className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">
                            Translated as
                          </span>
                          <h3 className="text-2xl font-bold text-primary">
                            "{w.english}"
                          </h3>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <h2 className="text-4xl font-serif text-accent-light mb-1">
                            {def.lemma}
                          </h2>
                          <div className="text-sm text-secondary">
                            <span className="font-medium text-primary mr-1">{def.xlit}</span>
                            {def.pron && <span>/{def.pron}/</span>}
                          </div>
                        </div>
                      </div>

                      <div className="bg-card-elevated rounded-xl p-5 border border-card-border mt-4">
                        <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-2">Definition</h4>
                        <p className="text-base text-primary leading-relaxed">{def.strongs_def}</p>
                        
                        {def.derivation && (
                          <div className="mt-4">
                            <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-1">Derivation</h4>
                            <p className="text-sm text-secondary leading-relaxed">{def.derivation}</p>
                          </div>
                        )}
                        
                        {def.kjv_def && (
                          <div className="mt-4">
                            <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-1">KJV Translations</h4>
                            <p className="text-sm text-secondary italic">{def.kjv_def}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Parses the KJV HTML response which contains Strong's tags like:
 * "In the beginning<S>7225</S> God<S>430</S> created<S>1254</S>"
 * 
 * Returns an array of objects linking the English text to its Strong's number.
 */
function parseKjvStrongs(html: string, isOT: boolean): ParsedWord[] {
  // Bolls API sometimes includes superscript notes like <sup>...</sup>. 
  // Let's strip them out for clean parsing.
  const cleanHtml = html.replace(/<sup\b[^>]*>.*?<\/sup>/gi, '');
  
  // We can use a regex to match English text optionally followed by a <S> tag.
  // Pattern: (Any characters that aren't '<') followed by an optional <S> tag.
  const regex = /([^<]+)(?:<S>(\d+)<\/S>)?/g;
  let match;
  const words: ParsedWord[] = [];
  
  while ((match = regex.exec(cleanHtml)) !== null) {
    let englishText = match[1].trim();
    const strongsNumber = match[2];
    
    if (!englishText && !strongsNumber) continue;
    
    if (englishText) {
       const formattedStrongs = strongsNumber ? `${isOT ? 'H' : 'G'}${strongsNumber}` : null;
       
       words.push({
         english: englishText,
         strongs: formattedStrongs
       });
    }
  }
  
  return words;
}
