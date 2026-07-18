import React, { useState, useEffect } from 'react';

interface ScrambleModeProps {
  text: string;
}

export const ScrambleMode: React.FC<ScrambleModeProps> = ({ text }) => {
  const [chunks, setChunks] = useState<string[][]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  
  const [pool, setPool] = useState<{ id: string, word: string, selected: boolean }[]>([]);
  const [assembledCount, setAssembledCount] = useState(0);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const timeoutRefs = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    // 1. Clean words (mirroring legacy regex to strip punctuation)
    const cleanWordList = text
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .split(/\s+/)
      .filter(w => w.trim().length > 0);

    // 2. Chunking for long verses
    let newChunks: string[][] = [];
    if (cleanWordList.length > 15) {
      const CHUNK_SIZE = 10;
      for (let i = 0; i < cleanWordList.length; i += CHUNK_SIZE) {
        newChunks.push(cleanWordList.slice(i, i + CHUNK_SIZE));
      }
    } else {
      newChunks = [cleanWordList];
    }
    
    setChunks(newChunks);
    setCurrentChunkIndex(0);
  }, [text]);

  useEffect(() => {
    if (chunks.length === 0) return;
    
    const targetWords = chunks[currentChunkIndex];
    const poolData = targetWords.map((word, idx) => ({
      id: `scramble-${currentChunkIndex}-${idx}`,
      word,
      selected: false
    }));
    
    // Shuffle the pool
    setPool(poolData.sort(() => Math.random() - 0.5));
    setAssembledCount(0);
  }, [chunks, currentChunkIndex]);

  const targetWords = chunks[currentChunkIndex] || [];
  const isChunkComplete = assembledCount === targetWords.length && targetWords.length > 0;
  const isAllComplete = isChunkComplete && currentChunkIndex === chunks.length - 1;

  const handleChipClick = (item: { id: string, word: string, selected: boolean }) => {
    if (item.selected || isChunkComplete) return;

    const nextWordToMatch = targetWords[assembledCount];
    
    // Case-insensitive match check
    if (item.word.toLowerCase() === nextWordToMatch.toLowerCase()) {
      // Match!
      setPool(prev => prev.map(p => p.id === item.id ? { ...p, selected: true } : p));
      setAssembledCount(prev => prev + 1);
      setErrorId(null);
      
      // If chunk is complete, advance after delay
      if (assembledCount + 1 === targetWords.length) {
        if (currentChunkIndex < chunks.length - 1) {
          const t1 = setTimeout(() => {
            setCurrentChunkIndex(prev => prev + 1);
          }, 800);
          timeoutRefs.current.push(t1);
        }
      }
    } else {
      // Mismatch!
      setErrorId(item.id);
      setShake(true);
      const t2 = setTimeout(() => setShake(false), 300);
      const t3 = setTimeout(() => setErrorId(null), 600);
      timeoutRefs.current.push(t2, t3);
    }
  };

  if (chunks.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 w-full items-center">
      
      {/* Status Text */}
      <div className="text-center min-h-[24px]">
        {isAllComplete ? (
          <span className="text-green-500 font-bold">Success! You completed the sequence.</span>
        ) : isChunkComplete ? (
          <span className="text-green-500 font-medium">Part {currentChunkIndex + 1} done! Loading next...</span>
        ) : chunks.length > 1 ? (
          <span className="text-muted text-sm italic">
            Part {currentChunkIndex + 1} of {chunks.length} — Tap words in correct order
          </span>
        ) : (
          <span className="text-muted text-sm italic">
            Reconstruct the verse by tapping words in order
          </span>
        )}
      </div>

      {/* Slots Container */}
      <div 
        className={`flex flex-wrap gap-2 justify-center transition-transform ${shake ? 'animate-shake' : ''}`}
        style={{ animation: shake ? 'shake 0.3s cubic-bezier(.36,.07,.19,.97) both' : 'none' }}
      >
        {targetWords.map((_, idx) => {
          const isFilled = idx < assembledCount;
          return (
            <div 
              key={idx}
              className={`min-w-[50px] h-10 px-3 flex items-center justify-center font-medium text-sm transition-all duration-300
                ${isFilled 
                  ? 'text-primary border-b-2 border-transparent scale-105' 
                  : 'text-accent-light border-b-2 border-glass-border'
                }`}
            >
              {isFilled ? targetWords[idx] : ''}
            </div>
          );
        })}
      </div>

      {/* Pool Container */}
      <div className="flex flex-wrap gap-3 justify-center mt-6">
        {pool.map(item => {
          if (item.selected) return null;
          
          const isError = errorId === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleChipClick(item)}
              className={`px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200
                ${isError 
                  ? 'bg-red-500/10 text-red-500 border-red-500 border shadow-[0_0_8px_rgba(239,68,68,0.4)]' 
                  : 'bg-glass-bg border border-glass-border text-primary hover:scale-105 hover:border-accent hover:text-accent'
                }`}
            >
              {item.word}
            </button>
          );
        })}
      </div>

      {/* Injecting Shake Animation Keyframes */}
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-2px, 0, 0); }
          20%, 80% { transform: translate3d(4px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
          40%, 60% { transform: translate3d(6px, 0, 0); }
        }
        .animate-shake {
          animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};
