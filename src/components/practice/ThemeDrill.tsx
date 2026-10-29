import React, { useMemo, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { evaluateSM2, formatInterval, isDue } from '../../utils/sm2';
import { buildReviewEvent } from '../../utils/reviewLog';
import type { ThemeProgress } from '../../types/models';
import { OT_BOOKS } from '../../data/otBooks';
import { NT_BOOKS } from '../../data/ntBooks';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
const DEFAULT_SM2 = { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() };

const GRADES: { score: number; label: string; className: string }[] = [
  { score: 1, label: 'Blank', className: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20' },
  { score: 3, label: 'Hard', className: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20' },
  { score: 4, label: 'Good', className: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20' },
  { score: 5, label: 'Easy', className: 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20' },
];

type Scope = 'all' | 'ot' | 'nt';

/**
 * Theme recall — the third of the app's three stated goals, and the only one that had
 * no test anywhere in the product.
 *
 * The nearest thing that existed was the book index's "Covers only" toggle, which hid
 * each book's *name* and showed its theme word. That's the right instinct pointed
 * exactly backwards: it withheld what the reader already knows and displayed the thing
 * to be learned, and recorded nothing either way. This inverts it — the name and its
 * cover art are the prompt, the theme word is the answer — and schedules the result on
 * the same SM-2 loop as verses and chapter anchors.
 *
 * 66 items is a small deck, which is the point: it is the cheapest complete layer of
 * the three, and the one that makes the whole canon feel navigable.
 */
export const ThemeDrill: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();

  const [scope, setScope] = useState<Scope>('all');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const livePool = useMemo(() => {
    const books = scope === 'ot' ? OT_BOOKS : scope === 'nt' ? NT_BOOKS : ALL_BOOKS;
    // Due first (most overdue leading), then never-attempted, then the rest.
    const due = books.filter(b => {
      const p = state.themeProgress[b.id];
      return p && isDue(p.sm2);
    }).sort((a, b) =>
      new Date(state.themeProgress[a.id].sm2.nextDueDate).getTime() -
      new Date(state.themeProgress[b.id].sm2.nextDueDate).getTime());

    const fresh = books.filter(b => !state.themeProgress[b.id]);
    if (due.length > 0) return [...due, ...fresh];
    if (fresh.length > 0) return fresh;
    return books; // Fallback so review is always possible across the scope!
  }, [scope, state.themeProgress]);

  // Frozen on the first grade, for the same reason the anchor drill's queue is: this
  // list is derived from themeProgress, which grading mutates. A graded book leaves
  // `fresh`, every later book shifts left one place, and an advancing index then steps
  // straight over its neighbour — grade Genesis and you are shown Leviticus, never
  // Exodus. Snapshotting means the index and the list cannot disagree.
  const [frozenPool, setFrozenPool] = useState<typeof livePool | null>(null);
  const pool = frozenPool ?? livePool;

  const current = pool[index];

  // Reset happens where the change happens. An effect that setStates on [index, scope]
  // is a cascading render for something both call sites already know they're doing.
  const goTo = (next: number) => { setIndex(next); setRevealed(false); setImgErr(false); };
  const changeScope = (next: Scope) => { setScope(next); setFrozenPool(null); setIsFinished(false); goTo(0); };

  const existing = current ? state.themeProgress[current.id] : undefined;

  const handleGrade = (score: number) => {
    if (!current) return;
    if (!frozenPool) setFrozenPool(livePool);
    const { newSM2, newStatus } = evaluateSM2(existing?.sm2 || DEFAULT_SM2, score, 'theme', state.settings.intervalScale ?? 1);
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
        itemKind: 'theme', itemId: current.id, gradeSubmitted: score,
        before: existing?.sm2, after: newSM2, mode: 'reveal', cueLevel: 0,
      }),
    });
    dispatch({ type: 'RECORD_ACTIVITY' });
    showToast(`Score logged. Next review in ${formatInterval(newSM2.interval)}.`, 'success');
    if (index < pool.length - 1) {
      goTo(index + 1);
    } else {
      setFrozenPool(null);
      setIsFinished(true);
    }
  };

  const learned = useMemo(
    () => Object.values(state.themeProgress).filter(p => p.sm2.repetition >= 6).length,
    [state.themeProgress]
  );

  if (isFinished || !current) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4 pt-20">
        <h2 className="text-xl font-bold text-primary">Every theme is scheduled</h2>
        <p className="text-secondary max-w-sm">
          Nothing in this set is due. {learned} of 66 book themes are secure.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={() => {
              setIsFinished(false);
              setFrozenPool(null);
              goTo(0);
            }}
            className="px-6 py-2.5 rounded-xl bg-accent text-[#14120E] text-sm font-bold hover:brightness-110 transition-colors shadow-sm"
          >
            Practice Again
          </button>
          <button
            onClick={onExit}
            className="px-6 py-2.5 rounded-xl border border-card-border text-sm font-semibold text-secondary hover:text-primary transition-colors"
          >
            Back to Today
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full w-full max-w-lg mx-auto px-4 pt-4 pb-4 justify-between gap-4 select-none">
      {/* Unified Sleek Top Bar: (X) Close on Left, Scope Pills in Center, Progress on Right */}
      <div className="flex items-center justify-between w-full h-11">
        <button
          onClick={onExit}
          className="p-2 -ml-2 rounded-full hover:bg-card-hover text-secondary hover:text-primary transition-colors"
          aria-label="Close to Today"
          title="Close to Today"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scope Selector Pills: Old / New / Whole */}
        <div className="flex items-center gap-1 bg-card-elevated p-1 rounded-xl border border-card-border">
          {([
            { id: 'ot', label: 'Old' },
            { id: 'nt', label: 'New' },
            { id: 'all', label: 'Whole' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => changeScope(tab.id as Scope)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                scope === tab.id
                  ? 'bg-accent text-[#14120E] shadow-sm'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Progress Counter Badge */}
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-primary tabular-nums">
            {learned}/66
          </span>
          <span className="text-[10px] text-muted tabular-nums">
            {index + 1} of {pool.length}
          </span>
        </div>
      </div>

      {/* Center: Large Cinematic Hero Artwork & Book Theme */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center my-auto">
        <div className="w-full max-w-[320px] aspect-[4/3] rounded-2xl overflow-hidden bg-card-elevated border border-card-border flex items-center justify-center shadow-lg">
          {!imgErr ? (
            <img
              src={current.image}
              alt=""
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <span className="text-4xl font-heading font-bold text-muted/25">{current.name.slice(0, 3)}</span>
          )}
        </div>

        <h2 className="text-3xl font-heading font-bold text-primary leading-tight mt-1">{current.name}</h2>
        <p className="text-xs text-muted italic">What is this book's theme?</p>

        {revealed ? (
          <div className="flex flex-col items-center gap-1.5 mt-1">
            <span className="text-2xl sm:text-3xl font-heading font-extrabold text-accent tracking-wide">{current.themeWord}</span>
            {current.keyWord && (
              <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-gold">{current.keyWord}</span>
            )}
            <p className="text-xs sm:text-sm text-secondary italic font-serif leading-relaxed max-w-xs px-2">{current.subtitle}</p>
          </div>
        ) : (
          <div className="py-2">
            <span className="sr-only">Answer hidden — recall it, then reveal.</span>
            <span className="inline-block text-xl font-medium tracking-[0.3em] text-muted/40" aria-hidden="true">
              — · · · —
            </span>
          </div>
        )}
      </div>

      {/* Compact Low-Profile Bottom Action Bar: Skip + Next Theme / Reveal side-by-side */}
      {revealed ? (
        <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
          <div className="grid grid-cols-4 gap-1.5">
            {GRADES.map(g => (
              <button
                key={g.score}
                onClick={() => handleGrade(g.score)}
                className={`py-2 text-xs font-bold rounded-lg border transition-all active:scale-95 ${g.className}`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goTo(index < pool.length - 1 ? index + 1 : 0)}
              className="py-2.5 px-4 rounded-xl border border-card-border text-xs font-semibold text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1"
            >
              Skip <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleGrade(4)}
              className="flex-1 py-2.5 rounded-xl bg-accent text-[#14120E] text-sm font-bold hover:brightness-110 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              Next Theme <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 w-full max-w-md mx-auto">
          <button
            onClick={() => goTo(index < pool.length - 1 ? index + 1 : 0)}
            className="py-2.5 px-4 rounded-xl border border-card-border text-xs font-semibold text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1"
          >
            Skip <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setRevealed(true)}
            className="flex-1 py-2.5 rounded-xl bg-accent text-[#14120E] text-sm font-bold hover:brightness-110 transition-colors shadow-sm"
          >
            Tap to reveal
          </button>
        </div>
      )}
    </div>
  );
};
