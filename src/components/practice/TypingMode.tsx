import React, { useState, useMemo } from 'react';

interface TypingModeProps {
  text: string;
  /** Percentage of the verse's words typed correctly, reported as they're typed.
   * This component has always known exactly how the attempt went — it colours every
   * word green, yellow or red — and the number was never passed anywhere, so the
   * screen went on to ask "How well did you remember it?" as though nothing were
   * known. Self-grading is reliably optimistic; this is free ground truth. */
  onAccuracy?: (percent: number) => void;
}

const normalize = (word: string) => word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

export const TypingMode: React.FC<TypingModeProps> = ({ text, onAccuracy }) => {
  const [input, setInput] = useState('');

  // Create a clean version of the target text (alphanumeric only for lenient comparison)
  const targetWords = useMemo(() => text.split(/(\s+)/).filter(w => w.trim().length > 0), [text]);
  const inputWords = useMemo(() => input.split(/\s+/).filter(w => w.trim().length > 0), [input]);

  // Reported from the change handler rather than an effect: an effect keyed on a
  // parent-supplied callback re-fires whenever the parent re-renders with a fresh
  // lambda, and there is nothing to synchronise here anyway.
  const handleChange = (value: string) => {
    setInput(value);
    if (!onAccuracy) return;
    const typed = value.split(/\s+/).filter(w => w.trim().length > 0);
    const correct = targetWords.reduce(
      (n, word, i) => n + (typed[i] && normalize(typed[i]) === normalize(word) ? 1 : 0), 0);
    onAccuracy(targetWords.length ? Math.round((correct / targetWords.length) * 100) : 0);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-lg leading-relaxed whitespace-pre-wrap">
        {targetWords.map((word, idx) => {
          const cleanTarget = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const cleanInput = inputWords[idx] ? inputWords[idx].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : null;
          
          let colorClass = 'text-muted opacity-50'; // untyped
          
          if (cleanInput !== null) {
            if (cleanInput === cleanTarget) {
              colorClass = 'text-green-500 font-bold'; // correct
            } else if (cleanTarget.startsWith(cleanInput)) {
              colorClass = 'text-yellow-500'; // typing in progress correctly
            } else {
              colorClass = 'text-red-500 line-through opacity-70'; // wrong
            }
          }

          return (
            <React.Fragment key={idx}>
              <span className={`transition-colors ${colorClass}`}>{word}</span>
              {' '}
            </React.Fragment>
          );
        })}
      </div>

      <textarea
        value={input}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start typing the verse here..."
        className="w-full min-h-[150px] p-5 rounded-md bg-card border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors duration-200 text-primary placeholder:text-muted/60 resize-none text-lg shadow-sm"
      />
    </div>
  );
};
