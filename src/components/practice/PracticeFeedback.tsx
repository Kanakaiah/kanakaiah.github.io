import React, { useMemo, useState } from 'react';
import { ArrowDownUp, ChevronDown, X } from 'lucide-react';
import type { SortOrder } from '../../types/models';
import { scoreAttempt } from '../../utils/cue';

export type PracticeModeKey =
  | 'read'
  | 'typing'
  | 'speech'
  | 'reference'
  | 'build'
  | 'first-letter'
  | 'eraser'
  | 'scramble'
  | 'listen'
  | 'immersed';

export const PRACTICE_MODE_LABELS: Record<PracticeModeKey, string> = {
  read: 'Recall',
  typing: 'Type',
  speech: 'Recite',
  reference: 'Find the reference',
  build: 'Build a passage',
  'first-letter': 'First letters',
  eraser: 'Blanks',
  scramble: 'Word order',
  listen: 'Listen',
  immersed: 'Immerse',
};

export const IS_LEARNING_MODE: Record<PracticeModeKey, boolean> = {
  read: false,
  typing: false,
  speech: false,
  reference: false,
  build: true,
  'first-letter': true,
  eraser: true,
  scramble: true,
  listen: true,
  immersed: true,
};

const MODE_CATEGORIES: { label: string; modes: PracticeModeKey[] }[] = [
  { label: 'Recall', modes: ['read', 'typing', 'speech', 'reference'] },
  { label: 'Learn', modes: ['build', 'first-letter', 'eraser', 'scramble'] },
  { label: 'Read and listen', modes: ['listen', 'immersed'] },
];

export const PracticeHeader: React.FC<{
  title: string;
  subtitle: string;
  index: number;
  total: number;
  onExit: () => void;
  exitLabel?: string;
  disabled?: boolean;
}> = ({
  title,
  subtitle,
  index,
  total,
  onExit,
  exitLabel = 'Exit',
  disabled = false,
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onExit}
        disabled={disabled}
        aria-label={exitLabel}
        className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-card-elevated transition-colors disabled:opacity-40"
      >
        <X className="w-5 h-5" />
      </button>
      <h1 className="flex-1 text-lg sm:text-xl font-heading font-bold text-primary truncate">
        {title}
      </h1>
      {total > 0 && (
        <span className="text-xs font-semibold text-secondary tabular-nums shrink-0">
          {Math.min(index + 1, total)} of {total}
        </span>
      )}
    </div>
    {subtitle && <p className="text-xs sm:text-sm text-secondary">{subtitle}</p>}
  </div>
);

const ORDER_LABELS: Record<SortOrder, string> = {
  smart: 'Review priority',
  'bible-asc': 'Bible order',
  random: 'Random order',
  'date-desc': 'Newest first',
  'date-asc': 'Oldest first',
  'bible-desc': 'Bible (Z–A)',
};

export const PracticeOrderMenu: React.FC<{
  order: SortOrder;
  onSelect: (order: SortOrder) => void;
  disabled?: boolean;
}> = ({ order, onSelect, disabled = false }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-card-border text-xs font-semibold text-primary hover:border-accent/50 transition-colors disabled:opacity-40"
      >
        <ArrowDownUp className="w-3.5 h-3.5 text-secondary" />
        <span>{ORDER_LABELS[order] || 'Order'}</span>
      </button>

      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[230px] max-w-[calc(100vw-2rem)] rounded-xl bg-card-elevated border border-card-border shadow-xl overflow-hidden">
            <button
              type="button"
              onClick={() => {
                onSelect('smart');
                setOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm hover:bg-card-hover transition-colors ${
                order === 'smart' ? 'text-accent font-semibold' : 'text-primary'
              }`}
            >
              Review priority · Due &amp; weakest first
            </button>
            <button
              type="button"
              onClick={() => {
                onSelect('bible-asc');
                setOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm hover:bg-card-hover transition-colors ${
                order === 'bible-asc' ? 'text-accent font-semibold' : 'text-primary'
              }`}
            >
              Bible order · Genesis to Revelation
            </button>
            <button
              type="button"
              onClick={() => {
                onSelect('random');
                setOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm hover:bg-card-hover transition-colors ${
                order === 'random' ? 'text-accent font-semibold' : 'text-primary'
              }`}
            >
              {order === 'random' ? 'Shuffle again' : 'Random order'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const PracticeModePicker: React.FC<{
  mode: PracticeModeKey;
  onSelect: (mode: PracticeModeKey) => void;
  disabled?: boolean;
}> = ({ mode, onSelect, disabled = false }) => {
  const [open, setOpen] = useState(false);

  const buttonLabel =
    mode === 'read'
      ? 'Recall · Self-check'
      : mode === 'listen' || mode === 'immersed'
      ? PRACTICE_MODE_LABELS[mode]
      : `${IS_LEARNING_MODE[mode] ? 'Learn' : 'Recall'}: ${PRACTICE_MODE_LABELS[mode]}`;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-card-elevated border border-card-border text-xs font-semibold text-primary hover:border-accent/60 transition-colors disabled:opacity-40"
      >
        <span>{buttonLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-secondary" />
      </button>

      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[220px] max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto rounded-xl bg-card-elevated border border-card-border shadow-xl py-1.5">
            {MODE_CATEGORIES.map(group => (
              <div key={group.label} className="py-1">
                <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                  {group.label}
                </div>
                {group.modes.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onSelect(option);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm hover:bg-card-hover transition-colors ${
                      mode === option ? 'text-accent font-semibold' : 'text-primary'
                    }`}
                  >
                    {PRACTICE_MODE_LABELS[option]}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const ReviewAnswer: React.FC<{
  text: string;
  submitted?: string | null;
  accuracy?: number | null;
  showWordDiff?: boolean;
}> = ({ text, submitted, accuracy, showWordDiff = false }) => {
  const score = useMemo(() => {
    if (!showWordDiff || !submitted?.trim()) return null;
    return scoreAttempt(text, submitted);
  }, [text, submitted, showWordDiff]);

  const missingWords = score
    ? score.words.filter(w => w.missing).map(w => w.word).join(' ')
    : '';
  const changedWords = score
    ? score.words.filter(w => !w.ok && !w.missing).map(w => w.word).join(' ')
    : '';

  return (
    <div className="flex flex-col gap-3.5">
      <div className="rounded-2xl bg-card-elevated border border-card-border p-5">
        {score ? (
          <p className="font-serif text-base sm:text-lg leading-relaxed text-primary">
            {score.words.map((w, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 ? ' ' : ''}
                <span
                  className={
                    w.ok
                      ? 'text-primary'
                      : 'text-red-400 underline decoration-red-400/75 underline-offset-4'
                  }
                >
                  {w.word}
                </span>
              </React.Fragment>
            ))}
          </p>
        ) : (
          <p className="font-serif text-base sm:text-lg leading-relaxed text-primary whitespace-pre-wrap">
            {text}
          </p>
        )}
      </div>

      {score && (
        <div className="flex flex-col gap-1 text-xs sm:text-sm text-secondary">
          <p>
            {score.matched} of {score.total} words matched. Underlined words need attention.
          </p>
          {missingWords && (
            <p className="text-primary">
              <span className="text-secondary font-medium">Missing: </span>
              {missingWords}
            </p>
          )}
          {changedWords && (
            <p className="text-primary">
              <span className="text-secondary font-medium">Different: </span>
              {changedWords}
            </p>
          )}
          {score.addedWords.length > 0 && (
            <p className="text-primary">
              <span className="text-secondary font-medium">Added: </span>
              {score.addedWords.join(' ')}
            </p>
          )}
        </div>
      )}

      {submitted?.trim() && (
        <div className="flex flex-col gap-1 rounded-xl bg-card border border-card-border p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Your answer
          </span>
          <p className="text-sm text-secondary whitespace-pre-wrap">{submitted}</p>
        </div>
      )}

      {typeof accuracy === 'number' && (
        <p className="text-xs font-semibold text-primary tabular-nums">
          {accuracy}% word match · this attempt
        </p>
      )}
    </div>
  );
};

const GRADE_OPTIONS: { score: number; label: string; hint: string; tone: string }[] = [
  {
    score: 1,
    label: 'Again',
    hint: 'Could not recall',
    tone: 'bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20',
  },
  {
    score: 3,
    label: 'Hard',
    hint: 'With effort',
    tone: 'bg-orange-500/10 text-orange-400 border-orange-500/25 hover:bg-orange-500/20',
  },
  {
    score: 4,
    label: 'Good',
    hint: 'Correct recall',
    tone: 'bg-blue-500/10 text-blue-400 border-blue-500/25 hover:bg-blue-500/20',
  },
  {
    score: 5,
    label: 'Easy',
    hint: 'Effortless recall',
    tone: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20',
  },
];

export const ReviewGrades: React.FC<{
  ceiling?: number;
  onGrade: (score: number) => void;
  disabled?: boolean;
}> = ({ ceiling = 5, onGrade, disabled = false }) => (
  <div className="flex flex-col gap-2.5">
    <h3 className="text-sm font-bold text-primary">How well did you remember?</h3>
    {ceiling < 5 && (
      <p className="text-xs text-secondary">
        Revisit the words that differed before your next review.
      </p>
    )}
    <div className="grid grid-cols-2 gap-2.5">
      {GRADE_OPTIONS.map(opt => {
        const isDisabled = disabled || opt.score > ceiling;
        return (
          <button
            key={opt.score}
            type="button"
            disabled={isDisabled}
            onClick={() => onGrade(opt.score)}
            className={`min-h-[54px] px-3.5 py-2.5 rounded-xl border text-left flex flex-col justify-center transition-all active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none ${opt.tone}`}
          >
            <span className="text-sm font-bold leading-tight">{opt.label}</span>
            <span className="text-[11px] opacity-80 leading-tight mt-0.5">{opt.hint}</span>
          </button>
        );
      })}
    </div>
  </div>
);
