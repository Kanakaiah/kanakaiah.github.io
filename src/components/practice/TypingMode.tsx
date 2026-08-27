import React, { useState, useMemo } from 'react';
import { FirstLetterMode } from './FirstLetterMode';

export interface TypingAttempt {
  /** Percentage of the verse's words typed correctly. */
  accuracy: number;
  /** Exactly what the reader wrote, kept so the review history can hold the attempt
   * itself rather than only a number derived from it. */
  committed: string;
}

interface TypingModeProps {
  text: string;
  /** Fires once, when the reader commits — not on every keystroke. */
  onAttempt?: (attempt: TypingAttempt) => void;
}

const normalize = (word: string) => word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

/**
 * Type the verse from memory, then find out how it went.
 *
 * This component used to print the entire verse above the input for the whole attempt,
 * greying out words and turning them green as they were matched. That is transcription,
 * not recall: the answer was on screen throughout, so a perfect score meant only that
 * the reader could copy. Worse, it was the app's one source of *measured* accuracy, so
 * the single number capable of checking whether self-grading is honest was itself
 * measuring nothing about memory.
 *
 * Two changes fix that, and they are the same change: the target is withheld until the
 * reader commits, and the word-by-word diff arrives with it rather than during. Feedback
 * that lands mid-attempt turns retrieval into guided copying — the colour of one word
 * tells you whether to trust the next — and retrieval practice needs the attempt to be
 * finished before it is corrected.
 *
 * What stays on screen is a first-letter cue, which is a real cue and is recorded as
 * one. Getting stuck is answered by committing what you have, not by revealing the text
 * and then rating yourself against it.
 */
export const TypingMode: React.FC<TypingModeProps> = ({ text, onAttempt }) => {
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);

  const targetWords = useMemo(() => text.split(/(\s+)/).filter(w => w.trim().length > 0), [text]);
  const typedWords = useMemo(() => input.split(/\s+/).filter(w => w.trim().length > 0), [input]);

  const correctCount = useMemo(
    () => targetWords.reduce(
      (n, word, i) => n + (typedWords[i] && normalize(typedWords[i]) === normalize(word) ? 1 : 0), 0),
    [targetWords, typedWords]
  );
  const accuracy = targetWords.length ? Math.round((correctCount / targetWords.length) * 100) : 0;

  const check = () => {
    if (checked) return;
    setChecked(true);
    onAttempt?.({ accuracy, committed: input });
  };

  if (!checked) {
    return (
      <div className="flex flex-col gap-5">
        {/* The cue, not the answer. Enough to place the verse and start recall. */}
        <div className="text-base leading-relaxed text-secondary">
          <FirstLetterMode text={text} />
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type the verse from memory…"
          aria-label="Type the verse from memory"
          className="w-full min-h-[150px] p-5 rounded-md bg-card border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors duration-200 text-primary placeholder:text-muted/60 resize-none text-lg shadow-sm"
        />

        <button
          onClick={check}
          className="w-full py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
        >
          Check
        </button>
        <p className="text-center text-[0.6875rem] text-muted -mt-2">
          You'll see the verse once you've committed to an answer
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-semibold text-primary tabular-nums">
        {correctCount} of {targetWords.length} words matched
      </p>

      {/* The diff, once. Missed words are named rather than merely counted — knowing
          which words failed is worth considerably more than a percentage. */}
      <div
        className="text-lg leading-relaxed whitespace-pre-wrap"
        role="status"
        aria-live="polite"
      >
        {targetWords.map((word, idx) => {
          const target = normalize(word);
          const typed = typedWords[idx] ? normalize(typedWords[idx]) : null;
          const ok = typed !== null && typed === target;
          return (
            <React.Fragment key={idx}>
              <span className={ok ? 'text-primary' : 'text-red-500 underline decoration-red-500/50 underline-offset-4'}>
                {word}
              </span>
              {' '}
            </React.Fragment>
          );
        })}
      </div>

      {input.trim() && (
        <div className="rounded-md border border-card-border bg-card-elevated p-4">
          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-muted mb-1.5">What you wrote</p>
          <p className="text-sm text-secondary whitespace-pre-wrap">{input}</p>
        </div>
      )}
    </div>
  );
};
