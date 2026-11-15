import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { studyThoughts } from '../../utils/studyText';

interface ScrambleModeProps {
  text: string;
  onComplete?: (accuracy: number) => void;
}

export const ScrambleMode: React.FC<ScrambleModeProps> = ({ text, onComplete }) => {
  const [chunks, setChunks] = useState<string[][]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);

  const [placedWords, setPlacedWords] = useState<{ id: string; word: string }[]>([]);
  const [bankWords, setBankWords] = useState<{ id: string; word: string }[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    const thoughtChunks = studyThoughts(text)
      .map(t =>
        t
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
          .trim()
          .split(/\s+/)
          .filter(w => w.length > 0)
      )
      .filter(chunk => chunk.length > 0);

    setChunks(thoughtChunks.length > 0 ? thoughtChunks : [[]]);
    setCurrentChunkIndex(0);
    setMistakes(0);
  }, [text]);

  useEffect(() => {
    if (chunks.length === 0) return;

    const targetWords = chunks[currentChunkIndex] || [];
    const poolData = targetWords.map((word, idx) => ({
      id: `scramble-${currentChunkIndex}-${idx}-${word}`,
      word,
    }));

    setBankWords([...poolData].sort(() => Math.random() - 0.5));
    setPlacedWords([]);
    setFeedback(null);
    setIsSuccess(false);
  }, [chunks, currentChunkIndex]);

  const targetWords = chunks[currentChunkIndex] || [];

  const handlePlaceWord = (item: { id: string; word: string }) => {
    if (isSuccess) return;
    setBankWords(prev => prev.filter(w => w.id !== item.id));
    setPlacedWords(prev => [...prev, item]);
    setFeedback(null);
  };

  const handleRemoveWord = (item: { id: string; word: string }) => {
    if (isSuccess) return;
    setPlacedWords(prev => prev.filter(w => w.id !== item.id));
    setBankWords(prev => [...prev, item]);
    setFeedback(null);
  };

  const handleReset = () => {
    setBankWords(prev => [...prev, ...placedWords]);
    setPlacedWords([]);
    setFeedback(null);
  };

  const handleCheckOrder = () => {
    if (placedWords.length < targetWords.length) {
      setFeedback('Place all words into the slots before checking order.');
      return;
    }

    const isCorrect = placedWords.every(
      (item, idx) => item.word.toLowerCase() === targetWords[idx].toLowerCase()
    );

    if (isCorrect) {
      setIsSuccess(true);
      setFeedback(
        currentChunkIndex < chunks.length - 1
          ? 'Correct! Moving to next thought…'
          : 'Excellent! You put all the words in order.'
      );

      setTimeout(() => {
        if (currentChunkIndex < chunks.length - 1) {
          setCurrentChunkIndex(prev => prev + 1);
        } else if (onComplete) {
          const totalWords = chunks.flat().length;
          const acc = totalWords + mistakes > 0 ? totalWords / (totalWords + mistakes) : 1;
          onComplete(Math.min(1, Math.max(0, acc)));
        }
      }, 700);
    } else {
      setMistakes(prev => prev + 1);
      setFeedback('The order is not quite right. Tap words to return them to the bank.');
    }
  };

  if (chunks.length === 0 || targetWords.length === 0) return null;

  const remainingSlots = Math.max(0, targetWords.length - placedWords.length);

  return (
    <div className="flex flex-col gap-5 w-full items-center select-none py-1">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs text-secondary font-medium">
          {chunks.length > 1
            ? `Put the words in order. (Thought ${currentChunkIndex + 1} of ${chunks.length})`
            : 'Put the words in order.'}
        </span>

        {placedWords.length > 0 && !isSuccess && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-secondary hover:text-accent transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      <div
        className={`w-full min-h-[120px] p-4 rounded-2xl bg-card border flex flex-wrap gap-2.5 items-center transition-colors ${
          isSuccess ? 'border-accent' : 'border-card-border'
        }`}
      >
        {placedWords.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleRemoveWord(item)}
            className="px-3 py-1.5 rounded-lg bg-accent text-[#141414] text-sm font-bold shadow hover:opacity-95 active:scale-95 transition-all"
            title="Tap to return to bank"
          >
            {item.word}
          </button>
        ))}

        {Array.from({ length: remainingSlots }).map((_, i) => (
          <div
            key={`empty-slot-${i}`}
            className="h-9 w-14 rounded-lg border border-dashed border-card-border flex items-center justify-center text-muted text-sm"
          >
            ·
          </div>
        ))}
      </div>

      {feedback && (
        <div
          className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-center border ${
            isSuccess
              ? 'bg-accent/15 border-accent text-accent'
              : 'bg-red-500/15 border-red-500/40 text-red-400'
          }`}
        >
          {feedback}
        </div>
      )}

      {bankWords.length > 0 && (
        <div className="flex flex-col gap-2 w-full mt-1">
          <span className="text-[10px] font-bold tracking-wider text-muted uppercase">
            Word Bank
          </span>
          <div className="flex flex-wrap gap-2.5">
            {bankWords.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePlaceWord(item)}
                className="px-3.5 py-2 rounded-lg bg-card-elevated border border-card-border text-sm font-medium text-primary hover:border-accent active:scale-95 transition-all shadow-sm"
              >
                {item.word}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={placedWords.length < targetWords.length || isSuccess}
        onClick={handleCheckOrder}
        className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-accent text-[#141414] font-bold text-sm disabled:opacity-40 transition-opacity"
      >
        Check order
      </button>
    </div>
  );
};
