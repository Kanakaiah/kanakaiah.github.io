import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Square, Minus, Plus } from 'lucide-react';
import { ReadMode } from './ReadMode';
import type { Verse } from '../../types/models';

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;
const IDLE_MS = 4000;

const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

interface ImmersedReaderProps {
  verse: Verse;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
}

export const ImmersedReader: React.FC<ImmersedReaderProps> = ({
  verse,
  index,
  total,
  onPrev,
  onNext,
  onExit,
  isAutoPlaying,
  onToggleAutoPlay,
}) => {
  const [zoom, setZoom] = useState(1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);

  // Mirrors chromeVisible so the toggle can read it without an impure state updater.
  const chromeVisibleRef = useRef(true);
  useEffect(() => {
    chromeVisibleRef.current = chromeVisible;
  }, [chromeVisible]);

  // Show the controls, then fade them out again after a period of stillness.
  const revealChrome = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setChromeVisible(true);
    idleTimer.current = setTimeout(() => setChromeVisible(false), IDLE_MS);
  }, []);

  const hideChrome = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setChromeVisible(false);
  }, []);

  const toggleChrome = useCallback(() => {
    setHasInteracted(true);
    if (chromeVisibleRef.current) hideChrome();
    else revealChrome();
  }, [hideChrome, revealChrome]);

  // Controls start visible (so the exit and nav affordances are discoverable),
  // and reappear whenever the verse changes so progress stays legible.
  useEffect(() => {
    revealChrome();
  }, [index, revealChrome]);

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  // Pointer movement brings the controls back on desktop.
  useEffect(() => {
    const handleMove = () => revealChrome();
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [revealChrome]);

  // Escape leaves immersive reading. Leaving browser fullscreen (also Escape,
  // which the browser swallows) must exit too, or the overlay would be stranded.
  // Declared before the fullscreen effect so this listener is detached first on unmount.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
        return;
      }
      revealChrome();
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) onExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onExit, revealChrome]);

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  // Pinch to resize the text on touch devices.
  useEffect(() => {
    const distance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDist.current = distance(e.touches);
        pinchStartZoom.current = zoom;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current !== null) {
        e.preventDefault(); // block the browser's own page zoom
        setZoom(clampZoom(pinchStartZoom.current * (distance(e.touches) / pinchStartDist.current)));
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStartDist.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoom]);

  // `invisible` (visibility:hidden) rather than just opacity so faded controls also
  // drop out of hit-testing and the tab order instead of being invisibly focusable.
  const chromeClass = chromeVisible ? 'opacity-100' : 'opacity-0 invisible';
  const iconButton =
    'p-2.5 rounded-md text-muted hover:text-primary hover:bg-card-hover transition-colors disabled:opacity-25 disabled:pointer-events-none';

  return (
    <div
      className="fixed inset-0 z-[100] bg-background flex flex-col animate-[fadeIn_0.25s_ease-out]"
      onClick={toggleChrome}
    >
      {/* Ambient session progress — stays put while the controls come and go */}
      {total > 1 && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-card-border z-30">
          <div
            className="h-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      )}

      {/* Top controls */}
      <header
        className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-4 px-3 sm:px-5 transition-[opacity,visibility] duration-300 ${chromeClass}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onExit} className={iconButton} aria-label="Exit immersive reading" title="Exit (Esc)">
          <X className="w-5 h-5" />
        </button>

        {total > 1 && (
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-muted tabular-nums">
            {index + 1} / {total}
          </span>
        )}

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setZoom(z => clampZoom(z - ZOOM_STEP))}
            disabled={zoom <= MIN_ZOOM}
            className={iconButton}
            aria-label="Decrease text size"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-1 py-2 text-[0.6875rem] font-bold tabular-nums text-muted hover:text-primary transition-colors w-11 text-center"
            aria-label="Reset text size"
            title="Reset text size"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom(z => clampZoom(z + ZOOM_STEP))}
            disabled={zoom >= MAX_ZOOM}
            className={iconButton}
            aria-label="Increase text size"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-card-border mx-1.5" />

          <button
            onClick={onToggleAutoPlay}
            className={iconButton}
            aria-label={isAutoPlaying ? 'Stop reading aloud' : 'Read aloud'}
            title={isAutoPlaying ? 'Stop reading aloud' : 'Read aloud'}
          >
            {isAutoPlaying ? (
              <Square className="w-4 h-4 fill-accent text-accent" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* The page */}
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full flex items-center px-6 sm:px-10 py-24">
          <div className="w-full max-w-3xl mx-auto">
            <div className="mb-6 pb-3 border-b border-card-border">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.25em] text-accent">
                {verse.ref}
              </span>
            </div>

            <ReadMode key={verse.id} text={verse.text} isImmersed zoomLevel={zoom} />

            {verse.translation && (
              <p className="mt-10 text-[0.625rem] font-bold uppercase tracking-[0.2em] text-muted">
                {verse.translation}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Bottom controls */}
      <footer
        className={`absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between gap-4 px-3 sm:px-5 transition-[opacity,visibility] duration-300 ${chromeClass}`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onPrev}
          disabled={index === 0}
          className={`${iconButton} flex items-center gap-1.5 text-sm font-medium`}
          aria-label="Previous verse"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {!hasInteracted && (
          <span className="text-[0.6875rem] text-muted/70 text-center hidden sm:block">
            Tap anywhere to hide controls · ← → to move between verses
          </span>
        )}

        <button
          onClick={onNext}
          disabled={index >= total - 1}
          className={`${iconButton} flex items-center gap-1.5 text-sm font-medium`}
          aria-label="Next verse"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
};
