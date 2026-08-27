import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { buildColdCheck, summarizeColdCheck, type ColdItem } from '../../utils/coldCheck';
import { scoreAttempt } from '../../utils/cue';
import { judgeAnchor } from '../../utils/anchorAnswer';
import { useFocusTrap } from '../../utils/useFocusTrap';

/**
 * The measurement the whole app is for.
 *
 * Deliberately unlike every other surface here. It does not consult the schedule, it does
 * not write to SM-2, it does not touch the streak, and it never says "well done". It asks
 * five things the reader has not seen in over a month and writes down how many came back.
 *
 * The restraint is the point. Every other number in this app is measured on the
 * scheduler's terms — items are asked when they are due, so a healthy pass rate partly
 * reports that the scheduler picked good moments. This asks on nobody's terms, and
 * because the result changes nothing, there is no reason for the reader to grade
 * generously and no way for the measurement to flatter itself.
 */
export const ColdCheck: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state, dispatch } = useApp();
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  // Built once. Rebuilding mid-check would swap the questions under the reader.
  const [items] = useState<ColdItem[]>(() => buildColdCheck(state));
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [shown, setShown] = useState(false);
  const [correct, setCorrect] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  const item = items[index];

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Judged the same way the ordinary cards judge, so a cold score and a session score
  // mean the same thing and can honestly be compared.
  const judge = (it: ColdItem, answer: string): boolean => {
    if (it.kind === 'verse') return scoreAttempt(it.answer, answer).accuracy >= 90;
    return judgeAnchor(answer, it.answer).verdict === 'correct';
  };

  const reveal = () => {
    if (shown) return;
    if (judge(item, typed)) setCorrect(c => new Set(c).add(item.key));
    setShown(true);
  };

  const next = () => {
    if (index < items.length - 1) {
      setIndex(i => i + 1);
      setTyped('');
      setShown(false);
      return;
    }
    dispatch({ type: 'RECORD_COLD_CHECK', payload: summarizeColdCheck(items, correct) });
    setDone(true);
  };

  const shell = (children: React.ReactNode) => (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Cold check"
      className="fixed inset-0 z-[75] flex flex-col bg-background animate-[fadeIn_0.2s_ease-out]"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
        <button onClick={onClose} className="p-2 -ml-2 rounded-md hover:bg-card-hover transition-colors" aria-label="Close cold check">
          <X className="w-5 h-5 text-secondary" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-primary tracking-wide">Cold check</span>
          <span className="text-[0.625rem] text-muted uppercase tracking-widest">
            {done ? 'Complete' : `${index + 1} of ${items.length}`}
          </span>
        </div>
        <div className="w-9" />
      </div>
      {children}
    </div>
  );

  if (items.length === 0) {
    return shell(
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
        <h2 className="text-xl font-heading font-bold text-primary">Nothing is cold yet</h2>
        <p className="text-secondary max-w-sm leading-relaxed">
          A cold check asks for things you haven't recalled in over a month. Come back once
          something has had time to fade — that waiting is what makes the number mean anything.
        </p>
        <button onClick={onClose} className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors">
          Back
        </button>
      </div>
    );
  }

  if (done) {
    const result = summarizeColdCheck(items, correct);
    return shell(
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5 text-center">
        <span className="text-5xl font-heading font-bold text-primary tabular-nums">
          {result.correct}<span className="text-muted text-2xl"> / {result.total}</span>
        </span>
        <p className="text-sm text-secondary max-w-xs leading-relaxed">
          Recalled unaided after a median of {result.medianColdFor} days away.
        </p>
        {/* Said plainly, because it is the reason to trust the number: an unrecorded
            result cannot be gamed, and nothing here has moved the reader's schedule. */}
        <p className="text-[0.6875rem] text-muted max-w-xs leading-relaxed">
          Nothing was scheduled or graded by this. Your intervals are exactly where they were.
        </p>
        <button
          onClick={onClose}
          className="w-full max-w-xs py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95 mt-2"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Cold check"
      className="fixed inset-0 z-[75] flex flex-col bg-background animate-[fadeIn_0.2s_ease-out]"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
        <button onClick={onClose} className="p-2 -ml-2 rounded-md hover:bg-card-hover transition-colors" aria-label="Close cold check">
          <X className="w-5 h-5 text-secondary" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-primary tracking-wide">Cold check</span>
          <span className="text-[0.625rem] text-muted uppercase tracking-widest">
            {index + 1} of {items.length}
          </span>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5 text-center min-h-0 overflow-y-auto">
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-muted">
          {item.kind === 'verse' ? 'Verse' : item.kind === 'anchor' ? 'Anchor' : 'Theme'}
          {' · '}last recalled {item.coldFor} days ago
        </span>
        <h2 className="text-2xl font-heading font-bold text-primary leading-tight">{item.prompt}</h2>

        {!shown ? (
          <>
            <p className="text-xs text-muted italic">
              {item.kind === 'verse' ? 'Type what you remember.' : 'One word.'}
            </p>
            {item.kind === 'verse' ? (
              <textarea
                value={typed}
                onChange={e => setTyped(e.target.value)}
                aria-label={`Type ${item.prompt} from memory`}
                className="w-full max-w-md min-h-[120px] p-4 rounded-md bg-card border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors text-primary text-base"
              />
            ) : (
              <input
                type="text"
                value={typed}
                onChange={e => setTyped(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') reveal(); }}
                aria-label={`The answer for ${item.prompt}`}
                autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false}
                className="w-full max-w-xs text-center text-xl py-3 px-4 rounded-md bg-card border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors text-primary"
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
            <span className={`text-xs font-bold ${correct.has(item.key) ? 'text-green-500' : 'text-red-400'}`}>
              {correct.has(item.key) ? 'Had it' : 'Gone'}
            </span>
            <p className="text-lg font-serif leading-relaxed text-primary max-w-md">{item.answer}</p>
          </div>
        )}
      </div>

      <div className="px-5 pb-6">
        <button
          onClick={shown ? next : reveal}
          className="w-full max-w-xs mx-auto block py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
        >
          {shown ? (index < items.length - 1 ? 'Next' : 'Finish') : 'Show me'}
        </button>
      </div>
    </div>
  );
};
