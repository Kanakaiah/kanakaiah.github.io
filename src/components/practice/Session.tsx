import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Flame } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { evaluateSM2, formatInterval } from '../../utils/sm2';
import { buildSession, type SessionItem, type SessionPlan } from '../../utils/session';
import { chapterProgressKey } from '../../types/models';
import type { ChapterProgress, SM2Data, ThemeProgress, Verse } from '../../types/models';
import { FirstLetterMode } from './FirstLetterMode';
import { ChainDrill } from './ChainDrill';

const DEFAULT_SM2 = { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() };

/** Ceiling on one session. Deliberately generous — its job is to guarantee an end
 * exists, not to ration. Anything beyond it is offered as "keep going" at the finish. */
export const SESSION_CAP = 20;

const GRADES: { score: number; label: string; className: string }[] = [
  { score: 1, label: 'Blank', className: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20' },
  { score: 3, label: 'Hard', className: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20' },
  { score: 4, label: 'Good', className: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20' },
  { score: 5, label: 'Easy', className: 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20' },
];

/** Segment colours, one per kind, so the progress bar says what today is made of. */
const KIND_COLOR: Record<SessionItem['kind'], string> = {
  verse: 'bg-accent',
  anchor: 'bg-gold',
  introduce: 'bg-gold/40',
  theme: 'bg-emerald-500',
  chain: 'bg-sky-500',
};

interface Outcome { id: string; kind: SessionItem['kind']; label: string; score: number; interval: number }

/**
 * A day's work, with an end.
 *
 * Every queue in the app before this wrapped forever: the anchor drill reset to index
 * 0, and the verse session had no completion state at all — grading didn't even
 * advance, so the reader sat on the item they had just scored. Nothing ever said "you
 * are finished", which removes the one reason a spaced system gives you to come back
 * tomorrow.
 */
export const Session: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { state, dispatch } = useApp();

  // Planned once, on mount. The plan reads from chapterProgress and the verse list,
  // both of which this screen is about to mutate — recomputing as we go would reshuffle
  // the work list under the cursor, which is the same defect the anchor drill had.
  const buildPlan = () =>
    buildSession(state, {
      newChapters: state.settings.dailyChapterTarget ?? 3,
      cap: SESSION_CAP,
    });

  const [plan, setPlan] = useState<SessionPlan>(buildPlan);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  // "Keep going" starts a genuinely new session against whatever is still due, rather
  // than replaying this one. Everything already graded has moved into the future, so
  // the fresh plan naturally picks up where this left off.
  const startAnother = () => {
    setPlan(buildPlan());
    setIndex(0);
    setRevealed(false);
    setOutcomes([]);
  };

  const item = plan.items[index];
  const isComplete = index >= plan.items.length;

  const advance = () => {
    setRevealed(false);
    setIndex(i => i + 1);
  };

  const recordActivity = () => {
    if (state.settings.streakIncludesChapters !== false) dispatch({ type: 'RECORD_ACTIVITY' });
  };

  const gradeVerse = (verse: Verse, score: number) => {
    const { newSM2, newStatus } = evaluateSM2(verse.sm2, score);
    dispatch({
      type: 'UPDATE_VERSE',
      payload: { ...verse, sm2: newSM2, status: newStatus, attempts: (verse.attempts || 0) + 1 },
    });
    dispatch({ type: 'RECORD_ACTIVITY' });
    setOutcomes(o => [...o, { id: verse.id, kind: 'verse', label: verse.ref, score, interval: newSM2.interval }]);
    advance();
  };

  const gradeAnchor = (bookId: string, bookName: string, chapter: number, score: number) => {
    const key = chapterProgressKey(bookId, chapter);
    const existing = state.chapterProgress[key];
    const { newSM2, newStatus } = evaluateSM2(existing?.sm2 || DEFAULT_SM2, score);
    const updated: ChapterProgress = {
      bookId, chapter,
      sm2: newSM2,
      status: newStatus,
      attempts: (existing?.attempts || 0) + 1,
      lastScore: score,
      lastAttemptDate: new Date().toISOString(),
      readCount: existing?.readCount || 0,
      lastReadDate: existing?.lastReadDate || null,
      chainHits: existing?.chainHits,
      chainMisses: existing?.chainMisses,
      lastChainDate: existing?.lastChainDate,
    };
    dispatch({ type: 'GRADE_CHAPTER_PROGRESS', payload: updated });
    recordActivity();
    setOutcomes(o => [...o, { id: key, kind: 'anchor', label: `${bookName} ${chapter}`, score, interval: newSM2.interval }]);
    advance();
  };

  const gradeTheme = (bookId: string, bookName: string, score: number) => {
    const existing = state.themeProgress[bookId];
    const { newSM2, newStatus } = evaluateSM2(existing?.sm2 || DEFAULT_SM2, score);
    const updated: ThemeProgress = {
      bookId,
      sm2: newSM2,
      status: newStatus,
      attempts: (existing?.attempts || 0) + 1,
      lastScore: score,
      lastAttemptDate: new Date().toISOString(),
    };
    dispatch({ type: 'GRADE_THEME_PROGRESS', payload: updated });
    dispatch({ type: 'RECORD_ACTIVITY' });
    setOutcomes(o => [...o, { id: `theme:${bookId}`, kind: 'theme', label: bookName, score, interval: newSM2.interval }]);
    advance();
  };

  // ── Completion ────────────────────────────────────────────────────────────────
  if (isComplete) {
    const advanced = outcomes.filter(o => o.score >= 4).length;
    const fellBack = outcomes.filter(o => o.score < 3);
    const nextDue = outcomes.length
      ? Math.min(...outcomes.map(o => o.interval).filter(n => n > 0))
      : 0;

    return (
      <div className="flex flex-col h-full w-full max-w-md mx-auto px-5 pt-10 pb-8 gap-5">
        <div className="flex gap-[3px]">
          {plan.items.map(i => (
            <span key={i.id} className={`h-1 flex-1 rounded-full ${KIND_COLOR[i.kind]}`} />
          ))}
        </div>

        <div className="text-center pt-4">
          <h2 className="text-3xl font-heading font-bold text-primary">Done for today</h2>
          {outcomes.length > 0 && (
            <p className="text-sm text-secondary mt-2">
              Next review in {formatInterval(nextDue)}
            </p>
          )}
        </div>

        <div className="border-y border-card-border divide-y divide-card-border">
          <Row label="Items reviewed" value={`${outcomes.length}`} />
          <Row label="Recalled well" value={`${advanced}`} tone={advanced > 0 ? 'good' : undefined} />
          {/* Named explicitly rather than hidden. A summary that only reports progress
              is a scoreboard; the point of this one is to be worth trusting. */}
          {fellBack.length > 0 && (
            <Row
              label="Fell back"
              value={fellBack.map(o => o.label).slice(0, 2).join(', ') + (fellBack.length > 2 ? ` +${fellBack.length - 2}` : '')}
              tone="bad"
            />
          )}
        </div>

        <div className="flex items-center justify-center gap-2 py-1">
          <Flame className="w-4 h-4 text-gold" />
          <span className="text-sm font-bold text-primary">{state.streak}-day streak</span>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={onExit}
            className="w-full py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
          >
            Back to Today
          </button>
          {/* The cap is a floor, not a ceiling: whoever wants more is never blocked,
              and whoever doesn't is never guilted into it. */}
          {plan.heldBack > 0 && (
            <button
              onClick={startAnother}
              className="w-full py-3 rounded-md border border-card-border text-secondary font-bold text-sm hover:text-primary transition-colors"
            >
              Keep going — {plan.heldBack} more due
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────────
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4">
        <h2 className="text-xl font-bold text-primary">Nothing due</h2>
        <p className="text-secondary max-w-sm">
          No verses or chapter anchors are scheduled right now. Open a book to start learning a new one.
        </p>
        <button onClick={onExit} className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors">
          Back to Today
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto px-5 pt-6 pb-6 gap-4">
      {/* Progress: how many, of what kind, how many left. */}
      <div className="flex items-center gap-3">
        <button onClick={onExit} className="p-1 -ml-1 rounded-full hover:bg-card-hover transition-colors" aria-label="Leave session">
          <ArrowLeft className="w-5 h-5 text-secondary" />
        </button>
        <div className="flex gap-[3px] flex-1">
          {plan.items.map((i, n) => (
            <span
              key={i.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                n < index ? KIND_COLOR[i.kind] : n === index ? 'bg-primary' : 'bg-card-border'
              }`}
            />
          ))}
        </div>
        <span className="text-[0.6875rem] font-bold text-muted tabular-nums">
          {index + 1}/{plan.items.length}
        </span>
      </div>

      {item.kind === 'chain' ? (
        // Reuses the drill the book guide opens, rather than a second implementation of
        // the same walk. It grades itself and reports back, and the session moves on.
        <ChainDrill
          bookId={item.bookId}
          blockIndex={item.blockIndex}
          label={`${item.bookName} · ${item.label}`}
          anchors={item.anchors}
          onClose={advance}
        />
      ) : item.kind === 'introduce' ? (
        <IntroduceCard item={item} onDone={advance} />
      ) : item.kind === 'verse' ? (
        <VerseCardPrompt
          item={item}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          onGrade={score => gradeVerse(item.verse, score)}
        />
      ) : item.kind === 'theme' ? (
        <ThemeCardPrompt
          item={item}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          existingSM2={state.themeProgress[item.bookId]?.sm2 || DEFAULT_SM2}
          onGrade={score => gradeTheme(item.bookId, item.bookName, score)}
        />
      ) : (
        <AnchorCardPrompt
          item={item}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          existingSM2={state.chapterProgress[chapterProgressKey(item.bookId, item.chapter)]?.sm2 || DEFAULT_SM2}
          onGrade={score => gradeAnchor(item.bookId, item.bookName, item.chapter, score)}
        />
      )}

      <div className="flex items-center justify-between text-[0.6875rem] text-muted pt-1">
        <span>{plan.items.length - index - 1} left</span>
        <button onClick={advance} className="flex items-center gap-1 hover:text-primary transition-colors">
          Skip <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; tone?: 'good' | 'bad' }> = ({ label, value, tone }) => (
  <div className="flex items-baseline justify-between py-2.5 text-sm">
    <span className="text-muted">{label}</span>
    <span className={`font-bold tabular-nums ${tone === 'good' ? 'text-green-500' : tone === 'bad' ? 'text-red-400' : 'text-primary'}`}>
      {value}
    </span>
  </div>
);

const GradeStrip: React.FC<{ sm2: SM2Data; onGrade: (score: number) => void }> = ({ sm2, onGrade }) => (
  <div className="grid grid-cols-4 gap-2">
    {GRADES.map(g => (
      <button
        key={g.score}
        onClick={() => onGrade(g.score)}
        className={`py-2.5 flex flex-col items-center justify-center rounded-md border transition-colors active:scale-95 ${g.className}`}
      >
        <span className="text-xs font-bold leading-tight">{g.label}</span>
        <span className="text-[0.625rem] opacity-80 font-medium tabular-nums">
          {formatInterval(evaluateSM2(sm2, g.score).newSM2.interval)}
        </span>
      </button>
    ))}
  </div>
);

const Plate: React.FC<{ bookId: string; chapter: number; className?: string }> = ({ bookId, chapter, className = '' }) => {
  const [err, setErr] = useState(false);
  return (
    <div className={`rounded-lg overflow-hidden bg-card-elevated border border-card-border flex items-center justify-center ${className}`}>
      {!err ? (
        <img src={`/chapters/${bookId}/ch${chapter}.png`} alt="" onError={() => setErr(true)} className="w-full h-full object-cover" />
      ) : (
        <span className="text-5xl font-heading font-bold text-muted/25">{chapter}</span>
      )}
    </div>
  );
};

/**
 * The encoding step the app never had.
 *
 * Both the drill and the guide grid opened new chapters the same way they open
 * reviewed ones — "What anchors this chapter?" over a blurred plate — so first contact
 * with an anchor was a test the reader was guaranteed to fail. Retrieval practice needs
 * something to retrieve; a guaranteed blank produces frustration, not learning.
 *
 * So: show the plate large and unblurred, name the word, and ask for one active
 * connection to the previous anchor. A link the reader builds themselves is recalled
 * far better than one handed over — and the chain position is what makes the chapter
 * number recoverable later. Nothing here is graded. The cold retrieval that follows is.
 */
const IntroduceCard: React.FC<{ item: Extract<SessionItem, { kind: 'introduce' }>; onDone: () => void }> = ({ item, onDone }) => (
  <div className="flex-1 flex flex-col gap-4">
    <span className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-gold">New chapter</span>
    <Plate bookId={item.bookId} chapter={item.chapter} className="aspect-[16/10] w-full" />
    <div>
      <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-muted">
        {item.bookName} {item.chapter}
      </p>
      <p className="text-2xl font-heading font-bold text-accent mt-1">{item.word}</p>
      <p className="text-sm text-secondary italic font-serif leading-relaxed mt-1.5">{item.scene}</p>
    </div>

    <div className="rounded-lg bg-card-elevated border border-card-border p-4" style={{ borderLeft: '2px solid var(--accent)' }}>
      {item.prevWord ? (
        <>
          <p className="text-xs font-bold tracking-wide text-muted mb-2">
            {item.prevWord} <span className="text-muted/60">→</span> <span className="text-accent">{item.word}</span>
          </p>
          <p className="text-sm text-secondary leading-relaxed">
            Say the link out loud: how does <b className="text-primary">{item.prevWord}</b> lead to{' '}
            <b className="text-primary">{item.word}</b>?
          </p>
        </>
      ) : (
        <p className="text-sm text-secondary leading-relaxed">
          This one opens the book. Picture <b className="text-primary">{item.word}</b> and say why it starts here.
        </p>
      )}
    </div>

    <div className="mt-auto flex flex-col gap-1.5">
      <button
        onClick={onDone}
        className="w-full py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
      >
        I've got it — test me
      </button>
      <p className="text-center text-[0.625rem] text-muted">First recall comes straight after, cold</p>
    </div>
  </div>
);

const VerseCardPrompt: React.FC<{
  item: Extract<SessionItem, { kind: 'verse' }>;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (score: number) => void;
}> = ({ item, revealed, onReveal, onGrade }) => (
  <div className="flex-1 flex flex-col gap-4">
    <span className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-accent">Verse</span>
    <h2 className="text-2xl font-heading font-bold text-primary">{item.verse.ref}</h2>

    <div className="flex-1 flex flex-col justify-center">
      {revealed ? (
        <p className="text-lg font-serif leading-relaxed text-primary">{item.verse.text}</p>
      ) : (
        <div className="text-base leading-relaxed text-secondary">
          <FirstLetterMode text={item.verse.text} />
        </div>
      )}
    </div>

    {revealed ? (
      <GradeStrip sm2={item.verse.sm2} onGrade={onGrade} />
    ) : (
      <button
        onClick={onReveal}
        className="w-full py-3 rounded-md border border-dashed border-card-border-hover text-sm font-semibold text-secondary hover:text-primary hover:border-accent/40 transition-colors"
      >
        Show the verse
      </button>
    )}
  </div>
);

const AnchorCardPrompt: React.FC<{
  item: Extract<SessionItem, { kind: 'anchor' }>;
  revealed: boolean;
  onReveal: () => void;
  existingSM2: SM2Data;
  onGrade: (score: number) => void;
}> = ({ item, revealed, onReveal, existingSM2, onGrade }) => (
  <div className="flex-1 flex flex-col gap-4">
    <span className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-gold">
      Anchor · {item.bookName}
    </span>

    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
      <span className="text-6xl font-heading font-bold text-accent leading-none">{item.chapter}</span>
      <p className="text-xs text-muted italic">What anchors this chapter?</p>

      {revealed ? (
        <div className="flex flex-col items-center gap-3">
          {/* The answer arrives with its picture, always — pairing the word with an
              image is the strongest lever there is on an arbitrary association. */}
          <Plate bookId={item.bookId} chapter={item.chapter} className="w-36 h-36" />
          <span className="text-2xl font-heading font-bold text-primary">{item.word}</span>
          <span className="text-sm text-muted italic">{item.scene}</span>
        </div>
      ) : (
        // A fixed-width bar, not the word blurred: length alone would give away
        // STEW versus CIRCUMCISION.
        <span className="inline-block h-5 w-28 rounded-sm bg-card-border" aria-hidden="true" />
      )}
    </div>

    {revealed ? (
      <GradeStrip sm2={existingSM2} onGrade={onGrade} />
    ) : (
      <button
        onClick={onReveal}
        className="w-full py-3 rounded-md border border-dashed border-card-border-hover text-sm font-semibold text-secondary hover:text-primary hover:border-accent/40 transition-colors"
      >
        <Check className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Tap to reveal
      </button>
    )}
  </div>
);

const ThemeCardPrompt: React.FC<{
  item: Extract<SessionItem, { kind: 'theme' }>;
  revealed: boolean;
  onReveal: () => void;
  existingSM2: SM2Data;
  onGrade: (score: number) => void;
}> = ({ item, revealed, onReveal, existingSM2, onGrade }) => (
  <div className="flex-1 flex flex-col gap-4">
    <span className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-emerald-500">Theme</span>

    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-3xl font-heading font-bold text-primary leading-tight">{item.bookName}</h2>
      <p className="text-xs text-muted italic">What is this book's theme?</p>

      {revealed ? (
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl font-heading font-bold text-accent tracking-wide">{item.themeWord}</span>
          <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-gold">{item.keyWord}</span>
          <p className="text-sm text-secondary italic font-serif leading-relaxed max-w-xs">{item.subtitle}</p>
        </div>
      ) : (
        <span className="inline-block h-6 w-32 rounded-sm bg-card-border" aria-hidden="true" />
      )}
    </div>

    {revealed ? (
      <GradeStrip sm2={existingSM2} onGrade={onGrade} />
    ) : (
      <button
        onClick={onReveal}
        className="w-full py-3 rounded-md border border-dashed border-card-border-hover text-sm font-semibold text-secondary hover:text-primary hover:border-accent/40 transition-colors"
      >
        Tap to reveal
      </button>
    )}
  </div>
);
