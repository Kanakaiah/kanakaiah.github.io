import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PenLine, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Verse } from '../types/models';

export const AddVerse: React.FC = () => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
  
  // Search Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTranslation, setSearchTranslation] = useState('web');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual Tab State
  const [manualRef, setManualRef] = useState('');
  const [manualText, setManualText] = useState('');
  const [manualTranslation, setManualTranslation] = useState('NIV');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const response = await fetch(`https://bible-api.com/${encodeURIComponent(searchQuery)}?translation=${searchTranslation}`);
      if (!response.ok) {
        throw new Error("Verse reference not found. E.g. 'John 3:16'");
      }
      const data = await response.json();
      setSearchResult(data);
    } catch (err: any) {
      setSearchError(err.message || 'Failed to search for verse');
    } finally {
      setIsLoading(false);
    }
  };

  const addVerseToLibrary = (ref: string, text: string, translation: string) => {
    // Check if exists
    if (state.verses.some(v => v.ref.toLowerCase() === ref.toLowerCase())) {
      showToast('This verse is already in your library!', 'error');
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
    showToast('Verse added to library!', 'success');
    navigate('/');
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full pt-4">
      <div className="hidden lg:block">
        <h1 className="text-3xl font-heading font-bold text-primary">Add Verse</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-glass-bg border border-glass-border rounded-xl p-1 relative">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2
            ${activeTab === 'search' ? 'bg-accent text-white shadow' : 'text-secondary hover:text-primary'}`}
        >
          <Search className="w-4 h-4" /> Look Up Verse
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2
            ${activeTab === 'manual' ? 'bg-accent text-white shadow' : 'text-secondary hover:text-primary'}`}
        >
          <PenLine className="w-4 h-4" /> Type It Yourself
        </button>
      </div>

      {/* SEARCH TAB */}
      {activeTab === 'search' && (
        <Card className="p-5 lg:p-8 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input 
                placeholder="e.g. John 3:16 or Psalm 23:1-3" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <select
              value={searchTranslation}
              onChange={(e) => setSearchTranslation(e.target.value)}
              className="h-12 px-4 rounded-xl bg-background border border-glass-border text-primary focus:outline-none focus:ring-2 focus:ring-accent w-full sm:w-auto"
            >
              <option value="web">WEB (World English Bible)</option>
              <option value="kjv">KJV (King James Version)</option>
              <option value="bbe">BBE (Bible in Basic English)</option>
            </select>
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

          {searchResult && (
            <div className="p-5 border border-accent/30 bg-accent/5 rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-heading font-bold text-lg text-accent-light">{searchResult.reference}</span>
                <span className="px-2 py-1 rounded text-xs font-bold bg-accent/20 text-accent-light">
                  {searchResult.translation_name}
                </span>
              </div>
              <p className="text-primary text-sm leading-relaxed">{searchResult.text}</p>
              <Button 
                onClick={() => addVerseToLibrary(searchResult.reference, searchResult.text, searchResult.translation_name || searchTranslation.toUpperCase())}
                className="mt-2 self-end"
              >
                Add to Library
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* MANUAL TAB */}
      {activeTab === 'manual' && (
        <Card className="p-5 lg:p-8 flex flex-col gap-5">
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
            className="w-full mt-2"
          >
            Save to Library
          </Button>
        </Card>
      )}
    </div>
  );
};
