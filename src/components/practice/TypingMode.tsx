import React, { useState } from 'react';
import { scoreAttempt } from '../../utils/cue';
import { ReviewAnswer } from './PracticeFeedback';

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

/**
 * Type the verse from memory, then see aligned word-by-word comparison via DP edit-distance.
 * Both target text and cues are withheld during the attempt so the test measures genuine recall.
 */
export const TypingMode: React.FC<TypingModeProps> = ({ text, onAttempt }) => {
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);

  const check = () => {
    if (checked || !input.trim()) return;
    const computed = scoreAttempt(text, input);
    setChecked(true);
    onAttempt?.({ accuracy: computed.accuracy, committed: input });
  };

  if (!checked) {
    return (
      <div className="flex flex-col gap-4 w-full">
        <p className="text-sm sm:text-base text-primary font-medium">
          Type from memory. Check when you finish.
        </p>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value.slice(0, 20000))}
          placeholder="Type the verse from memory"
          aria-label="Your answer"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="w-full min-h-[150px] p-4 rounded-xl bg-card-elevated border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors text-primary placeholder:text-muted/70 resize-y text-base sm:text-lg shadow-sm"
        />

        <button
          type="button"
          onClick={check}
          disabled={!input.trim()}
          className="w-full min-h-[48px] py-3 rounded-2xl bg-accent text-on-accent font-bold text-sm hover:opacity-95 disabled:opacity-40 transition-opacity"
        >
          Check answer
        </button>

        <p className="text-xs text-secondary text-center">
          Capitalization and punctuation do not count against you.
        </p>
      </div>
    );
  }

  const computed = scoreAttempt(text, input);
  return (
    <ReviewAnswer
      text={text}
      submitted={input}
      accuracy={computed.accuracy}
      showWordDiff
    />
  );
};
