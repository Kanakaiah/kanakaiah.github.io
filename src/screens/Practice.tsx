import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronLeft, ArrowLeft, ArrowRight, Eye, Eraser, Keyboard, Grid, FileText, Mic, Maximize, Check, Play, Square, HelpCircle } from 'lucide-react';
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
import { Button } from '../components/ui/Button';

type PracticeMode = 'read' | 'eraser' | 'first-letter' | 'scramble' | 'typing' | 'speech' | 'immersed';

export const Practice: React.FC = () => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeMode, setActiveMode] = useState<PracticeMode>('read');
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);

  const [zoomLevel, setZoomLevel] = useState(1);
  const initialPinchDist = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  // If there are no verses, show empty state
  if (state.verses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 pt-20">
        <div className="w-16 h-16 bg-glass-bg rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-muted" />
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">No Verse Selected</h2>
        <p className="text-secondary mb-6 max-w-sm">Pick a verse from the dashboard list or add a new one to practice.</p>
        <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
      </div>
    );
  }

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

  if (!currentVerse) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 pt-20">
        <h2 className="text-xl font-bold text-primary mb-2">You're All Caught Up!</h2>
        <p className="text-secondary mb-6">No verses are currently due for review.</p>
        <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
      </div>
    );
  }

  const handleToggleTTS = () => {
    if (isAutoPlaying) {
      window.speechSynthesis.cancel();
      setIsAutoPlaying(false);
    } else {
      setIsAutoPlaying(true);
    }
  };

  // Handle Auto Play Logic
  React.useEffect(() => {
    if (activeMode !== 'read') {
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
      <div className="mb-6 p-4 rounded-xl bg-accent/10 border border-accent/20 text-secondary text-base leading-relaxed relative">
        <div className="absolute -top-2 -left-2 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
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

  // Render the current mode's workspace
  const renderWorkspace = () => {
    switch (activeMode) {
      case 'read':
      case 'immersed':
        return <ReadMode key={currentVerse.id} text={currentVerse.text} isImmersed={isImmersed} zoomLevel={zoomLevel} />;
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

    // Immersed click navigation
    const handleImmersedClick = (e: MouseEvent) => {
      if (!isImmersed) return;
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('button') || target.closest('a') || target.closest('.masked-sentence');
      
      if (!isInteractive) {
        const x = e.clientX;
        const width = window.innerWidth;
        if (x < width * 0.25) handlePrevVerse();
        else if (x > width * 0.75) handleNextVerse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('click', handleImmersedClick);

    // Fullscreen logic
    if (isImmersed && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('click', handleImmersedClick);
      
      if (isImmersed && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isImmersed, verses.length]);

  // Reset zoom when leaving immersed mode
  useEffect(() => {
    if (!isImmersed) {
      setZoomLevel(1);
    }
  }, [isImmersed]);

  // Pinch-to-zoom logic for Immersed mode
  useEffect(() => {
    if (!isImmersed) return;

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialPinchDist.current = getDistance(e.touches);
        initialZoomRef.current = zoomLevel;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDist.current !== null) {
        e.preventDefault(); // Prevent native browser page zoom
        const currentDist = getDistance(e.touches);
        const ratio = currentDist / initialPinchDist.current;
        let newZoom = initialZoomRef.current * ratio;
        newZoom = Math.max(0.5, Math.min(newZoom, 4.0));
        setZoomLevel(newZoom);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchDist.current = null;
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isImmersed, zoomLevel]);

  return (
    <div 
      className={`flex flex-col h-full w-full ${isImmersed ? 'fixed inset-0 z-[100]' : ''}`}
      style={isImmersed ? { backgroundColor: 'var(--bg-color)' } : {}}
    >
      
      {/* Header */}
      <div className={`flex items-center justify-between p-4 ${isImmersed ? 'absolute top-0 left-0 w-full z-10' : ''}`}>
        <button 
          onClick={() => {
            if (isImmersed) setActiveMode('read');
            else navigate(-1);
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-glass-bg border border-glass-border text-primary hover:bg-glass-bg-hover transition-colors"
        >
          {isImmersed ? <ArrowLeft className="w-5 h-5" /> : <ChevronLeft className="w-6 h-6" />}
        </button>
      </div>

      <div className={`flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 ${isImmersed ? 'justify-center items-center h-full' : ''}`}>
        
        {/* Mode Selector (Hidden in Immersed) */}
        {!isImmersed && (
          <div className="flex md:grid md:grid-cols-7 overflow-x-auto pb-6 pt-2 px-2 -mx-2 mb-2 scrollbar-hide gap-3">
            {[
              { id: 'read', icon: Eye, label: 'Read', sub: 'Read the full text' },
              { id: 'eraser', icon: Eraser, label: 'Eraser', sub: 'Hide words gradually' },
              { id: 'first-letter', icon: Keyboard, label: 'Letters', sub: 'First letters only' },
              { id: 'scramble', icon: Grid, label: 'Scramble', sub: 'Reorder words' },
              { id: 'typing', icon: FileText, label: 'Typing', sub: 'Type from memory' },
              { id: 'speech', icon: Mic, label: 'Recite', sub: 'Speak it aloud' },
              { id: 'immersed', icon: Maximize, label: 'Immersed', sub: 'Focus reading' },
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id as PracticeMode)}
                className={`flex-shrink-0 md:flex-shrink flex flex-col items-center p-3 rounded-xl min-w-[100px] md:min-w-0 border transition-all duration-300
                  ${activeMode === mode.id 
                    ? 'border-accent bg-[var(--accent-glow-strong)] shadow-[0_0_15px_var(--accent-glow)] scale-105' 
                    : 'bg-glass-bg border-glass-border hover:bg-glass-bg-hover'}`}
              >
                <mode.icon className={`w-6 h-6 mb-2 ${activeMode === mode.id ? 'text-accent' : 'text-secondary'}`} />
                <span className={`text-sm font-bold ${activeMode === mode.id ? 'text-primary' : 'text-secondary'}`}>{mode.label}</span>
                <span className="text-[10px] text-muted mt-1 text-center leading-tight">{mode.sub}</span>
              </button>
            ))}
          </div>
        )}

        {/* Display Board */}
        <div className={`bg-glass-bg border border-glass-border rounded-3xl p-6 lg:p-10 relative flex-1 flex flex-col ${isImmersed ? 'border-none bg-transparent w-full max-w-3xl' : 'shadow-sm mb-48 lg:mb-32'}`}>
          <div className="flex-1 flex flex-col">
            <div className={`flex items-center mb-6 ${isImmersed ? 'justify-center' : 'justify-between'}`}>
              <span 
                className={`font-heading font-bold transition-all duration-75 ${isImmersed ? 'text-secondary' : 'text-accent-light text-xl'}`}
                style={isImmersed ? { fontSize: `${1.5 * zoomLevel}rem`, lineHeight: `${2 * zoomLevel}rem` } : {}}
              >
                {currentVerse.ref}
              </span>
              
              {!isImmersed && activeMode === 'read' && (
                <button 
                  onClick={handleToggleTTS} 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent hover:bg-accent hover:text-white transition-colors text-sm font-bold"
                >
                  {isAutoPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isAutoPlaying ? 'Stop' : 'Auto Play'}</span>
                </button>
              )}

              {!isImmersed && activeMode !== 'read' && (
                <button 
                  onClick={handleHintClick} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-sm font-bold
                    ${hintLevel > 0 ? 'bg-accent text-white' : 'bg-accent/10 text-accent hover:bg-accent hover:text-white'}`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {hintLevel === 0 ? 'Show Hint' : hintLevel < 4 ? 'More Hint' : 'Hide Hint'}
                  </span>
                </button>
              )}
            </div>
            
            {!isImmersed && activeMode !== 'read' && renderProgressiveHint()}
            
            <div className="flex-1">
              {renderWorkspace()}
            </div>
          </div>

          {/* Navigation Arrows */}
          {!isImmersed && (
            <div className="mt-12 flex items-center justify-between">
              <button 
                onClick={handlePrev} disabled={activeVerseIndex === 0}
                className="p-2 rounded-full hover:bg-glass-bg-hover disabled:opacity-30 transition-colors text-secondary hover:text-primary"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              
              <span className="font-heading font-bold text-muted text-sm">
                {activeVerseIndex + 1} / {verses.length}
              </span>
              
              <button 
                onClick={handleNext} disabled={activeVerseIndex === verses.length - 1}
                className="p-2 rounded-full hover:bg-glass-bg-hover disabled:opacity-30 transition-colors text-secondary hover:text-primary"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Footer / Scoring (Hidden in Read/Immersed) */}
      {!isImmersed && activeMode !== 'read' && (
        <div className="fixed bottom-20 lg:bottom-4 left-0 lg:left-64 w-full lg:w-[calc(100%-16rem)] px-4 flex justify-center z-40">
          <div className="max-w-md w-full bg-glass-bg backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl p-4 flex flex-col gap-4">
            
            {!isEvaluationOpen ? (
              <Button onClick={() => setIsEvaluationOpen(true)} className="w-full h-12 shadow-accent/20">
                <Check className="w-5 h-5 mr-2" /> Score My Recall
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-center font-medium text-secondary text-sm">How well did you remember it?</p>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => handleScore(1)} className="py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-colors text-sm border border-red-500/20">Blank (1)</button>
                  <button onClick={() => handleScore(2)} className="py-3 rounded-xl bg-orange-500/10 text-orange-500 font-bold hover:bg-orange-500/20 transition-colors text-sm border border-orange-500/20">Hard (2)</button>
                  <button onClick={() => handleScore(4)} className="py-3 rounded-xl bg-blue-500/10 text-blue-500 font-bold hover:bg-blue-500/20 transition-colors text-sm border border-blue-500/20">Good (4)</button>
                  <button onClick={() => handleScore(5)} className="py-3 rounded-xl bg-green-500/10 text-green-500 font-bold hover:bg-green-500/20 transition-colors text-sm border border-green-500/20">Easy (5)</button>
                </div>
                <button onClick={() => setIsEvaluationOpen(false)} className="text-muted text-xs hover:text-primary mt-1">Cancel</button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
};

