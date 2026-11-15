import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { scoreAttempt } from '../../utils/cue';
import { ReviewAnswer } from './PracticeFeedback';

interface SpeechModeProps {
  text: string;
  isEnglish?: boolean;
  onAttempt?: (attempt: { accuracy: number; committed: string }) => void;
}

export const SpeechMode: React.FC<SpeechModeProps> = ({
  text,
  isEnglish = true,
  onAttempt,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [reviewingTranscript, setReviewingTranscript] = useState(false);
  const [compared, setCompared] = useState(false);
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    setIsListening(false);
    setTranscript('');
    setReviewingTranscript(false);
    setCompared(false);
    setError('');
  }, [text]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = isEnglish ? 'en-US' : 'te-IN';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      if (transcriptRef.current.trim()) {
        setReviewingTranscript(true);
      }
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        // Ignore stop errors during cleanup.
      }
    };
  }, [isEnglish]);

  const startReciting = () => {
    setError('');
    setTranscript('');
    setReviewingTranscript(false);
    setCompared(false);
    try {
      recognitionRef.current?.start();
      setIsListening(true);
    } catch {
      setError('Could not start microphone recognition.');
    }
  };

  const stopReciting = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors.
    }
    setIsListening(false);
    if (transcriptRef.current.trim()) {
      setReviewingTranscript(true);
    }
  };

  if (compared) {
    const score = scoreAttempt(text, transcript);
    return (
      <ReviewAnswer
        text={text}
        submitted={transcript}
        accuracy={score.accuracy}
        showWordDiff
      />
    );
  }

  if (reviewingTranscript && !isListening) {
    return (
      <div className="flex flex-col gap-3.5 w-full">
        <h3 className="text-base font-bold text-primary">Check what was heard</h3>
        <p className="text-xs sm:text-sm text-secondary">
          Correct recognition mistakes before comparing with the passage.
        </p>

        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value.slice(0, 20000))}
          aria-label="Recognized words"
          className="w-full min-h-[130px] p-4 rounded-xl bg-card-elevated border border-card-border text-primary text-sm sm:text-base focus:outline-none focus:border-accent"
        />

        <button
          type="button"
          disabled={!transcript.trim()}
          onClick={() => {
            const score = scoreAttempt(text, transcript);
            setCompared(true);
            onAttempt?.({ accuracy: score.accuracy, committed: transcript });
          }}
          className="w-full min-h-[48px] py-3 rounded-2xl bg-accent text-[#141414] font-bold text-sm hover:opacity-95 disabled:opacity-40 transition-opacity"
        >
          Compare transcript
        </button>

        <button
          type="button"
          onClick={() => {
            setReviewingTranscript(false);
            setTranscript('');
          }}
          className="self-start text-xs font-semibold text-accent hover:underline"
        >
          Record again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <h3 className="text-base font-bold text-primary">Say it from memory</h3>
      <p className="text-sm text-primary">
        The passage stays hidden while you speak. You can check the transcript before comparing.
      </p>
      <p className="text-xs sm:text-sm text-secondary">
        Your device&apos;s speech service may require an internet connection. Use Recall for self-check without the microphone.
      </p>

      {!isSupported ? (
        <p className="text-sm text-secondary rounded-xl bg-card border border-card-border p-4">
          Speech recognition is unavailable in this browser.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={isListening ? stopReciting : startReciting}
            className={`w-full min-h-[48px] px-4 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
              isListening
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-accent text-[#141414] hover:opacity-95'
            }`}
          >
            {isListening ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Finish speaking</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Start reciting</span>
              </>
            )}
          </button>

          <p className="text-xs text-secondary text-center">
            {isListening
              ? 'Listening…'
              : 'Speak the verse, then finish when you are ready.'}
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {transcript.trim() && (
        <div className="rounded-xl bg-card-elevated border border-card-border p-4 flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Live transcript
          </span>
          <p className="text-sm text-primary">{transcript}</p>
          <span className="text-[11px] text-secondary">
            Only the final transcript is checked.
          </span>
        </div>
      )}
    </div>
  );
};
