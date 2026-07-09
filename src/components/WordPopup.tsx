import { useEffect, useCallback, type ReactNode } from 'react';
import { ArrowRight, X } from 'lucide-react';

interface StrongsDefinition {
  lemma: string;
  xlit?: string;
  pron?: string;
  strongs_def: string;
  kjv_def: string;
  derivation?: string;
  pos?: string;
}

interface WordPopupProps {
  word: string;
  strongsNumber: string;
  definition: StrongsDefinition;
  onClose: () => void;
  onViewOccurrences: (strongsNumber: string) => void;
}

/**
 * Parses Strong's references (e.g. G1234, H5678, G1234 (word)) in a text string
 * and returns an array of React elements with styled spans for each reference.
 */
function formatStrongsRefs(text: string): ReactNode[] {
  // Match patterns like G1234, H5678, or G1234 (some word)
  const regex = /([GH]\d+)(\s*\([^)]*\))?/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push the text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    parts.push(
      <span
        key={`ref-${match.index}`}
        className="text-accent font-medium cursor-pointer hover:underline"
      >
        {fullMatch}
      </span>
    );

    lastIndex = match.index + fullMatch.length;
  }

  // Push any remaining text after the last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function WordPopup({
  word,
  strongsNumber,
  definition: def,
  onClose,
  onViewOccurrences,
}: WordPopupProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Dark overlay backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="relative z-10 bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300 flex flex-col"
        style={{ maxHeight: '60vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-glass-border" />
        </div>

        {/* Close button (top-right corner) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 p-1.5 rounded-full hover:bg-glass-bg transition-colors"
        >
          <X className="w-4 h-4 text-secondary" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* 1. Header row: Lemma + POS badge */}
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-3xl font-serif text-accent-light">
              {def.lemma}
            </h2>
            {def.pos && (
              <span className="bg-accent/15 text-accent text-xs font-bold px-2 py-0.5 rounded-full uppercase shrink-0 mt-1">
                {def.pos}
              </span>
            )}
          </div>

          {/* 2. Transliteration row */}
          {(def.xlit || def.pron) && (
            <div className="text-sm text-secondary mb-4">
              {def.xlit && <span>{def.xlit}</span>}
              {def.xlit && def.pron && <span> </span>}
              {def.pron && <span>/ {def.pron} /</span>}
            </div>
          )}

          {/* 3. "Translated as" label + English word */}
          <div className="mb-4">
            <span className="text-xs uppercase tracking-wider text-accent font-bold">
              Translated as
            </span>
            <h3 className="text-xl font-bold text-primary mt-0.5">
              &ldquo;{word}&rdquo;
            </h3>
          </div>

          {/* 4. Definition section */}
          <div className="bg-card-elevated rounded-xl p-4 border border-card-border mb-4">
            <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-2">
              Definition
            </h4>
            <p className="text-base text-primary leading-relaxed">
              {formatStrongsRefs(def.strongs_def)}
            </p>
          </div>

          {/* 5. Derivation section */}
          {def.derivation && (
            <div className="mb-4">
              <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-1">
                Derivation
              </h4>
              <p className="text-sm text-secondary leading-relaxed">
                {formatStrongsRefs(def.derivation)}
              </p>
            </div>
          )}

          {/* 6. KJV Translations */}
          {def.kjv_def && (
            <div className="mb-5">
              <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-1">
                KJV Translations
              </h4>
              <p className="text-sm text-secondary italic">{def.kjv_def}</p>
            </div>
          )}

          {/* 7. View all occurrences button */}
          <button
            onClick={() => onViewOccurrences(strongsNumber)}
            className="w-full py-3 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            View all occurrences
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* 8. Source citation */}
          <p className="text-[0.625rem] text-muted text-center italic mt-4">
            Strong&rsquo;s Exhaustive Concordance (1890)
          </p>
        </div>
      </div>
    </div>
  );
}
