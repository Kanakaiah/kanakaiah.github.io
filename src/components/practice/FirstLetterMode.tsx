import React, { useEffect, useMemo, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { CueText } from './CueText';
import { initialCue } from '../../utils/studyText';

export interface FirstLetterModeProps {
  text: string;
  onComplete?: (revealedRatio: number) => void;
  previouslySeen?: number[];
  onSeenChanged?: (seen: number[], total: number) => void;
  interactive?: boolean;
}

/**
 * First-letter cue surface.
 *
 * When rendered in interactive Practice mode (`interactive` or `onComplete` supplied),
 * follows the Android scaffold: progressive 1/4–4/4 Hint levels, tap-to-reveal word chips
 * tracking exposed word indices, and a "Try without hints" step before checking.
 * Static callers (like MemorySentence) still render the accessible CueText display.
 */
export const FirstLetterMode: React.FC<FirstLetterModeProps> = ({
  text,
  onComplete,
  previouslySeen = [],
  onSeenChanged,
  interactive = false,
}) => {
  const isInteractive = interactive || Boolean(onComplete);
  const words = useMemo(
    () =>
      text
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0),
    [text]
  );

  const [tryingWithoutHints, setTryingWithoutHints] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [manuallyRevealed, setManuallyRevealed] = useState<number[]>([]);
  const [seen, setSeen] = useState<number[]>(() =>
    previouslySeen.filter(i => i >= 0 && i < words.length)
  );

  useEffect(() => {
    setTryingWithoutHints(false);
    setHintLevel(0);
    setManuallyRevealed([]);
    setSeen(previouslySeen.filter(i => i >= 0 && i < words.length));
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isInteractive) {
    return <CueText text={text} level="first-letters" />;
  }

  const recordSeen = (indices: number[]) => {
    const next = Array.from(new Set([...seen, ...indices]))
      .filter(i => i >= 0 && i < words.length)
      .sort((a, b) => a - b);
    if (next.length !== seen.length) {
      setSeen(next);
      onSeenChanged?.(next, words.length);
    }
  };

  const hintRevealedCount =
    hintLevel === 0 ? 0 : Math.min(words.length, Math.ceil(words.length * (hintLevel * 0.25)));

  const handleCycleHint = () => {
    const nextLevel = hintLevel >= 4 ? 0 : hintLevel + 1;
    setHintLevel(nextLevel);
    if (nextLevel > 0) {
      const count = Math.min(words.length, Math.ceil(words.length * (nextLevel * 0.25)));
      recordSeen(Array.from({ length: count }, (_, i) => i));
    }
  };

  const toggleWord = (idx: number) => {
    recordSeen([idx]);
    setManuallyRevealed(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const revealedRatio = words.length > 0 ? seen.length / words.length : 0;

  return (
    <div className="flex flex-col gap-5 w-full">
      {!tryingWithoutHints && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleCycleHint}
            className="self-start inline-flex items-center gap-2 text-sm font-semibold text-accent hover:opacity-85 transition-opacity"
          >
            <Lightbulb className="w-4 h-4" />
            <span>
              {hintLevel === 0
                ? 'Hint'
                : hintLevel < 4
                ? `Hint ${hintLevel}/4`
                : 'Full hint'}
            </span>
          </button>
          <p className="text-xs text-secondary">
            {seen.length} {seen.length === 1 ? 'word' : 'words'} revealed · Practice with help
          </p>
        </div>
      )}

      {tryingWithoutHints ? (
        <div className="rounded-2xl bg-card-elevated border border-card-border p-6">
          <p className="font-heading font-bold text-xl text-primary">
            Recall the whole passage without the initials.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 py-2">
          {words.map((word, index) => {
            const revealed = index < hintRevealedCount || manuallyRevealed.includes(index);
            const cued = initialCue(word);
            return (
              <button
                key={`${index}-${word}`}
                type="button"
                onClick={() => toggleWord(index)}
                aria-pressed={revealed}
                aria-label={revealed ? `${word}, revealed` : `Reveal word ${index + 1}, initial ${cued}`}
                className={`min-h-[44px] px-2.5 py-1.5 rounded-lg font-serif text-lg transition-colors ${
                  revealed
                    ? 'bg-accent/15 border border-accent/50 text-primary font-semibold'
                    : 'border border-transparent text-secondary hover:bg-card-elevated font-medium tracking-wide'
                }`}
              >
                {revealed ? word : cued}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2.5 pt-2">
        <p className="text-xs text-secondary text-center">
          {tryingWithoutHints
            ? 'This is still assisted practice. Check unaided recall in a later session.'
            : 'Tap an initial for help, then try the passage without hints.'}
        </p>

        <button
          type="button"
          onClick={() => {
            if (tryingWithoutHints) {
              onComplete?.(revealedRatio);
            } else {
              setTryingWithoutHints(true);
            }
          }}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-accent text-[#141414] font-bold text-sm hover:opacity-95 transition-opacity"
        >
          {tryingWithoutHints ? 'Check passage' : 'Try without hints'}
        </button>

        {tryingWithoutHints && (
          <button
            type="button"
            onClick={() => setTryingWithoutHints(false)}
            className="text-xs font-semibold text-accent hover:underline py-1"
          >
            Return to initials
          </button>
        )}
      </div>
    </div>
  );
};
