import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Loader2, Type, Plus, Minus, X, Copy, Trash2, BookOpen } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { NT_BOOKS } from '../../data/ntBooks';
import { OT_BOOKS } from '../../data/otBooks';
import { CrossReferenceModal } from './CrossReferenceModal';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import otQuotesData from '../../data/otQuotes.json';

const otQuotes = otQuotesData as Record<string, Record<string, number[]>>;

interface ChapterReaderProps {
  bookId: string;
  chapter: number;
  bookTitle: string;
  onClose: () => void;
}

export const BOLLS_BIBLE_MAP: Record<string, number> = {
  // OT
  genesis: 1, exodus: 2, leviticus: 3, numbers: 4, deuteronomy: 5,
  joshua: 6, judges: 7, ruth: 8, '1samuel': 9, '2samuel': 10,
  '1kings': 11, '2kings': 12, '1chronicles': 13, '2chronicles': 14,
  ezra: 15, nehemiah: 16, esther: 17, job: 18, psalms: 19, proverbs: 20,
  ecclesiastes: 21, songofsolomon: 22, isaiah: 23, jeremiah: 24, lamentations: 25,
  ezekiel: 26, daniel: 27, hosea: 28, joel: 29, amos: 30, obadiah: 31,
  jonah: 32, micah: 33, nahum: 34, habakkuk: 35, zephaniah: 36,
  haggai: 37, zechariah: 38, malachi: 39,
  // NT
  matthew: 40, mark: 41, luke: 42, john: 43, acts: 44,
  romans: 45, '1corinthians': 46, '2corinthians': 47, galatians: 48,
  ephesians: 49, philippians: 50, colossians: 51, '1thessalonians': 52,
  '2thessalonians': 53, '1timothy': 54, '2timothy': 55, titus: 56,
  philemon: 57, hebrews: 58, james: 59, '1peter': 60, '2peter': 61,
  '1john': 62, '2john': 63, '3john': 64, jude: 65, revelation: 66,
};

const BOOK_SHORT: Record<string, string> = {
  genesis: 'Gen', exodus: 'Exod', leviticus: 'Lev', numbers: 'Num',
  deuteronomy: 'Deut', joshua: 'Josh', judges: 'Judg', ruth: 'Ruth',
  '1samuel': '1 Sam', '2samuel': '2 Sam', '1kings': '1 Kgs', '2kings': '2 Kgs',
  '1chronicles': '1 Chr', '2chronicles': '2 Chr', nehemiah: 'Neh',
  songofsolomon: 'Song', ecclesiastes: 'Eccl', jeremiah: 'Jer',
  lamentations: 'Lam', ezekiel: 'Ezek', habakkuk: 'Hab', zephaniah: 'Zeph',
  haggai: 'Hag', zechariah: 'Zech', malachi: 'Mal',
  matthew: 'Matt', '1corinthians': '1 Cor', '2corinthians': '2 Cor',
  galatians: 'Gal', ephesians: 'Eph', philippians: 'Phil', colossians: 'Col',
  '1thessalonians': '1 Thess', '2thessalonians': '2 Thess',
  '1timothy': '1 Tim', '2timothy': '2 Tim', philemon: 'Philem',
  hebrews: 'Heb', '1peter': '1 Pet', '2peter': '2 Pet',
  '1john': '1 John', '2john': '2 John', '3john': '3 John',
  revelation: 'Rev',
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
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightVerse = searchParams.get('highlightVerse');
  const returnBook = searchParams.get('returnBook');
  const returnChapter = searchParams.get('returnChapter');
  const returnVerse = searchParams.get('returnVerse');
  const navigate = useNavigate();
  const [showOptions, setShowOptions] = useState(false);
  const [showCrossReferences, setShowCrossReferences] = useState<string[] | null>(null);
  const [crossRefMap, setCrossRefMap] = useState<Record<string, string[]> | null>(null);
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [navigatorBook, setNavigatorBook] = useState(bookId);
  const chapterGridRef = useRef<HTMLDivElement>(null);

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
  const bookIndex = ALL_BOOKS.findIndex(b => b.id === bookId);
  const currentBook = bookIndex !== -1 ? ALL_BOOKS[bookIndex] : null;

  let prevLabel: string | null = null;
  let prevAbbrLabel: string | null = null;
  let nextLabel: string | null = null;
  let nextAbbrLabel: string | null = null;

  const getAbbr = (name: string) => {
    if (name.length <= 4) return name;
    if (name.startsWith('1 ') || name.startsWith('2 ') || name.startsWith('3 ')) {
      return name.substring(0, 5).replace(' ', '');
    }
    return name.substring(0, 3);
  };

  if (currentBook) {
    if (chapter > 1) {
      prevLabel = `${bookTitle} ${chapter - 1}`;
      prevAbbrLabel = `${getAbbr(bookTitle)} ${chapter - 1}`;
    } else if (bookIndex > 0) {
      const prev = ALL_BOOKS[bookIndex - 1];
      prevLabel = `${prev.name} ${prev.chapters}`;
      prevAbbrLabel = `${getAbbr(prev.name)} ${prev.chapters}`;
    }

    if (chapter < currentBook.chapters) {
      nextLabel = `${bookTitle} ${chapter + 1}`;
      nextAbbrLabel = `${getAbbr(bookTitle)} ${chapter + 1}`;
    } else if (bookIndex < ALL_BOOKS.length - 1) {
      nextLabel = `${ALL_BOOKS[bookIndex + 1].name} 1`;
      nextAbbrLabel = `${getAbbr(ALL_BOOKS[bookIndex + 1].name)} 1`;
    }
  }

  const handleNextChapter = () => {
    const bookIndex = ALL_BOOKS.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return;
    const currentBook = ALL_BOOKS[bookIndex];
    
    if (chapter < currentBook.chapters) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerChapter', (chapter + 1).toString());
        return next;
      });
    } else if (bookIndex < ALL_BOOKS.length - 1) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerBook', ALL_BOOKS[bookIndex + 1].id);
        next.set('readerChapter', '1');
        return next;
      });
    }
  };

  const handlePrevChapter = () => {
    const bookIndex = ALL_BOOKS.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return;
    
    if (chapter > 1) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('readerChapter', (chapter - 1).toString());
        return next;
      });
    } else if (bookIndex > 0) {
      const prevBook = ALL_BOOKS[bookIndex - 1];
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

  const handleNavigate = (targetBookId: string, targetChapter: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('readerBook', targetBookId);
      next.set('readerChapter', targetChapter.toString());
      // Also update the guide param so closing the reader lands on the correct book's page
      if (next.has('guide')) {
        next.set('guide', targetBookId);
      }
      return next;
    }, { replace: true });
    setShowNavigator(false);
  };

  useEffect(() => {
    let mounted = true;
    fetch('/data/cross_references.json')
      .then(res => res.json())
      .then(data => {
        if (mounted) setCrossRefMap(data);
      })
      .catch(console.error);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (showNavigator && chapterGridRef.current) {
      setTimeout(() => {
        chapterGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [navigatorBook, showNavigator]);

  useEffect(() => {
    const fetchChapter = async () => {
      setLoading(true);
      setError(null);
      try {
        const bollsId = BOLLS_BIBLE_MAP[bookId];
        if (!bollsId) {
          throw new Error('Book not found in Bible API map.');
        }

        const res = await fetch(`https://bolls.life/get-text/LSB/${bollsId}/${chapter}/`);
        if (!res.ok) {
          throw new Error('Failed to fetch chapter text.');
        }
        
        const data: Verse[] = await res.json();
        setVerses(data);
        setSelectedVerses([]); // Clear any previous selection when loading a new chapter
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading the chapter.');
      } finally {
        setLoading(false);
      }
    };

    fetchChapter();
  }, [bookId, chapter]);

  useEffect(() => {
    if (verses.length > 0 && highlightVerse && !loading) {
      setTimeout(() => {
        const el = document.querySelector(`[data-verse="${highlightVerse}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a temporary highlight effect (light green)
          el.classList.add('bg-green-500/30', 'transition-colors', 'duration-1000');
          setTimeout(() => {
            el.classList.remove('bg-green-500/30');
          }, 2500);
        }
      }, 100);
    }
  }, [verses, highlightVerse, loading]);

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
    let skippedCount = 0;
    
    if (mode === 'individual') {
      selectedVerses.forEach(verseNum => {
        const v = verses.find(x => x.verse === verseNum);
        if (v) {
          const cleanText = v.text
            .replace(/<b\b[^>]*>.*?<\/b>/gi, '')
            .replace(/<h[1-6]\b[^>]*>.*?<\/h[1-6]>/gi, '')
            .replace(/<div\b[^>]*class="[^"]*heading[^"]*"[^>]*>.*?<\/div>/gi, '')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<\/p>/gi, ' ')
            .replace(/<[^>]+>/g, '')
            .trim();
          const ref = `${bookTitle} ${chapter}:${verseNum}`;
          
          if (state.verses.some(verse => verse.ref === ref)) {
            skippedCount++;
            return;
          }
          
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
          if (v) {
            textParts.push(
              v.text
                .replace(/<b\b[^>]*>.*?<\/b>/gi, '')
                .replace(/<h[1-6]\b[^>]*>.*?<\/h[1-6]>/gi, '')
                .replace(/<div\b[^>]*class="[^"]*heading[^"]*"[^>]*>.*?<\/div>/gi, '')
                .replace(/<br\s*\/?>/gi, ' ')
                .replace(/<\/p>/gi, ' ')
                .replace(/<[^>]+>/g, '')
                .trim()
            );
          }
        });
        
        const combinedText = textParts.join(' ');
        const refStr = group.length === 1 ? `${group[0]}` : `${group[0]}-${group[group.length - 1]}`;
        const ref = `${bookTitle} ${chapter}:${refStr}`;
        
        if (state.verses.some(verse => verse.ref === ref)) {
          skippedCount++;
          return;
        }
        
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
    
    const actionObj = {
      label: 'Go to Library',
      onClick: () => {
        setTimeout(() => {
          onClose();
          navigate(`/?search=${encodeURIComponent(bookTitle + ' ' + chapter + ':')}`);
        }, 300);
      }
    };
    
    if (addedCount > 0 && skippedCount > 0) {
      showToast(`Added ${addedCount} ${addedCount === 1 ? 'entry' : 'entries'} (${skippedCount} skipped as duplicate)`, 'success', actionObj);
    } else if (addedCount > 0) {
      showToast(`Added ${addedCount} ${addedCount === 1 ? 'entry' : 'entries'} to your library!`, 'success', actionObj);
    } else if (skippedCount > 0) {
      showToast(`${skippedCount} ${skippedCount === 1 ? 'entry' : 'entries'} already in your library!`, 'info', actionObj);
    }
    
    setSelectedVerses([]);
    setShowAddOptions(false);
  };

  const handleDeleteSelected = () => {
    const prefix = `${bookTitle} ${chapter}:`;
    
    // Find all verses in the library that overlap with the selected verses
    const versesToDelete = state.verses.filter(v => {
      if (!v.ref.startsWith(prefix)) return false;
      const versePart = v.ref.substring(prefix.length);
      let memSet = new Set<number>();
      if (versePart.includes('-')) {
        const [start, end] = versePart.split('-').map(n => parseInt(n, 10));
        for (let i = start; i <= end; i++) memSet.add(i);
      } else if (versePart.includes(',')) {
        versePart.split(',').forEach(n => memSet.add(parseInt(n, 10)));
      } else {
        memSet.add(parseInt(versePart, 10));
      }
      
      return selectedVerses.some(sv => memSet.has(sv));
    });

    if (versesToDelete.length > 0) {
      versesToDelete.forEach(v => {
        dispatch({ type: 'DELETE_VERSE', payload: v.id });
      });
      showToast(`Removed ${versesToDelete.length} ${versesToDelete.length === 1 ? 'entry' : 'entries'} from your library.`, 'success');
    }
    
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

    const bollsId = BOLLS_BIBLE_MAP[bookId];
    let quoteLevel = 0; // Track quote nesting across verses

    verses.forEach((v) => {
      let text = v.text;
      
      const isOtQuoteVerse = otQuotes[bollsId]?.[chapter]?.includes(v.verse);
      if (isOtQuoteVerse) {
        // Split by quote characters. 
        // We use lookarounds for the right single quote ’ (U+2019) so we don't accidentally split on apostrophes (like "Abraham’s")
        let parts = text.split(/(["“‘”]|(?<!\w)’|’(?!\w))/);
        let newText = '';

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!part) continue; // skip empty strings from split

          if (part === '"') {
            if (quoteLevel > 0) quoteLevel--; else quoteLevel++;
            newText += part;
          } else if (part === '“' || part === '‘') {
            quoteLevel++;
            newText += part;
          } else if (part === '”' || part === '’') {
            quoteLevel = Math.max(0, quoteLevel - 1);
            newText += part;
          } else {
            // It's text content. If we're inside a quote, uppercase it.
            if (quoteLevel > 0 && part.trim().length > 0) {
              newText += `<span class="uppercase">${part}</span>`;
            } else {
              newText += part;
            }
          }
        }
        text = newText;
      } else {
        // If we exit an OT quote block, reset the quote level to prevent bleeding into non-OT verses
        quoteLevel = 0;
      }
      
      // Extract section headings (<S> or <b>) FIRST
      let heading = '';
      text = text.replace(/<S[^>]*>(.*?)<\/S>|<b[^>]*>(.*?)<\/b>/gi, (_, sMatch, bMatch) => {
        const hText = sMatch || bMatch;
        heading += `<div class="mt-10 first-of-type:mt-0 mb-3 text-[1.1em] font-bold tracking-tight text-primary font-heading italic leading-snug break-words w-full block">${hText}</div>`;
        return '';
      });

      // Extract paragraph breaks and forcefully strip all block tags to ensure inline rendering
      let hasP = false;
      text = text.replace(/<\/?(p|br|div)[^>]*>/gi, (matchStr) => {
        if (!matchStr.startsWith('</')) hasP = true;
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

  const hasRefs = !crossRefMap || selectedVerses.some(v => {
    const refs = crossRefMap[`${bookTitle.toLowerCase()} ${chapter}:${v}`];
    return refs && refs.length > 0;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl animate-in fade-in duration-300"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="flex-1 overflow-y-auto overscroll-y-contain px-5 pb-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
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
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 px-3 pb-3 sm:pb-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)' }}>
          <div className="bg-accent text-white rounded-2xl shadow-2xl max-w-md mx-auto overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-bold text-sm">
                {selectedVerses.length} {selectedVerses.length === 1 ? 'verse' : 'verses'} selected
              </span>
              <button 
                onClick={() => setSelectedVerses([])}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                title="Cancel Selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
              <button 
                onClick={handleCopySelected}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              {hasRefs && (
                <button 
                  onClick={() => {
                    const sorted = [...selectedVerses].sort((a, b) => a - b);
                    setShowCrossReferences(sorted.map(v => `${bookTitle.toLowerCase()} ${chapter}:${v}`));
                  }}
                  className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Refs
                </button>
              )}
              {selectedVerses.every(v => memorizedVerses.has(v)) ? (
                <button 
                  onClick={handleDeleteSelected}
                  className="bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              ) : (
                <button 
                  onClick={handleAddClick}
                  className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
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
        <div className={`absolute bottom-0 left-0 w-full bg-background/60 backdrop-blur-xl z-10 transition-transform duration-300 ease-in-out ${isNavHidden ? 'translate-y-full' : 'translate-y-0'}`}>
          <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
            <button
              onClick={handlePrevChapter}
              disabled={!prevLabel}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-glass-bg text-secondary hover:text-primary"
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:block truncate max-w-[120px]">{prevLabel || 'Start'}</span>
              <span className="sm:hidden truncate max-w-[80px]">{prevAbbrLabel || 'Start'}</span>
            </button>

            <button 
              onClick={() => { setNavigatorBook(bookId); setShowNavigator(true); }}
              className="flex items-center gap-1 text-xs font-bold text-muted uppercase tracking-wider hover:text-primary transition-colors border border-glass-border rounded-lg px-3 py-1.5"
            >
              Ch {chapter}
              <ChevronDown className="w-3 h-3" />
            </button>

            <button
              onClick={handleNextChapter}
              disabled={!nextLabel}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-glass-bg text-secondary hover:text-primary"
            >
              <span className="hidden sm:block truncate max-w-[120px]">{nextLabel || 'End'}</span>
              <span className="sm:hidden truncate max-w-[80px]">{nextAbbrLabel || 'End'}</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Book/Chapter Navigator */}
      {showNavigator && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-background/60 backdrop-blur-xl animate-in fade-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
            <button
              onClick={() => setShowNavigator(false)}
              className="p-2 -ml-2 rounded-full hover:bg-glass-bg transition-colors"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
            <span className="text-sm font-bold text-primary tracking-wide">Go to...</span>
            <div className="w-9" />
          </div>

          {/* Book list */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {/* Column headers */}
            <div className="grid grid-cols-2 mb-2">
              <span className="text-right pr-4 text-[10px] font-bold text-muted uppercase tracking-widest">Old Testament</span>
              <span className="text-left pl-4 text-[10px] font-bold text-muted uppercase tracking-widest">New Testament</span>
            </div>

            {/* Book rows with inline chapter grid */}
            <div className="grid grid-cols-2">
              {(() => {
                const rows: React.ReactNode[] = [];
                const maxLen = Math.max(OT_BOOKS.length, NT_BOOKS.length);
                const selectedBookData = ALL_BOOKS.find(b => b.id === navigatorBook);

                for (let i = 0; i < maxLen; i++) {
                  const ot = i < OT_BOOKS.length ? OT_BOOKS[i] : null;
                  const nt = i < NT_BOOKS.length ? NT_BOOKS[i] : null;
                  const isOtSelected = ot?.id === navigatorBook;
                  const isNtSelected = nt?.id === navigatorBook;

                  rows.push(
                    <React.Fragment key={`row-${i}`}>
                      <button
                        onClick={() => ot && setNavigatorBook(ot.id)}
                        className={`text-right pr-4 py-2 text-[15px] transition-colors ${
                          isOtSelected
                            ? 'text-accent font-bold bg-accent/10 rounded-r-lg'
                            : ot ? 'text-secondary hover:text-primary' : 'pointer-events-none'
                        }`}
                        disabled={!ot}
                      >
                        {ot ? (BOOK_SHORT[ot.id] || ot.name) : ''}
                      </button>
                      <button
                        onClick={() => nt && setNavigatorBook(nt.id)}
                        className={`text-left pl-4 py-2 text-[15px] font-medium transition-colors ${
                          isNtSelected
                            ? 'text-accent font-bold bg-accent/10 rounded-l-lg'
                            : nt ? 'text-secondary hover:text-primary' : 'pointer-events-none'
                        }`}
                        disabled={!nt}
                      >
                        {nt ? (BOOK_SHORT[nt.id] || nt.name) : ''}
                      </button>
                    </React.Fragment>
                  );

                  {/* Full-width chapter grid if this row's book is selected */}
                  if ((isOtSelected || isNtSelected) && selectedBookData) {
                    rows.push(
                      <div
                        key="chapter-grid"
                        ref={chapterGridRef}
                        className="py-3 px-2 border-y border-glass-border/50 my-1"
                        style={{ gridColumn: '1 / -1' }}
                      >
                        <div className="grid grid-cols-7 gap-1.5 max-w-xs mx-auto">
                          {Array.from({ length: selectedBookData.chapters }, (_, j) => j + 1).map(ch => {
                            const isCurrent = navigatorBook === bookId && ch === chapter;
                            return (
                              <button
                                key={ch}
                                onClick={() => handleNavigate(navigatorBook, ch)}
                                className={`aspect-square rounded-lg text-base font-bold transition-all flex items-center justify-center ${
                                  isCurrent
                                    ? 'bg-accent text-white shadow-lg shadow-accent/30'
                                    : 'text-secondary hover:bg-glass-bg hover:text-primary'
                                }`}
                              >
                                {ch}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                }

                return rows;
              })()}
            </div>
          </div>
        </div>
      )}

      {showCrossReferences && (
        <CrossReferenceModal 
          verseRefs={showCrossReferences}
          onClose={() => setShowCrossReferences(null)}
          onNavigateToVerse={(navBookId, ch, v) => {
            setShowCrossReferences(null);
            setSelectedVerses([]); // Ensure we drop the previous selection so the toast disappears!
            
            let originalVerse = '';
            if (showCrossReferences && showCrossReferences.length > 0) {
               // Extract the original verse from the reference string
               // e.g., "romans 1:1" -> "1"
               const refParts = showCrossReferences[0].split(':');
               if (refParts.length > 1) {
                 originalVerse = refParts[1];
               }
            }

            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.set('readerBook', navBookId);
              next.set('readerChapter', ch.toString());
              next.set('highlightVerse', v.toString());
              next.set('returnBook', bookId);
              next.set('returnChapter', chapter.toString());
              if (originalVerse) {
                next.set('returnVerse', originalVerse);
              }
              return next;
            }, { replace: true });

            if (navBookId === bookId && ch === chapter) {
              setTimeout(() => {
                const el = document.querySelector(`[data-verse="${v}"]`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('bg-green-500/30', 'transition-colors', 'duration-1000');
                  setTimeout(() => el.classList.remove('bg-green-500/30'), 2500);
                }
              }, 50);
            }
          }}
        />
      )}

      {returnBook && returnChapter && selectedVerses.length === 0 && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-8 pt-6 px-4 pointer-events-none transition-all duration-300 animate-in slide-in-from-bottom fade-in bg-gradient-to-t from-background via-background/80 to-transparent"
        >
          <div className="bg-[#414141] text-white shadow-xl rounded-full px-5 py-3.5 flex items-center gap-4 pointer-events-auto">
            <button 
              onClick={() => {
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.set('readerBook', returnBook);
                  next.set('readerChapter', returnChapter);
                  next.delete('returnBook');
                  next.delete('returnChapter');
                  next.delete('returnVerse');
                  next.delete('highlightVerse');
                  if (returnVerse) {
                    next.set('highlightVerse', returnVerse);
                  }
                  return next;
                }, { replace: true });
                
                // If returning to same chapter, manually scroll
                if (returnBook === bookId && returnChapter === chapter.toString()) {
                  setTimeout(() => {
                    const el = document.querySelector(`[data-verse="${returnVerse}"]`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('bg-green-500/30', 'transition-colors', 'duration-1000');
                      setTimeout(() => el.classList.remove('bg-green-500/30'), 2500);
                    }
                  }, 50);
                }
              }}
              className="text-[15px] font-medium transition-colors"
            >
              Click here to go back to <span className="font-bold">{ALL_BOOKS.find(b => b.id === returnBook)?.name || returnBook} {returnChapter}:{returnVerse || ''}</span>
            </button>
            <button
              onClick={() => {
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.delete('returnBook');
                  next.delete('returnChapter');
                  next.delete('returnVerse');
                  return next;
                }, { replace: true });
              }}
              className="p-1 -mr-2 -my-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-[18px] h-[18px] opacity-80" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
