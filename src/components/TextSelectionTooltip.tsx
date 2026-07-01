import { useState, useEffect, useRef } from 'react';
import { BookOpen } from 'lucide-react';

interface TextSelectionTooltipProps {
  onOriginalWordLookup: (verseRef: { book: number; chapter: number; verse: number }) => void;
}

export function TextSelectionTooltip({ onOriginalWordLookup }: TextSelectionTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedVerseRef, setSelectedVerseRef] = useState<{ book: number; chapter: number; verse: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
        setPosition(null);
        setSelectedVerseRef(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Try to find if the selection is within a verse container
      // Use startContainer instead of commonAncestorContainer to handle cross-verse selections
      let container = range.startContainer as HTMLElement;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement as HTMLElement;
      }

      const verseContainer = container.closest('[data-verse-ref]');
      
      if (verseContainer) {
        const refStr = verseContainer.getAttribute('data-verse-ref');
        if (refStr) {
          const [book, chapter, verse] = refStr.split('-').map(Number);
          setSelectedVerseRef({ book, chapter, verse });
          setPosition({ top: 0, left: 0 }); // Fixed position doesn't need these, just non-null
        }
      } else {
        setPosition(null);
        setSelectedVerseRef(null);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Don't close if clicking inside the tooltip
      if (tooltipRef.current && tooltipRef.current.contains(e.target as Node)) {
        return;
      }
    };

    // Use a small timeout to let the browser complete selection
    const debouncedSelectionChange = () => {
      setTimeout(handleSelectionChange, 50);
    };

    document.addEventListener('selectionchange', debouncedSelectionChange);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('selectionchange', debouncedSelectionChange);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  if (!position || !selectedVerseRef) return null;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[100] bottom-24 left-1/2 transform -translate-x-1/2 flex items-center bg-surface border border-card-border shadow-[0_10px_40px_rgba(235,186,113,0.2)] rounded-full overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300"
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOriginalWordLookup(selectedVerseRef);
          window.getSelection()?.removeAllRanges();
          setPosition(null);
        }}
        className="flex items-center gap-2 px-6 py-3 hover:bg-card-border transition-colors text-sm font-bold text-accent-light uppercase tracking-wider"
      >
        <BookOpen className="w-5 h-5" />
        Study Original Words
      </button>
    </div>
  );
}
