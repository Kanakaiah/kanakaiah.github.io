import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
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

  const livePool = useMemo(() => {
    const books = scope === 'ot' ? OT_BOOKS : scope === 'nt' ? NT_BOOKS : ALL_BOOKS;
    // Due first (most overdue leading), then never-attempted, then the rest. A reader
    // who has learned nothing yet simply gets the canon in order, which is the right
    // way to meet 66 unfamiliar books.
    const due = books.filter(b => {
      const p = state.themeProgress[b.id];
      return p && isDue(p.sm2);
    }).sort((a, b) =>
      new Date(state.themeProgress[a.id].sm2.nextDueDate).getTime() -
      new Date(state.themeProgress[b.id].sm2.nextDueDate).getTime());

    const fresh = books.filter(b => !state.themeProgress[b.id]);
    return due.length > 0 ? [...due, ...fresh] : fresh;
    // Deliberately excludes books already known and not yet due — drilling those early
    // is exactly the massed repetition the schedule exists to prevent.
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
  const changeScope = (next: Scope) => { setScope(next); setFrozenPool(null); goTo(0); };

  const existing = current ? state.themeProgress[current.id] : undefined;

  const handleGrade = (score: number) => {
    if (!current) return;
    if (!frozenPool) setFrozenPool(livePool);
    const { newSM2, newStatus } = evaluateSM2(existing?.sm2 || DEFAULT_SM2, score, 'theme');
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
    if (index < pool.length - 1) { goTo(index + 1); }
    else { setFrozenPool(null); goTo(0); }
  };

  const learned = useMemo(
    () => Object.values(state.themeProgress).filter(p => p.sm2.repetition >= 6).length,
    [state.themeProgress]
  );

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4 pt-20">
        <h2 className="text-xl font-bold text-primary">Every theme is scheduled</h2>
        <p className="text-secondary max-w-sm">
          Nothing in this set is due. {learned} of 66 book themes are secure.
        </p>
        <button onClick={onExit} className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full w-full max-w-md mx-auto px-5 pt-6 pb-6 gap-4">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="p-2 -ml-2 rounded-full hover:bg-card-hover transition-colors" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-secondary" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[0.625rem] font-bold uppercase tracking-widest text-muted">
            {index + 1} of {pool.length}
          </span>
          <span className="text-[0.625rem] text-muted tabular-nums">{learned}/66 secure</span>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex justify-center gap-2">
        {(['all', 'ot', 'nt'] as Scope[]).map(s => (
          <button
            key={s}
            onClick={() => changeScope(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-colors ${
              scope === s ? 'bg-accent text-white' : 'text-muted hover:text-primary border border-card-border'
            }`}
          >
            {s === 'all' ? 'Whole Bible' : s === 'ot' ? 'Old' : 'New'}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
        {/* The prompt: the book, by name and by its cover. Both are things the reader
            already has; neither gives the answer away. */}
        <div className="w-40 h-40 rounded-lg overflow-hidden bg-card-elevated border border-card-border flex items-center justify-center">
          {!imgErr ? (
            <img src={current.image} alt="" onError={() => setImgErr(true)} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-heading font-bold text-muted/25">{current.name.slice(0, 3)}</span>
          )}
        </div>

        <h2 className="text-3xl font-heading font-bold text-primary leading-tight">{current.name}</h2>
        <p className="text-xs text-muted italic">What is this book's theme?</p>

        {revealed ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl font-heading font-bold text-accent tracking-wide">{current.themeWord}</span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-gold">{current.keyWord}</span>
            <p className="text-sm text-secondary italic font-serif leading-relaxed max-w-xs">{current.subtitle}</p>
          </div>
        ) : (
          // A fixed-width bar rather than the word blurred — length alone separates
          // GARDEN from BURNING BUSH.
          <><span className="sr-only">Answer hidden — recall it, then reveal.</span><span className="inline-block h-6 w-32 rounded-sm bg-card-border" aria-hidden="true" /></>
        )}
      </div>

      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map(g => (
            <button
              key={g.score}
              onClick={() => handleGrade(g.score)}
              className={`py-3 flex items-center justify-center rounded-md border transition-colors active:scale-95 ${g.className}`}
            >
              {/* No interval preview. Printing what each grade buys turns the question
                  from "did you remember it?" into a choice between a short wait and a
                  long one — and nothing here verifies the answer. The toast on the next
                  line reports the schedule once the grade is already in. */}
              <span className="text-xs font-bold leading-tight">{g.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="w-full py-3 rounded-md border border-dashed border-card-border-hover text-sm font-semibold text-secondary hover:text-primary hover:border-accent/40 transition-colors"
        >
          Tap to reveal
        </button>
      )}

      <div className="flex justify-center">
        <button
          onClick={() => goTo(index < pool.length - 1 ? index + 1 : 0)}
          className="flex items-center gap-1 text-xs font-medium text-muted hover:text-primary transition-colors px-3 py-1"
        >
          Skip <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
