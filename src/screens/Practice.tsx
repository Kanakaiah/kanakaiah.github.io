import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, ArrowLeft, ArrowRight, Eye, Eraser, Keyboard, FileText, Check, Play, Square, HelpCircle, X, Maximize } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { evaluateSM2 } from '../utils/sm2';
import type { Verse } from '../types/models';

// Subcomponents
import { ReadMode } from '../components/practice/ReadMode';
import { EraserMode } from '../components/practice/EraserMode';
import { FirstLetterMode } from '../components/practice/FirstLetterMode';
import { ScrambleMode } from '../components/practice/ScrambleMode';
import { TypingMode } from '../components/practice/TypingMode';
import { SpeechMode } from '../components/practice/SpeechMode';
import { ImmersedReader } from '../components/practice/ImmersedReader';
import { Button } from '../components/ui/Button';

type PracticeMode = 'read' | 'eraser' | 'first-letter' | 'scramble' | 'typing' | 'speech' | 'immersed';

export const Practice: React.FC = () => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeMode, setActiveMode] = useState<PracticeMode>('read');
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  
  const [isAutoPlaying, setIsAutoPlaying] = useState(state.settings.ttsEnabled);

  // Sync with global TTS setting
  React.useEffect(() => {
    setIsAutoPlaying(state.settings.ttsEnabled);
  }, [state.settings.ttsEnabled]);

  const [hintLevel, setHintLevel] = useState(0);

  // Filter for allDue if query param is present
  const isAllDue = searchParams.get('mode') === 'alldue';
  const targetId = searchParams.get('id');

  const verses = React.useMemo(() => {
    return isAllDue 
      ? state.verses.filter(v => v.status === 'review' || new Date(v.sm2.nextDueDate) <= new Date())
      : state.verses;
  }, [state.verses, isAllDue]);

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

  // Reset hint when changing verses or modes
  React.useEffect(() => {
    setHintLevel(0);
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

  const handleScore = (score: number) => {
    const { newSM2, newStatus } = evaluateSM2(currentVerse.sm2, score);
    
    const updatedVerse: Verse = {
      ...currentVerse,
      sm2: newSM2,
      status: newStatus,
      attempts: (currentVerse.attempts || 0) + 1
    };
    
    dispatch({ type: 'UPDATE_VERSE', payload: updatedVerse });
    setIsEvaluationOpen(false);
    showToast(`Score logged. Next review in ${newSM2.interval} days.`, 'success');
  };

  const formatInterval = (days: number) => {
    if (days === 0) return '<10m';
    if (days === 1) return '1d';
    if (days < 30) return `${days}d`;
    if (days < 365) return `${Math.round(days / 30)}mo`;
    return `${Math.round(days / 365)}y`;
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
        return <TypingMode key={currentVerse.id} text={currentVerse.text} />;
      case 'speech':
        return <SpeechMode key={currentVerse.id} text={currentVerse.text} />;
      default:
        return null;
    }
  };

  // Global Navigation: Keyboard, Swipe, and Immersed Taps
  React.useEffect(() => {
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
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
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
  }, [verses.length]);

  // If there are no verses, show empty state
  if (state.verses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 pt-20">
        <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-muted" />
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">No Verse Selected</h2>
        <p className="text-secondary mb-6 max-w-sm">Pick a verse from the dashboard list or add a new one to practice.</p>
        <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
      </div>
    );
  }

  if (!currentVerse) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 pt-20">
        <h2 className="text-xl font-bold text-primary mb-2">You're All Caught Up!</h2>
        <p className="text-secondary mb-6">No verses are currently due for review.</p>
        <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
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
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >

      {/* Session progress bar (thin line at very top) */}
      {verses.length > 1 && (
        <div className="absolute top-0 left-0 w-full h-0.5 bg-card-border z-30">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${((activeVerseIndex + 1) / verses.length) * 100}%` }}
          />
        </div>
      )}

      {/* Exit Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute left-4 lg:left-6 w-10 h-10 rounded-full flex items-center justify-center bg-card border border-card-border text-muted hover:text-primary hover:bg-card-hover transition-colors z-20 shadow-sm"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Audio Play/Pause Button */}
      <button
        onClick={handleToggleTTS}
        className="absolute right-4 lg:right-6 w-10 h-10 rounded-full flex items-center justify-center bg-card border border-card-border text-primary hover:text-accent hover:bg-card-hover transition-colors z-20 shadow-sm"
        title="Play Audio"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        {isAutoPlaying ? (
          <Square className="w-4 h-4 text-accent fill-accent" />
        ) : (
          <Play className="w-5 h-5 ml-1" />
        )}
      </button>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4">

        {/* Navigation & Header */}
        <div className="flex flex-col items-center gap-3 mb-8 mt-4 lg:mt-0">
          <span className="font-heading font-bold text-primary text-2xl tracking-tight">
            {currentVerse.ref}
          </span>
          <div className="flex items-center justify-between w-full max-w-xs bg-card p-1.5 rounded-full border border-card-border">
            <button
              onClick={handlePrev} disabled={activeVerseIndex === 0}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-card-hover disabled:opacity-30 transition-colors text-muted hover:text-primary"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 h-[2px] bg-card-border/50 mx-2 rounded-full"></div>
            <button
              onClick={handleNext} disabled={activeVerseIndex === verses.length - 1}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-card-hover disabled:opacity-30 transition-colors text-muted hover:text-primary"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <span className="font-heading font-semibold text-muted text-xs uppercase tracking-widest mt-1">
            {activeVerseIndex + 1} of {verses.length}
          </span>
        </div>

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
                <p className="text-center font-semibold text-primary">How well did you remember it?</p>
                <div className="grid grid-cols-4 gap-3">
                  <button onClick={() => handleScore(1)} className="py-3 flex flex-col items-center justify-center rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/20 active:scale-95">
                    <span className="text-sm font-bold leading-tight">Blank</span>
                    <span className="text-[0.6875rem] opacity-80 font-medium">{formatInterval(evaluateSM2(currentVerse.sm2, 1).newSM2.interval)}</span>
                  </button>
                  <button onClick={() => handleScore(2)} className="py-3 flex flex-col items-center justify-center rounded-md bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors border border-orange-500/20 active:scale-95">
                    <span className="text-sm font-bold leading-tight">Hard</span>
                    <span className="text-[0.6875rem] opacity-80 font-medium">{formatInterval(evaluateSM2(currentVerse.sm2, 2).newSM2.interval)}</span>
                  </button>
                  <button onClick={() => handleScore(4)} className="py-3 flex flex-col items-center justify-center rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors border border-blue-500/20 active:scale-95">
                    <span className="text-sm font-bold leading-tight">Good</span>
                    <span className="text-[0.6875rem] opacity-80 font-medium">{formatInterval(evaluateSM2(currentVerse.sm2, 4).newSM2.interval)}</span>
                  </button>
                  <button onClick={() => handleScore(5)} className="py-3 flex flex-col items-center justify-center rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors border border-green-500/20 active:scale-95">
                    <span className="text-sm font-bold leading-tight">Easy</span>
                    <span className="text-[0.6875rem] opacity-80 font-medium">{formatInterval(evaluateSM2(currentVerse.sm2, 5).newSM2.interval)}</span>
                  </button>
                </div>
                <button onClick={() => setIsEvaluationOpen(false)} className="text-muted text-sm font-medium hover:text-primary transition-colors py-1">Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* Mode Selector (Moved to Bottom) */}
        <div className="flex flex-col gap-5 pb-4 lg:pb-8">
            {/* Primary Modes — plain text tabs with an underline indicator */}
            <div className="grid grid-cols-4 border-b border-card-border">
              {[
                { id: 'read', icon: Eye, label: 'Read' },
                { id: 'eraser', icon: Eraser, label: 'Erase' },
                { id: 'first-letter', icon: Keyboard, label: 'Letters' },
                { id: 'typing', icon: FileText, label: 'Type' },
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setActiveMode(mode.id as PracticeMode)}
                  className={`flex flex-col items-center gap-2 py-3 px-2 border-b-2 -mb-px transition-colors duration-150
                    ${activeMode === mode.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-secondary hover:text-primary'}`}
                >
                  <mode.icon className="w-5 h-5" />
                  <span className="text-xs font-bold">{mode.label}</span>
                </button>
              ))}
            </div>

            {/* Secondary Modes — compact text row */}
            <div className="flex items-center justify-center gap-4 mt-1 text-sm font-semibold text-muted">
              <span className="text-xs uppercase tracking-widest opacity-80">More</span>
              <div className="w-px h-4 bg-card-border" />
              <div className="flex items-center gap-4">
                {[
                  { id: 'scramble', label: 'Scramble' },
                  { id: 'speech', label: 'Recite' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setActiveMode(mode.id as PracticeMode)}
                    className={`transition-colors ${activeMode === mode.id ? 'text-accent font-bold' : 'hover:text-primary'}`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

