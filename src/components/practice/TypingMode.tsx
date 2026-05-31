import React, { useState, useMemo } from 'react';

interface TypingModeProps {
  text: string;
}

export const TypingMode: React.FC<TypingModeProps> = ({ text }) => {
  const [input, setInput] = useState('');
  
  // Create a clean version of the target text (alphanumeric only for lenient comparison)
  const targetWords = useMemo(() => text.split(/(\s+)/).filter(w => w.trim().length > 0), [text]);
  const inputWords = useMemo(() => input.split(/\s+/).filter(w => w.trim().length > 0), [input]);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-xl leading-relaxed whitespace-pre-wrap">
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
        onChange={(e) => setInput(e.target.value)}
        placeholder="Start typing the verse here..."
        className="w-full min-h-[150px] p-4 rounded-xl bg-background border border-glass-border focus:outline-none focus:ring-2 focus:ring-accent transition-all text-primary placeholder:text-muted resize-none text-lg"
      />
    </div>
  );
};
