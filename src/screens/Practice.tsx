import React, { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { BookOpen, ArrowLeft, ArrowRight, Check, Play, Square, HelpCircle, Maximize } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { evaluateSM2, formatInterval, suggestedScore } from '../utils/sm2';
import { dueChapters } from '../utils/mastery';
import type { Verse, ReviewEvent } from '../types/models';
import { buildReviewEvent } from '../utils/reviewLog';

// Subcomponents
import { ReadMode } from '../components/practice/ReadMode';
import { EraserMode } from '../components/practice/EraserMode';
import { FirstLetterMode } from '../components/practice/FirstLetterMode';
import { ScrambleMode } from '../components/practice/ScrambleMode';
import { TypingMode } from '../components/practice/TypingMode';
import { SpeechMode } from '../components/practice/SpeechMode';
import { ImmersedReader } from '../components/practice/ImmersedReader';
import { AnchorDrill } from '../components/practice/AnchorDrill';
import { ThemeDrill } from '../components/practice/ThemeDrill';
import { Session } from '../components/practice/Session';
import { Button } from '../components/ui/Button';

type PracticeMode = 'read' | 'eraser' | 'first-letter' | 'scramble' | 'typing' | 'speech' | 'immersed';

/** The app's three stated goals, and now its top-level control. This used to be a
 * two-way 'verses' | 'chapters' switch rendered as 10px text below the workspace,
 * below the scoring block — on a screen whose entire header is about verses. Theme
 * had no home at all. Naming the navigation after the goal is what makes the anchor
 * and theme layers discoverable rather than buried. */
type Subject = 'theme' | 'anchor' | 'verse';

const SUGGESTED_LABEL: Record<number, string> = { 1: 'Blank', 3: 'Hard', 4: 'Good', 5: 'Easy' };

/** Practice's own mode names, in the vocabulary the review history uses. Read mode has
 * no scoring block, so it can never reach the log. */
const MODE_TO_LOG: Partial<Record<PracticeMode, ReviewEvent['mode']>> = {
  typing: 'type',
  speech: 'speak',
  scramble: 'scramble',
  eraser: 'erase',
  'first-letter': 'reveal',
};

/**
 * The best grade a hinted attempt can honestly earn.
 *
 * `handleScore` never consulted `hintLevel`, so a reader could press the hint button
 * four times — revealing the entire verse, which the badge itself labels "(Full)" —
 * then press Easy and have it recorded as a clean recall worth a long interval. That
 * is the same defect as every other one this app has been fixing: the schedule acting
 * on something that did not happen.
 *
 * A quarter of the verse is a nudge, so Good stays available. Half or more is enough
 * support that the honest ceiling is Hard. The whole verse on screen is not recall at
 * all, whatever it felt like, and grades as a lapse.
 */
const HINT_GRADE_CEILING: Record<number, number> = { 0: 5, 1: 4, 2: 3, 3: 3, 4: 1 };
const ceilingFor = (hintLevel: number) => HINT_GRADE_CEILING[hintLevel] ?? 5;

export const Practice: React.FC = () => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Verses vs. Chapters — the same screen and the same SM2 grading loop, pointed
  // at a different kind of recall. Chapters renders an entirely separate
  // component (AnchorDrill) rather than trying to thread a second item type
  // through the verse-specific mode machinery below (ReadMode, EraserMode, TTS
  // auto-play, the cross-verse selection state) — that machinery is real
  // complexity earned by verses specifically, and generalizing all of it was a
  // materially larger, riskier change than this screen's other moves for the
  // value it would add over a clean second branch.
  //
  // A navigation can arrive already asking for Chapters — the testament browser's
  // "Test me on these N" button, or a due-chapter empty-state redirect elsewhere —
  // via location.state, the same channel Guides.tsx already uses for
  // scrollToMemorySentence.
  const navState = location.state as { subject?: Subject; sweepBookIds?: string[] } | null;
  const [subject, setSubject] = useState<Subject>(navState?.subject || 'verse');
  const sweepBookIds = navState?.sweepBookIds;

  // The workshop opens on a mode that can be scored.
  //
  // It used to land on Read, which is the one mode with no scoring block at all — so the
  // tab labelled "Practice" opened a screen where practising produced no record of any
  // kind. Type is the strongest default available: it is the only mode besides Recite
  // that can measure an attempt rather than ask about it, which is what makes the grade
  // worth anything. Read is still one tap away, and is still the right thing for looking
  // at a verse you are not yet trying to produce.
  const [activeMode, setActiveMode] = useState<PracticeMode>('typing');
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  
  const [isAutoPlaying, setIsAutoPlaying] = useState(state.settings.ttsEnabled);

  // Sync with global TTS setting
  React.useEffect(() => {
    setIsAutoPlaying(state.settings.ttsEnabled);
  }, [state.settings.ttsEnabled]);

  // Consume the incoming subject/sweep request once, then clear it — otherwise
  // it would sit in browser history and silently re-trigger a testament sweep the
  // next time something merely navigates back to /practice.
  React.useEffect(() => {
    if (navState) navigate(location.pathname + location.search, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [hintLevel, setHintLevel] = useState(0);

  /**
   * Two activities live behind this one route, and until now they were not distinguished.
   *
   * The day's work is bounded, mixed and self-terminating, and it is what the reader
   * should meet by default. Free practice on a single verse is a genuinely different
   * thing — deliberate, occasional, chosen — and worth keeping, but it is not a daily
   * habit and it should be entered on purpose rather than landed in.
   *
   * Every route into this screen already had the right shape except the tab itself: the
   * dashboard's "Start Session" asks for the day's work, a verse card asks for that one
   * verse, and the guides ask for a specific drill. Only a bare /practice — the second
   * item in the navigation, the most prominent entry in the app — opened the workshop,
   * over the whole library, in a mode that recorded nothing. That is the split being
   * closed here: the tab now means the same thing the Today button means, and the
   * workshop keeps its own address.
   */
  const modeParam = searchParams.get('mode');
  const targetId = searchParams.get('id');
  const isWorkshop = !!targetId || modeParam === 'free';

  // The workshop always works against the whole library — it is a place to pick something
  // up deliberately, so filtering it to what happens to be due would defeat the point.
  // The day's-work path builds its own plan and never reads this.
  const verses = state.verses;

  const initialIndex = React.useMemo(() => {
    if (targetId) {
      const idx = verses.findIndex(v => v.id === targetId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  }, [verses, targetId]);

  const [activeVerseIndex, setActiveVerseIndex] = useState(initialIndex);

  React.useEffect(() => {
    setActiveVerseIndex(initialIndex);
  }, [initialIndex]);

  // Chrome (fixed header + bottom verse-nav) visibility — tap-to-toggle, the same
  // rule the chapter reader and the guide pages use: a tap on empty space toggles,
  // a tap on anything interactive only ever reveals, so answering a prompt or
  // switching mode never feels like it also yanked the navigation away.
  const [chromeVisible, setChromeVisible] = useState(true);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const handlePracticeContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [role="button"]')) {
      setChromeVisible(true);
    } else {
      setChromeVisible(v => !v);
    }
  };

  // Keep the content clear of the fixed header — its height shifts with the verse
  // reference wrapping, so it's measured rather than hardcoded.
  React.useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [activeVerseIndex]);

  // Objective accuracy from whichever mode can measure it (Typing, Recite). Null in
  // the modes that genuinely can't know — Read and Erase have no ground truth to
  // compare against, so those stay purely self-graded.
  const [modeAccuracy, setModeAccuracy] = useState<number | null>(null);
  // What the reader actually wrote or said, kept alongside the number so the review
  // history can hold the attempt itself. A percentage tells you an attempt went badly;
  // the words tell you why, which is what makes a leech worth rewording rather than
  // simply repeating.
  const [modeCommitted, setModeCommitted] = useState<string | null>(null);

  const handleAttempt = React.useCallback((attempt: { accuracy: number; committed: string }) => {
    setModeAccuracy(attempt.accuracy);
    setModeCommitted(attempt.committed);
  }, []);

  // Reset hint and any measured accuracy when changing verses or modes
  React.useEffect(() => {
    setHintLevel(0);
    setModeAccuracy(null);
    setModeCommitted(null);
  }, [activeVerseIndex, activeMode]);

  const currentVerse = verses[activeVerseIndex];

  const handleToggleTTS = () => {
    if (isAutoPlaying) {
      window.speechSynthesis.cancel();
      setIsAutoPlaying(false);
    } else {
      setIsAutoPlaying(true);
    }
  };

  // Handle Auto Play Logic — available while reading, including immersive reading
  React.useEffect(() => {
    if (activeMode !== 'read' && activeMode !== 'immersed') {
      if (isAutoPlaying) {
        setIsAutoPlaying(false);
        window.speechSynthesis.cancel();
      }
      return;
    }

    if (isAutoPlaying && currentVerse) {
      window.speechSynthesis.cancel();
      const textToSpeak = `${currentVerse.ref}. ${currentVerse.text}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      utterance.onend = () => {
        if (activeVerseIndex < verses.length - 1) {
          // Short pause before advancing to the next verse
          setTimeout(() => {
            setActiveVerseIndex(i => i + 1);
          }, 800);
        } else {
          setIsAutoPlaying(false);
        }
      };
      
      window.speechSynthesis.speak(utterance);
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [activeVerseIndex, isAutoPlaying, currentVerse, verses.length, activeMode]);

  const handleNext = () => {
    if (activeVerseIndex < verses.length - 1) setActiveVerseIndex(i => i + 1);
  };

  const handlePrev = () => {
    if (activeVerseIndex > 0) setActiveVerseIndex(i => i - 1);
  };

  const handleScore = (rawScore: number) => {
    // Capped, not just discouraged. The buttons above the ceiling are disabled too, so
    // this should never actually bite — but the grade that reaches the scheduler is the
    // one that matters, and it must not depend on the UI having behaved.
    const score = Math.min(rawScore, ceilingFor(hintLevel));
    const { newSM2, newStatus } = evaluateSM2(currentVerse.sm2, score, 'verse');
    
    const updatedVerse: Verse = {
      ...currentVerse,
      sm2: newSM2,
      status: newStatus,
      attempts: (currentVerse.attempts || 0) + 1
    };
    
    dispatch({ type: 'UPDATE_VERSE', payload: updatedVerse });
    // The only surface in the app that can currently measure an attempt rather than ask
    // about it. `modeAccuracy` is real ground truth from Type and Recite; recording it
    // next to the grade the reader chose is what makes the honesty gap computable.
    dispatch({
      type: 'RECORD_REVIEW',
      payload: buildReviewEvent({
        itemKind: 'verse', itemId: currentVerse.id, gradeSubmitted: score,
        before: currentVerse.sm2, after: newSM2,
        mode: MODE_TO_LOG[activeMode] ?? 'reveal',
        // A hint level is a cue level. First-letter mode carries a standing cue of its
        // own even with no hint pressed, so the recorded cue is whichever is stronger.
        cueLevel: Math.max(hintLevel, activeMode === 'first-letter' ? 2 : 0) as 0 | 1 | 2 | 3 | 4,
        gradeCeiling: ceilingFor(hintLevel),
        measuredAccuracy: modeAccuracy,
        committed: modeCommitted,
      }),
    });
    // The streak action existed in the reducer with nothing in the app ever
    // dispatching it, so the flame on Today and in the shell header had shown
    // zero for every session. This is where it actually starts counting.
    dispatch({ type: 'RECORD_ACTIVITY' });
    setIsEvaluationOpen(false);
    // formatInterval, not raw days: this said "Next review in 63 days" where every other
    // grading surface in the app says "2 mo". It is also now the only place the interval
    // appears at all, the grade buttons having stopped advertising what each one buys.
    showToast(`Score logged. Next review in ${formatInterval(newSM2.interval)}.`, 'success');
  };

  const handleHintClick = () => {
    if (hintLevel >= 4) {
      setHintLevel(0);
    } else {
      setHintLevel(h => h + 1);
    }
  };

  const renderProgressiveHint = () => {
    if (hintLevel === 0) return null;
    
    const totalWords = currentVerse.text.split(/\s+/).filter(w => w.trim().length > 0);
    const wordsToReveal = Math.ceil(totalWords.length * (hintLevel * 0.25));
    
    let revealedCount = 0;
    const tokens = currentVerse.text.split(/(\s+)/);
    
    return (
      <div className="mb-6 p-4 rounded-xl bg-accent/10 border border-accent/20 text-secondary text-lg leading-relaxed relative">
        <div className="absolute -top-2 -left-2 bg-accent text-white text-[0.625rem] font-bold px-2 py-0.5 rounded-full shadow-sm">
          HINT {hintLevel < 4 ? `${hintLevel}/4` : '(Full)'}
        </div>
        {tokens.map((token, i) => {
          if (!token.trim()) return <span key={i}>{token}</span>; // whitespace
          
          revealedCount++;
          if (revealedCount <= wordsToReveal) {
            return <span key={i} className="text-primary font-medium">{token}</span>;
          } else {
            return <span key={i} className="opacity-40 blur-[4px] select-none transition-all">{token}</span>;
          }
        })}
      </div>
    );
  };

  const isImmersed = activeMode === 'immersed';

  // Render the current mode's workspace (immersive reading renders separately)
  const renderWorkspace = () => {
    switch (activeMode) {
      case 'read':
        return <ReadMode key={currentVerse.id} text={currentVerse.text} />;
      case 'eraser':
        return <EraserMode key={currentVerse.id} text={currentVerse.text} />;
      case 'first-letter':
        return <FirstLetterMode key={currentVerse.id} text={currentVerse.text} />;
      case 'scramble':
        return <ScrambleMode key={currentVerse.id} text={currentVerse.text} />;
      case 'typing':
        return <TypingMode key={currentVerse.id} text={currentVerse.text} onAttempt={handleAttempt} />;
      case 'speech':
        return <SpeechMode key={currentVerse.id} text={currentVerse.text} onAttempt={handleAttempt} />;
      default:
        return null;
    }
  };

  // Global Navigation: Keyboard, Swipe, and Immersed Taps
  //
  // Bound only while the verse workspace is the thing on screen. The early returns for
  // Session, ThemeDrill and AnchorDrill sit below every hook, so without this guard
  // these window listeners stayed live underneath them — an arrow key or a swipe during
  // a chain drill silently moved activeVerseIndex in a screen the reader could not see,
  // and they would come back to a different verse than they left.
  const verseNavActive = subject === 'verse' && isWorkshop && !!currentVerse;
  React.useEffect(() => {
    if (!verseNavActive) return;
    let touchStartX = 0;
    let touchStartY = 0;

    const handlePrevVerse = () => {
      setActiveVerseIndex(i => (i > 0 ? i - 1 : i));
    };

    const handleNextVerse = () => {
      setActiveVerseIndex(i => (i < verses.length - 1 ? i + 1 : i));
    };

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') handlePrevVerse();
      if (e.key === 'ArrowRight') handleNextVerse();
    };

    // Swipe navigation
    // A drag that starts on a control belongs to that control, not to verse navigation.
    //
    // The keydown handler above has always ignored events from inputs; this one never
    // did, so any horizontal drag anywhere flipped the verse — including dragging
    // EraserMode's "Hide Words" range slider, which is operated by exactly this gesture
    // and therefore could not be used without changing the verse underneath it.
    const IGNORED = 'input, textarea, select, button, a, [role="slider"], [role="button"]';
    let ignoring = false;

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      ignoring = !!target?.closest?.(IGNORED);
      if (ignoring) return;
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (ignoring) { ignoring = false; return; }
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;

      const swipeX = touchEndX - touchStartX;
      const swipeY = touchEndY - touchStartY;

      // Ensure it's a deliberate horizontal swipe (not just scrolling)
      if (Math.abs(swipeX) > 50 && Math.abs(swipeX) > Math.abs(swipeY) * 1.5) {
        if (swipeX > 0) handlePrevVerse();
        else handleNextVerse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [verses.length, verseNavActive]);

  // Switches the whole screen to the chapter-anchor drill — see the Subject type
  // note above. Placed ahead of the verse empty-states below so choosing it from
  // either of their "drill chapters instead" buttons actually leaves verse-land
  // rather than merely offering to.
  if (subject === 'theme') {
    return <ThemeDrill onExit={() => setSubject('verse')} />;
  }

  if (subject === 'anchor') {
    return <AnchorDrill onExit={() => setSubject('verse')} sweepBookIds={sweepBookIds} />;
  }

  // The day's work — everything that is not an explicit request for the workshop. That
  // now includes the Practice tab itself, which is the point: two loops meant two habits
  // and two sets of records, and the one that was bounded and self-terminating was the
  // one hidden behind a button on another tab.
  //
  // Everything below stays exactly as it was, reachable at /practice?id=… from a verse
  // card and at /practice?mode=free from the session's own empty state.
  if (!isWorkshop) {
    return (
      <Session
        onExit={() => navigate('/')}
        onFreePractice={() => navigate('/practice?mode=free')}
      />
    );
  }

  const dueChapter = dueChapters(state.chapterProgress)[0];

  // If there are no verses, show empty state
  if (state.verses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 pt-20">
        <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-muted" />
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">No Verse Selected</h2>
        <p className="text-secondary mb-6 max-w-sm">Pick a verse from the dashboard list or add a new one to practice.</p>
        {dueChapter ? (
          <Button onClick={() => setSubject('anchor')}>Drill Chapter Anchors Instead</Button>
        ) : (
          <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
        )}
      </div>
    );
  }

  if (!currentVerse) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 pt-20">
        <h2 className="text-xl font-bold text-primary mb-2">You're All Caught Up!</h2>
        <p className="text-secondary mb-6">
          {dueChapter ? 'No verses due — but a chapter anchor is.' : 'No verses are currently due for review.'}
        </p>
        {dueChapter ? (
          <Button onClick={() => setSubject('anchor')}>Drill Chapter Anchors</Button>
        ) : (
          <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
        )}
      </div>
    );
  }

  if (isImmersed) {
    return (
      <ImmersedReader
        verse={currentVerse}
        index={activeVerseIndex}
        total={verses.length}
        onPrev={handlePrev}
        onNext={handleNext}
        onExit={() => setActiveMode('read')}
        isAutoPlaying={isAutoPlaying}
        onToggleAutoPlay={handleToggleTTS}
      />
    );
  }

  return (
      <div
        className="relative flex flex-col h-full w-full pb-6 lg:pb-8"
        style={{ paddingTop: headerHeight ? `${headerHeight + 16}px` : 'calc(env(safe-area-inset-top, 0px) + 5rem)' }}
        onClick={handlePracticeContentClick}
      >

      {/* Session progress — the same fixed top rule the reader uses for reading
          progress, rather than a separate absolutely-positioned track. */}
      {verses.length > 1 && (
        <div
          className="reading-progress"
          style={{ width: `${((activeVerseIndex + 1) / verses.length) * 100}%` }}
        />
      )}

      {/* Fixed header — back arrow, centred verse reference, audio toggle on the
          right, matching the chapter reader and the guide pages. Replaces the two
          free-floating round buttons and the verse reference that used to scroll
          away with the content. */}
      <div
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-40 bg-background border-b border-card-border/60 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${chromeVisible ? 'translate-y-0' : '-translate-y-full'}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <div className="max-w-4xl mx-auto w-full px-5 sm:px-8 pb-3 relative">
          <button
            onClick={() => navigate('/')}
            className="absolute left-5 sm:left-8 top-1 p-2 -ml-2 rounded-full hover:bg-card-hover transition-colors z-10"
            title="Exit practice"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-secondary" />
          </button>

          <button
            onClick={handleToggleTTS}
            className="absolute right-5 sm:right-8 top-1 p-2 -mr-2 rounded-full hover:bg-card-hover transition-colors z-10"
            title="Play Audio"
            aria-label={isAutoPlaying ? 'Stop audio' : 'Play audio'}
          >
            {isAutoPlaying ? (
              <Square className="w-5 h-5 text-accent fill-accent" />
            ) : (
              <Play className="w-5 h-5 text-secondary ml-0.5" />
            )}
          </button>

          <div className="flex flex-col items-center justify-center pt-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary font-heading text-center px-12 leading-tight line-clamp-2">
              {currentVerse.ref}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4">

        {/* Display Board (Workspace) */}
        <div className="bg-card border border-card-border rounded-lg p-6 lg:p-10 relative flex-1 flex flex-col shadow-sm mb-8">
          <div className="flex-1 flex flex-col">
            {activeMode === 'read' && (
              <button 
                onClick={() => setActiveMode('immersed')} 
                className="absolute top-4 right-4 lg:top-6 lg:right-6 w-11 h-11 rounded-full flex items-center justify-center bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all shadow-sm active:scale-95"
                title="Immerse Reading"
              >
                <Maximize className="w-5 h-5" />
              </button>
            )}

            {activeMode !== 'read' && (
              <button
                onClick={handleHintClick}
                className={`absolute top-4 right-4 lg:top-6 lg:right-6 w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95
                  ${hintLevel > 0 ? 'bg-accent text-white hover:bg-accent-hover' : 'bg-card border border-card-border text-muted hover:text-primary hover:bg-card-hover'}`}
                title={hintLevel === 0 ? 'Show Hint' : hintLevel < 4 ? 'More Hint' : 'Hide Hint'}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            )}

            <div className="mt-4">
              {activeMode !== 'read' && renderProgressiveHint()}
            </div>

            <div key={activeMode} className="flex-1 animate-[fadeScaleIn_0.2s_ease-out] flex flex-col justify-start mt-8 lg:mt-6">
              {renderWorkspace()}
            </div>
          </div>
        </div>

        {/* Inline Scoring Block (hidden in Read mode) */}
        {activeMode !== 'read' && (
          <div className="w-full flex justify-center mb-8">
            {!isEvaluationOpen ? (
              <button
                onClick={() => setIsEvaluationOpen(true)}
                className="flex items-center gap-2 px-8 py-3.5 rounded-md bg-accent text-white font-bold text-lg hover:bg-accent-hover transition-colors active:scale-95"
              >
                <Check className="w-5 h-5" /> Score My Recall
              </button>
            ) : (
              <div className="max-w-md w-full bg-card-elevated border border-card-border rounded-lg p-5 flex flex-col gap-4 animate-[fadeScaleIn_0.2s_ease-out] shadow-sm">
                {/* When the mode measured the attempt, say so and point at the grade that
                    matches — but never grade for the user. The suggestion is a ring around
                    one button, not a pre-submitted answer: they may know they were guessing,
                    or that a "wrong" word was a synonym the diff can't forgive. */}
                {modeAccuracy !== null ? (
                  <div className="text-center flex flex-col gap-1">
                    <p className="font-semibold text-primary">
                      <span className="tabular-nums">{modeAccuracy}%</span> of the words matched
                    </p>
                    <p className="text-xs text-muted">
                      Suggested: <span className="font-bold text-accent">{SUGGESTED_LABEL[suggestedScore(modeAccuracy)]}</span> — change it if that's not right
                    </p>
                  </div>
                ) : (
                  <p className="text-center font-semibold text-primary">How well did you remember it?</p>
                )}
                {hintLevel > 0 && (
                  <p className="text-center text-[0.6875rem] text-muted -mt-1">
                    {hintLevel >= 4
                      ? 'You revealed the whole verse — this counts as a blank.'
                      : `Hint used — best available grade is ${SUGGESTED_LABEL[ceilingFor(hintLevel)]}.`}
                  </p>
                )}
                <div className="grid grid-cols-4 gap-3">
                  <button onClick={() => handleScore(1)} disabled={1 > ceilingFor(hintLevel)} title={1 > ceilingFor(hintLevel) ? 'Not available after using hints' : undefined} className={`py-3 flex items-center justify-center rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/20 active:scale-95 disabled:opacity-25 disabled:pointer-events-none ${modeAccuracy !== null && suggestedScore(modeAccuracy) === 1 ? 'ring-2 ring-accent ring-offset-2 ring-offset-card-elevated' : ''}`}>
                    <span className="text-sm font-bold leading-tight">Blank</span>
                  </button>
                  <button onClick={() => handleScore(3)} disabled={3 > ceilingFor(hintLevel)} title={3 > ceilingFor(hintLevel) ? 'Not available after using hints' : undefined} className={`py-3 flex items-center justify-center rounded-md bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors border border-orange-500/20 active:scale-95 disabled:opacity-25 disabled:pointer-events-none ${modeAccuracy !== null && suggestedScore(modeAccuracy) === 3 ? 'ring-2 ring-accent ring-offset-2 ring-offset-card-elevated' : ''}`}>
                    <span className="text-sm font-bold leading-tight">Hard</span>
                  </button>
                  <button onClick={() => handleScore(4)} disabled={4 > ceilingFor(hintLevel)} title={4 > ceilingFor(hintLevel) ? 'Not available after using hints' : undefined} className={`py-3 flex items-center justify-center rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors border border-blue-500/20 active:scale-95 disabled:opacity-25 disabled:pointer-events-none ${modeAccuracy !== null && suggestedScore(modeAccuracy) === 4 ? 'ring-2 ring-accent ring-offset-2 ring-offset-card-elevated' : ''}`}>
                    <span className="text-sm font-bold leading-tight">Good</span>
                  </button>
                  <button onClick={() => handleScore(5)} disabled={5 > ceilingFor(hintLevel)} title={5 > ceilingFor(hintLevel) ? 'Not available after using hints' : undefined} className={`py-3 flex items-center justify-center rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors border border-green-500/20 active:scale-95 disabled:opacity-25 disabled:pointer-events-none ${modeAccuracy !== null && suggestedScore(modeAccuracy) === 5 ? 'ring-2 ring-accent ring-offset-2 ring-offset-card-elevated' : ''}`}>
                    <span className="text-sm font-bold leading-tight">Easy</span>
                  </button>
                </div>
                <button onClick={() => setIsEvaluationOpen(false)} className="text-muted text-sm font-medium hover:text-primary transition-colors py-1">Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* One row of modes, and nothing else.

            This was three stacked control groups wrapped around a card holding up to a
            hundred and nine words to be held in mind: a three-way Theme/Anchor/Verse
            switch, four mode tabs, and a second "More" row — nine controls, alongside a
            hint button, a TTS toggle, tap-to-toggle chrome, swipe and arrow-key
            navigation. Each one is a decision competing for the working memory the
            passage itself needs, which in a memorization product is the most expensive
            kind of clutter there is and the easiest to stop noticing.

            The subject switch is gone entirely. The Practice tab now opens the day's
            work, and the theme and anchor decks are reached from Today and from the book
            guides; inside the workshop the subject is already settled — it is this verse.
            The two mode rows became one, ordered from most help to least. */}
        <div className="flex flex-col gap-4 pb-24 lg:pb-24">
            <div className="grid grid-cols-6 border-b border-card-border">
              {[
                { id: 'read', label: 'Read' },
                { id: 'eraser', label: 'Erase' },
                { id: 'first-letter', label: 'Letters' },
                { id: 'scramble', label: 'Order' },
                { id: 'typing', label: 'Type' },
                { id: 'speech', label: 'Recite' },
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setActiveMode(mode.id as PracticeMode)}
                  aria-pressed={activeMode === mode.id}
                  className={`py-3 px-1 border-b-2 -mb-px text-xs font-bold transition-colors duration-150 ${
                    activeMode === mode.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
        </div>
      </div>

      {/* Bottom verse navigation — this level's equivalent of the reader's prev/next
          chapter and the book page's prev/next book, disabling each end the same way.
          The position readout sits in the centre slot where those bars put "CH 1" and
          "INDEX". Previously this lived inline above the workspace and scrolled away. */}
      <div className={`
        fixed bottom-0 left-0 right-0
        bg-card border-t border-card-border
        z-40 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${chromeVisible ? 'translate-y-0' : 'translate-y-full'}
      `}>
        <div className="max-w-4xl mx-auto flex items-center justify-between px-5 sm:px-8 py-3 pb-safe">
          <button
            onClick={handlePrev}
            disabled={activeVerseIndex === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-hover text-secondary hover:text-primary"
            aria-label="Previous verse"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:block">Previous</span>
            <span className="sm:hidden">Prev</span>
          </button>

          <span className="text-xs font-bold text-muted uppercase tracking-wider border border-card-border rounded-md px-3 py-1.5">
            {activeVerseIndex + 1} of {verses.length}
          </span>

          <button
            onClick={handleNext}
            disabled={activeVerseIndex === verses.length - 1}
            className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-hover text-secondary hover:text-primary"
            aria-label="Next verse"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};

