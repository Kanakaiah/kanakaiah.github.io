import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PenLine, AlertCircle, Plus, Check, Library, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { ManageTopicsModal } from '../components/dashboard/ManageTopicsModal';
import type { Verse } from '../types/models';
import { SEED_VERSES } from '../data/seed';
import { TOP_100_VERSES } from '../data/top100';
import { ALL_KEY_VERSES } from '../data/allKeyVerses';
import { TRANSLATION_OPTIONS } from '../data/bibleMap';
import { OT_BOOKS } from '../data/otBooks';
import { NT_BOOKS } from '../data/ntBooks';
import {
  parseVerseRef,
  fetchVerseText,
  fetchChapterVerses,
  searchBibleByKeyword,
  formatVerseNumbers,
} from '../utils/verseText';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

interface AddVerseProps {
  onVerseAdded?: () => void;
}

export const AddVerse: React.FC<AddVerseProps> = ({ onVerseAdded }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'manual' | 'search' | 'collections'>('manual');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [isManageTopicsOpen, setIsManageTopicsOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreateGroup = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newGroupName.trim()) {
      const newId = `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      dispatch({
        type: 'ADD_TOPIC',
        payload: {
          id: newId,
          name: newGroupName.trim(),
        },
      });
      setSelectedTopicIds([newId]);
      setNewGroupName('');
      setIsAddingGroup(false);
    }
  };
  const defaultTranslation = state.settings.bibleVersion || 'LSB';

  // Search Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTranslation, setSearchTranslation] = useState<string>(defaultTranslation);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual Tab State
  const [usePicker, setUsePicker] = useState(false);
  const [pickerBookId, setPickerBookId] = useState(ALL_BOOKS[0].id);
  const [pickerChapter, setPickerChapter] = useState('1');
  const [pickerVerse, setPickerVerse] = useState('1');
  const [pickerEndVerse, setPickerEndVerse] = useState('');
  const [isFetchingPicker, setIsFetchingPicker] = useState(false);
  const [manualRef, setManualRef] = useState('');
  const [manualText, setManualText] = useState('');
  const [manualTranslation, setManualTranslation] = useState<string>(defaultTranslation);

  const handleSearch = async (overrideQuery?: string) => {
    const queryToUse = ((typeof overrideQuery === 'string' ? overrideQuery : searchQuery) || searchQuery).trim();
    if (!queryToUse) return;
    setIsLoading(true);
    setSearchError(null);
    setSearchResults([]);

    const rawQueries = queryToUse.replace(/[\u2013\u2014]/g, '-').split(';').map(q => q.trim()).filter(Boolean);

    // Keyword search when query has no digits or semicolons
    if (rawQueries.length === 1 && !/\d/.test(queryToUse)) {
      try {
        const hits = await searchBibleByKeyword(searchTranslation, queryToUse, 25);
        if (hits.length === 0) {
          setSearchError(`No verses matched "${queryToUse}".`);
        } else {
          setSearchResults(
            hits.map(hit => {
              const bookName = ALL_BOOKS[hit.bollsId - 1]?.name || `Book ${hit.bollsId}`;
              return {
                reference: `${bookName} ${hit.chapter}:${hit.verse}`,
                text: hit.text,
                translation_name: searchTranslation,
                verses: [{ book_name: bookName, chapter: hit.chapter, verse: hit.verse, text: hit.text }],
              };
            })
          );
        }
      } catch (err: any) {
        setSearchError(err.message || `Failed to search for "${queryToUse}".`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    let lastBookId: string | undefined;
    let currentBook = '';
    const refPattern = /^([1-3]?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)?\s*(\d.*)$/;

    const queries: Array<{ normalizedQuery: string; parsed: ReturnType<typeof parseVerseRef> }> = [];
    for (const part of rawQueries) {
      const normalizedRest = part.replace(/(\d)\s+(?=\d)/g, '$1,');
      const parsed = parseVerseRef(normalizedRest, lastBookId);
      if (parsed) {
        lastBookId = parsed.bookId;
        const bookName = ALL_BOOKS[parsed.bollsId - 1]?.name || parsed.bookId;
        currentBook = bookName;
        queries.push({ normalizedQuery: `${bookName} ${parsed.chapter}:${formatVerseNumbers(parsed.verses)}`, parsed });
      } else {
        const match = normalizedRest.match(refPattern);
        if (match) {
          if (match[1]) currentBook = match[1].trim();
          queries.push({ normalizedQuery: currentBook ? `${currentBook} ${match[2]}` : normalizedRest, parsed: null });
        } else {
          queries.push({ normalizedQuery: normalizedRest, parsed: null });
        }
      }
    }

    const usesRemoteChapterFetch = ['LSB', 'NASB', 'NLT', 'ESV', 'BSB', 'TELIRV', 'TBSI'].includes(searchTranslation);
    const parseTranslation = usesRemoteChapterFetch ? 'WEB' : searchTranslation;

    const fetchWithRetry = async (url: string, retries = 3) => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await fetch(url);
          if (res.status === 429 && attempt < retries) {
            await new Promise(r => setTimeout(r, 1500 * Math.pow(1.5, attempt)));
            continue;
          }
          return res;
        } catch (err: any) {
          if (err.message === 'Failed to fetch' && attempt < retries) {
            await new Promise(r => setTimeout(r, 1500 * Math.pow(1.5, attempt)));
            continue;
          }
          throw err;
        }
      }
      return fetch(url);
    };

    const baseDelay = queries.length > 20 ? 350 : 120;

    for (let i = 0; i < queries.length; i++) {
      const { normalizedQuery: query, parsed } = queries[i];
      try {
        if (parsed) {
          const chapterVerses = await fetchChapterVerses(searchTranslation, parsed.bollsId, parsed.chapter);
          const bookName = ALL_BOOKS[parsed.bollsId - 1]?.name || parsed.bookId;
          const individualVerses = parsed.verses
            .map(vNum => chapterVerses.find(cv => cv.verse === vNum))
            .filter((cv): cv is { verse: number; text: string } => Boolean(cv))
            .map(cv => ({ book_name: bookName, chapter: parsed.chapter, verse: cv.verse, text: cv.text }));

          if (individualVerses.length === 0) {
            throw new Error(`Verse reference not found: '${query}'`);
          }
          setSearchResults(prev => [
            ...prev,
            {
              reference: `${bookName} ${parsed.chapter}:${formatVerseNumbers(parsed.verses)}`,
              text: individualVerses.map(v => v.text).join(' ').trim(),
              translation_name: searchTranslation,
              verses: individualVerses,
            },
          ]);
          continue;
        }

        if (i > 0) await new Promise(res => setTimeout(res, baseDelay));
        const response = await fetchWithRetry(`https://bible-api.com/${encodeURIComponent(query)}?translation=${parseTranslation}`);

        if (!response.ok) {
          throw new Error(response.status === 429
            ? `Rate limit exceeded while fetching '${query}'. Try adding fewer verses.`
            : `Verse reference not found: '${query}'`);
        }

        const data = await response.json();

        if (usesRemoteChapterFetch) {
          const bookName = data.verses[0].book_name;
          let normalName = bookName.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normalName === 'songofsongs') normalName = 'songofsolomon';
          const matchedBook = ALL_BOOKS.find(b => b.id === normalName);
          const bollsId = matchedBook ? ALL_BOOKS.indexOf(matchedBook) + 1 : 0;
          if (!bollsId) throw new Error(`Could not map book '${bookName}' to API.`);

          const versesByChapter: Record<number, number[]> = {};
          data.verses.forEach((v: any) => {
            if (!versesByChapter[v.chapter]) versesByChapter[v.chapter] = [];
            versesByChapter[v.chapter].push(v.verse);
          });

          const individualVerses: any[] = [];
          let combinedText = '';
          for (const [chStr, vNums] of Object.entries(versesByChapter)) {
            const ch = parseInt(chStr, 10);
            const chapterVerses = await fetchChapterVerses(searchTranslation, bollsId, ch);
            const requestedVerses = chapterVerses.filter(v => vNums.includes(v.verse));
            for (const rv of requestedVerses) {
              individualVerses.push({
                book_name: bookName,
                chapter: ch,
                verse: rv.verse,
                text: rv.text,
              });
            }
            combinedText += requestedVerses.map(rv => rv.text).join(' ') + ' ';
            await new Promise(res => setTimeout(res, 150));
          }

          setSearchResults(prev => [
            ...prev,
            {
              reference: data.reference,
              text: combinedText.trim(),
              translation_name: searchTranslation,
              verses: individualVerses,
            },
          ]);
        } else {
          setSearchResults(prev => [...prev, data]);
        }
      } catch (err: any) {
        if (err.message === 'Failed to fetch') {
          setSearchError(`Rate limit exceeded at '${query}'. The verses fetched so far have been kept. Please wait a minute and try adding the rest in a new batch.`);
        } else {
          setSearchError(err.message || `Failed to search for verse: ${query}`);
        }
        break;
      }
    }

    setIsLoading(false);
  };

  const getEffectiveTopicIds = (): string[] => {
    if (selectedTopicIds.length > 0) return selectedTopicIds;
    const existingGeneral = (state.topics || []).find(t => t.name.toLowerCase() === 'general');
    if (existingGeneral) return [existingGeneral.id];
    const generalId = 'topic-general';
    dispatch({ type: 'ADD_TOPIC', payload: { id: generalId, name: 'General' } });
    return [generalId];
  };

  const addVerseToLibrary = (ref: string, text: string, translation: string, skipNavigate = false) => {
    // Check if exists
    if (state.verses.some(v => v.ref.toLowerCase() === ref.toLowerCase() && v.translation.toLowerCase() === translation.toLowerCase())) {
      showToast(`'${ref} (${translation})' is already in your library!`, 'error');
      return;
    }

    const effectiveTopicIds = getEffectiveTopicIds();

    const newVerse: Verse = {
      id: "v_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      ref,
      text: text.trim(),
      translation,
      addedDate: new Date().toISOString(),
      status: "learning",
      sm2: {
        interval: 0,
        repetition: 0,
        efactor: 2.5,
        nextDueDate: new Date().toISOString()
      },
      streak: 0,
      attempts: 0,
      topicIds: effectiveTopicIds
    };

    dispatch({ type: 'ADD_VERSE', payload: newVerse });
    showToast(`Added ${ref} to library!`, 'success');
    
    if (!skipNavigate) {
      if (onVerseAdded) {
        onVerseAdded();
      } else {
        navigate('/');
      }
    }
  };

  const currentPickerBook = ALL_BOOKS.find(b => b.id === pickerBookId) || ALL_BOOKS[0];
  const parsedPickerChapter = parseInt(pickerChapter, 10);
  const parsedPickerStart = parseInt(pickerVerse, 10);
  const parsedPickerEnd = pickerEndVerse.trim() ? parseInt(pickerEndVerse, 10) : null;
  const pickerValidChapter = Number.isFinite(parsedPickerChapter) && parsedPickerChapter >= 1 && parsedPickerChapter <= currentPickerBook.chapters;
  const pickerValidVerse = Number.isFinite(parsedPickerStart) && parsedPickerStart >= 1;
  const pickerValidEnd = parsedPickerEnd === null || (Number.isFinite(parsedPickerEnd) && parsedPickerEnd >= parsedPickerStart);

  const handlePickerAdd = async () => {
    if (!pickerValidChapter || !pickerValidVerse || !pickerValidEnd) {
      showToast('Choose a valid chapter and verse range.', 'error');
      return;
    }
    const verseSpec = parsedPickerEnd && parsedPickerEnd > parsedPickerStart
      ? `${parsedPickerStart}-${parsedPickerEnd}`
      : `${parsedPickerStart}`;
    const parsed = parseVerseRef(`${currentPickerBook.id} ${parsedPickerChapter}:${verseSpec}`);
    if (!parsed) {
      showToast('Maximum range is 12 verses at once.', 'error');
      return;
    }

    setIsFetchingPicker(true);
    try {
      const text = await fetchVerseText(manualTranslation, parsed);
      const displayRef = `${currentPickerBook.name} ${parsedPickerChapter}:${verseSpec}`;
      addVerseToLibrary(displayRef, text, manualTranslation);
    } catch (err: any) {
      showToast(err?.message || `Could not fetch ${currentPickerBook.name} ${parsedPickerChapter}:${verseSpec}.`, 'error');
    } finally {
      setIsFetchingPicker(false);
    }
  };

  const hydrateStarterPack = (packVerses: Verse[], topicName: string, unitLabel: string) => {
    const existingTopic = (state.topics || []).find(t => t.name === topicName);
    const topicId = existingTopic ? existingTopic.id : crypto.randomUUID();
    if (!existingTopic) {
      dispatch({ type: 'ADD_TOPIC', payload: { id: topicId, name: topicName } });
    }
    const existingKeys = new Set(
      state.verses.map(v => `${v.ref.toLowerCase()}-${(v.translation || 'lsb').toLowerCase()}`)
    );
    const addedCount = packVerses.filter(
      v => !existingKeys.has(`${v.ref.toLowerCase()}-${(v.translation || 'lsb').toLowerCase()}`)
    ).length;

    const versesWithTopic = packVerses.map(v => ({ ...v, topicIds: [topicId] }));
    dispatch({ type: 'HYDRATE_VERSES', payload: versesWithTopic });
    showToast(
      addedCount > 0
        ? `Added ${addedCount} ${unitLabel} to '${topicName}' group!`
        : `Updated '${topicName}' tags on your existing passages!`,
      'success'
    );
    if (onVerseAdded) onVerseAdded();
    else navigate('/');
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full pt-2 pb-10 px-2">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-3xl font-heading font-bold text-primary tracking-tight mb-2">Add New Verses</h2>
        <p className="text-secondary text-sm">Grow your library by searching or adding verses manually.</p>
      </div>

      {/* Global Group Selector */}
      <div className="flex flex-col gap-3 -mt-4 mb-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-[0.6875rem] font-bold text-muted uppercase tracking-wider">Assign to Groups (Optional)</span>
          <button
            onClick={() => setIsManageTopicsOpen(true)}
            className="text-muted hover:text-primary transition-colors p-1 rounded hover:bg-card-border flex items-center"
            title="Manage Groups"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {state.topics?.map(topic => {
            const isActive = selectedTopicIds.includes(topic.id);
            return (
              <button
                key={topic.id}
                onClick={() => {
                  setSelectedTopicIds(prev => 
                    isActive ? prev.filter(id => id !== topic.id) : [...prev, topic.id]
                  );
                }}
                className={`text-[0.8125rem] px-3 py-1.5 rounded-full font-medium transition-colors border ${
                  isActive 
                    ? 'bg-accent/15 text-accent border-accent/30' 
                    : 'bg-transparent text-secondary border-card-border hover:border-card-border-hover hover:text-primary'
                }`}
              >
                {topic.name}
              </button>
            );
          })}
          
          {isAddingGroup ? (
            <form onSubmit={handleCreateGroup} className="flex items-center gap-1">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="New group..."
                className="text-[0.8125rem] px-3 py-1.5 rounded-full bg-card border border-accent text-primary focus:outline-none w-32"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsAddingGroup(false);
                }}
                onBlur={() => {
                  if (!newGroupName.trim()) setIsAddingGroup(false);
                }}
              />
              <button
                type="submit"
                disabled={!newGroupName.trim()}
                className="p-1.5 rounded-full text-accent hover:bg-accent/10 disabled:opacity-50 transition-colors"
                aria-label="Save group"
              >
                <Check className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingGroup(true)}
              className="text-[0.8125rem] px-3 py-1.5 rounded-full font-medium transition-colors border bg-transparent text-secondary border-card-border border-dashed hover:border-solid hover:border-accent hover:text-accent flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New Group
            </button>
          )}
        </div>
      </div>

      {/* Mode Selection Buttons */}
      <div className="grid grid-cols-3 gap-2 bg-card-elevated p-2 rounded-lg border border-card-border">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 sm:p-4 rounded-md transition-colors duration-150 ${
            activeTab === 'manual'
              ? 'bg-accent text-white'
              : 'bg-transparent text-muted hover:bg-card-hover hover:text-primary'
          }`}
        >
          <PenLine className="w-5 h-5" />
          <span className="font-heading font-bold text-[0.8rem] leading-tight text-center">Manual</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 sm:p-4 rounded-md transition-colors duration-150 ${
            activeTab === 'search'
              ? 'bg-accent text-white'
              : 'bg-transparent text-muted hover:bg-card-hover hover:text-primary'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="font-heading font-bold text-[0.8rem] leading-tight text-center">Search API</span>
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 sm:p-4 rounded-md transition-colors duration-150 ${
            activeTab === 'collections'
              ? 'bg-accent text-white'
              : 'bg-transparent text-muted hover:bg-card-hover hover:text-primary'
          }`}
        >
          <Library className="w-5 h-5" />
          <span className="font-heading font-bold text-[0.8rem] leading-tight text-center">Collections</span>
        </button>
      </div>

      {/* SEARCH TAB */}
      {activeTab === 'search' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input 
                placeholder="e.g. John 3:16 or Psalm 23:1-3" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-full sm:w-auto shrink-0">
              <CustomSelect
                value={searchTranslation}
                onChange={setSearchTranslation}
                options={TRANSLATION_OPTIONS}
              />
            </div>
          </div>
          
          {searchQuery.split(';').length > 20 && (
            <div className="p-3 border border-blue-500/30 bg-blue-500/10 rounded-md text-blue-400 flex flex-col sm:flex-row items-start gap-3">
              <div className="mt-0.5"><AlertCircle className="w-5 h-5 shrink-0" /></div>
              <p className="text-sm font-medium leading-relaxed">
                You are adding a massive batch of verses. To protect the public Bible API from crashing, verses will be added slowly one-by-one. If the API forces a timeout halfway through, <strong>just save the ones that succeeded, wait 60 seconds, and paste the remainder in a new search!</strong>
              </p>
            </div>
          )}

          <Button onClick={() => handleSearch()} isLoading={isLoading} className="w-full">
            Search
          </Button>

          {searchError && (
            <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-md text-center text-red-500 flex flex-col items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              <p className="text-sm font-medium">{searchError}</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="flex flex-col gap-4">
              {searchResults.length > 1 && (
                <Button 
                  onClick={() => {
                    searchResults.forEach(res => {
                      addVerseToLibrary(res.reference, res.text, searchTranslation.toUpperCase(), true);
                    });
                    if (onVerseAdded) onVerseAdded();
                    else navigate('/');
                  }}
                  className="w-full bg-accent/20 hover:bg-accent/30 text-accent-light border-accent/30"
                >
                  <Plus className="w-5 h-5 mr-2" /> Add All {searchResults.length} Results
                </Button>
              )}

              {searchResults.map((res, i) => (
                <div key={i} className="p-5 border border-accent/30 bg-accent/5 rounded-md flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="font-heading font-bold text-lg text-accent-light">{res.reference}</span>
                    <span className="px-2 py-1 rounded text-xs font-bold bg-accent/20 text-accent-light">
                      {searchTranslation.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-primary text-sm font-serif leading-relaxed">{res.text}</p>
                  <div className="mt-2 flex flex-col sm:flex-row gap-2 justify-end">
                    {res.verses && res.verses.length > 1 ? (
                      <>
                        <Button 
                          variant="secondary"
                          onClick={() => {
                            let skipped = 0;
                            res.verses.forEach((v: any) => {
                              const ref = `${v.book_name} ${v.chapter}:${v.verse}`;
                              // Check if exists
                              if (state.verses.some(existing => existing.ref.toLowerCase() === ref.toLowerCase() && existing.translation.toLowerCase() === (searchTranslation.toUpperCase()).toLowerCase())) {
                                skipped++;
                                return;
                              }
                              
                              const newVerse: any = {
                                id: "v_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
                                ref,
                                text: v.text.trim(),
                                translation: searchTranslation.toUpperCase(),
                                addedDate: new Date().toISOString(),
                                status: "learning",
                                sm2: { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() },
                                streak: 0,
                                attempts: 0,
                                ...(selectedTopicIds.length > 0 ? { topicIds: selectedTopicIds } : {})
                              };
                              dispatch({ type: 'ADD_VERSE', payload: newVerse });
                            });
                            
                            const added = res.verses.length - skipped;
                            if (added > 0 && skipped > 0) {
                              showToast(`Added ${added} individual verses (${skipped} skipped as duplicate)`, 'success');
                            } else if (added > 0) {
                              showToast(`Added ${added} individual verses to library!`, 'success');
                            } else {
                              showToast(`All ${skipped} verses are already in your library!`, 'error');
                            }
                            
                            if (onVerseAdded) onVerseAdded();
                            else navigate('/');
                          }}
                        >
                          Add Individually ({res.verses.length})
                        </Button>
                        <Button 
                          onClick={() => addVerseToLibrary(res.reference, res.text, searchTranslation.toUpperCase())}
                        >
                          Add Combined (1)
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={() => addVerseToLibrary(res.reference, res.text, searchTranslation.toUpperCase())}
                      >
                        Add to Library
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Curated Collections */}
          <div className="mt-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted ml-2">Curated Collections</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { topic: "Peace & Calming", desc: "Verses for anxiety & stress", q: "Philippians 4:6-7" },
                { topic: "Faith & Trust", desc: "Strengthen your belief", q: "Proverbs 3:5-6" },
                { topic: "Strength & Courage", desc: "Power to overcome obstacles", q: "Joshua 1:9" },
                { topic: "Love & Grace", desc: "God's love and kindness", q: "Romans 8:38-39" }
              ].map(collection => (
                <button
                  key={collection.topic}
                  onClick={() => {
                    setSearchQuery(collection.q);
                    handleSearch(collection.q);
                  }}
                  className="bg-card border border-card-border rounded-md p-4 text-left hover:bg-card-hover transition-colors flex flex-col gap-1"
                >
                  <span className="font-bold text-primary">{collection.topic}</span>
                  <span className="text-xs text-muted">{collection.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MANUAL TAB */}
      {activeTab === 'manual' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-secondary">
              {usePicker ? 'Pick book, chapter & verse:' : 'Enter a reference:'}
            </span>
            <button
              type="button"
              onClick={() => setUsePicker(p => !p)}
              className="text-xs font-semibold text-accent hover:underline"
            >
              {usePicker ? 'Switch to Text Input' : 'Pick from Bible Dropdown'}
            </button>
          </div>

          {usePicker ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-secondary ml-1">Book</label>
                <CustomSelect
                  value={pickerBookId}
                  onChange={(val) => {
                    setPickerBookId(val);
                    setPickerChapter('1');
                    setPickerVerse('1');
                    setPickerEndVerse('');
                  }}
                  options={ALL_BOOKS.map(b => ({ value: b.id, label: b.name }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label={`Chapter (1-${currentPickerBook.chapters})`}
                  type="number"
                  min={1}
                  max={currentPickerBook.chapters}
                  value={pickerChapter}
                  onChange={(e) => setPickerChapter(e.target.value.replace(/\D/g, ''))}
                />
                <Input
                  label="Start Verse"
                  type="number"
                  min={1}
                  value={pickerVerse}
                  onChange={(e) => setPickerVerse(e.target.value.replace(/\D/g, ''))}
                />
                <Input
                  label="End (opt)"
                  type="number"
                  min={1}
                  placeholder="—"
                  value={pickerEndVerse}
                  onChange={(e) => setPickerEndVerse(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              {pickerChapter && !pickerValidChapter && (
                <p className="text-xs text-red-400">
                  {currentPickerBook.name} has {currentPickerBook.chapters} chapter{currentPickerBook.chapters === 1 ? '' : 's'}.
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-secondary ml-1">Translation</label>
                <CustomSelect
                  value={manualTranslation}
                  onChange={setManualTranslation}
                  options={TRANSLATION_OPTIONS}
                />
              </div>

              <Button
                onClick={handlePickerAdd}
                isLoading={isFetchingPicker}
                disabled={!pickerValidChapter || !pickerValidVerse || !pickerValidEnd}
                className="w-full mt-2 h-14 text-lg"
              >
                <Plus className="w-5 h-5 mr-2" /> Fetch &amp; Add Verse
              </Button>
            </>
          ) : (
            <>
              <Input 
                label="Reference"
                placeholder="e.g. Genesis 1:1"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
              />
              <Input 
                label="Translation Version"
                placeholder="e.g. LSB, ESV, NASB"
                value={manualTranslation}
                onChange={(e) => setManualTranslation(e.target.value)}
              />
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-secondary ml-1">Verse Text</label>
                <textarea
                  className="w-full min-h-[120px] p-4 rounded-md bg-card border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors text-primary placeholder:text-muted resize-none"
                  placeholder="Type or paste the verse text here..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
              </div>

              <Button 
                onClick={() => {
                  if (!manualRef || !manualText) {
                    showToast('Reference and Text are required.', 'error');
                    return;
                  }
                  addVerseToLibrary(manualRef, manualText, manualTranslation || 'Custom');
                }} 
                className="w-full mt-4 h-14 text-lg"
              >
                Add Verse
              </Button>
            </>
          )}
        </div>
      )}

      {/* COLLECTIONS TAB */}
      {activeTab === 'collections' && (
        <div className="flex flex-col gap-4">
          <p className="text-secondary text-sm mb-2">
            Kickstart your memory journey with curated collections of popular verses. Adding a collection automatically groups them together for easy practice.
          </p>

          <div className="p-4 bg-card-elevated border-2 border-accent/40 rounded-lg flex flex-col gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-primary flex items-center gap-2">
                <span>📖</span> Key Verses (All 66 Books)
              </h3>
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent/15 px-2.5 py-1 rounded-full">
                {ALL_KEY_VERSES.length} Verses · 66 Books
              </span>
            </div>
            <p className="text-sm text-muted">The complete key verses for each of the 66 books of the Bible (all canonical key verses per book, including Genesis 1:1, 3:15, 12:3, 50:20, etc.).</p>
            <Button
              onClick={() => hydrateStarterPack(ALL_KEY_VERSES, 'Key Verses (66 Books)', 'key verses')}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-2" /> Add All Key Verses ({ALL_KEY_VERSES.length} Verses)
            </Button>
          </div>

          <div className="p-4 bg-card-elevated border border-card-border rounded-lg flex flex-col gap-3">
            <h3 className="font-heading font-bold text-lg text-primary">Top 100 Verses</h3>
            <p className="text-sm text-muted">The 100 most popular Bible verses according to global search data.</p>
            <Button
              onClick={() => hydrateStarterPack(TOP_100_VERSES, 'Top 100', 'passages')}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Top 100
            </Button>
          </div>

          <div className="p-4 bg-card-elevated border border-card-border rounded-lg flex flex-col gap-3">
            <h3 className="font-heading font-bold text-lg text-primary">75 Well-Known Verses</h3>
            <p className="text-sm text-muted">A hand-picked selection of deeply encouraging and essential scriptures.</p>
            <Button
              onClick={() => hydrateStarterPack(SEED_VERSES, 'Well-Known', 'passages')}
              className="mt-2"
              variant="secondary"
            >
              <Plus className="w-4 h-4 mr-2" /> Add 75 Well-Known
            </Button>
          </div>

          <div className="p-4 bg-card-elevated border border-card-border rounded-lg flex flex-col gap-3">
            <h3 className="font-heading font-bold text-lg text-primary">Topical Memory Collections</h3>
            <p className="text-sm text-muted">Explore these thematic and book-specific collections in the <a href="/#/guides?tab=guides" className="text-accent hover:underline font-bold" onClick={(e) => { e.preventDefault(); navigate('/guides?tab=guides'); if (onVerseAdded) onVerseAdded(); }}>Guides tab</a> to view and add them in your preferred translation.</p>
            <Button
              onClick={() => { navigate('/guides?tab=guides'); if (onVerseAdded) onVerseAdded(); }}
              className="mt-2"
              variant="secondary"
            >
              <Library className="w-4 h-4 mr-2" /> View Collections in Guides
            </Button>
          </div>
        </div>
      )}

      {isManageTopicsOpen && (
        <ManageTopicsModal onClose={() => setIsManageTopicsOpen(false)} />
      )}
    </div>
  );
};
