import React, { useState, useMemo, useEffect } from 'react';

interface EraserModeProps {
  text: string;
}

export const EraserMode: React.FC<EraserModeProps> = ({ text }) => {
  const [sliderValue, setSliderValue] = useState(0);
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set());

  // Tokenize text into words preserving spaces
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const wordIndices = useMemo(() => {
    const indices: number[] = [];
    words.forEach((w, i) => {
      if (w.trim().length > 0) indices.push(i);
    });
    return indices;
  }, [words]);

  // Handle slider change to recalculate random hidden indices
  useEffect(() => {
    const hideCount = Math.round((sliderValue / 100) * wordIndices.length);
    // Shuffle
    const shuffled = [...wordIndices].sort(() => 0.5 - Math.random());
    setHiddenIndices(new Set(shuffled.slice(0, hideCount)));
  }, [sliderValue, wordIndices]);

  const toggleWord = (idx: number) => {
    setHiddenIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // Sync slider roughly with manual toggles
  useEffect(() => {
    const pct = Math.round((hiddenIndices.size / wordIndices.length) * 100);
    if (Math.abs(pct - sliderValue) > 5) {
      // Avoid infinite loop by only updating if difference is significant
      // Actually it's better to NOT sync the slider when manual clicking happens, or just update local state without triggering the random reshuffle.
      // For simplicity, we just leave the slider as is, or update a visual label.
    }
  }, [hiddenIndices, wordIndices.length, sliderValue]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 bg-background p-4 rounded-xl border border-glass-border">
        <span className="text-sm font-medium text-secondary whitespace-nowrap">Hide Words:</span>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue}
          onChange={(e) => setSliderValue(parseInt(e.target.value))}
          className="flex-1 accent-accent"
        />
        <span className="text-sm font-bold text-primary w-12 text-right">{sliderValue}%</span>
      </div>

      <div className="text-lg leading-relaxed text-primary whitespace-pre-wrap">
        {words.map((word, idx) => {
          if (word.trim().length === 0) {
            return <span key={idx}>{word}</span>;
          }
          const isHidden = hiddenIndices.has(idx);
          return (
            <span
              key={idx}
              onClick={() => toggleWord(idx)}
              className={`cursor-pointer transition-all duration-200 px-1 rounded hover:bg-accent/10 ${
                isHidden ? 'bg-secondary text-transparent select-none' : ''
              }`}
              style={isHidden ? { backgroundColor: 'var(--text-muted)' } : {}}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
