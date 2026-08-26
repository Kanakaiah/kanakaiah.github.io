import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { FirstLetterMode } from './FirstLetterMode';

interface SpeechModeProps {
  text: string;
  /** Fires as the transcript arrives. Unlike TypingMode this cannot easily be deferred —
   * speech recognition streams, and there is no keystroke to hold back — but it also
   * doesn't need to be: the reader is speaking, not reading the screen, so the target
   * text below is a check afterwards rather than something to copy from mid-attempt. */
  onAttempt?: (attempt: { accuracy: number; committed: string }) => void;
}

const normalize = (word: string) => word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

export const SpeechMode: React.FC<SpeechModeProps> = ({ text, onAttempt }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  // Speech Recognition setup (Web Speech API)
  const recognitionRef = React.useRef<any>(null);
  // The recognizer's onresult closure is built once, on mount, so it would otherwise
  // capture whichever callback the parent happened to pass on that first render.
  // Same for the target text: Practice remounts this component per verse via `key`,
  // but BlockDrillModal reuses one instance across different anchor chains, so the
  // closure must not hold whichever string happened to be current at mount.
  const onAttemptRef = React.useRef(onAttempt);
  const textRef = React.useRef(text);
  useEffect(() => { onAttemptRef.current = onAttempt; }, [onAttempt]);
  useEffect(() => { textRef.current = text; }, [text]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      // @ts-ignore
      recognitionRef.current = new webkitSpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        const spoken = currentTranscript.split(/\s+/).filter((w: string) => w.trim().length > 0);
        const target = textRef.current.split(/\s+/).filter(w => w.trim().length > 0);
        const correct = target.reduce(
          (n, word, i) => n + (spoken[i] && normalize(spoken[i]) === normalize(word) ? 1 : 0), 0);
        onAttemptRef.current?.({
          accuracy: target.length ? Math.round((correct / target.length) * 100) : 0,
          committed: currentTranscript,
        });
      };

      recognitionRef.current.onerror = (event: any) => {
        setError('Error occurred in recognition: ' + event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError('Speech recognition not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current && 'webkitSpeechRecognition' in window) {
       // @ts-ignore
      recognitionRef.current = new webkitSpeechRecognition();
      // configure again if re-init is needed, simplified for brevity
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setError('');
      setTranscript('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Simple diff rendering like TypingMode
  const targetWords = text.split(/(\s+)/).filter(w => w.trim().length > 0);
  const spokenWords = transcript.split(/\s+/).filter(w => w.trim().length > 0);

  return (
    <div className="flex flex-col gap-6 items-center">
      {/* The verse is withheld until the recitation stops.
          It used to sit here in full for the whole attempt, colouring word by word as
          you spoke — so the reader could simply read it aloud, and the accuracy this
          mode reports (the app's only measured signal, now also the basis for checking
          whether self-grading is honest) would have been measuring reading. First
          letters stay up as a real cue; the diff waits until there is an attempt to
          diff. */}
      {isListening || !transcript ? (
        <div className="w-full text-base leading-relaxed text-secondary mb-4 text-center">
          <FirstLetterMode text={text} />
        </div>
      ) : (
      <div className="w-full text-lg leading-relaxed whitespace-pre-wrap mb-4 text-center">
        {targetWords.map((word, idx) => {
          const cleanTarget = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const cleanSpoken = spokenWords[idx] ? spokenWords[idx].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : null;
          
          let colorClass = 'text-muted opacity-50';
          
          if (cleanSpoken !== null) {
             if (cleanSpoken === cleanTarget) {
               colorClass = 'text-green-500 font-bold';
             } else {
               colorClass = 'text-red-500 line-through opacity-70';
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
      )}

      <button
        onClick={toggleListen}
        disabled={!!error && !isListening}
        className={`rounded-full w-20 h-20 flex items-center justify-center text-white transition-colors disabled:opacity-50 disabled:pointer-events-none active:scale-95 ${
          isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-accent hover:bg-accent-hover'
        }`}
      >
        {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
      </button>

      {isListening && (
        <span className="text-accent animate-pulse font-medium">Listening...</span>
      )}
      
      {error && <span className="text-red-500 text-sm mt-2">{error}</span>}

      <div className="w-full mt-4 p-4 rounded-md bg-card-elevated border border-card-border min-h-[100px]">
        <p className="text-secondary text-sm font-medium mb-2">Live Transcript:</p>
        <p className="text-primary italic">{transcript || "Waiting for speech..."}</p>
      </div>
    </div>
  );
};
