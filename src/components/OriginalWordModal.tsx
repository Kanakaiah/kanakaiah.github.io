import { useState, useEffect } from 'react';
import { Loader2, BookOpen, ArrowRight } from 'lucide-react';
import { OT_BOOKS } from '../data/otBooks';
import { NT_BOOKS } from '../data/ntBooks';
import { Modal } from './ui/Modal';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

interface OriginalWordModalProps {
  verseRef: { book: number; chapter: number; verse: number };
  onClose: () => void;
  onNavigateToVerse?: (bookId: string, chapter: number, verse: number) => void;
}

interface StrongsDefinition {
  lemma: string;
  xlit?: string;
  pron?: string;
  strongs_def: string;
  kjv_def: string;
  derivation?: string;
  pos?: string;
}

interface ParsedWord {
  english: string;
  strongs: string | null;
}

import { StrongsOccurrencesModal } from './StrongsOccurrencesModal';
import { loadStrongsDictionary, normalizeStrongsRef, type StrongsDictionary as Dictionary } from '../utils/strongs';

export function OriginalWordModal({ verseRef, onClose, onNavigateToVerse }: OriginalWordModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<ParsedWord[]>([]);
  // Keyed by reference prefix ('H' / 'G'). A verse only needs its own testament's
  // dictionary to render, but Greek entries cite Hebrew origins for proper nouns
  // (Anna, G451 -> H2584), and following one of those needs the other dictionary too.
  const [dictionaries, setDictionaries] = useState<Record<string, Dictionary>>({});
  const [viewingOccurrences, setViewingOccurrences] = useState<string | null>(null);
  const [loadingRef, setLoadingRef] = useState<string | null>(null);

  const isOldTestament = verseRef.book <= 39;

  const lookupDefinition = (ref: string | null): StrongsDefinition | undefined =>
    ref ? dictionaries[ref.charAt(0)]?.[ref] : undefined;

  // Every G####/H#### in a definition is clickable. Following one used to do nothing
  // whenever it pointed at the other testament — the dictionary holding it wasn't
  // loaded, so the guard below never opened the modal.
  const openOccurrences = async (rawRef: string) => {
    const ref = normalizeStrongsRef(rawRef);
    const prefix = ref.charAt(0);

    if (!dictionaries[prefix]) {
      setLoadingRef(ref);
      try {
        const data = await loadStrongsDictionary(prefix);
        setDictionaries(prev => ({ ...prev, [prefix]: data }));
      } catch {
        setLoadingRef(null);
        return;
      }
      setLoadingRef(null);
    }

    setViewingOccurrences(ref);
  };

  // Helper to format Strong's references in text
  const formatStrongsRefs = (text: string) => {
    if (!text) return null;
    // Match G1234, H1234, or G1234 (word)
    const regex = /([GH]\d+)(?:\s*\([^)]+\))?/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
      }
      const strongsRef = match[1];
      const isLoading = loadingRef === normalizeStrongsRef(strongsRef);
      parts.push(
        <span
          key={`ref-${match.index}`}
          className={`text-accent font-medium cursor-pointer hover:underline ${isLoading ? 'opacity-50' : ''}`}
          onClick={() => openOccurrences(strongsRef)}
        >
          {match[0]}
        </span>
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
    }
    return parts;
  };

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

        // 2. Fetch this testament's dictionary
        const prefix = isOldTestament ? 'H' : 'G';
        const dictData = await loadStrongsDictionary(prefix);
        setDictionaries(prev => ({ ...prev, [prefix]: dictData }));

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [verseRef.book, verseRef.chapter, verseRef.verse, isOldTestament]);

  // bolls numbers books 1-66 in canonical order, matching OT_BOOKS then NT_BOOKS.
  const bookName = ALL_BOOKS[verseRef.book - 1]?.name || `Book ${verseRef.book}`;
  const fullVerse = words.map(w => w.english).join(' ');

  // Create an array with unique suffix keys for duplicate words so they render properly
  const studyWords = words.filter(w => lookupDefinition(w.strongs));

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="fullscreen"
      icon={<BookOpen className="w-5 h-5 text-accent" />}
      title="Original Words"
      subtitle={`${bookName} ${verseRef.chapter}:${verseRef.verse}`}
    >
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
                  const def = lookupDefinition(w.strongs)!;
                  return (
                    <div key={`${w.strongs}-${i}`} className="px-5 py-6 border-b border-card-border last:border-b-0">
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

                      <div className="bg-card-elevated rounded-md p-5 border border-card-border mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-xs uppercase tracking-wider text-accent font-bold">Definition</h4>
                          {def.pos && (
                            <span className="bg-accent/15 text-accent text-[0.65rem] font-bold px-2 py-0.5 rounded-full uppercase">
                              {def.pos}
                            </span>
                          )}
                        </div>
                        <p className="text-base text-primary leading-relaxed">
                          {formatStrongsRefs(def.strongs_def)}
                        </p>
                        
                        {def.derivation && (
                          <div className="mt-4">
                            <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-1">Derivation</h4>
                            <p className="text-sm text-secondary leading-relaxed">
                              {formatStrongsRefs(def.derivation)}
                            </p>
                          </div>
                        )}
                        
                        {def.kjv_def && (
                          <div className="mt-4">
                            <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-1">KJV Translations</h4>
                            <p className="text-sm text-secondary italic">{def.kjv_def}</p>
                          </div>
                        )}

                        <button
                          onClick={() => openOccurrences(w.strongs!)}
                          className="mt-6 w-full py-3 bg-accent/10 hover:bg-accent/20 text-accent hover:text-accent-light rounded-md font-bold tracking-wide transition-colors flex items-center justify-center gap-2"
                        >
                          View all occurrences
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
        <div className="mt-8 text-center px-6 mb-4">
          <p className="text-[0.625rem] text-muted italic">
            Definitions from Strong's Exhaustive Concordance (1890)
          </p>
        </div>
      </div>

      {viewingOccurrences && lookupDefinition(viewingOccurrences) && (
        <StrongsOccurrencesModal
          strongsNumber={viewingOccurrences}
          lemma={lookupDefinition(viewingOccurrences)!.lemma}
          onClose={() => setViewingOccurrences(null)}
          onNavigateToVerse={onNavigateToVerse || (() => {})}
        />
      )}
    </Modal>
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
