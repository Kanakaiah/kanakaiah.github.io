import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Eye, EyeOff } from 'lucide-react';

interface ListenModeProps {
  text: string;
  isEnglish: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export const ListenMode: React.FC<ListenModeProps> = ({
  text,
  isEnglish,
  onPrev,
  onNext,
}) => {
  const words = React.useMemo(() => {
    return text.trim().split(/\s+/).filter(w => w.length > 0);
  }, [text]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [repeatCount, setRepeatCount] = useState<number>(3);
  const [currentIteration, setCurrentIteration] = useState<number>(1);
  const [hideText, setHideText] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Time tracking
  const wordsPerSecond = 2.4 * speed;
  const totalSeconds = Math.max(3, Math.round(words.length / wordsPerSecond));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // When text changes (e.g. navigated or auto-advanced to new verse):
  useEffect(() => {
    setElapsedSeconds(0);
    setCurrentWordIndex(0);
    setCurrentIteration(1);
    if (isPlaying && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speed;
      utterance.lang = isEnglish ? 'en-US' : 'te-IN';

      utterance.onend = () => {
        if (currentIteration < repeatCount) {
          setCurrentIteration(prev => prev + 1);
          setElapsedSeconds(0);
        } else {
          if (autoAdvance) {
            setCurrentIteration(1);
            setElapsedSeconds(0);
            setCurrentWordIndex(0);
            onNext();
          } else {
            setIsPlaying(false);
            setElapsedSeconds(totalSeconds);
            setCurrentWordIndex(words.length - 1);
          }
        }
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  }, [text]);

  // Synchronize highlight
  useEffect(() => {
    if (words.length > 0 && totalSeconds > 0) {
      const ratio = Math.min(1, Math.max(0, elapsedSeconds / totalSeconds));
      setCurrentWordIndex(Math.min(words.length - 1, Math.floor(ratio * words.length)));
    }
  }, [elapsedSeconds, totalSeconds, words.length]);

  // Handle Speech & Timer
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speed;
      utterance.lang = isEnglish ? 'en-US' : 'te-IN';

      utterance.onend = () => {
        if (currentIteration < repeatCount) {
          setCurrentIteration(prev => prev + 1);
          setElapsedSeconds(0);
        } else {
          if (autoAdvance) {
            setCurrentIteration(1);
            setElapsedSeconds(0);
            setCurrentWordIndex(0);
            onNext();
          } else {
            setIsPlaying(false);
            setElapsedSeconds(totalSeconds);
            setCurrentWordIndex(words.length - 1);
          }
        }
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => {
        if (prev >= totalSeconds) {
          return totalSeconds;
        }
        return Number((prev + 0.1).toFixed(1));
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying, currentIteration, speed, repeatCount, text, isEnglish, totalSeconds, autoAdvance, onNext, words.length]);

  const formatTime = (sec: number) => {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const cycleSpeed = () => {
    const next = speed === 0.75 ? 1.0 : speed === 1.0 ? 1.25 : speed === 1.25 ? 1.5 : 0.75;
    setSpeed(next);
  };

  const cycleRepeat = () => {
    const next = repeatCount === 1 ? 2 : repeatCount === 2 ? 3 : repeatCount === 3 ? 999 : 1;
    setRepeatCount(next);
  };

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[380px] py-2">
      {/* Upper Area: "NOW PLAYING" & Large Serif Verse Text */}
      <div className="flex flex-col gap-4 w-full">
        <span className="text-[11px] font-bold tracking-widest text-[#D4A359] uppercase">
          Now Playing
        </span>

        {hideText ? (
          <div className="flex flex-col items-center justify-center p-8 bg-[#191714] border border-[#2C2720] rounded-2xl gap-3 text-center my-4">
            <EyeOff className="w-8 h-8 text-[#D4A359]" />
            <h4 className="text-base font-semibold text-[#F5F2EB]">Text Hidden for Auditory Recall</h4>
            <p className="text-xs text-[#A89F91] max-w-xs">
              Listen closely and recite from memory as the audio plays.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-2 gap-y-3 font-serif text-[22px] leading-relaxed text-[#DDD5C7] my-2 select-none">
            {words.map((word, idx) => {
              const isCurrent = isPlaying && idx === currentWordIndex;
              const hasPassed = isPlaying && idx < currentWordIndex;

              return (
                <span
                  key={`${word}-${idx}`}
                  className={`px-1.5 py-0.5 rounded transition-colors duration-150 ${
                    isCurrent
                      ? 'bg-[#D4A359] text-[#14120E] font-bold shadow-sm'
                      : hasPassed
                      ? 'text-[#F5F2EB]'
                      : 'text-[#A89F91]'
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Audio Controller Card (Rounded 3xl matching Mockup 3 & 4) */}
      <div className="bg-[#1A1815] border border-[#2C2720] rounded-3xl p-5 flex flex-col gap-4 mt-6 shadow-xl">
        {/* Scrubber slider */}
        <div className="flex flex-col gap-1.5 w-full">
          <input
            type="range"
            min={0}
            max={totalSeconds}
            step={0.1}
            value={elapsedSeconds}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setElapsedSeconds(val);
              const ratio = val / totalSeconds;
              setCurrentWordIndex(Math.floor(ratio * words.length));
            }}
            className="w-full accent-[#D4A359] bg-[#332D24] h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between items-center text-[11px] text-[#8C8273] font-mono">
            <span>{formatTime(elapsedSeconds)}</span>
            <span>{formatTime(totalSeconds)}</span>
          </div>
        </div>

        {/* Playback Controls Row: Prev | Play/Pause | Next */}
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => {
              setElapsedSeconds(0);
              setCurrentWordIndex(0);
              onPrev();
            }}
            className="w-11 h-11 rounded-full bg-[#221F1B] border border-[#38322A] flex items-center justify-center text-[#DDD5C7] hover:text-[#D4A359] hover:border-[#D4A359] active:scale-95 transition-all shadow-sm"
            aria-label="Previous verse"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-14 h-14 rounded-full bg-[#D4A359] text-[#14120E] flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setElapsedSeconds(0);
              setCurrentWordIndex(0);
              onNext();
            }}
            className="w-11 h-11 rounded-full bg-[#221F1B] border border-[#38322A] flex items-center justify-center text-[#DDD5C7] hover:text-[#D4A359] hover:border-[#D4A359] active:scale-95 transition-all shadow-sm"
            aria-label="Next verse"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Option Pills: Speed | Repeat | Hide text (Rounded-full stadium pills) */}
        <div className="flex items-center justify-around gap-2 pt-2 border-t border-[#26221B]">
          <button
            type="button"
            onClick={cycleSpeed}
            className="px-4 py-1.5 rounded-full bg-[#221F1B] border border-[#38322A] text-xs font-medium text-[#DDD5C7] hover:border-[#D4A359] transition-colors"
          >
            Speed {speed}x
          </button>

          <button
            type="button"
            onClick={cycleRepeat}
            className="px-4 py-1.5 rounded-full bg-[#221F1B] border border-[#38322A] text-xs font-medium text-[#DDD5C7] hover:border-[#D4A359] transition-colors"
          >
            Repeat {repeatCount > 10 ? '∞' : `${repeatCount}x`}
          </button>

          <button
            type="button"
            onClick={() => setHideText(!hideText)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-medium transition-colors ${
              hideText
                ? 'bg-[#D4A359]/20 border-[#D4A359] text-[#D4A359]'
                : 'bg-[#221F1B] border-[#38322A] text-[#DDD5C7] hover:border-[#D4A359]'
            }`}
          >
            {hideText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            Hide text
          </button>
        </div>

        {/* Auto-advance Checkbox Row: Text on Left, Checkbox on Right matching Mockup 3 */}
        <div
          onClick={() => setAutoAdvance(!autoAdvance)}
          className="flex items-center justify-between pt-2 border-t border-[#26221B] cursor-pointer"
        >
          <span className="text-xs font-medium text-[#DDD5C7]">
            Auto-advance to next verse
          </span>
          <input
            type="checkbox"
            checked={autoAdvance}
            onChange={(e) => setAutoAdvance(e.target.checked)}
            className="w-4 h-4 rounded border-[#38322A] accent-[#D4A359] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
