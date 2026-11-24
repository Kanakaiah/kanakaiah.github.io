import React, { useEffect, useMemo, useState } from 'react';
import { studyThoughts } from '../../utils/studyText';

interface EraserModeProps {
  text: string;
  onComplete?: (hiddenRatio: number) => void;
}

const PRESETS = [
  { value: 25, label: 'Some words' },
  { value: 50, label: 'One thought' },
  { value: 100, label: 'Whole passage' },
] as const;

export const EraserMode: React.FC<EraserModeProps> = ({ text, onComplete }) => {
  const words = useMemo(
    () =>
      text
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0),
    [text]
  );

  // Longer words make a practical initial scaffold without claiming semantic weight.
  const longestFirstIndices = useMemo(
    () => words.map((_, i) => i).sort((a, b) => words[b].length - words[a].length),
    [words]
  );

  const [sliderValue, setSliderValue] = useState(25);
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setSliderValue(25);
    setManualOverrides({});
  }, [text]);

  const sliderHiddenSet = useMemo(() => {
    if (sliderValue === 50) {
      const thoughts = studyThoughts(text);
      let bestIdx = 0;
      thoughts.forEach((t, i) => {
        if (t.length > (thoughts[bestIdx]?.length || 0)) bestIdx = i;
      });
      let start = 0;
      for (let i = 0; i < bestIdx; i++) {
        start += thoughts[i]
          .trim()
          .split(/\s+/)
          .filter(Boolean).length;
      }
      const count = (thoughts[bestIdx] || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      const set = new Set<number>();
      for (let idx = start; idx < start + count && idx < words.length; idx++) {
        set.add(idx);
      }
      return set;
    }
    const hideCount = Math.min(
      words.length,
      Math.max(0, Math.round((sliderValue / 100) * words.length))
    );
    return new Set(longestFirstIndices.slice(0, hideCount));
  }, [sliderValue, text, words.length, longestFirstIndices]);

  const isWordHidden = (index: number) =>
    manualOverrides[index] !== undefined
      ? manualOverrides[index]
      : sliderHiddenSet.has(index);

  const totalHiddenCount = words.reduce((n, _, i) => n + (isWordHidden(i) ? 1 : 0), 0);
  const hiddenRatio = words.length > 0 ? totalHiddenCount / words.length : 0;

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="rounded-2xl bg-card-elevated border border-card-border p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-primary">Blanks</h3>
          <span className="text-xs font-medium text-secondary">Practice with help</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                setSliderValue(p.value);
                setManualOverrides({});
              }}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                sliderValue === p.value
                  ? 'bg-accent border-accent text-on-accent'
                  : 'bg-card border-card-border text-secondary hover:text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={sliderValue}
            onChange={e => {
              setSliderValue(Number(e.target.value));
              setManualOverrides({});
            }}
            aria-label="Percentage of words hidden"
            className="flex-1 remora-slider"
          />
          <span className="text-xs font-bold text-primary tabular-nums w-10 text-right">
            {sliderValue}%
          </span>
        </div>

        <div className="text-xs text-secondary flex flex-col gap-0.5">
          <span>Tap any word to reveal or hide</span>
          <span className="text-muted">Recall the gaps, then try without help.</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 py-1">
        {words.map((word, idx) => {
          const hidden = isWordHidden(idx);
          return (
            <button
              key={`${idx}-${word}`}
              type="button"
              onClick={() =>
                setManualOverrides(prev => ({
                  ...prev,
                  [idx]: !hidden,
                }))
              }
              aria-pressed={hidden}
              aria-label={
                hidden
                  ? 'Hidden word, tap to reveal'
                  : `${word}, activate to hide`
              }
              className={`min-h-[44px] px-2.5 py-1.5 rounded-lg font-serif text-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                hidden
                  ? 'bg-card-elevated border border-card-border text-secondary tracking-widest'
                  : 'border border-transparent text-primary hover:bg-card-elevated'
              }`}
            >
              {hidden ? '•••' : word}
            </button>
          );
        })}
      </div>

      {onComplete && (
        <div className="flex flex-col gap-2 pt-2">
          <p className="text-xs text-secondary text-center">
            Recite the verse filling in the erased gaps from memory
          </p>
          <button
            type="button"
            onClick={() => onComplete(hiddenRatio)}
            className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-accent text-on-accent font-bold text-sm hover:opacity-95 transition-opacity"
          >
            Check passage
          </button>
        </div>
      )}
    </div>
  );
};
