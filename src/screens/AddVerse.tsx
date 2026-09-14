import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PenLine, AlertCircle, Plus, Check, Library } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import type { Verse } from '../types/models';
import { SEED_VERSES } from '../data/seed';
import { TOP_100_VERSES } from '../data/top100';
import { TRANSLATION_OPTIONS } from '../data/bibleMap';

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
  // Search Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTranslation, setSearchTranslation] = useState('web');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual Tab State
  const [manualRef, setManualRef] = useState('');
  const [manualText, setManualText] = useState('');
  const [manualTranslation, setManualTranslation] = useState('NIV');

  const handleSearch = async (overrideQuery?: string) => {
    const queryToUse = (typeof overrideQuery === 'string' ? overrideQuery : searchQuery) || searchQuery;
    if (!queryToUse.trim()) return;
    setIsLoading(true);
    setSearchError(null);
    setSearchResults([]);

    const isBolls = ['LSB', 'NASB', 'NLT', 'ESV'].includes(searchTranslation);
    const parseTranslation = isBolls ? 'web' : searchTranslation;
    const rawQueries = queryToUse.replace(/[\u2013\u2014]/g, '-').split(';').map(q => q.trim()).filter(Boolean);
    const queries = [];
    let currentBook = '';
    const refPattern = /^([1-3]?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)?\s*(\d.*)$/;

    for (const part of rawQueries) {
      const match = part.match(refPattern);
      if (match) {
        const book = match[1];
        // Normalize spaces between verse numbers to commas so the API can parse them.
        // e.g. "11:1 13" → "11:1,13" and "6:41 43" → "6:41,43"
        const rest = match[2].replace(/(\d)\s+(?=\d)/g, '$1,');
        if (book) {
          currentBook = book.trim();
        }
        queries.push(currentBook ? `${currentBook} ${rest}` : part);
      } else {
        queries.push(part);
      }
    }
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

    const baseDelay = queries.length > 20 ? 800 : 400; // longer delay for massive batches

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      try {
        if (i > 0) await new Promise(res => setTimeout(res, baseDelay)); // prevent rate limits on bulk queries
        
        const response = await fetchWithRetry(`https://bible-api.com/${encodeURIComponent(query)}?translation=${parseTranslation}`);
        
        if (!response.ok) {
          throw new Error(response.status === 429 
            ? `Rate limit exceeded while fetching '${query}'. Try adding fewer verses.` 
            : `Verse reference not found: '${query}'`);
        }
        
        const data = await response.json();

        if (isBolls) {
          const bookName = data.verses[0].book_name;
          let normalName = bookName.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normalName === 'songofsongs') normalName = 'songofsolomon';
          
          const BOLLS_BOOKS = [
            "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", 
            "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", 
            "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", 
            "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", 
            "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", 
            "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", 
            "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
          ];
          
          const bollsId = BOLLS_BOOKS.findIndex(b => b.toLowerCase().replace(/[^a-z0-9]/g, '') === normalName) + 1;
          if (!bollsId) throw new Error(`Could not map book '${bookName}' to API.`);

          const versesByChapter: Record<number, number[]> = {};
          data.verses.forEach((v: any) => {
            if (!versesByChapter[v.chapter]) versesByChapter[v.chapter] = [];
            versesByChapter[v.chapter].push(v.verse);
          });

          const individualVerses: any[] = [];
          let combinedText = '';
          for (const [chStr, vNums] of Object.entries(versesByChapter)) {
            const ch = parseInt(chStr);
            const bollsRes = await fetchWithRetry(`https://bolls.life/get-text/${searchTranslation}/${bollsId}/${ch}/`);
            if (!bollsRes.ok) throw new Error(`Could not fetch ${searchTranslation} translation.`);
            
            const chapterData = await bollsRes.json();
            const requestedVerses = chapterData.filter((v: any) => vNums.includes(v.verse));
            
            const textChunk = requestedVerses.map((v: any) => {
              const cleanText = v.text
                .replace(/<b\b[^>]*>.*?<\/b>/gi, '')
                .replace(/<h[1-6]\b[^>]*>.*?<\/h[1-6]>/gi, '')
                .replace(/<div\b[^>]*class="[^"]*heading[^"]*"[^>]*>.*?<\/div>/gi, '')
                .replace(/<br\s*\/?>/gi, ' ')
                .replace(/<\/p>/gi, ' ')
                .replace(/<[^>]*>/g, '')
                .trim();
                
              individualVerses.push({
                book_name: data.verses[0].book_name,
                chapter: ch,
                verse: v.verse,
                text: cleanText
              });
              
              return cleanText;
            }).join(' ');
            
            combinedText += textChunk + ' ';
            await new Promise(res => setTimeout(res, 250)); // stagger bolls requests slightly
          }

          const resultObj = {
            reference: data.reference,
            text: combinedText.trim(),
            translation_name: searchTranslation,
            verses: individualVerses
          };
          setSearchResults(prev => [...prev, resultObj]);
        } else {
          setSearchResults(prev => [...prev, data]);
        }
      } catch (err: any) {
        if (err.message === 'Failed to fetch') {
          setSearchError(`Rate limit exceeded at '${query}'. The verses fetched so far have been kept. Please wait a minute and try adding the rest in a new batch.`);
        } else {
          setSearchError(err.message || `Failed to search for verse: ${query}`);
        }
        break; // Stop processing but keep the ones we got
      }
    }
    
    setIsLoading(false);
  };

  const addVerseToLibrary = (ref: string, text: string, translation: string, skipNavigate = false) => {
    // Check if exists
    if (state.verses.some(v => v.ref.toLowerCase() === ref.toLowerCase() && v.translation.toLowerCase() === translation.toLowerCase())) {
      showToast(`'${ref} (${translation})' is already in your library!`, 'error');
      return;
    }

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
      ...(selectedTopicIds.length > 0 ? { topicIds: selectedTopicIds } : {})
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

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full pt-2 pb-10 px-2">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-3xl font-heading font-bold text-primary tracking-tight mb-2">Add New Verses</h2>
        <p className="text-secondary text-sm">Grow your library by searching or adding verses manually.</p>
      </div>

      {/* Global Group Selector */}
      <div className="flex flex-col gap-3 -mt-4 mb-2">
        <span className="text-[0.6875rem] font-bold text-muted uppercase tracking-wider text-center">Assign to Groups (Optional)</span>
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
            <div className="w-full sm:w-56 shrink-0">
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
                      addVerseToLibrary(res.reference, res.text, res.translation_name || searchTranslation.toUpperCase(), true);
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
                      {res.translation_name || searchTranslation.toUpperCase()}
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
                              if (state.verses.some(existing => existing.ref.toLowerCase() === ref.toLowerCase() && existing.translation.toLowerCase() === (res.translation_name || searchTranslation.toUpperCase()).toLowerCase())) {
                                skipped++;
                                return;
                              }
                              
                              const newVerse: any = {
                                id: "v_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
                                ref,
                                text: v.text.trim(),
                                translation: res.translation_name || searchTranslation.toUpperCase(),
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
                          onClick={() => addVerseToLibrary(res.reference, res.text, res.translation_name || searchTranslation.toUpperCase())}
                        >
                          Add Combined (1)
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={() => addVerseToLibrary(res.reference, res.text, res.translation_name || searchTranslation.toUpperCase())}
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
          <Input 
            label="Reference"
            placeholder="e.g. Genesis 1:1"
            value={manualRef}
            onChange={(e) => setManualRef(e.target.value)}
          />
          <Input 
            label="Translation Version"
            placeholder="e.g. NIV, ESV, LSB"
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
        </div>
      )}

      {/* COLLECTIONS TAB */}
      {activeTab === 'collections' && (
        <div className="flex flex-col gap-4">
          <p className="text-secondary text-sm mb-2">
            Kickstart your memory journey with curated collections of popular verses. Adding a collection automatically groups them together for easy practice.
          </p>

          <div className="p-4 bg-card-elevated border border-card-border rounded-lg flex flex-col gap-3">
            <h3 className="font-heading font-bold text-lg text-primary">Top 100 Verses</h3>
            <p className="text-sm text-muted">The 100 most popular Bible verses according to global search data.</p>
            <Button
              onClick={() => {
                const existingTopic = (state.topics || []).find(t => t.name === 'Top 100');
                const topicId = existingTopic ? existingTopic.id : crypto.randomUUID();
                if (!existingTopic) {
                  dispatch({ type: 'ADD_TOPIC', payload: { id: topicId, name: 'Top 100' } });
                }
                const versesWithTopic = TOP_100_VERSES.map(v => ({ ...v, topicIds: [topicId] }));
                dispatch({ type: 'HYDRATE_VERSES', payload: versesWithTopic });
                showToast(`Added 100 passages to 'Top 100' group!`, 'success');
                if (onVerseAdded) onVerseAdded();
                else navigate('/');
              }}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Top 100
            </Button>
          </div>

          <div className="p-4 bg-card-elevated border border-card-border rounded-lg flex flex-col gap-3">
            <h3 className="font-heading font-bold text-lg text-primary">75 Well-Known Verses</h3>
            <p className="text-sm text-muted">A hand-picked selection of deeply encouraging and essential scriptures.</p>
            <Button
              onClick={() => {
                const existingTopic = (state.topics || []).find(t => t.name === 'Well-Known');
                const topicId = existingTopic ? existingTopic.id : crypto.randomUUID();
                if (!existingTopic) {
                  dispatch({ type: 'ADD_TOPIC', payload: { id: topicId, name: 'Well-Known' } });
                }
                const versesWithTopic = SEED_VERSES.map(v => ({ ...v, topicIds: [topicId] }));
                dispatch({ type: 'HYDRATE_VERSES', payload: versesWithTopic });
                showToast(`Added ${SEED_VERSES.length} passages to 'Well-Known' group!`, 'success');
                if (onVerseAdded) onVerseAdded();
                else navigate('/');
              }}
              className="mt-2"
              variant="secondary"
            >
              <Plus className="w-4 h-4 mr-2" /> Add 75 Well-Known
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
