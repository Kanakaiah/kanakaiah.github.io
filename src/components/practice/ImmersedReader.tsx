import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Square,
  Type,
  Volume2,
  X,
} from 'lucide-react';
import type { SortOrder, Verse } from '../../types/models';
import { practicePassage, studyThoughts } from '../../utils/studyText';

const IMMERSE_APPEARANCE_KEY = 'remora_immerse_appearance';

export interface ImmerseAppearanceSettings {
  fontSize: number;
  lineHeight: number;
  layout: 'paragraph' | 'thought';
  masking: boolean;
  readingWidth: 'narrow' | 'comfort' | 'wide';
  font: 'serif' | 'sans' | 'system';
  theme: 'app' | 'paper' | 'night';
}

const DEFAULT_APPEARANCE: ImmerseAppearanceSettings = {
  fontSize: 26,
  lineHeight: 1.6,
  layout: 'paragraph',
  masking: false,
  readingWidth: 'comfort',
  font: 'serif',
  theme: 'app',
};

function loadAppearance(): ImmerseAppearanceSettings {
  try {
    const raw = localStorage.getItem(IMMERSE_APPEARANCE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<ImmerseAppearanceSettings>;
    return {
      fontSize:
        typeof parsed.fontSize === 'number'
          ? Math.min(40, Math.max(22, parsed.fontSize))
          : DEFAULT_APPEARANCE.fontSize,
      lineHeight:
        typeof parsed.lineHeight === 'number'
          ? Math.min(2.0, Math.max(1.5, parsed.lineHeight))
          : DEFAULT_APPEARANCE.lineHeight,
      layout: parsed.layout === 'thought' ? 'thought' : 'paragraph',
      masking: Boolean(parsed.masking),
      readingWidth:
        parsed.readingWidth === 'narrow' || parsed.readingWidth === 'wide'
          ? parsed.readingWidth
          : 'comfort',
      font:
        parsed.font === 'sans' || parsed.font === 'system' ? parsed.font : 'serif',
      theme:
        parsed.theme === 'paper' || parsed.theme === 'night'
          ? parsed.theme
          : 'app',
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function saveAppearance(settings: ImmerseAppearanceSettings) {
  try {
    localStorage.setItem(IMMERSE_APPEARANCE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors in restricted browsing modes.
  }
}

const WIDTH_MAX_PX: Record<ImmerseAppearanceSettings['readingWidth'], string> = {
  narrow: '420px',
  comfort: '620px',
  wide: '840px',
};

const FONT_FAMILY_CSS: Record<ImmerseAppearanceSettings['font'], string> = {
  serif: "'Merriweather', 'Lora', Georgia, serif",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
  system: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
};

const VERSE_ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'smart', label: 'Review priority' },
  { value: 'bible-asc', label: 'Bible order' },
  { value: 'random', label: 'Shuffle' },
];

export interface ImmersedReaderProps {
  verse: Verse;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
  onExposure?: () => void;
  verseOrder?: SortOrder;
  onChangeVerseOrder?: (order: SortOrder) => void;
  bibleVersion?: string;
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
  onExposure,
  verseOrder,
  onChangeVerseOrder,
  bibleVersion,
}) => {
  const [appearance, setAppearance] = useState<ImmerseAppearanceSettings>(loadAppearance);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [orderMenuOpen, setOrderMenuOpen] = useState(false);

  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [thoughtHidden, setThoughtHidden] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [revealedSentences, setRevealedSentences] = useState<number[]>([]);

  const updateAppearance = (
    patch:
      | Partial<ImmerseAppearanceSettings>
      | ((prev: ImmerseAppearanceSettings) => ImmerseAppearanceSettings)
  ) => {
    setAppearance(prev => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      saveAppearance(next);
      return next;
    });
  };

  const passage = useMemo(() => practicePassage(verse.text || ''), [verse.text]);
  const text = passage.text;
  const sentences = useMemo(() => studyThoughts(text), [text]);
  const readingBlocks = useMemo(
    () =>
      text
        .split(/\n\s*\n/)
        .map(b => b.trim())
        .filter(Boolean),
    [text]
  );

  // Reset per-verse reveal & thought cursor cleanly on verse change.
  useEffect(() => {
    setThoughtIndex(0);
    setThoughtHidden(false);
    setShowContext(false);
    setRevealedSentences([]);
  }, [verse.id, text]);

  // Report passage exposure once full passage or all sentences become visible/heard.
  useEffect(() => {
    if (!onExposure) return;
    if (!appearance.masking || isAutoPlaying) {
      onExposure();
    }
  }, [verse.id, text, appearance.masking, isAutoPlaying, onExposure]);

  // Keyboard shortcuts for desktop accessibility.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (appearanceOpen) {
        if (e.key === 'Escape') setAppearanceOpen(false);
        return;
      }
      if (e.key === 'Escape') {
        onExit();
      } else if (e.key === 'ArrowLeft' && total > 1 && index > 0) {
        onPrev();
      } else if (e.key === 'ArrowRight' && total > 1 && index < total - 1) {
        onNext();
      } else if (e.key === ' ') {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag !== 'BUTTON' && tag !== 'INPUT') {
          e.preventDefault();
          onToggleAutoPlay();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appearanceOpen, index, total, onExit, onPrev, onNext, onToggleAutoPlay]);

  const themeClasses = useMemo(() => {
    if (appearance.theme === 'paper') {
      return {
        root: 'bg-[#FAF8F4] text-[#1E1B16]',
        muted: 'text-[#665F54]',
        surface: 'bg-[#EFECE4] border-[#DDD6C7]',
        sheet: 'bg-[#FAF8F4] text-[#1E1B16] border-[#DDD6C7]',
        chipIdle: 'bg-[#EFECE4] border-[#DDD6C7] text-[#4E473E]',
        chipActive: 'bg-[#B57B1C] border-[#B57B1C] text-white',
      };
    }
    if (appearance.theme === 'night') {
      return {
        root: 'bg-[#000000] text-[#F1EEE8]',
        muted: 'text-[#9B9589]',
        surface: 'bg-[#121212] border-[#262626]',
        sheet: 'bg-[#111111] text-[#F1EEE8] border-[#262626]',
        chipIdle: 'bg-[#171717] border-[#2C2C2C] text-[#BDB7AB]',
        chipActive: 'bg-accent border-accent text-[#141414]',
      };
    }
    return {
      root: 'bg-background text-primary',
      muted: 'text-secondary',
      surface: 'bg-card border-card-border',
      sheet: 'bg-card-elevated text-primary border-card-border',
      chipIdle: 'bg-card border-card-border text-secondary hover:text-primary',
      chipActive: 'bg-accent border-accent text-[#141414]',
    };
  }, [appearance.theme]);

  const safeThoughtIndex = Math.min(thoughtIndex, Math.max(0, sentences.length - 1));
  const currentThought = sentences[safeThoughtIndex] || text;
  const previewThought =
    sentences.length > 1
      ? (sentences[safeThoughtIndex + 1] ?? sentences[safeThoughtIndex - 1] ?? '').trim()
      : '';

  const hiddenControlClass = (visible: boolean) =>
    visible ? 'opacity-100' : 'opacity-0 pointer-events-none select-none';

  const revealSentence = (idx: number) => {
    setRevealedSentences(prev => (prev.includes(idx) ? prev : [...prev, idx]));
    onExposure?.();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col min-h-0 w-full h-[100dvh] transition-colors ${themeClasses.root}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Top Bar (fixed slot stability in Focus Mode) */}
      <header className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-5 h-16">
        <button
          type="button"
          onClick={onExit}
          disabled={!controlsVisible}
          aria-hidden={!controlsVisible}
          aria-label="Exit immersed reader"
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-opacity ${hiddenControlClass(
            controlsVisible
          )} hover:bg-black/10 dark:hover:bg-white/10`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1 text-center px-2">
          <p className="font-heading font-bold text-base sm:text-lg truncate">
            {verse.ref}
          </p>
          <p className={`text-xs truncate ${themeClasses.muted}`}>
            {onChangeVerseOrder ? 'Passage' : 'Verse'} {index + 1} of {Math.max(1, total)}
            {bibleVersion ? ` · ${bibleVersion}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAppearanceOpen(true)}
            disabled={!controlsVisible}
            aria-hidden={!controlsVisible}
            aria-label="Reading appearance"
            title="Reading appearance"
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-opacity ${hiddenControlClass(
              controlsVisible
            )} hover:bg-black/10 dark:hover:bg-white/10`}
          >
            <Type className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setControlsVisible(v => !v);
              setOrderMenuOpen(false);
            }}
            aria-label={controlsVisible ? 'Hide controls' : 'Show controls'}
            title={controlsVisible ? 'Hide controls' : 'Show controls'}
            className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            {controlsVisible ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Scrollable Viewport */}
      <main
        className="flex-1 min-h-0 overflow-y-auto px-6 py-6 sm:py-10 flex flex-col items-center"
        onClick={() => {
          if (!controlsVisible) setControlsVisible(true);
        }}
      >
        <div
          className="w-full my-auto flex flex-col gap-5"
          style={{ maxWidth: WIDTH_MAX_PX[appearance.readingWidth] }}
          onClick={e => e.stopPropagation()}
        >
          {appearance.layout === 'thought' ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${themeClasses.muted}`}>
                  Thought {safeThoughtIndex + 1} of {Math.max(1, sentences.length)}
                </span>
                {verse.note && controlsVisible && (
                  <span className={`text-xs italic truncate max-w-[60%] ${themeClasses.muted}`}>
                    {verse.note}
                  </span>
                )}
              </div>

              {thoughtHidden ? (
                <div className={`rounded-2xl border p-6 text-center ${themeClasses.surface}`}>
                  <p className="font-heading font-bold text-xl">Recall this thought.</p>
                  <p className={`text-sm mt-1 ${themeClasses.muted}`}>
                    Say or picture the line in your mind, then check yourself.
                  </p>
                </div>
              ) : (
                <p
                  style={{
                    fontSize: `${appearance.fontSize}px`,
                    lineHeight: appearance.lineHeight,
                    fontFamily: FONT_FAMILY_CSS[appearance.font],
                  }}
                  className="font-normal tracking-[-0.01em] whitespace-pre-wrap"
                >
                  {currentThought.trim()}
                </p>
              )}

              {!thoughtHidden && !showContext && previewThought && (
                <p
                  style={{
                    fontSize: `${Math.round(appearance.fontSize * 0.85)}px`,
                    lineHeight: appearance.lineHeight,
                    fontFamily: FONT_FAMILY_CSS[appearance.font],
                  }}
                  className={`${themeClasses.muted} opacity-75 whitespace-pre-wrap`}
                >
                  {previewThought}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={safeThoughtIndex <= 0}
                  onClick={() => {
                    setThoughtIndex(i => Math.max(0, i - 1));
                    setThoughtHidden(false);
                    setShowContext(false);
                  }}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-opacity disabled:opacity-35 ${themeClasses.surface}`}
                >
                  Previous thought
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setThoughtHidden(h => !h);
                    setShowContext(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-accent text-[#141414] text-xs font-bold inline-flex items-center gap-1.5"
                >
                  {thoughtHidden ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Show thought
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Hide to recall
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={safeThoughtIndex >= sentences.length - 1}
                  onClick={() => {
                    setThoughtIndex(i => Math.min(sentences.length - 1, i + 1));
                    setThoughtHidden(false);
                    setShowContext(false);
                  }}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-opacity disabled:opacity-35 ${themeClasses.surface}`}
                >
                  Next thought
                </button>
              </div>

              {!thoughtHidden && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowContext(v => !v)}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    {showContext ? 'Close whole passage' : 'Read in context'}
                  </button>
                  {showContext && (
                    <div
                      className={`mt-3 rounded-2xl border p-4 whitespace-pre-wrap ${themeClasses.surface}`}
                      style={{
                        fontSize: `${Math.max(18, Math.round(appearance.fontSize * 0.85))}px`,
                        lineHeight: appearance.lineHeight,
                        fontFamily: FONT_FAMILY_CSS[appearance.font],
                      }}
                    >
                      {text}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : !appearance.masking ? (
            <div className="flex flex-col gap-5">
              {(readingBlocks.length > 0 ? readingBlocks : [text]).map((block, bIdx) => (
                <p
                  key={bIdx}
                  style={{
                    fontSize: `${appearance.fontSize}px`,
                    lineHeight: appearance.lineHeight,
                    fontFamily: FONT_FAMILY_CSS[appearance.font],
                  }}
                  className="font-normal tracking-[-0.01em] whitespace-pre-wrap"
                >
                  {block}
                </p>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {sentences.map((sentence, idx) => {
                const isRevealed = revealedSentences.includes(idx);
                if (isRevealed) {
                  return (
                    <p
                      key={idx}
                      style={{
                        fontSize: `${appearance.fontSize}px`,
                        lineHeight: appearance.lineHeight,
                        fontFamily: FONT_FAMILY_CSS[appearance.font],
                      }}
                      className="font-normal tracking-[-0.01em] whitespace-pre-wrap"
                    >
                      {sentence.trim()}
                    </p>
                  );
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => revealSentence(idx)}
                    className={`w-full min-h-[52px] px-4 py-3 rounded-2xl border text-sm font-semibold text-center transition-colors hover:border-accent ${themeClasses.surface}`}
                  >
                    Reveal sentence {idx + 1}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Bar (keeps slot layout stable when Focus Mode hides outer controls) */}
      <footer className="shrink-0 px-4 sm:px-6 h-20 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={!controlsVisible || total <= 1 || index <= 0}
          aria-hidden={!controlsVisible || total <= 1}
          aria-label="Previous verse"
          className={`w-11 h-11 rounded-full flex items-center justify-center border transition-opacity disabled:opacity-30 ${
            themeClasses.surface
          } ${hiddenControlClass(controlsVisible && total > 1)}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={onToggleAutoPlay}
            disabled={!controlsVisible && !isAutoPlaying}
            aria-label={isAutoPlaying ? 'Stop reading aloud' : 'Read aloud'}
            className={`px-5 h-11 rounded-full font-semibold text-sm inline-flex items-center gap-2 transition-all ${
              isAutoPlaying
                ? 'bg-accent text-[#141414] shadow-sm'
                : `${themeClasses.surface} border hover:border-accent/60`
            } ${hiddenControlClass(controlsVisible || isAutoPlaying)}`}
          >
            {isAutoPlaying ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Listen</span>
              </>
            )}
          </button>

          {onChangeVerseOrder && (
            <div className={hiddenControlClass(controlsVisible)}>
              <button
                type="button"
                disabled={!controlsVisible || total <= 1}
                onClick={() => setOrderMenuOpen(o => !o)}
                aria-label="Verse order"
                title="Verse order"
                className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors disabled:opacity-40 ${themeClasses.surface}`}
              >
                <ArrowDownUp className="w-4 h-4" />
              </button>

              {orderMenuOpen && controlsVisible && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOrderMenuOpen(false)}
                  />
                  <div
                    className={`absolute bottom-14 right-0 z-50 min-w-[170px] rounded-2xl border shadow-xl overflow-hidden ${themeClasses.sheet}`}
                  >
                    {VERSE_ORDER_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChangeVerseOrder(opt.value);
                          setOrderMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                          verseOrder === opt.value
                            ? 'text-accent font-semibold'
                            : ''
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!controlsVisible || total <= 1 || index >= total - 1}
          aria-hidden={!controlsVisible || total <= 1}
          aria-label="Next verse"
          className={`w-11 h-11 rounded-full flex items-center justify-center border transition-opacity disabled:opacity-30 ${
            themeClasses.surface
          } ${hiddenControlClass(controlsVisible && total > 1)}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>

      {/* Reading Appearance Bottom Sheet */}
      {appearanceOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center"
          onClick={() => setAppearanceOpen(false)}
        >
          <div
            className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border p-6 flex flex-col gap-5 shadow-2xl ${themeClasses.sheet}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-heading font-bold">Reading appearance</h2>
              <button
                type="button"
                onClick={() => setAppearanceOpen(false)}
                className="text-sm font-semibold text-accent hover:opacity-80"
              >
                Done
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Text size</span>
                <span className={themeClasses.muted}>{appearance.fontSize}px</span>
              </div>
              <input
                type="range"
                min={22}
                max={40}
                step={2}
                value={appearance.fontSize}
                onChange={e => updateAppearance({ fontSize: Number(e.target.value) })}
                aria-label="Text size"
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Line spacing</span>
                <span className={themeClasses.muted}>{appearance.lineHeight.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={1.5}
                max={2.0}
                step={0.1}
                value={appearance.lineHeight}
                onChange={e => updateAppearance({ lineHeight: Number(e.target.value) })}
                aria-label="Line spacing"
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Layout</span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: 'paragraph', label: 'Whole passage' },
                    { key: 'thought', label: 'Thought focus' },
                  ] as const
                ).map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      updateAppearance({ layout: opt.key, masking: false });
                      setThoughtHidden(false);
                      setShowContext(false);
                      setRevealedSentences([]);
                    }}
                    className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                      appearance.layout === opt.key
                        ? themeClasses.chipActive
                        : themeClasses.chipIdle
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className={`text-xs ${themeClasses.muted}`}>
                Complete sentences are kept together when reviewed thought boundaries are unavailable.
              </p>
              {appearance.layout === 'paragraph' && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      updateAppearance(prev => ({ ...prev, masking: !prev.masking }));
                      setRevealedSentences([]);
                      setAppearanceOpen(false);
                    }}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    {appearance.masking ? 'Show whole passage' : 'Hide to recall'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Reading width</span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: 'narrow', label: 'Narrow' },
                    { key: 'comfort', label: 'Comfort' },
                    { key: 'wide', label: 'Wide' },
                  ] as const
                ).map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => updateAppearance({ readingWidth: opt.key })}
                    className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                      appearance.readingWidth === opt.key
                        ? themeClasses.chipActive
                        : themeClasses.chipIdle
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Typeface</span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: 'serif', label: 'Serif' },
                    { key: 'sans', label: 'Sans' },
                    { key: 'system', label: 'System' },
                  ] as const
                ).map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => updateAppearance({ font: opt.key })}
                    className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                      appearance.font === opt.key
                        ? themeClasses.chipActive
                        : themeClasses.chipIdle
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Theme</span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: 'app', label: 'App theme' },
                    { key: 'paper', label: 'Paper' },
                    { key: 'night', label: 'Night' },
                  ] as const
                ).map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => updateAppearance({ theme: opt.key })}
                    className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                      appearance.theme === opt.key
                        ? themeClasses.chipActive
                        : themeClasses.chipIdle
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
