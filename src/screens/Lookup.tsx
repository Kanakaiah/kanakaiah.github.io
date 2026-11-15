import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, AlertCircle, BookOpen, Settings, Plus, Check, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { readerPath } from '../utils/readerRoute';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { TRANSLATION_OPTIONS, BIBLE_VERSION_LABELS } from '../data/bibleMap';
import type { BibleVersion } from '../types/models';
import { OT_BOOKS } from '../data/otBooks';
import { NT_BOOKS } from '../data/ntBooks';
import {
  parseVerseRef,
  parseChapterRef,
  fetchVerseText,
  fetchChapterVerses,
  searchBibleByKeyword,
  formatVerseNumbers,
} from '../utils/verseText';
import {
  loadStrongsDictionary,
  normalizeStrongsRef,
  type StrongsDefinition,
} from '../utils/strongs';
import { StrongsRefText } from '../components/strongs/StrongsRefText';
import { useStrongsOccurrences } from '../components/strongs/useStrongsOccurrences';
import { StrongsOccurrencesModal } from '../components/StrongsOccurrencesModal';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

interface VerseLookupResult {
  reference: string;
  text: string;
  translation_name: string;
  bookId: string;
  chapter: number;
  verse: number;
  endVerse?: number;
}

interface StrongsLookupResult {
  code: string;
  def: StrongsDefinition;
}

type LookupMode = 'verses' | 'strongs';

export const Lookup: React.FC = () => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultTranslation = state.settings.bibleVersion || 'LSB';
  const urlQuery = searchParams.get('q') || '';
  const urlTranslation = searchParams.get('t') || defaultTranslation;
  const urlMode: LookupMode = searchParams.get('mode') === 'strongs' ? 'strongs' : 'verses';

  const [lookupMode, setLookupMode] = useState<LookupMode>(urlMode);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [searchTranslation, setSearchTranslation] = useState(urlTranslation);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<VerseLookupResult[]>([]);
  const [strongsResults, setStrongsResults] = useState<StrongsLookupResult[]>([]);
  const [chapterHeader, setChapterHeader] = useState<{ bookId: string; bookName: string; chapter: number } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const strongsLemmaMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of strongsResults) {
      map.set(item.code, item.def.lemma);
    }
    return map;
  }, [strongsResults]);

  const { occurrence, loadingRef, openOccurrences, closeOccurrences } = useStrongsOccurrences(
    ref => strongsLemmaMap.get(ref)
  );

  const performStrongsSearch = useCallback(async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q) return;
    setIsLoading(true);
    setSearchError(null);
    setStrongsResults([]);
    setSearchResults([]);
    setChapterHeader(null);

    try {
      const codeMatch = q.match(/^([GHgh])0*(\d+)$/);
      if (codeMatch) {
        const prefix = codeMatch[1].toUpperCase();
        const norm = normalizeStrongsRef(q);
        const dict = await loadStrongsDictionary(prefix);
        const exact = dict[norm];
        if (exact) {
          setStrongsResults([{ code: norm, def: exact }]);
          setIsLoading(false);
          return;
        }
      }

      const [greekDict, hebrewDict] = await Promise.all([
        loadStrongsDictionary('G'),
        loadStrongsDictionary('H'),
      ]);

      const lower = q.toLowerCase();
      const hits: Array<{ score: number; item: StrongsLookupResult }> = [];
      const scan = (dict: Record<string, StrongsDefinition>) => {
        for (const [code, def] of Object.entries(dict)) {
          const xlit = (def.xlit || '').toLowerCase();
          const lemma = (def.lemma || '').toLowerCase();
          const sDef = (def.strongs_def || '').toLowerCase();
          const kDef = (def.kjv_def || '').toLowerCase();
          const cLower = code.toLowerCase();

          let score = 0;
          if (cLower === lower || xlit === lower || lemma === lower) score = 100;
          else if (xlit.startsWith(lower) || cLower.startsWith(lower)) score = 70;
          else if (kDef.includes(lower)) score = 45;
          else if (sDef.includes(lower)) score = 25;

          if (score > 0) hits.push({ score, item: { code, def } });
        }
      };

      scan(greekDict);
      scan(hebrewDict);

      hits.sort((a, b) => b.score - a.score || a.item.code.localeCompare(b.item.code));
      const top = hits.slice(0, 30).map(h => h.item);
      if (top.length === 0) {
        setSearchError(`No Strong's entries matched "${q}". Try a code like G26 or a word like grace.`);
      } else {
        setStrongsResults(top);
      }
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Could not load Strong's lexicon.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const performVerseSearch = useCallback(async (queryToUse: string, translationToUse: string) => {
    const cleanQuery = queryToUse.trim();
    if (!cleanQuery) return;
    setIsLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setStrongsResults([]);
    setChapterHeader(null);

    const singleChapter = !cleanQuery.includes(';') ? parseChapterRef(cleanQuery) : null;
    if (singleChapter) {
      try {
        const book = ALL_BOOKS.find(b => b.id === singleChapter.bookId);
        if (book && singleChapter.chapter <= book.chapters) {
          const verses = await fetchChapterVerses(
            translationToUse,
            singleChapter.bollsId,
            singleChapter.chapter
          );
          if (verses.length === 0) throw new Error('No verses found for that chapter.');
          setChapterHeader({
            bookId: singleChapter.bookId,
            bookName: book.name,
            chapter: singleChapter.chapter,
          });
          setSearchResults(
            verses.map(v => ({
              reference: `${book.name} ${singleChapter.chapter}:${v.verse}`,
              text: v.text,
              translation_name: translationToUse,
              bookId: singleChapter.bookId,
              chapter: singleChapter.chapter,
              verse: v.verse,
            }))
          );
          setIsLoading(false);
          return;
        }
      } catch (err: unknown) {
        setSearchError(err instanceof Error ? err.message : `Could not load chapter '${cleanQuery}'.`);
        setIsLoading(false);
        return;
      }
    }

    const rawQueries = cleanQuery
      .replace(/[\u2013\u2014]/g, '-')
      .split(';')
      .map(q => q.trim())
      .filter(Boolean);

    const parsedParts: Array<{ raw: string; ref: ReturnType<typeof parseVerseRef> }> = [];
    let lastBookId: string | undefined;

    for (const part of rawQueries) {
      const normalizedPart = part.replace(/(\d)\s+(?=\d)/g, '$1,');
      const ref = parseVerseRef(normalizedPart, lastBookId);
      if (ref) lastBookId = ref.bookId;
      parsedParts.push({ raw: normalizedPart, ref });
    }

    const anyParsedRef = parsedParts.some(p => p.ref !== null);
    if (anyParsedRef) {
      const results: VerseLookupResult[] = [];
      let hasError = false;

      for (const item of parsedParts) {
        try {
          if (item.ref) {
            const book = ALL_BOOKS.find(b => b.id === item.ref!.bookId);
            const text = await fetchVerseText(translationToUse, item.ref);
            const sortedVerses = [...item.ref.verses].sort((a, b) => a - b);
            const firstV = sortedVerses[0];
            const lastV = sortedVerses[sortedVerses.length - 1];
            const label = formatVerseNumbers(sortedVerses);
            results.push({
              reference: `${book?.name || item.ref.bookId} ${item.ref.chapter}:${label}`,
              text,
              translation_name: translationToUse,
              bookId: item.ref.bookId,
              chapter: item.ref.chapter,
              verse: firstV,
              endVerse: lastV > firstV ? lastV : undefined,
            });
          } else {
            const parseTrans = ['LSB', 'NASB', 'NLT', 'ESV', 'BSB', 'TELIRV', 'TBSI'].includes(translationToUse)
              ? 'WEB'
              : translationToUse;
            const response = await fetch(`https://bible-api.com/${encodeURIComponent(item.raw)}?translation=${parseTrans}`);
            if (!response.ok) throw new Error(`Verse reference not found: '${item.raw}'`);
            const data = await response.json();
            const firstVerse = data.verses[0];
            let normalName = firstVerse.book_name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalName === 'songofsongs') normalName = 'songofsolomon';
            const parsedFallback = parseVerseRef(`${normalName} ${firstVerse.chapter}:${firstVerse.verse}`);
            const text = parsedFallback
              ? await fetchVerseText(
                  translationToUse,
                  {
                    ...parsedFallback,
                    verses: data.verses.map((v: { verse: number }) => v.verse),
                  }
                )
              : data.text;
            results.push({
              reference: data.reference,
              text: text.trim(),
              translation_name: translationToUse,
              bookId: normalName,
              chapter: firstVerse.chapter,
              verse: firstVerse.verse,
            });
          }
        } catch (err: unknown) {
          setSearchError(err instanceof Error ? err.message : `Failed to search for verse: ${item.raw}`);
          hasError = true;
          break;
        }
      }

      if (!hasError) setSearchResults(results);
      setIsLoading(false);
      return;
    }

    try {
      const hits = await searchBibleByKeyword(translationToUse, cleanQuery, 30);
      if (hits.length === 0) {
        setSearchError(`No verses matched "${cleanQuery}".`);
      } else {
        setSearchResults(
          hits.map(hit => {
            const book = ALL_BOOKS[hit.bollsId - 1];
            return {
              reference: `${book?.name || `Book ${hit.bollsId}`} ${hit.chapter}:${hit.verse}`,
              text: hit.text,
              translation_name: translationToUse,
              bookId: book?.id || '',
              chapter: hit.chapter,
              verse: hit.verse,
            };
          })
        );
      }
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : `Failed to search for "${cleanQuery}".`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasSearchedRef = useRef(false);

  useEffect(() => {
    if (urlQuery && !hasSearchedRef.current) {
      hasSearchedRef.current = true;
      void Promise.resolve().then(() => {
        if (urlMode === 'strongs') {
          void performStrongsSearch(urlQuery);
        } else {
          void performVerseSearch(urlQuery, urlTranslation);
        }
      });
    }
  }, [urlQuery, urlTranslation, urlMode, performVerseSearch, performStrongsSearch]);

  const handleSearch = (overrideQuery?: string, overrideMode?: LookupMode) => {
    const q = (overrideQuery ?? searchQuery).trim();
    if (!q) return;
    const mode = overrideMode ?? lookupMode;
    setSearchParams({ q, t: searchTranslation, mode });
    hasSearchedRef.current = true;
    if (mode === 'strongs') {
      performStrongsSearch(q);
    } else {
      performVerseSearch(q, searchTranslation);
    }
  };

  const syncTranslationAndOpen = (bookId: string, chapter: number, verse?: number) => {
    const validTranslation = TRANSLATION_OPTIONS.find(
      opt => opt.value.toLowerCase() === searchTranslation.toLowerCase()
    );
    if (validTranslation) {
      dispatch({
        type: 'UPDATE_SETTINGS',
        payload: { bibleVersion: validTranslation.value as BibleVersion },
      });
    }
    const path = readerPath(bookId, chapter, verse);
    if (path) {
      navigate(path, {
        state: {
          returnTo: `/lookup?q=${encodeURIComponent(searchQuery)}&t=${encodeURIComponent(searchTranslation)}&mode=${lookupMode}`,
        },
      });
    }
  };

  const addVerseToMemory = (res: VerseLookupResult) => {
    const existing = state.verses.some(
      v => v.ref.toLowerCase() === res.reference.toLowerCase() &&
        v.translation.toLowerCase() === (res.translation_name || searchTranslation).toLowerCase()
    );
    if (existing) {
      showToast(`'${res.reference}' is already in your memory library.`, 'info');
      return;
    }

    const existingGeneral = (state.topics || []).find(t => t.name.toLowerCase() === 'general');
    const topicIds = existingGeneral ? [existingGeneral.id] : [];

    dispatch({
      type: 'ADD_VERSE',
      payload: {
        id: crypto.randomUUID(),
        ref: res.reference,
        text: res.text.trim(),
        translation: res.translation_name || searchTranslation,
        addedDate: new Date().toISOString(),
        status: 'learning',
        sm2: {
          interval: 0,
          repetition: 0,
          efactor: 2.5,
          nextDueDate: new Date().toISOString(),
        },
        streak: 0,
        attempts: 0,
        topicIds,
      },
    });
    showToast(`Added ${res.reference} to memory!`, 'success', {
      label: 'Go to Today',
      onClick: () => navigate('/'),
    });
  };

  const activeTransLabel = BIBLE_VERSION_LABELS[searchTranslation] || searchTranslation;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative isolate">
      <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 pb-32">
        <div className="flex flex-col gap-5">
          {/* Header with active translation & settings gear */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-heading font-bold text-primary tracking-tight">Lookup</h2>
              <p className="text-secondary text-sm mt-0.5">
                {lookupMode === 'strongs'
                  ? "Search Strong's numbers (e.g. G26, H430), transliterations, or definitions."
                  : 'Look up references (Gen 1:1; 2:4), full chapters (John 3), or keywords.'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent">
                {activeTransLabel}
              </span>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('remora:open-settings'))}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full border border-card-border bg-card text-secondary hover:text-primary transition-colors"
                aria-label="Open settings"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode filter chips */}
          <div className="flex items-center gap-2">
            {([
              { id: 'verses', label: 'Bible verses' },
              { id: 'strongs', label: "Strong's" },
            ] as const).map(chip => {
              const selected = lookupMode === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setLookupMode(chip.id);
                    setSearchError(null);
                    if (searchQuery.trim()) {
                      handleSearch(searchQuery, chip.id);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selected
                      ? 'bg-accent/15 text-accent border-accent'
                      : 'bg-card text-secondary border-card-border hover:text-primary'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-xl shadow-sm border border-card-border">
            <div className="flex-1">
              <Input
                placeholder={
                  lookupMode === 'strongs'
                    ? 'e.g. G26, H430, agape, grace'
                    : 'e.g. John 3:16; Rom 8:1, or John 3, or shepherd'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                autoFocus
              />
            </div>
            {lookupMode === 'verses' && (
              <div className="w-full sm:w-48 shrink-0">
                <CustomSelect
                  value={searchTranslation}
                  onChange={setSearchTranslation}
                  options={TRANSLATION_OPTIONS}
                />
              </div>
            )}
            <Button onClick={() => handleSearch()} isLoading={isLoading} className="shrink-0">
              <Search className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Search</span>
            </Button>
          </div>

          {searchError && (
            <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-lg text-center text-red-500 flex flex-col items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              <p className="text-sm font-medium">{searchError}</p>
            </div>
          )}

          {lookupMode === 'strongs' && strongsResults.length > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-lg font-heading font-bold text-primary">
                  {strongsResults.length} Strong&apos;s {strongsResults.length === 1 ? 'Entry' : 'Entries'}
                </h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {strongsResults.map(({ code, def }) => (
                  <div key={code} className="p-5 border border-card-border bg-card rounded-xl shadow-sm flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent/10 text-accent tracking-wider uppercase">
                          {code}
                        </span>
                        <h4 className="text-2xl font-serif text-accent-light mt-1.5">{def.lemma}</h4>
                        {(def.xlit || def.pron) && (
                          <p className="text-sm text-secondary mt-0.5">
                            {def.xlit} {def.pron ? `/${def.pron}/` : ''}
                          </p>
                        )}
                      </div>
                      {def.pos && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-card-elevated text-secondary border border-card-border uppercase">
                          {def.pos}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-primary leading-relaxed">
                      <StrongsRefText
                        text={def.strongs_def}
                        onRefClick={(ref) => openOccurrences(ref)}
                        loadingRef={loadingRef}
                      />
                    </p>
                    {def.kjv_def && (
                      <p className="text-xs text-muted italic">
                        KJV: {def.kjv_def}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => openOccurrences(code)}
                      className="mt-auto self-start inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent hover:underline pt-1"
                    >
                      View all occurrences <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lookupMode === 'verses' && searchResults.length > 0 && (
            <div className="flex flex-col gap-5 mt-2">
              <div className="flex flex-wrap justify-between items-center gap-2 px-1">
                <h3 className="text-lg font-heading font-bold text-primary">
                  {chapterHeader
                    ? `${chapterHeader.bookName} ${chapterHeader.chapter} (${searchResults.length} verses)`
                    : `${searchResults.length} Result${searchResults.length !== 1 ? 's' : ''}`}
                </h3>
                {chapterHeader && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => syncTranslationAndOpen(chapterHeader.bookId, chapterHeader.chapter)}
                  >
                    <BookOpen className="w-4 h-4 mr-1.5" /> Open chapter
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {searchResults.map((res, i) => {
                  const inMemory = state.verses.some(
                    v => v.ref.toLowerCase() === res.reference.toLowerCase() &&
                      v.translation.toLowerCase() === (res.translation_name || searchTranslation).toLowerCase()
                  );
                  return (
                    <div key={`${res.reference}-${i}`} className="p-5 sm:p-6 border border-card-border bg-card rounded-xl shadow-sm flex flex-col gap-3.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-heading font-bold text-xl text-primary">{res.reference}</span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-accent/10 text-accent uppercase tracking-wider shrink-0">
                          {res.translation_name || searchTranslation.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-primary text-base md:text-lg font-serif leading-relaxed flex-1">
                        &ldquo;{res.text}&rdquo;
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-card-border/50">
                        <button
                          type="button"
                          onClick={() => addVerseToMemory(res)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            inMemory
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-accent/10 text-accent hover:bg-accent/20 border border-accent/25'
                          }`}
                        >
                          {inMemory ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          {inMemory ? 'In memory' : 'Add to memory'}
                        </button>
                        {res.bookId && (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => syncTranslationAndOpen(res.bookId, res.chapter)}
                              className="text-secondary hover:text-accent text-xs font-semibold tracking-wide transition-colors"
                            >
                              Open chapter
                            </button>
                            <button
                              type="button"
                              onClick={() => syncTranslationAndOpen(res.bookId, res.chapter, res.verse)}
                              className="text-accent hover:underline text-xs font-bold tracking-wider uppercase flex items-center gap-1"
                            >
                              Read <BookOpen className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {occurrence && (
        <StrongsOccurrencesModal
          strongsNumber={occurrence.ref}
          lemma={occurrence.lemma}
          onClose={closeOccurrences}
          onNavigateToVerse={(bookId, ch, vs) => {
            closeOccurrences();
            const path = readerPath(bookId, ch, vs);
            if (path) navigate(path);
          }}
        />
      )}
    </div>
  );
};
