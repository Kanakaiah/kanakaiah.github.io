import { useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { StrongsEntry } from './strongs/StrongsEntry';
import { StrongsOccurrencesModal } from './StrongsOccurrencesModal';
import { useStrongsOccurrences } from './strongs/useStrongsOccurrences';
import { normalizeStrongsRef, type StrongsDefinition } from '../utils/strongs';

interface WordPopupProps {
  word: string;
  strongsNumber: string;
  definition: StrongsDefinition;
  onClose: () => void;
  onViewOccurrences: (strongsNumber: string) => void;
  onNavigateToVerse?: (bookId: string, chapter: number, verse: number) => void;
}

/**
 * The reader's single-word sheet: tap an underlined word in alpha mode. Its definition
 * body and its cross-reference handling are shared with the per-verse list in
 * OriginalWordModal; what's local here is the bottom-sheet presentation.
 */
export function WordPopup({
  word,
  strongsNumber,
  definition: def,
  onClose,
  onViewOccurrences,
  onNavigateToVerse,
}: WordPopupProps) {
  // --- Drag-to-dismiss state ---
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    // Only allow dragging downward
    setDragY(Math.max(0, delta));
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
    dragStartY.current = null;
  }, [dragY, onClose]);

  // This popup holds exactly one definition, so it can answer for its own word and
  // leave everything else to the shared dictionary.
  const resolveLemma = useCallback(
    (ref: string) => (ref === normalizeStrongsRef(strongsNumber) ? def.lemma : undefined),
    [strongsNumber, def.lemma]
  );
  const { occurrence, loadingRef, openOccurrences, closeOccurrences } = useStrongsOccurrences(resolveLemma);

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="sheet"
      size="sm"
      panelStyle={{
        maxHeight: '60vh',
        transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        transition: dragY > 0 ? 'none' : 'transform 0.2s ease-out',
      }}
      panelProps={{
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
      }}
    >
      <>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-card-border" />
        </div>

        {/* Close button (top-right corner) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 p-1.5 rounded-full hover:bg-card-hover transition-colors"
        >
          <X className="w-4 h-4 text-secondary" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <StrongsEntry
            word={word}
            definition={def}
            layout="sheet"
            onRefClick={openOccurrences}
            loadingRef={loadingRef}
            onViewOccurrences={() => onViewOccurrences(strongsNumber)}
          />

          {/* Source citation */}
          <p className="text-[0.625rem] text-muted text-center italic mt-4">
            Strong&rsquo;s Exhaustive Concordance (1890)
          </p>
        </div>

        {/* Occurrences for a cross-reference tapped inside a definition */}
        {occurrence && (
          <StrongsOccurrencesModal
            strongsNumber={occurrence.ref}
            lemma={occurrence.lemma}
            onClose={closeOccurrences}
            onNavigateToVerse={onNavigateToVerse || (() => {})}
          />
        )}
      </>
    </Modal>
  );
}
