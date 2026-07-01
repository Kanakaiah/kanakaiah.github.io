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
  const [selectedStrongs, setSelectedStrongs] = useState<string | null>(null);

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
  const activeDef = selectedStrongs ? dictionary[selectedStrongs] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card-elevated border border-card-border shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-card-border bg-background/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-lg text-accent-light">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif text-primary">
                Original Language Study
              </h2>
              <p className="text-sm text-secondary font-medium">
                {bookName} {verseRef.chapter}:{verseRef.verse}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-secondary hover:text-primary hover:bg-card-border rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-secondary">Loading original text and dictionaries...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          ) : (
            <>
              {/* Interlinear View */}
              <div className="bg-background/30 rounded-xl p-6 border border-card-border">
                <h3 className="text-sm font-bold text-accent uppercase tracking-wider mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  Interlinear Translation (KJV)
                </h3>
                
                <div className="flex flex-wrap gap-x-6 gap-y-8 leading-loose rtl-support">
                  {words.map((w, i) => (
                    <div 
                      key={i} 
                      className={`flex flex-col items-center group ${w.strongs ? 'cursor-pointer' : ''}`}
                      onClick={() => w.strongs && setSelectedStrongs(w.strongs)}
                    >
                      <span className={`text-xl font-serif mb-1 ${w.strongs === selectedStrongs ? 'text-accent-light' : 'text-secondary group-hover:text-primary transition-colors'}`}>
                        {w.strongs ? (dictionary[w.strongs]?.lemma || '---') : '---'}
                      </span>
                      <span className={`text-[11px] font-mono mb-2 px-1.5 py-0.5 rounded ${w.strongs ? 'bg-card-border/50 text-secondary' : 'opacity-0'}`}>
                        {w.strongs || '---'}
                      </span>
                      <span className={`text-base font-medium ${w.strongs === selectedStrongs ? 'text-accent underline underline-offset-4 decoration-accent/50' : 'text-primary'}`}>
                        {w.english}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dictionary Definition */}
              <div className={`transition-all duration-300 ease-out ${activeDef ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                {activeDef && (
                  <div className="bg-gradient-to-br from-card to-background border border-card-border rounded-xl p-6 shadow-lg relative overflow-hidden">
                    {/* Decorative background element */}
                    <div className="absolute -right-10 -top-10 text-9xl text-accent/5 font-serif select-none pointer-events-none">
                      {activeDef.lemma}
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 relative z-10">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-end gap-4 border-b border-card-border/50 pb-4">
                          <h1 className="text-5xl font-serif text-accent-light">{activeDef.lemma}</h1>
                          <div className="mb-2">
                            <span className="text-lg text-primary font-medium mr-3">{activeDef.xlit}</span>
                            <span className="text-sm text-secondary">/{activeDef.pron}/</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-2">Definition</h4>
                          <p className="text-lg text-primary leading-relaxed">{activeDef.strongs_def}</p>
                        </div>
                        
                        {activeDef.derivation && (
                          <div>
                            <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-2">Derivation</h4>
                            <p className="text-sm text-secondary leading-relaxed">{activeDef.derivation}</p>
                          </div>
                        )}
                        
                        {activeDef.kjv_def && (
                          <div>
                            <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-2">KJV Translation Count</h4>
                            <p className="text-sm text-secondary italic">{activeDef.kjv_def}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {!activeDef && (
                <div className="text-center text-secondary py-10 opacity-50 font-medium">
                  Click on any word above to view its original {isOldTestament ? 'Hebrew' : 'Greek'} definition.
                </div>
              )}
            </>
          )}
        </div>
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
    
    // We might have multiple words clumped in `englishText` if there were no tags, 
    // but typically Bolls groups the phrase that belongs to the Strong's number together.
    // If englishText is just punctuation, we might merge it or keep it separate.
    if (englishText) {
       // Add the appropriate H or G prefix for our JSON dictionary keys
       const formattedStrongs = strongsNumber ? `${isOT ? 'H' : 'G'}${strongsNumber}` : null;
       
       // Handle some cleanup for punctuation attached to words
       words.push({
         english: englishText,
         strongs: formattedStrongs
       });
    }
  }
  
  return words;
}
