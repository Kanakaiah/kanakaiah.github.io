import React, { useEffect, useMemo, useState } from 'react';
import { OT_BOOKS } from '../../data/otBooks';
import { NT_BOOKS } from '../../data/ntBooks';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import type { ThemeProgress } from '../../types/models';
import { buildReviewEvent } from '../../utils/reviewLog';
import { evaluateSM2, formatInterval, isDue } from '../../utils/sm2';
import { getBookName } from '../../utils/localization';
import { PracticeHeader, ReviewGrades } from './PracticeFeedback';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
const DEFAULT_SM2 = {
  interval: 0,
  repetition: 0,
  efactor: 2.5,
  nextDueDate: new Date().toISOString(),
};

type Scope = 'all' | 'ot' | 'nt';

const SCOPE_OPTIONS: { id: Scope; label: string }[] = [
  { id: 'all', label: 'Whole Bible' },
  { id: 'ot', label: 'Old Testament' },
  { id: 'nt', label: 'New Testament' },
];

/**
 * Book theme recall — the 66-book macro-structure deck.
 * Cover artwork stays withheld unless revealed or explicitly requested via "Show image cue",
 * and image-cued attempts advance without elevating SM-2 recall intervals.
 */
export const ThemeDrill: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();

  const [scope, setScope] = useState<Scope>('all');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [withCue, setWithCue] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const livePool = useMemo(() => {
    const books =
      scope === 'ot' ? OT_BOOKS : scope === 'nt' ? NT_BOOKS : ALL_BOOKS;
    const due = books
      .filter(b => {
        const p = state.themeProgress[b.id];
        return p && isDue(p.sm2);
      })
      .sort(
        (a, b) =>
          new Date(state.themeProgress[a.id].sm2.nextDueDate).getTime() -
          new Date(state.themeProgress[b.id].sm2.nextDueDate).getTime()
      );

    const fresh = books.filter(b => !state.themeProgress[b.id]);
    if (due.length > 0) return [...due, ...fresh];
    if (fresh.length > 0) return fresh;
    return books;
  }, [scope, state.themeProgress]);

  const [frozenPool, setFrozenPool] = useState<typeof livePool | null>(null);
  const pool = frozenPool ?? livePool;
  const current = pool[index];

  const goTo = (next: number) => {
    setIndex(next);
    setRevealed(false);
    setWithCue(false);
    setImgErr(false);
  };

  const changeScope = (next: Scope) => {
    setScope(next);
    setFrozenPool(null);
    setIsFinished(false);
    goTo(0);
  };

  const handleSkip = () => {
    if (index < pool.length - 1) {
      goTo(index + 1);
    } else {
      setFrozenPool(null);
      setIsFinished(true);
    }
  };

  const handleContinueCued = () => {
    if (!current) {
      handleSkip();
      return;
    }
    const existing = state.themeProgress[current.id];
    dispatch({
      type: 'RECORD_REVIEW',
      payload: buildReviewEvent({
        itemKind: 'theme',
        itemId: current.id,
        gradeSubmitted: 1,
        before: existing?.sm2,
        after: existing?.sm2 || DEFAULT_SM2,
        mode: 'assisted',
        cueLevel: 1,
      }),
    });
    handleSkip();
  };

  const handleGrade = (score: number) => {
    if (!current) return;
    if (!frozenPool) setFrozenPool(livePool);
    const existing = state.themeProgress[current.id];
    const { newSM2, newStatus } = evaluateSM2(
      existing?.sm2 || DEFAULT_SM2,
      score,
      'theme',
      state.settings.intervalScale ?? 1
    );
    const updated: ThemeProgress = {
      bookId: current.id,
      sm2: newSM2,
      status: newStatus,
      attempts: (existing?.attempts || 0) + 1,
      lastScore: score,
      lastAttemptDate: new Date().toISOString(),
    };
    dispatch({ type: 'GRADE_THEME_PROGRESS', payload: updated });
    dispatch({
      type: 'RECORD_REVIEW',
      payload: buildReviewEvent({
        itemKind: 'theme',
        itemId: current.id,
        gradeSubmitted: score,
        before: existing?.sm2,
        after: newSM2,
        mode: 'reveal',
        cueLevel: 0,
      }),
    });
    dispatch({ type: 'RECORD_ACTIVITY' });
    showToast(
      `Score logged. Next review in ${formatInterval(newSM2.interval)}.`,
      'success'
    );
    if (index < pool.length - 1) {
      goTo(index + 1);
    } else {
      setFrozenPool(null);
      setIsFinished(true);
    }
  };

  const learnedCount = useMemo(
    () => Object.values(state.themeProgress).filter(p => p.sm2.repetition >= 6).length,
    [state.themeProgress]
  );

  // Desktop keyboard shortcuts while avoiding form controls.
  useEffect(() => {
    if (isFinished || !current) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        else if (withCue) handleContinueCued();
        else handleGrade(4);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip();
      } else if (revealed && !withCue) {
        if (e.key === '1') handleGrade(1);
        else if (e.key === '2' || e.key === '3') handleGrade(3);
        else if (e.key === '4') handleGrade(4);
        else if (e.key === '5') handleGrade(5);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const displayName = current
    ? getBookName(current.id, current.name, state.settings.bibleVersion)
    : '';

  return (
    <div className="max-w-xl mx-auto w-full px-5 py-6 flex flex-col gap-4 pb-20">
      <PracticeHeader
        title="Book themes"
        subtitle="Recall the central theme of each book."
        index={index}
        total={isFinished ? 0 : pool.length}
        onExit={onExit}
        exitLabel="Back to Today"
      />

      <div className="flex flex-wrap gap-2">
        {SCOPE_OPTIONS.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => changeScope(opt.id)}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
              scope === opt.id
                ? 'bg-accent border-accent text-[#141414]'
                : 'bg-card border-card-border text-secondary hover:text-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="text-xs sm:text-sm text-secondary">
        {learnedCount} of 66 themes learned across the Bible
      </p>

      {isFinished || !current ? (
        <div className="rounded-2xl bg-card border border-card-border p-6 flex flex-col gap-4 text-center items-center mt-2">
          <h2 className="text-2xl font-heading font-bold text-primary">
            Theme practice complete
          </h2>
          <p className="text-sm text-secondary max-w-sm">
            {learnedCount} of 66 book themes are secure.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            <button
              type="button"
              onClick={() => {
                setIsFinished(false);
                setFrozenPool(null);
                goTo(0);
              }}
              className="flex-1 min-h-[48px] rounded-2xl bg-accent text-[#141414] font-bold text-sm hover:opacity-95"
            >
              Practice again
            </button>
            <button
              type="button"
              onClick={onExit}
              className="flex-1 min-h-[48px] rounded-2xl border border-card-border text-secondary hover:text-primary font-semibold text-sm"
            >
              Back to Today
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {(revealed || withCue) && (
            <div className="w-full h-52 rounded-2xl overflow-hidden bg-card-elevated border border-card-border flex items-center justify-center">
              {!imgErr ? (
                <img
                  src={current.image}
                  alt={`${displayName} cover`}
                  onError={() => setImgErr(true)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="text-4xl font-heading font-bold text-muted/30">
                  {displayName.slice(0, 3)}
                </span>
              )}
            </div>
          )}

          <h2 className="text-3xl font-heading font-bold text-primary">
            {displayName}
          </h2>

          {revealed ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-card-elevated border border-card-border p-5 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                  Book theme
                </span>
                <p className="text-2xl font-heading font-extrabold text-primary">
                  {current.themeWord}
                </p>
                {current.keyWord && (
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                    {current.keyWord}
                  </p>
                )}
                <p className="text-sm text-secondary font-serif italic pt-1">
                  {current.subtitle}
                </p>
              </div>

              {withCue ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-secondary">
                    Practiced with an image cue. Recall it without help in a later review.
                  </p>
                  <button
                    type="button"
                    onClick={handleContinueCued}
                    className="w-full min-h-[48px] rounded-2xl bg-accent text-[#141414] font-bold text-sm hover:opacity-95"
                  >
                    Continue without grading
                  </button>
                </div>
              ) : (
                <ReviewGrades ceiling={5} onGrade={handleGrade} />
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-base text-secondary">What is this book&apos;s theme?</p>
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="w-full min-h-[48px] rounded-2xl bg-accent text-[#141414] font-bold text-sm hover:opacity-95"
              >
                Show theme
              </button>
              {!withCue && (
                <button
                  type="button"
                  onClick={() => setWithCue(true)}
                  className="self-start text-sm font-semibold text-accent hover:underline"
                >
                  Show image cue
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleSkip}
            className="self-start text-xs font-semibold text-secondary hover:text-primary py-1"
          >
            Skip without grading
          </button>
        </div>
      )}
    </div>
  );
};
