import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, SkipBack, SkipForward, ChevronDown } from 'lucide-react';

interface ListenModeProps {
  text: string;
  isEnglish: boolean;
  onPrev: () => void;
  onNext: () => void;
  onComplete?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
}

const PAUSE_RECALL_KEY = 'remora_listen_pause_recall';

function loadPauseForRecall(): boolean {
  try {
    const raw = localStorage.getItem(PAUSE_RECALL_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export const ListenMode: React.FC<ListenModeProps> = ({
  text,
  isEnglish,
  onPrev,
  onNext,
  onComplete,
  canGoPrev = true,
  canGoNext = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [repeatCount, setRepeatCount] = useState<number>(3);
  const [currentIteration, setCurrentIteration] = useState<number>(1);
  const [hideText, setHideText] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [pauseForRecall, setPauseForRecall] = useState<boolean>(loadPauseForRecall);
  const [recallPhase, setRecallPhase] = useState(false);
  const [answerShown, setAnswerShown] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const latestRef = useRef({
    pauseForRecall,
    repeatCount,
    currentIteration,
    autoAdvance,
    canGoNext,
    onNext,
  });
  latestRef.current = {
    pauseForRecall,
    repeatCount,
    currentIteration,
    autoAdvance,
    canGoNext,
    onNext,
  };

  useEffect(() => {
    setRecallPhase(false);
    setAnswerShown(false);
    setCurrentIteration(1);
    setTtsError(null);
  }, [text]);

  useEffect(() => {
    if (!isPlaying) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      return;
    }

    if (!('speechSynthesis' in window)) {
      setIsPlaying(false);
      setTtsError('Text-to-speech is unavailable in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    utterance.lang = isEnglish ? 'en-US' : 'te-IN';

    utterance.onend = () => {
      const latest = latestRef.current;
      if (latest.pauseForRecall) {
        setIsPlaying(false);
        setCurrentIteration(1);
        setRecallPhase(true);
        setAnswerShown(false);
      } else if (latest.currentIteration < latest.repeatCount) {
        setCurrentIteration(prev => prev + 1);
      } else if (latest.autoAdvance && latest.canGoNext) {
        setCurrentIteration(1);
        latest.onNext();
      } else {
        setIsPlaying(false);
        setCurrentIteration(1);
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying, currentIteration, speed, text, isEnglish]);

  const selectPauseMode = (value: boolean) => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsPlaying(false);
    setPauseForRecall(value);
    setRecallPhase(false);
    setAnswerShown(false);
    try {
      localStorage.setItem(PAUSE_RECALL_KEY, String(value));
    } catch {
      // Ignore storage errors.
    }
  };

  const cycleSpeed = () => {
    setSpeed(s => (s === 0.75 ? 1.0 : s === 1.0 ? 1.25 : s === 1.25 ? 1.5 : 0.75));
  };

  const cycleRepeat = () => {
    setRepeatCount(r => (r === 1 ? 2 : r === 2 ? 3 : r === 3 ? 999 : 1));
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-wrap gap-2">
        {[
          { value: true, label: 'Pause for recall' },
          { value: false, label: 'Continuous listening' },
        ].map(opt => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => selectPauseMode(opt.value)}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
              pauseForRecall === opt.value
                ? 'bg-accent border-accent text-[#141414]'
                : 'bg-card border-card-border text-secondary hover:text-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-card-elevated border border-card-border p-5">
        <p className="font-serif text-base sm:text-lg leading-relaxed text-primary whitespace-pre-wrap">
          {recallPhase && !answerShown
            ? 'Now say it back. Recall the passage before checking.'
            : hideText && !answerShown
            ? 'Passage text hidden while you listen.'
            : text}
        </p>
      </div>

      {ttsError && <p className="text-xs text-red-400">{ttsError}</p>}

      <div className="flex items-center justify-center gap-5 py-1">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => {
            setIsPlaying(false);
            setCurrentIteration(1);
            onPrev();
          }}
          aria-label="Previous verse"
          className="w-11 h-11 rounded-full bg-card-elevated border border-card-border flex items-center justify-center text-secondary hover:text-primary disabled:opacity-35"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (isPlaying) {
              setIsPlaying(false);
              setCurrentIteration(1);
            } else {
              setTtsError(null);
              setRecallPhase(false);
              setAnswerShown(false);
              setCurrentIteration(1);
              setIsPlaying(true);
            }
          }}
          aria-label={isPlaying ? 'Stop playback' : 'Play verse'}
          className="w-14 h-14 rounded-full bg-accent text-[#141414] flex items-center justify-center shadow-md hover:opacity-95 active:scale-95 transition-all"
        >
          {isPlaying ? (
            <Square className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-0.5" />
          )}
        </button>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => {
            setIsPlaying(false);
            setCurrentIteration(1);
            onNext();
          }}
          aria-label="Next verse"
          className="w-11 h-11 rounded-full bg-card-elevated border border-card-border flex items-center justify-center text-secondary hover:text-primary disabled:opacity-35"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      <p className="text-xs text-secondary text-center">
        {isPlaying
          ? `Playing · repetition ${currentIteration} of ${
              pauseForRecall ? 1 : repeatCount > 10 ? '∞' : repeatCount
            }`
          : recallPhase
          ? 'Paused for recall'
          : 'Stopped'}
      </p>

      {recallPhase && !answerShown && (
        <button
          type="button"
          onClick={() => setAnswerShown(true)}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-accent text-[#141414] font-bold text-sm hover:opacity-95"
        >
          Check passage
        </button>
      )}

      {!isPlaying && onComplete && (
        <button
          type="button"
          onClick={onComplete}
          className="text-xs sm:text-sm font-semibold text-accent hover:underline self-center py-1"
        >
          Save listening practice and continue
        </button>
      )}

      <p className="text-xs text-secondary text-center">
        Listening is practice with help. It does not increase your recall grade.
      </p>

      <div>
        <button
          type="button"
          onClick={() => setOptionsExpanded(e => !e)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary"
        >
          <span>{optionsExpanded ? 'Hide listening options' : 'Listening options'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${
              optionsExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {optionsExpanded && (
          <div className="mt-3 rounded-xl bg-card border border-card-border p-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={cycleSpeed}
                className="px-3.5 py-1.5 rounded-full bg-card-elevated border border-card-border text-xs font-semibold text-primary"
              >
                Speed {speed}×
              </button>
              {!pauseForRecall && (
                <button
                  type="button"
                  onClick={cycleRepeat}
                  className="px-3.5 py-1.5 rounded-full bg-card-elevated border border-card-border text-xs font-semibold text-primary"
                >
                  Repeat {repeatCount > 10 ? '∞' : `${repeatCount}×`}
                </button>
              )}
              <button
                type="button"
                onClick={() => setHideText(h => !h)}
                className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold ${
                  hideText
                    ? 'bg-accent border-accent text-[#141414]'
                    : 'bg-card-elevated border-card-border text-primary'
                }`}
              >
                Hide text
              </button>
            </div>

            {!pauseForRecall && (
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-xs text-primary">
                  Advance to next verse after listening
                </span>
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={e => setAutoAdvance(e.target.checked)}
                  className="w-4 h-4 accent-accent cursor-pointer"
                />
              </label>
            )}

            <p className="text-xs text-muted">
              {pauseForRecall
                ? 'Plays once, then pauses so you can recall the passage. Speed changes apply on the next playback.'
                : 'Speed changes apply on the next playback. Advancing does not grade the verse.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
