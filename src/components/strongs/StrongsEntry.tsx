import { ArrowRight } from 'lucide-react';
import type { StrongsDefinition } from '../../utils/strongs';
import { StrongsRefText } from './StrongsRefText';

interface StrongsEntryProps {
  /** The English word this definition was reached through. */
  word: string;
  definition: StrongsDefinition;
  /**
   * 'sheet' is the reader's single-word popup, which leads with the lemma; 'card' is a
   * row in the per-verse list, which leads with the English word. Same content, two
   * arrangements — the surfaces looked different before they shared this code, and
   * keeping both is deliberate.
   */
  layout: 'sheet' | 'card';
  onRefClick: (ref: string) => void;
  loadingRef?: string | null;
  onViewOccurrences: () => void;
}

export function StrongsEntry({
  word,
  definition: def,
  layout,
  onRefClick,
  loadingRef,
  onViewOccurrences,
}: StrongsEntryProps) {
  const definitionText = <StrongsRefText text={def.strongs_def} onRefClick={onRefClick} loadingRef={loadingRef} />;
  const derivationText = def.derivation
    ? <StrongsRefText text={def.derivation} onRefClick={onRefClick} loadingRef={loadingRef} />
    : null;

  if (layout === 'sheet') {
    return (
      <>
        {/* Header row: Lemma + POS badge */}
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-3xl font-serif text-accent-light">{def.lemma}</h2>
          {def.pos && (
            <span className="bg-accent/15 text-accent text-xs font-bold px-2 py-0.5 rounded-full uppercase shrink-0 mt-1">
              {def.pos}
            </span>
          )}
        </div>

        {/* Transliteration row */}
        {(def.xlit || def.pron) && (
          <div className="text-sm text-secondary mb-4">
            {def.xlit && <span>{def.xlit}</span>}
            {def.xlit && def.pron && <span> </span>}
            {def.pron && <span>/ {def.pron} /</span>}
          </div>
        )}

        {/* "Translated as" label + English word */}
        <div className="mb-4">
          <span className="text-xs uppercase tracking-wider text-accent font-bold">Translated as</span>
          <h3 className="text-xl font-bold text-primary mt-0.5">&ldquo;{word}&rdquo;</h3>
        </div>

        <div className="bg-card-elevated rounded-md p-4 border border-card-border mb-4">
          <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-2">Definition</h4>
          <p className="text-base text-primary leading-relaxed">{definitionText}</p>
        </div>

        {derivationText && (
          <div className="mb-4">
            <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-1">Derivation</h4>
            <p className="text-sm text-secondary leading-relaxed">{derivationText}</p>
          </div>
        )}

        {def.kjv_def && (
          <div className="mb-5">
            <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-1">KJV Translations</h4>
            <p className="text-sm text-secondary italic">{def.kjv_def}</p>
          </div>
        )}

        <button
          onClick={onViewOccurrences}
          className="w-full py-3 bg-accent/10 hover:bg-accent/20 text-accent rounded-md font-bold transition-colors flex items-center justify-center gap-2"
        >
          View all occurrences
          <ArrowRight className="w-4 h-4" />
        </button>
      </>
    );
  }

  return (
    <div className="px-5 py-6 border-b border-card-border last:border-b-0">
      <div className="flex items-end justify-between mb-4">
        <div className="flex-1 pr-4">
          <span className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">Translated as</span>
          <h3 className="text-2xl font-bold text-primary">"{word}"</h3>
        </div>
        <div className="text-right flex-shrink-0">
          <h2 className="text-4xl font-serif text-accent-light mb-1">{def.lemma}</h2>
          <div className="text-sm text-secondary">
            <span className="font-medium text-primary mr-1">{def.xlit}</span>
            {def.pron && <span>/{def.pron}/</span>}
          </div>
        </div>
      </div>

      <div className="bg-card-elevated rounded-md p-5 border border-card-border mt-4">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-xs uppercase tracking-wider text-accent font-bold">Definition</h4>
          {def.pos && (
            <span className="bg-accent/15 text-accent text-[0.65rem] font-bold px-2 py-0.5 rounded-full uppercase">
              {def.pos}
            </span>
          )}
        </div>
        <p className="text-base text-primary leading-relaxed">{definitionText}</p>

        {derivationText && (
          <div className="mt-4">
            <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-1">Derivation</h4>
            <p className="text-sm text-secondary leading-relaxed">{derivationText}</p>
          </div>
        )}

        {def.kjv_def && (
          <div className="mt-4">
            <h4 className="text-xs uppercase tracking-wider text-accent font-bold mb-1">KJV Translations</h4>
            <p className="text-sm text-secondary italic">{def.kjv_def}</p>
          </div>
        )}

        <button
          onClick={onViewOccurrences}
          className="mt-6 w-full py-3 bg-accent/10 hover:bg-accent/20 text-accent hover:text-accent-light rounded-md font-bold tracking-wide transition-colors flex items-center justify-center gap-2"
        >
          View all occurrences
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
