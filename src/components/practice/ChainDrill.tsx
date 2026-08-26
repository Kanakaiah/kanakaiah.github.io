import React, { useMemo, useState } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useFocusTrap } from '../../utils/useFocusTrap';
import { evaluateSM2, formatInterval } from '../../utils/sm2';
import { buildReviewEvent } from '../../utils/reviewLog';
import { blockProgressKey } from '../../types/models';
import type { BlockProgress } from '../../types/models';

const DEFAULT_SM2 = { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() };

export interface ChainAnchor { ch: number | string; word: string; scene?: string }

/**
 * Walks one narrative block's anchor chain in order, one link at a time.
 *
 * Sequence is the mechanism the anchor system runs on — a chapter number is recovered
 * by counting forward from a block boundary, which is why every card carries an
 * "after X · before Y" line — and nothing in the app trained or measured it. The
 * closest thing pointed Scramble at the joined chain, which lays every candidate word
 * on screen: that is ordered *recognition*, and it recorded nothing. It also chunked
 * at a fixed ten words, cutting a fifty-word book chain across the very block
 * boundaries being learned.
 *
 * Here the block is the unit, the words arrive one at a time, and each is answered
 * before it is seen. The block gets its own SM-2 schedule; the per-chapter signal goes
 * to chainHits/chainMisses — evidence that a chapter is worth drilling properly, never
 * a grade, because recalling a word with its neighbours adjacent is not the same task
 * as being asked about that chapter cold.
 */
export const ChainDrill: React.FC<{
  bookId: string;
  blockIndex: number;
  label: string;
  anchors: ChainAnchor[];
  onClose: () => void;
}> = ({ bookId, blockIndex, label, anchors, onClose }) => {
  const { state, dispatch } = useApp();

  const chain = useMemo(
    () => anchors.map(a => ({ ch: Number(a.ch), word: String(a.word || '') })).filter(a => a.word),
    [anchors]
  );

  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  const key = blockProgressKey(bookId, blockIndex);
  const existing = state.blockProgress[key];
  const current = chain[position];

  const mark = (correct: boolean) => {
    const next = [...results, correct];
    setResults(next);
    setRevealed(false);
    if (position < chain.length - 1) {
      setPosition(p => p + 1);
    } else {
      finish(next);
    }
  };

  const finish = (final: boolean[]) => {
    const correct = final.filter(Boolean).length;
    const accuracy = final.length ? correct / final.length : 0;

    // Accuracy maps onto the same four grades every other surface uses. Strict at the
    // top on purpose: a chain with a hole in it is a chain that fails under real use,
    // since every later chapter number is counted through the gap.
    const score = accuracy >= 1 ? 5 : accuracy >= 0.85 ? 4 : accuracy >= 0.6 ? 3 : 1;
    const { newSM2, newStatus } = evaluateSM2(existing?.sm2 || DEFAULT_SM2, score, 'chain');

    const updated: BlockProgress = {
      bookId, blockIndex, label,
      sm2: newSM2,
      status: newStatus,
      attempts: (existing?.attempts || 0) + 1,
      lastScore: score,
      lastAccuracy: accuracy,
      lastAttemptDate: new Date().toISOString(),
    };
    dispatch({ type: 'GRADE_BLOCK_PROGRESS', payload: updated });
    dispatch({
      type: 'RECORD_REVIEW',
      payload: buildReviewEvent({
        itemKind: 'chain', itemId: key, gradeSubmitted: score,
        before: existing?.sm2, after: newSM2, mode: 'chain', cueLevel: 0,
        // `accuracy` is left out of measuredAccuracy on purpose. It is an aggregate of
        // per-link "Had it / Missed" taps — self-report, just at finer grain — and
        // feeding it in would have the honesty gap comparing a self-report against
        // itself and reporting a reassuring zero. That field is reserved for a produced
        // answer diffed against the real text.
      }),
    });

    // Per-chapter evidence, not a per-chapter grade. `revealed: true` means "needed
    // the answer", which is what a miss is here.
    dispatch({
      type: 'RECORD_CHAIN_PASS',
      payload: {
        bookId,
        results: chain.map((link, i) => ({ chapter: link.ch, revealed: !final[i] })),
      },
    });

    if (state.settings.streakIncludesChapters !== false) {
      dispatch({ type: 'RECORD_ACTIVITY' });
    }
    setFinished(true);
  };

  const restart = () => {
    setPosition(0);
    setRevealed(false);
    setResults([]);
    setFinished(false);
  };

  const correctCount = results.filter(Boolean).length;

  // Hand-rolled overlays in this app were bare `fixed inset-0` divs: no Escape, no
  // scroll lock, and nothing telling assistive tech a dialog had opened. Modal.tsx
  // has done this correctly for a while; this is the same behaviour for a component
  // that does not route through it.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${label} — anchor chain drill`}
      className="fixed inset-0 z-[75] flex flex-col bg-background animate-[fadeIn_0.2s_ease-out]"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
        <button onClick={onClose} className="p-2 -ml-2 rounded-md hover:bg-card-hover transition-colors" aria-label="Close drill">
          <X className="w-5 h-5 text-secondary" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-primary tracking-wide truncate max-w-[60vw]">{label}</span>
          <span className="text-[0.625rem] text-muted uppercase tracking-widest">
            {finished ? 'Chain complete' : `Link ${position + 1} of ${chain.length}`}
          </span>
        </div>
        <div className="w-9" />
      </div>

      {/* Progress: one pip per link, filled as it is answered. The shape of the chain
          is the thing being learned, so it stays on screen throughout. */}
      <div className="flex gap-[3px] px-5 py-3">
        {chain.map((link, i) => (
          <span
            key={link.ch}
            title={`Chapter ${link.ch}`}
            className={`h-1.5 flex-1 rounded-full ${
              i < results.length
                ? results[i] ? 'bg-green-500' : 'bg-red-500/70'
                : i === position && !finished ? 'bg-primary' : 'bg-card-border'
            }`}
          />
        ))}
      </div>

      {finished ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5 text-center">
          <span className="text-5xl font-heading font-bold text-primary tabular-nums">
            {correctCount}<span className="text-muted text-2xl"> / {chain.length}</span>
          </span>
          <p className="text-sm text-secondary max-w-xs">
            Next chain review in {formatInterval(state.blockProgress[key]?.sm2.interval ?? 1)}.
          </p>

          {/* The words that broke the chain, named. Every chapter after a gap is counted
              through it, so a miss here costs more than one answer. */}
          {correctCount < chain.length && (
            <div className="w-full max-w-sm flex flex-col gap-1.5">
              <span className="text-[0.625rem] font-bold uppercase tracking-widest text-muted">Broke the chain</span>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {chain.map((link, i) => !results[i] && (
                  <span key={link.ch} className="text-[0.6875rem] font-bold px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                    {link.ch} {link.word}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
            <button onClick={restart} className="flex items-center justify-center gap-2 py-3 rounded-md border border-card-border text-secondary font-bold text-sm hover:text-primary transition-colors">
              <RotateCcw className="w-4 h-4" /> Run it again
            </button>
            <button onClick={onClose} className="py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95">
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
          {/* What came before is the cue — that is what a chain is. */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[0.625rem] font-bold uppercase tracking-widest text-muted">
              {position === 0 ? 'Chain starts' : 'After'}
            </span>
            <span className="text-lg font-heading font-bold text-secondary tracking-wide">
              {position === 0 ? label : chain[position - 1].word}
            </span>
          </div>

          <span className="text-[0.625rem] text-muted">↓</span>

          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl font-heading font-bold text-accent tabular-nums">{current.ch}</span>
            {revealed ? (
              <span className="text-2xl font-heading font-bold text-primary tracking-wide">{current.word}</span>
            ) : (
              <><span className="sr-only">Answer hidden — recall it, then reveal.</span><span className="inline-block h-7 w-32 rounded-sm bg-card-border" aria-hidden="true" /></>
            )}
          </div>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full max-w-xs py-3 rounded-md border border-dashed border-card-border-hover text-sm font-semibold text-secondary hover:text-primary hover:border-accent/40 transition-colors"
            >
              What comes next?
            </button>
          ) : (
            <div className="w-full max-w-xs grid grid-cols-2 gap-2">
              <button
                onClick={() => mark(false)}
                className="py-3 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 font-bold text-sm hover:bg-red-500/20 transition-colors active:scale-95"
              >
                Missed
              </button>
              <button
                onClick={() => mark(true)}
                className="py-3 rounded-md bg-green-500/10 text-green-500 border border-green-500/20 font-bold text-sm hover:bg-green-500/20 transition-colors active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Had it
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
