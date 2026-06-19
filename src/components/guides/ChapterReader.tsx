import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Type, Plus, Minus, X, Copy } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { NT_BOOKS } from '../../data/ntBooks';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';

interface ChapterReaderProps {
  bookId: string;
  chapter: number;
  bookTitle: string;
  onClose: () => void;
}

const BOLLS_NT_MAP: Record<string, number> = {
  matthew: 40,
  mark: 41,
  luke: 42,
  john: 43,
  acts: 44,
  romans: 45,
  '1corinthians': 46,
  '2corinthians': 47,
  galatians: 48,
  ephesians: 49,
  philippians: 50,
  colossians: 51,
  '1thessalonians': 52,
  '2thessalonians': 53,
  '1timothy': 54,
  '2timothy': 55,
  titus: 56,
  philemon: 57,
  hebrews: 58,
  james: 59,
  '1peter': 60,
  '2peter': 61,
  '1john': 62,
  '2john': 63,
  '3john': 64,
  jude: 65,
  revelation: 66,
};

interface Verse {
  pk: number;
  verse: number;
  text: string;
}

export function ChapterReader({ bookId, chapter, bookTitle, onClose }: ChapterReaderProps) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setSearchParams] = useSearchParams();
  const [showOptions, setShowOptions] = useState(false);
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [showAddOptions, setShowAddOptions] = useState(false);

  const lastScrollY = useRef(0);
  const [isNavHidden, setIsNavHidden] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 50) {
      setIsNavHidden(true);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsNavHidden(false);
    }
    lastScrollY.current = currentScrollY;
  };

  // Compute prev/next labels for the navigation bar
  const bookIndex = NT_BOOKS.findIndex(b => b.id === bookId);
  const currentBook = bookIndex !== -1 ? NT_BOOKS[bookIndex] : null;

  let prevLabel: string | null = null;
  let nextLabel: string | null = null;

  if (currentBook) {
    if (chapter > 1) {
      prevLabel = `${bookTitle} ${chapter - 1}`;
    } else if (bookIndex > 0) {
      const prev = NT_BOOKS[bookIndex - 1];
      prevLabel = `${prev.name} ${prev.chapters}`;
    }

    if (chapter < currentBook.chapters) {
      nextLabel = `${bookTitle} ${chapter + 1}`;
    } else if (bookIndex < NT_BOOKS.length - 1) {
      nextLabel = `${NT_BOOKS[bookIndex + 1].name} 1`;
    }
  }

  const handleNextChapter = () => {
    const bookIndex = NT_BOOKS.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return;
    const currentBook = NT_BOOKS[bookIndex];
    
    if (chapter < currentBook.chapters) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerChapter', (chapter + 1).toString());
        return next;
      });
    } else if (bookIndex < NT_BOOKS.length - 1) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerBook', NT_BOOKS[bookIndex + 1].id);
        next.set('readerChapter', '1');
        return next;
      });
    }
  };

  const handlePrevChapter = () => {
    const bookIndex = NT_BOOKS.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return;
    
    if (chapter > 1) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerChapter', (chapter - 1).toString());
        return next;
      });
    } else if (bookIndex > 0) {
      const prevBook = NT_BOOKS[bookIndex - 1];
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerBook', prevBook.id);
        next.set('readerChapter', prevBook.chapters.toString());
        return next;
      });
    }
  };

  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null);
  const [touchEndPos, setTouchEndPos] = useState<{x: number, y: number} | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndPos(null);
    setTouchStartPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchEnd = () => {
    if (!touchStartPos || !touchEndPos) return;
    const distanceX = touchStartPos.x - touchEndPos.x;
    const distanceY = touchStartPos.y - touchEndPos.y;
    const minSwipeDistance = 50;

    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
        handleNextChapter();
      } else {
        handlePrevChapter();
      }
    }
  };

  useEffect(() => {
    const fetchChapter = async () => {
      setLoading(true);
      setError(null);
      try {
        const bollsId = BOLLS_NT_MAP[bookId];
        if (!bollsId) {
          throw new Error('Book not found in Bible API map.');
        }

        const res = await fetch(`https://bolls.life/get-text/LSB/${bollsId}/${chapter}/`);
        if (!res.ok) {
          throw new Error('Failed to fetch chapter text.');
        }
        
        const data: Verse[] = await res.json();
        setVerses(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading the chapter.');
      } finally {
        setLoading(false);
      }
    };

    fetchChapter();
  }, [bookId, chapter]);

  const memorizedVerses = useMemo(() => {
    const memSet = new Set<number>();
    const prefix = `${bookTitle} ${chapter}:`;
    
    state.verses.forEach(v => {
      if (v.ref.startsWith(prefix)) {
        const versePart = v.ref.substring(prefix.length);
        if (versePart.includes('-')) {
          const [start, end] = versePart.split('-').map(n => parseInt(n, 10));
          for (let i = start; i <= end; i++) memSet.add(i);
        } else if (versePart.includes(',')) {
          versePart.split(',').forEach(n => memSet.add(parseInt(n, 10)));
        } else {
          memSet.add(parseInt(versePart, 10));
        }
      }
    });
    return memSet;
  }, [state.verses, bookTitle, chapter]);

  const handleVerseClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const verseSpan = target.closest('.verse-span');
    if (verseSpan) {
      const verseNumStr = verseSpan.getAttribute('data-verse');
      if (verseNumStr) {
        const verseNum = parseInt(verseNumStr, 10);
        setSelectedVerses(prev => 
          prev.includes(verseNum) 
            ? prev.filter(v => v !== verseNum)
            : [...prev, verseNum].sort((a, b) => a - b)
        );
      }
    }
  };

  const handleAddClick = () => {
    if (selectedVerses.length > 1) {
      setShowAddOptions(true);
    } else {
      executeAdd('individual');
    }
  };

  const executeAdd = (mode: 'individual' | 'combined') => {
    let addedCount = 0;
    
    if (mode === 'individual') {
      selectedVerses.forEach(verseNum => {
        const v = verses.find(x => x.verse === verseNum);
        if (v) {
          const cleanText = v.text.replace(/<[^>]+>/g, '').trim();
          const ref = `${bookTitle} ${chapter}:${verseNum}`;
          dispatch({
            type: 'ADD_VERSE',
            payload: {
              id: crypto.randomUUID(),
              ref: ref,
              text: cleanText,
              translation: 'LSB',
              addedDate: new Date().toISOString(),
              status: 'learning',
              sm2: { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() },
              streak: 0,
              attempts: 0
            }
          });
          addedCount++;
        }
      });
    } else {
      // Group contiguous verses
      const sorted = [...selectedVerses].sort((a, b) => a - b);
      if (sorted.length === 0) return;
      
      const groups: number[][] = [];
      let currentGroup = [sorted[0]];
      
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i-1] + 1) {
          currentGroup.push(sorted[i]);
        } else {
          groups.push(currentGroup);
          currentGroup = [sorted[i]];
        }
      }
      groups.push(currentGroup);
      
      groups.forEach(group => {
        const textParts: string[] = [];
        group.forEach(verseNum => {
          const v = verses.find(x => x.verse === verseNum);
          if (v) textParts.push(v.text.replace(/<[^>]+>/g, '').trim());
        });
        
        const combinedText = textParts.join(' ');
        const refStr = group.length === 1 ? `${group[0]}` : `${group[0]}-${group[group.length - 1]}`;
        const ref = `${bookTitle} ${chapter}:${refStr}`;
        
        dispatch({
          type: 'ADD_VERSE',
          payload: {
            id: crypto.randomUUID(),
            ref: ref,
            text: combinedText,
            translation: 'LSB',
            addedDate: new Date().toISOString(),
            status: 'learning',
            sm2: { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() },
            streak: 0,
            attempts: 0
          }
        });
        addedCount++;
      });
    }
    
    showToast(`Added ${addedCount} ${addedCount === 1 ? 'entry' : 'entries'} to your library!`, 'success');
    setSelectedVerses([]);
    setShowAddOptions(false);
  };

  const handleCopySelected = () => {
    if (selectedVerses.length === 0) return;

    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const textParts: string[] = [];
    
    sorted.forEach(verseNum => {
      const v = verses.find(x => x.verse === verseNum);
      if (v) {
        textParts.push(v.text.replace(/<[^>]+>/g, '').trim());
      }
    });

    const combinedText = textParts.join(' ');
    
    // Format the reference
    let refStr = '';
    const isContiguous = sorted.length > 1 && (sorted[sorted.length - 1] - sorted[0] === sorted.length - 1);
    
    if (sorted.length === 1) {
      refStr = `${sorted[0]}`;
    } else if (isContiguous) {
      refStr = `${sorted[0]}-${sorted[sorted.length - 1]}`;
    } else {
      refStr = sorted.join(',');
    }

    const finalString = `'${combinedText}'\n\n${bookTitle} ${chapter}:${refStr} (LSB)`;

    navigator.clipboard.writeText(finalString).then(() => {
      showToast('Copied to clipboard!', 'success');
      setSelectedVerses([]);
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  const buildChapterHtml = () => {
    let html = '';
    
    // The chapter title is already shown in the sticky header, no need to duplicate it here.

    verses.forEach((v) => {
      let text = v.text;
      
      // Extract section headings (<S> or <b>) FIRST
      let heading = '';
      text = text.replace(/<S[^>]*>(.*?)<\/S>|<b[^>]*>(.*?)<\/b>/gi, (_, sMatch, bMatch) => {
        const hText = sMatch || bMatch;
        heading += `<div class="mt-10 first-of-type:mt-0 mb-3 text-[1.1em] font-bold tracking-tight text-primary font-heading italic leading-snug break-words w-full block">${hText}</div>`;
        return '';
      });

      // Extract paragraph breaks and forcefully strip all block tags to ensure inline rendering
      let hasP = false;
      text = text.replace(/<\/?(p|br|div)[^>]*>/gi, (match) => {
        if (!match.startsWith('</')) hasP = true;
        return '';
      });

      // Apply Bionic Reading safely (only to text outside HTML tags)
      if (state.settings.bionicReading) {
        text = text.replace(/([a-zA-Z\u00C0-\u024F]+)(?![^<]*>)/g, (word) => {
          if (word.length <= 1) return `<strong class="font-bold">${word}</strong>`;
          if (word.length <= 3) return `<strong class="font-bold">${word.substring(0, 1)}</strong>${word.substring(1)}`;
          const half = Math.ceil(word.length / 2);
          return `<strong class="font-bold">${word.substring(0, half)}</strong>${word.substring(half)}`;
        });
      }

      // Append in correct order
      if (heading) {
        html += heading;
      } else if (hasP) {
        // Visual paragraph break only if there is no heading
        html += `<div class="w-full h-4"></div>`; 
      }

      // Add verse number and text
      const inLibrary = memorizedVerses.has(v.verse);
      const isSelected = selectedVerses.includes(v.verse);
      
      let extraClass = '';
      if (isSelected) {
        extraClass = 'bg-accent/20 text-primary rounded px-1 -mx-1';
      } else if (inLibrary) {
        extraClass = 'bg-yellow-400/25 rounded px-1 -mx-1';
      }
      
      html += `<span class="inline verse-span cursor-pointer transition-colors ${extraClass}" data-verse="${v.verse}"><sup class="text-[0.55em] font-normal text-muted ml-1 mr-1.5 relative -top-[0.4em] select-none pointer-events-none">${v.verse}</sup><span class="inline pointer-events-none">${text}</span> </span>`;
    });

    return html;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl animate-in fade-in duration-300"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="flex-1 overflow-y-auto overscroll-y-contain px-5 py-6"
        onScroll={handleScroll}
      >
        
        <div className="max-w-2xl mx-auto w-full mb-10 mt-2 relative flex items-start justify-between">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-glass-bg transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-secondary" />
          </button>
          <div className="flex flex-col items-center justify-center pt-1">
            <h2 className="text-4xl font-bold tracking-tight text-primary font-heading mb-2">
              {bookTitle} {chapter}
            </h2>
            <span className="text-[0.6875rem] font-bold text-accent tracking-widest uppercase bg-accent/10 px-2.5 py-0.5 rounded-full">
              LSB Translation
            </span>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`p-2 -mr-2 rounded-full transition-colors ${showOptions ? 'bg-glass-bg text-primary' : 'hover:bg-glass-bg text-secondary'}`}
              title="Reading Options"
            >
              <Type className="w-5 h-5" />
            </button>
            
            {showOptions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 bg-card-elevated border border-glass-border rounded-2xl shadow-2xl z-50 overflow-hidden p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">Text Size</span>
                    <div className="flex items-center gap-2 bg-card border border-card-border rounded-xl p-1">
                      <button 
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontSize: parseFloat(Math.max(0.85, state.settings.fontSize - 0.15).toFixed(2)) }})}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-glass-bg text-secondary hover:text-primary transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold w-8 text-center">{state.settings.fontSize.toFixed(2)}</span>
                      <button 
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontSize: parseFloat(Math.min(1.45, state.settings.fontSize + 0.15).toFixed(2)) }})}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-glass-bg text-secondary hover:text-primary transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="h-[1px] bg-card-border w-full" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">Font</span>
                    <div className="flex items-center bg-card border border-card-border rounded-xl p-1 gap-1">
                      <button 
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontFamily: 'sans' }})}
                        className={`px-2 py-1 text-xs font-sans rounded-lg transition-colors ${(!state.settings.fontFamily || state.settings.fontFamily === 'sans') ? 'bg-accent text-white font-bold' : 'text-secondary hover:text-primary hover:bg-glass-bg'}`}
                      >
                        Inter
                      </button>
                      <button 
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontFamily: 'serif' }})}
                        className={`px-2 py-1 text-xs font-serif rounded-lg transition-colors ${state.settings.fontFamily === 'serif' ? 'bg-accent text-white font-bold' : 'text-secondary hover:text-primary hover:bg-glass-bg'}`}
                      >
                        Merriweather
                      </button>
                      <button 
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontFamily: 'hyper' }})}
                        className={`px-2 py-1 text-xs font-hyper rounded-lg transition-colors ${state.settings.fontFamily === 'hyper' ? 'bg-accent text-white font-bold' : 'text-secondary hover:text-primary hover:bg-glass-bg'}`}
                      >
                        Atkinson
                      </button>
                    </div>
                  </div>
                  
                  <div className="h-[1px] bg-card-border w-full" />
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <span className="text-sm font-bold text-primary block">Bionic Reading</span>
                      <span className="text-[0.625rem] text-secondary">Bold first letters</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.settings.bionicReading}
                      onChange={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { bionicReading: !state.settings.bionicReading }})}
                      className="w-4 h-4 accent-accent"
                    />
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-secondary">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <p className="text-sm font-medium">Loading scripture...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-red-400">
            <p>{error}</p>
            <button 
              onClick={onClose}
              className="px-4 py-2 mt-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto pb-32 select-text" onClick={handleVerseClick}>
            <div 
              className={`tracking-[-0.01em] text-primary/95 [&>div:first-child]:mt-0 ${
                state.settings.fontFamily === 'serif' ? 'font-serif' : 
                state.settings.fontFamily === 'hyper' ? 'font-hyper tracking-normal' : 
                'font-sans'
              }`}
              style={{
                fontSize: `${1.25 * (state.settings.fontSize || 1)}rem`,
                lineHeight: `${1.7 * (state.settings.fontSize || 1)}rem`
              }}
              dangerouslySetInnerHTML={{ __html: buildChapterHtml() }}
            />
          </div>
        )}
      </div>

      {/* Floating Action Bar for Selected Verses */}
      {selectedVerses.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-accent text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
            <span className="font-bold text-sm whitespace-nowrap">
              {selectedVerses.length} {selectedVerses.length === 1 ? 'verse' : 'verses'} selected
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopySelected}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-1"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button 
                onClick={handleAddClick}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
              <button 
                onClick={() => setSelectedVerses([])}
                className="p-1.5 rounded-xl hover:bg-white/20 transition-colors ml-1"
                title="Cancel Selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Options Modal */}
      {showAddOptions && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card-elevated border border-glass-border rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-primary mb-2">How to add?</h3>
            <p className="text-sm text-secondary mb-6">You have selected {selectedVerses.length} verses. Would you like to add them as individual verses or combine consecutive verses into single entries?</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => executeAdd('combined')}
                className="w-full py-3 px-4 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition-colors flex flex-col items-start"
              >
                <span>Combine Consecutive</span>
                <span className="text-xs font-normal text-white/70 mt-0.5">e.g. 1:3-5 and 1:7</span>
              </button>
              
              <button 
                onClick={() => executeAdd('individual')}
                className="w-full py-3 px-4 bg-glass-bg border border-glass-border text-primary font-bold rounded-xl hover:bg-glass-bg-hover transition-colors flex flex-col items-start"
              >
                <span>Individual Verses</span>
                <span className="text-xs font-normal text-secondary mt-0.5">Add {selectedVerses.length} separate entries</span>
              </button>
              
              <button 
                onClick={() => setShowAddOptions(false)}
                className="w-full py-2 mt-2 text-sm font-bold text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Chapter Navigation Bar */}
      {!loading && !error && selectedVerses.length === 0 && (
        <div className={`absolute bottom-0 left-0 w-full bg-background/80 backdrop-blur-xl z-10 transition-transform duration-300 ease-in-out ${isNavHidden ? 'translate-y-full' : 'translate-y-0'}`}>
          <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
            <button
              onClick={handlePrevChapter}
              disabled={!prevLabel}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-glass-bg text-secondary hover:text-primary"
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[120px]">{prevLabel || 'Start'}</span>
            </button>

            <span className="text-xs font-bold text-muted uppercase tracking-wider">
              Ch {chapter}
            </span>

            <button
              onClick={handleNextChapter}
              disabled={!nextLabel}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-glass-bg text-secondary hover:text-primary"
            >
              <span className="truncate max-w-[120px]">{nextLabel || 'End'}</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
