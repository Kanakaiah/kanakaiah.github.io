import React, { useState, useEffect } from 'react';
import { ArrowRight, Loader2, BookOpen } from 'lucide-react';
import { NT_BOOKS } from '../../data/ntBooks';
import { OT_BOOKS } from '../../data/otBooks';
import { BIBLE_VERSION_LABELS, normalizeCrossRefKey } from '../../data/bibleMap';
import { CROSS_REFS_URL } from '../../data/crossRefsUrl';
import { fetchVerseText, parseVerseRef } from '../../utils/verseText';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

interface CrossReferenceModalProps {
  verseRefs: string[];
  onClose: () => void;
  // fromRef is the exact "book chapter:verse" string (matching one of verseRefs) that
  // the clicked reference was listed under — callers need this to know which verse to
  // treat as "where the user came from" when multiple verses are shown at once.
  onNavigateToVerse: (bookId: string, chapter: number, verse: number, fromRef: string) => void;
  // Reuse the host's already-fetched cross-reference database instead of re-fetching
  // the (multi-MB) file every time this modal opens.
  crossRefMap?: Record<string, string[]> | null;
}

interface CrossRefData {
  refStr: string;
  bookName: string;
  chapter: number;
  verse: number;
  /** End of a ranged reference ("Luke 2:4-7"); absent for a single verse. */
  endVerse?: number;
  text?: string;
  loading: boolean;
  error?: string;
}

interface VerseGroup {
  parentRef: string;
  refs: CrossRefData[];
}

export const CrossReferenceModal: React.FC<CrossReferenceModalProps> = ({ verseRefs, onClose, onNavigateToVerse, crossRefMap }) => {
  const [groups, setGroups] = useState<VerseGroup[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { state } = useApp();
  const bibleVersion = state.settings.bibleVersion || 'LSB';

  const capitalize = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  useEffect(() => {
    let mounted = true;

    const loadRefs = async () => {
      setLoadingRefs(true);
      try {
        const data = crossRefMap ?? await fetch(CROSS_REFS_URL).then(res => {
          if (!res.ok) throw new Error('Failed to load cross references database');
          return res.json();
        });

        const verseGroups: VerseGroup[] = [];
        const allParsedRefs: CrossRefData[] = [];

        for (const vRef of verseRefs) {
          // Normalized only for the lookup — vRef stays in its display form so the
          // modal's subtitle still reads "1 Samuel 3:10" rather than "1samuel 3:10".
          const related = data[normalizeCrossRefKey(vRef)] || [];
          const parsedRefs = related.map((ref: string) => {
            // The trailing range is optional: OpenBible contributes single verses, while
            // TSKe cites passages ("Luke 2:4-7"). Without the optional group every ranged
            // reference parsed as null and was dropped from the modal entirely.
            const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
            if (match) {
              return {
                refStr: ref,
                bookName: match[1],
                chapter: parseInt(match[2], 10),
                verse: parseInt(match[3], 10),
                endVerse: match[4] ? parseInt(match[4], 10) : undefined,
                loading: true
              };
            }
            return null;
          }).filter(Boolean) as CrossRefData[];

          verseGroups.push({ parentRef: vRef, refs: parsedRefs });
          allParsedRefs.push(...parsedRefs);
        }

        if (mounted) setGroups(verseGroups);

        if (allParsedRefs.length === 0) {
          if (mounted) setLoadingRefs(false);
          return;
        }

        const fetchVerse = async (r: CrossRefData) => {
          const book = ALL_BOOKS.find(b => b.name.toLowerCase() === r.bookName.toLowerCase() || b.id === r.bookName.toLowerCase());
          // parseVerseRef caps how many verses one reference may pull in, so a long TSKe
          // range ("Isaiah 60:1-22") falls back to quoting its opening verse rather than
          // reporting the book as missing.
          const versePart = r.endVerse ? `${r.verse}-${r.endVerse}` : `${r.verse}`;
          const parsed = book
            ? parseVerseRef(`${r.chapter}:${versePart}`, book.id) ?? parseVerseRef(`${r.chapter}:${r.verse}`, book.id)
            : null;

          const apply = (patch: Partial<CrossRefData>) => {
            if (!mounted) return;
            setGroups(prev => prev.map(g => ({
              ...g,
              refs: g.refs.map(p => p.refStr === r.refStr ? { ...p, ...patch, loading: false } : p)
            })));
          };

          if (!parsed) {
            apply({ error: 'Book not found' });
            return;
          }

          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              apply({ text: await fetchVerseText(bibleVersion, parsed) });
              return;
            } catch (err: any) {
              if (attempt === 1) apply({ error: err.message || 'Failed to fetch text' });
              else await new Promise(res => setTimeout(res, 600));
            }
          }
        };

        const seen = new Set<string>();
        const uniqueRefs: CrossRefData[] = [];
        for (const r of allParsedRefs) {
          if (!seen.has(r.refStr)) {
            seen.add(r.refStr);
            uniqueRefs.push(r);
          }
        }

        // Every reference goes out together. fetchVerseText caches by chapter, so the
        // several references that land in one chapter collapse into a single request —
        // as does anything the guide's key verses already pulled. The previous code ran
        // four at a time with a 250ms pause between batches, which left a verse with a
        // dozen cross-references filling in for seconds.
        await Promise.all(uniqueRefs.map(fetchVerse));
        
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoadingRefs(false);
      }
    };

    loadRefs();

    return () => { mounted = false; };
  }, [verseRefs, crossRefMap, bibleVersion]);

  const totalRefs = groups.reduce((sum, g) => sum + g.refs.length, 0);
  const isMultiVerse = verseRefs.length > 1;

  // The reader's own version label sits behind this fullscreen modal, so the translation
  // is named here rather than leaving the quoted verses unattributed.
  const versionLabel = BIBLE_VERSION_LABELS[bibleVersion] || bibleVersion;
  const subtitle = isMultiVerse
    ? `${verseRefs.length} verses · ${totalRefs} references · ${versionLabel}`
    : `${capitalize(verseRefs[0])} · ${versionLabel}`;

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="fullscreen"
      icon={<BookOpen className="w-5 h-5 text-accent" />}
      title="Cross References"
      subtitle={subtitle}
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-500/10 text-red-400 text-sm border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {!error && loadingRefs && totalRefs === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-secondary">
            <Loader2 className="w-6 h-6 animate-spin mb-3 text-accent" />
            <p className="text-sm">Finding related verses...</p>
          </div>
        )}

        {!error && !loadingRefs && totalRefs === 0 && (
          <div className="py-16 text-center text-secondary px-6">
            <p className="text-sm">No cross-references available.</p>
          </div>
        )}

        {groups.map((group, gi) => {
          if (group.refs.length === 0) return null;
          
          return (
            <div key={gi}>
              {/* Parent verse section header — shown when multi-verse */}
              {isMultiVerse && (
                <div className="sticky top-0 z-10 px-5 py-3 bg-accent/10 backdrop-blur-md border-b border-accent/20 border-l-4 border-l-accent flex items-center justify-between">
                  <span className="text-base font-bold text-accent">
                    {capitalize(group.parentRef)}
                  </span>
                  <span className="text-xs font-bold text-accent/60 bg-accent/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {group.refs.length} {group.refs.length === 1 ? 'ref' : 'refs'}
                  </span>
                </div>
              )}

              {/* Refs list */}
              {group.refs.map((r, i) => {
                const bookInfo = ALL_BOOKS.find(b => b.name.toLowerCase() === r.bookName.toLowerCase() || b.id === r.bookName.toLowerCase());
                
                return (
                  <div 
                    key={`${gi}-${i}`} 
                    className="px-5 py-2.5 relative active:bg-card-hover transition-colors"
                    onClick={() => {
                      if (bookInfo) {
                        onNavigateToVerse(bookInfo.id, r.chapter, r.verse, group.parentRef);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-accent text-base">
                        {bookInfo?.name || capitalize(r.bookName)} {r.chapter}:{r.verse}{r.endVerse ? `-${r.endVerse}` : ''}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />
                    </div>
                    
                    {r.loading ? (
                      <div className="flex items-center gap-2 text-sm text-secondary animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                      </div>
                    ) : r.error ? (
                      <p className="text-sm text-red-400">{r.error}</p>
                    ) : (
                      <p className="text-lg leading-loose text-primary/90">{r.text}</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
