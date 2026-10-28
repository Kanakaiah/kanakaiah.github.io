import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

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
    const cleanWordList = text
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .split(/\s+/)
      .filter(w => w.trim().length > 0);

    let newChunks: string[][] = [];
    if (cleanWordList.length > 14) {
      const CHUNK_SIZE = 10;
      for (let i = 0; i < cleanWordList.length; i += CHUNK_SIZE) {
        newChunks.push(cleanWordList.slice(i, i + CHUNK_SIZE));
      }
    } else {
      newChunks = [cleanWordList];
    }

    setChunks(newChunks);
    setCurrentChunkIndex(0);
    setMistakes(0);
  }, [text]);

  useEffect(() => {
    if (chunks.length === 0) return;

    const targetWords = chunks[currentChunkIndex] || [];
    const poolData = targetWords.map((word, idx) => ({
      id: `scramble-${currentChunkIndex}-${idx}-${word}`,
      word
    }));

    // Shuffle pool
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
      setFeedback("Place all words into the slots before checking order.");
      return;
    }

    const isCorrect = placedWords.every(
      (item, idx) => item.word.toLowerCase() === targetWords[idx].toLowerCase()
    );

    if (isCorrect) {
      setIsSuccess(true);
      setFeedback(
        currentChunkIndex < chunks.length - 1
          ? "Correct! Moving to next section..."
          : "Excellent! You put all the words in order."
      );

      setTimeout(() => {
        if (currentChunkIndex < chunks.length - 1) {
          setCurrentChunkIndex(prev => prev + 1);
        } else if (onComplete) {
          const totalWords = chunks.flat().length;
          const acc = totalWords + mistakes > 0 ? totalWords / (totalWords + mistakes) : 1;
          onComplete(Math.min(1, Math.max(0, acc)));
        }
      }, 750);
    } else {
      setMistakes(prev => prev + 1);
      setFeedback("The order is not quite right. Tap words to return them to the bank.");
    }
  };

  if (chunks.length === 0) return null;

  const remainingSlots = Math.max(0, targetWords.length - placedWords.length);

  return (
    <div className="flex flex-col gap-5 w-full items-center select-none py-1">
      {/* Instruction & Reset Row */}
      <div className="flex items-center justify-between w-full">
        <span className="text-xs text-[#A89F91] font-medium">
          {chunks.length > 1
            ? `Put the words in order. (Part ${currentChunkIndex + 1} of ${chunks.length})`
            : 'Put the words in order.'}
        </span>

        {placedWords.length > 0 && !isSuccess && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] text-[#8C8273] hover:text-[#D4A359] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Target Word Slot Board */}
      <div
        className={`w-full min-h-[120px] p-4 rounded-2xl bg-[#1A1815] border flex flex-wrap gap-2.5 items-center transition-colors ${
          isSuccess ? 'border-[#D4A359]' : 'border-[#2C2720]'
        }`}
      >
        {placedWords.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleRemoveWord(item)}
            className="px-3 py-1.5 rounded-lg bg-[#D4A359] text-[#14120E] text-sm font-bold shadow hover:brightness-105 active:scale-95 transition-all"
            title="Tap to return to bank"
          >
            {item.word}
          </button>
        ))}

        {Array.from({ length: remainingSlots }).map((_, i) => (
          <div
            key={`empty-slot-${i}`}
            className="h-9 w-14 rounded-lg border border-dashed border-[#38322A] flex items-center justify-center text-[#4A4237] text-sm"
          >
            ·
          </div>
        ))}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-center border ${
            isSuccess
              ? 'bg-[#D4A359]/15 border-[#D4A359] text-[#D4A359]'
              : 'bg-red-500/15 border-red-500/50 text-red-400'
          }`}
        >
          {feedback}
        </div>
      )}

      {/* Word Bank Pool */}
      {bankWords.length > 0 && (
        <div className="flex flex-col gap-2 w-full mt-2">
          <span className="text-[10px] font-bold tracking-wider text-[#8C8273] uppercase">
            Word Bank
          </span>
          <div className="flex flex-wrap gap-2.5">
            {bankWords.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePlaceWord(item)}
                className="px-3.5 py-2 rounded-lg bg-[#221F1B] border border-[#38322A] text-sm font-medium text-[#F5F2EB] hover:border-[#D4A359] active:scale-95 transition-all shadow-sm"
              >
                {item.word}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Check order Button */}
      <button
        type="button"
        onClick={handleCheckOrder}
        disabled={placedWords.length === 0 || isSuccess}
        className="w-full h-12 mt-4 rounded-xl bg-[#D4A359] text-[#14120E] text-sm font-bold shadow-lg hover:brightness-105 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {isSuccess ? "Correct!" : "Check order"}
      </button>
    </div>
  );
};
