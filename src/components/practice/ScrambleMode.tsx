import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';

interface ScrambleModeProps {
  text: string;
}

export const ScrambleMode: React.FC<ScrambleModeProps> = ({ text }) => {
  const [pool, setPool] = useState<{ id: string, word: string }[]>([]);
  const [assembled, setAssembled] = useState<{ id: string, word: string }[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const words = useMemo(() => {
    return text.split(/(\s+)/).filter(w => w.trim().length > 0);
  }, [text]);

  useEffect(() => {
    const wordObjs = words.map((w, i) => ({ id: `${i}-${w}`, word: w }));
    setPool([...wordObjs].sort(() => Math.random() - 0.5));
    setAssembled([]);
    setIsCorrect(null);
  }, [words]);

  const moveToAssembled = (item: { id: string, word: string }) => {
    setPool(pool.filter(p => p.id !== item.id));
    setAssembled([...assembled, item]);
    setIsCorrect(null);
  };

  const moveToPool = (item: { id: string, word: string }) => {
    setAssembled(assembled.filter(a => a.id !== item.id));
    setPool([...pool, item]);
    setIsCorrect(null);
  };

  const checkOrder = () => {
    if (assembled.length !== words.length) {
      setIsCorrect(false);
      return;
    }
    const currentStr = assembled.map(a => a.word).join(" ");
    const targetStr = words.join(" ");
    setIsCorrect(currentStr === targetStr);
  };

  const reset = () => {
    const wordObjs = words.map((w, i) => ({ id: `${i}-${w}`, word: w }));
    setPool([...wordObjs].sort(() => Math.random() - 0.5));
    setAssembled([]);
    setIsCorrect(null);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Assembled Area */}
      <div className="min-h-[120px] p-4 rounded-xl border-2 border-dashed border-glass-border bg-background flex flex-wrap gap-2 items-start content-start">
        {assembled.map(item => (
          <button
            key={item.id}
            onClick={() => moveToPool(item)}
            className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm shadow hover:scale-105 transition-transform"
          >
            {item.word}
          </button>
        ))}
        {assembled.length === 0 && (
          <span className="text-muted text-sm w-full text-center mt-8">Tap words from the pool below to assemble them here.</span>
        )}
      </div>

      {/* Pool Area */}
      <div className="p-4 rounded-xl bg-glass-bg flex flex-wrap gap-2 justify-center">
        {pool.map(item => (
          <button
            key={item.id}
            onClick={() => moveToAssembled(item)}
            className="px-3 py-1.5 bg-background border border-glass-border text-primary rounded-lg text-sm shadow-sm hover:scale-105 transition-transform hover:border-accent hover:text-accent"
          >
            {item.word}
          </button>
        ))}
        {pool.length === 0 && (
          <span className="text-muted text-sm w-full text-center py-2">All words placed.</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={reset}>Reset</Button>
        <div className="flex items-center gap-4">
          {isCorrect === true && <span className="text-green-500 font-bold">Perfect!</span>}
          {isCorrect === false && <span className="text-red-500 font-bold">Not quite right.</span>}
          <Button onClick={checkOrder} disabled={assembled.length === 0}>Check Order</Button>
        </div>
      </div>
    </div>
  );
};
