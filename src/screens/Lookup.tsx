import React, { useState } from 'react';
import { Search, AlertCircle, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { readerPath } from '../utils/readerRoute';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';

const TRANSLATION_OPTIONS = [
  { value: 'LSB', label: 'LSB (Legacy Standard)' },
  { value: 'NASB', label: 'NASB95' },
  { value: 'ESV', label: 'ESV' },
  { value: 'NLT', label: 'NLT' },
  { value: 'web', label: 'WEB (World English)' },
  { value: 'kjv', label: 'KJV' },
  { value: 'bbe', label: 'BBE (Basic English)' },
];

export const Lookup: React.FC = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchTranslation, setSearchTranslation] = useState('web');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

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
        const rest = match[2];
        if (book) {
          currentBook = book.trim();
        }
        queries.push(currentBook ? `${currentBook} ${rest}` : part);
      } else {
        queries.push(part);
      }
    }
    const results = [];
    let hasError = false;

    for (const query of queries) {
      try {
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(query)}?translation=${parseTranslation}`);
        
        if (!response.ok) {
          throw new Error(`Verse reference not found: '${query}'`);
        }
        
        const data = await response.json();
        const firstVerse = data.verses[0];
        let normalName = firstVerse.book_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalName === 'songofsongs') normalName = 'songofsolomon';

        if (isBolls) {
          const bookName = firstVerse.book_name;
          
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
            await new Promise(res => setTimeout(res, 250));
          }

          results.push({
            reference: data.reference,
            text: combinedText.trim(),
            translation_name: searchTranslation,
            bookId: normalName,
            chapter: firstVerse.chapter,
            verse: firstVerse.verse
          });
        } else {
          results.push({
            ...data,
            bookId: normalName,
            chapter: firstVerse.chapter,
            verse: firstVerse.verse
          });
        }
      } catch (err: any) {
        setSearchError(err.message || `Failed to search for verse: ${query}`);
        hasError = true;
        break; 
      }
    }
    
    if (!hasError) {
      setSearchResults(results);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative isolate">
      <div className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-card-border px-4 py-3 flex items-center justify-center shrink-0 shadow-sm transition-all duration-300">
        <h1 className="text-xl font-heading font-bold text-primary tracking-tight">Lookup</h1>
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-4 py-8 pb-32">
        <div className="flex flex-col gap-6">
          <div className="text-center mb-4">
            <Search className="w-12 h-12 text-accent mx-auto mb-3 opacity-80" />
            <h2 className="text-2xl font-heading font-bold text-primary tracking-tight mb-2">Search Scriptures</h2>
            <p className="text-secondary text-sm max-w-md mx-auto">
              Look up multiple verses at once. Use semicolons to separate references (e.g. Gen 1:1; 2:4; John 3:16).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-xl shadow-sm border border-card-border">
            <div className="flex-1">
              <Input 
                placeholder="e.g. Gen 22:1; Exod 15:25; 16:4" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                autoFocus
              />
            </div>
            <div className="w-full sm:w-48 shrink-0">
              <CustomSelect
                value={searchTranslation}
                onChange={setSearchTranslation}
                options={TRANSLATION_OPTIONS}
              />
            </div>
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

          {searchResults.length > 0 && (
            <div className="flex flex-col gap-6 mt-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-lg font-heading font-bold text-primary">
                  {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''}
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {searchResults.map((res, i) => (
                  <div key={i} className="p-6 border border-card-border bg-card rounded-xl shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <span className="font-heading font-bold text-xl text-primary">{res.reference}</span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-accent/10 text-accent uppercase tracking-wider">
                        {res.translation_name || searchTranslation.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-primary text-base md:text-lg font-serif leading-relaxed flex-1">"{res.text}"</p>
                      <Button 
                        onClick={() => {
                          const path = readerPath(res.bookId, res.chapter, res.verse);
                          if (path) navigate(path, { state: { returnTo: '/lookup' } });
                        }}
                        variant="secondary"
                        className="mt-2 w-full justify-center"
                      >
                        <BookOpen className="w-4 h-4 mr-2" /> Read Chapter
                      </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
