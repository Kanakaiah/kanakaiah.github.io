import React, { useMemo } from 'react';
import { cueString, cueAriaLabel, type CueLevel } from '../../utils/cue';

interface CueTextProps {
  text: string;
  level: CueLevel;
  className?: string;
}

/**
 * The passage, shown at whatever strength the item has earned.
 *
 * Replaces the fixed first-letters treatment that every surface used regardless of how
 * well the reader knew the item, and carries the accessible label with it. `FirstLetterMode`
 * emitted `T___ h_ s___` as literal text, which a screen reader reads as a string of
 * underscores or skips entirely — so the app's primary prompt mechanism was inaudible to
 * anyone not looking at it. The visible run of underscores is decorative; the label
 * spells the cue out.
 */
export const CueText: React.FC<CueTextProps> = ({ text, level, className = '' }) => {
  const shown = useMemo(() => cueString(text, level), [text, level]);
  const label = useMemo(() => cueAriaLabel(text, level), [text, level]);

  if (level === 'none') {
    return (
      <p className={`text-sm text-muted italic ${className}`} role="note">
        No cue — recall it from the reference.
      </p>
    );
  }

  return (
    <div className={className}>
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className={
          level === 'full'
            ? 'text-lg font-serif leading-relaxed text-primary whitespace-pre-wrap'
            : 'text-lg leading-relaxed font-semibold tracking-[0.1em] text-primary whitespace-pre-wrap'
        }
      >
        {shown}
      </div>
    </div>
  );
};
