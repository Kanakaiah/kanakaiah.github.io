import { useCallback, useState, useEffect } from 'react';
import { Loader2, BookOpen } from 'lucide-react';
import { OT_BOOKS } from '../data/otBooks';
import { NT_BOOKS } from '../data/ntBooks';
import { Modal } from './ui/Modal';
import { StrongsEntry } from './strongs/StrongsEntry';
import { StrongsOccurrencesModal } from './StrongsOccurrencesModal';
import { useStrongsOccurrences } from './strongs/useStrongsOccurrences';
import { loadStrongsDictionary, type StrongsDefinition, type StrongsDictionary } from '../utils/strongs';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

interface OriginalWordModalProps {
  verseRef: { book: number; chapter: number; verse: number };
  onClose: () => void;
  onNavigateToVerse?: (bookId: string, chapter: number, verse: number) => void;
}

interface ParsedWord {
  english: string;
  strongs: string | null;
}

/**
 * Every original-language word in one verse, listed with its definition. Shares its
 * definition rendering and cross-reference handling with the reader's WordPopup; what's
 * local here is fetching the verse and the fullscreen list presentation.
 */
export function OriginalWordModal({ verseRef, onClose, onNavigateToVerse }: OriginalWordModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<ParsedWord[]>([]);
  const [dictionary, setDictionary] = useState<StrongsDictionary>({});

  const isOldTestament = verseRef.book <= 39;

  // This verse's own words resolve locally; a cross-reference into the other testament
  // falls through to the shared dictionary inside the hook.
  const resolveLemma = useCallback((ref: string) => dictionary[ref]?.lemma, [dictionary]);
  const { occurrence, loadingRef, openOccurrences, closeOccurrences } = useStrongsOccurrences(resolveLemma);

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
        setDictionary(await loadStrongsDictionary(isOldTestament ? 'H' : 'G'));
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

  const studyWords = words.filter(w => w.strongs && dictionary[w.strongs]);

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
                studyWords.map((w, i) => (
                  <StrongsEntry
                    key={`${w.strongs}-${i}`}
                    word={w.english}
                    definition={dictionary[w.strongs!] as StrongsDefinition}
                    layout="card"
                    onRefClick={openOccurrences}
                    loadingRef={loadingRef}
                    onViewOccurrences={() => openOccurrences(w.strongs!)}
                  />
                ))
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

      {occurrence && (
        <StrongsOccurrencesModal
          strongsNumber={occurrence.ref}
          lemma={occurrence.lemma}
          onClose={closeOccurrences}
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
