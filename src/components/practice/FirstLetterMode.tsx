import React from 'react';
import { CueText } from './CueText';

interface FirstLetterModeProps {
  text: string;
}

/**
 * First letters of every word.
 *
 * Now a thin wrapper over CueText, which carries the spoken equivalent of the cue.
 * This component used to emit `T___ h_ s___` as literal text, which a screen reader
 * reads as a run of underscores or skips entirely — so the app's primary prompt
 * mechanism was inaudible to anyone not looking at it, on every surface that used it.
 * Kept as its own name because several callers want exactly this level and shouldn't
 * have to know about the cue scale.
 */
export const FirstLetterMode: React.FC<FirstLetterModeProps> = ({ text }) => (
  <CueText text={text} level="first-letters" />
);
