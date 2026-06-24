import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PenLine, AlertCircle, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import type { Verse } from '../types/models';

const TRANSLATION_OPTIONS = [
  { value: 'LSB', label: 'LSB (Legacy Standard)' },
  { value: 'NASB', label: 'NASB95' },
  { value: 'ESV', label: 'ESV' },
  { value: 'NLT', label: 'NLT' },
  { value: 'web', label: 'WEB (World English)' },
  { value: 'kjv', label: 'KJV' },
  { value: 'bbe', label: 'BBE (Basic English)' },
];

interface AddVerseProps {
  onVerseAdded?: () => void;
}

export const AddVerse: React.FC<AddVerseProps> = ({ onVerseAdded }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'manual' | 'search'>('manual');
  
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setSearchError(null);
    setSearchResults([]);

    const isBolls = ['LSB', 'NASB', 'NLT', 'ESV'].includes(searchTranslation);
    const parseTranslation = isBolls ? 'web' : searchTranslation;
    const queries = searchQuery.split(';').map(q => q.trim()).filter(Boolean);
    const results = [];
    let hasError = false;

    for (const query of queries) {
      try {
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(query)}?translation=${parseTranslation}`);
        
        if (!response.ok) {
          throw new Error(`Verse reference not found: '${query}'`);
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

          let combinedText = '';
          for (const [chStr, vNums] of Object.entries(versesByChapter)) {
            const ch = parseInt(chStr);
            const bollsRes = await fetch(`https://bolls.life/get-text/${searchTranslation}/${bollsId}/${ch}/`);
            if (!bollsRes.ok) throw new Error(`Could not fetch ${searchTranslation} translation.`);
            
            const chapterData = await bollsRes.json();
            const requestedVerses = chapterData.filter((v: any) => vNums.includes(v.verse));
            
            const textChunk = requestedVerses.map((v: any) => {
              return v.text
                .replace(/<b\b[^>]*>.*?<\/b>/gi, '')
                .replace(/<h[1-6]\b[^>]*>.*?<\/h[1-6]>/gi, '')
                .replace(/<div\b[^>]*class="[^"]*heading[^"]*"[^>]*>.*?<\/div>/gi, '')
                .replace(/<br\s*\/?>/gi, ' ')
                .replace(/<\/p>/gi, ' ')
                .replace(/<[^>]*>/g, '')
                .trim();
            }).join(' ');
            
            combinedText += textChunk + ' ';
            await new Promise(res => setTimeout(res, 250)); // stagger bolls requests slightly
          }

          results.push({
            reference: data.reference,
            text: combinedText.trim(),
            translation_name: searchTranslation
          });
        } else {
          results.push(data);
        }
      } catch (err: any) {
        setSearchError(err.message || `Failed to search for verse: ${query}`);
        hasError = true;
        break; // Stop processing if one fails to keep it consistent
      }
    }
    
    if (!hasError) {
      setSearchResults(results);
    }
    setIsLoading(false);
  };

  const addVerseToLibrary = (ref: string, text: string, translation: string, skipNavigate = false) => {
    // Check if exists
    if (state.verses.some(v => v.ref.toLowerCase() === ref.toLowerCase())) {
      showToast(`'${ref}' is already in your library!`, 'error');
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
      attempts: 0
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
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full pt-1 pb-10">

      {/* Mode Selection Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 transition-all ${
            activeTab === 'manual' 
              ? 'border-accent bg-accent/5 text-accent-light' 
              : 'border-card-border bg-card text-muted hover:border-accent/40 hover:text-primary'
          }`}
        >
          <PenLine className="w-6 h-6 mb-1" />
          <span className="font-heading font-bold text-lg leading-tight">Manual<br />Entry</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 transition-all ${
            activeTab === 'search' 
              ? 'border-accent bg-accent/5 text-accent-light' 
              : 'border-card-border bg-card text-muted hover:border-accent/40 hover:text-primary'
          }`}
        >
          <Search className="w-6 h-6 mb-1" />
          <span className="font-heading font-bold text-lg leading-tight">Pick from<br />Top Verses</span>
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
          
          <Button onClick={handleSearch} isLoading={isLoading} className="w-full">
            Search
          </Button>

          {searchError && (
            <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-xl text-center text-red-500 flex flex-col items-center gap-2">
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
                <div key={i} className="p-5 border border-accent/30 bg-accent/5 rounded-xl flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="font-heading font-bold text-lg text-accent-light">{res.reference}</span>
                    <span className="px-2 py-1 rounded text-xs font-bold bg-accent/20 text-accent-light">
                      {res.translation_name || searchTranslation.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-primary text-sm leading-relaxed">{res.text}</p>
                  <Button 
                    onClick={() => addVerseToLibrary(res.reference, res.text, res.translation_name || searchTranslation.toUpperCase())}
                    className="mt-2 self-end"
                  >
                    Add to Library
                  </Button>
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
                    handleSearch();
                  }}
                  className="bg-card border border-card-border rounded-xl p-4 text-left hover:bg-card-hover transition-colors flex flex-col gap-1"
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
              className="w-full min-h-[120px] p-4 rounded-xl bg-background border border-glass-border focus:outline-none focus:ring-2 focus:ring-accent transition-all text-primary placeholder:text-muted resize-none"
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
    </div>
  );
};
