import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeft, ArrowRight, Flame } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { evaluateSM2, formatInterval, suggestedScore } from '../../utils/sm2';
import { buildReviewEvent } from '../../utils/reviewLog';
import { buildSession, type SessionItem, type SessionPlan } from '../../utils/session';
import { chapterProgressKey, blockProgressKey } from '../../types/models';
import type { ChapterProgress, ThemeProgress, Verse } from '../../types/models';
import { CueText } from './CueText';
import { chunkText, chainSpan, chainedText, cueForRepetition, cueLevelToNumber, scoreAttempt } from '../../utils/cue';
import { judgeAnchor, judgeByDirection, type AnchorJudgement, type AnchorDirection } from '../../utils/anchorAnswer';
import { ChainDrill } from './ChainDrill';
import { saveSession, loadSession, clearSession } from '../../utils/sessionStore';

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

/** What the verse card measured, handed up so the review history records the attempt and
 * not merely the grade the reader chose afterwards. */
export interface VerseAttempt {
  accuracy: number;
  committed: string;
  cueLevel: 0 | 1 | 2 | 3 | 4;
  elapsedMs: number;
}

const GRADE_LABEL: Record<number, string> = { 1: 'Blank', 3: 'Hard', 4: 'Good', 5: 'Easy' };

/**
 * How overdue an item is, in whole days.
 *
 * Shown because a reader meeting a verse they last saw in spring should know that before
 * they judge how the attempt went — an answer that feels like a failure is a different
 * event at three days than at three months, and without the number the reader supplies
 * their own, usually harsher, guess. Stated flatly and without comment: no exclamation,
 * no "yikes", nothing that turns a fact into a reprimand.
 */
const daysLate = (dueAt: string | undefined, now = Date.now()): number => {
  if (!dueAt) return 0;
  return Math.max(0, Math.floor((now - new Date(dueAt).getTime()) / 86400000));
};

const LateBadge: React.FC<{ dueAt?: string }> = ({ dueAt }) => {
  const late = daysLate(dueAt);
  // A day or two late is ordinary life, not a fact worth reporting.
  if (late < 3) return null;
  return (
    <span className="text-[0.625rem] font-bold uppercase tracking-widest text-orange-400">
      {late} days late
    </span>
  );
};

/**
 * Whether the browser believes it is offline.
 *
 * Only worth saying where it changes what the reader is looking at. Verse text is stored
 * with the verse, so the passage itself is never missing — but the reader's chosen
 * translation is fetched, and a cached fallback quietly differing from the version they
 * expect is exactly the kind of thing that reads as a memory failure when it is nothing
 * of the sort.
 */
function useOffline(): boolean {
  const [offline, setOffline] = useState(() =>
    typeof navigator !== 'undefined' && navigator.onLine === false);
  React.useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return offline;
}

/**
 * A day's work, with an end.
 *
 * Every queue in the app before this wrapped forever: the anchor drill reset to index
 * 0, and the verse session had no completion state at all — grading didn't even
 * advance, so the reader sat on the item they had just scored. Nothing ever said "you
 * are finished", which removes the one reason a spaced system gives you to come back
 * tomorrow.
 */
export const Session: React.FC<{
  onExit: () => void;
  /** Restrict the day to one book — see SessionOptions.bookId. Passed through from a
   * navigation that named one, so "just Genesis this week" is expressible. */
  bookId?: string;
  /** Route into free practice on the whole library. The session is now what the Practice
   * tab opens, so its empty state has to lead somewhere rather than being a dead end on
   * the app's second most prominent screen. */
  onFreePractice?: () => void;
}> = ({ onExit, onFreePractice, bookId }) => {
  const { state, dispatch } = useApp();

  // Planned once, on mount. The plan reads from chapterProgress and the verse list,
  // both of which this screen is about to mutate — recomputing as we go would reshuffle
  // the work list under the cursor, which is the same defect the anchor drill had.
  const buildPlan = () =>
    buildSession(state, {
      newChapters: state.settings.dailyChapterTarget ?? 3,
      cap: SESSION_CAP,
      bookId,
    });

  // A session interrupted mid-way is resumed rather than restarted. Read once, on
  // mount, so the restored cursor and the restored plan can never disagree.
  const restored = useState(() => loadSession())[0];

  const [plan, setPlan] = useState<SessionPlan>(() => restored?.plan ?? buildPlan());
  const [index, setIndex] = useState(restored?.index ?? 0);
  const [outcomes, setOutcomes] = useState<Outcome[]>((restored?.outcomes as Outcome[]) ?? []);

  // Persisted on every move through the list. Cheap — twenty items of plain data — and
  // it is the difference between a phone call costing a moment and costing the session.
  React.useEffect(() => { saveSession(plan, index, outcomes); }, [plan, index, outcomes]);

  // Adherence: whether sessions are finished, not merely opened.
  //
  // Counted here because this is the only place that knows. The reducer has carried these
  // actions and the Retention screen has rendered their totals since both were written —
  // and nothing dispatched them, so every figure sat at zero and the section never
  // appeared. That is precisely the collect-and-drop failure this codebase has now made
  // four times (`lapses`, `chainHits`, `RECORD_ACTIVITY`, and this).
  //
  // A resumed session is the same sitting continuing, not a new start, so it is not
  // counted again; and a session with nothing due was never really started.
  // The clock starts when *this* sitting starts, whether or not it is a fresh session.
  //
  // It used to be set only inside the SESSION_STARTED branch, which returns early on a
  // resume — so a resumed session finished with `startedAt` still 0 and reported a
  // duration measured from 1970. One such session pushed the mean session length to
  // thirty million minutes, permanently, because the total is persisted.
  const startedAt = useRef(0);
  React.useEffect(() => { startedAt.current = Date.now(); }, []);

  // Whether this sitting has already been resolved — completed or abandoned, once each.
  //
  // Started/completed/abandoned have to agree or the completion rate is nonsense. A
  // resumed session suppresses only the *start*, since it is the same sitting continuing;
  // its completion still counts, which is what makes `completed <= started` hold. And
  // "keep going" opens a genuinely new session inside the same mount, so both flags reset
  // there — without that, every session after the first in a sitting recorded nothing at
  // all and a reader who always keeps going stayed at one forever.
  const resolved = useRef(false);
  const countedStart = useRef(false);
  React.useEffect(() => {
    if (countedStart.current || restored || plan.items.length === 0) return;
    countedStart.current = true;
    dispatch({ type: 'SESSION_STARTED' });
  }, [plan.items.length, restored, dispatch]);

  // Where people stop is the useful half: consistently quitting at item three says
  // something a completion rate does not.
  //
  // Mirrored in an effect rather than assigned during render, because writing refs while
  // rendering makes the output depend on when the component happened to be called. Under
  // StrictMode the mirror runs before the simulated unmount, so a *restored* session would
  // otherwise report an abandon at mount — hence the `countedStart` guard here too: a
  // sitting that never registered a start has nothing to abandon.
  const liveIndex = useRef(index);
  const liveTotal = useRef(plan.items.length);
  React.useEffect(() => {
    liveIndex.current = index;
    liveTotal.current = plan.items.length;
  }, [index, plan.items.length]);

  React.useEffect(() => () => {
    // Not on unload — React cleanups do not run then. This catches the back arrow and
    // route changes, which is where abandonment actually happens.
    if (resolved.current || !countedStart.current) return;
    if (liveTotal.current > 0 && liveIndex.current > 0 && liveIndex.current < liveTotal.current) {
      resolved.current = true;
      dispatch({ type: 'SESSION_ABANDONED', payload: { atIndex: liveIndex.current } });
    }
  }, [dispatch]);

  const finished = plan.items.length > 0 && index >= plan.items.length;
  React.useEffect(() => {
    if (!finished || resolved.current) return;
    resolved.current = true;
    dispatch({
      type: 'SESSION_COMPLETED',
      payload: { itemsGraded: outcomes.length, durationMs: Date.now() - startedAt.current },
    });
  }, [finished, outcomes.length, dispatch]);

  // "Keep going" starts a genuinely new session against whatever is still due, rather
  // than replaying this one. Everything already graded has moved into the future, so
  // the fresh plan naturally picks up where this left off.
  const startAnother = () => {
    clearSession();
    // A genuinely new session, so it counts as one. Leaving these set meant every
    // session after the first in a sitting recorded nothing — not started, not
    // completed, not abandoned — so a reader who always keeps going stayed at one
    // started session forever while doing several.
    //
    // Dispatched here rather than by clearing `countedStart`: the mount effect keys on
    // plan length, which the new plan is about to change, so clearing the flag would let
    // it fire again and count this same session twice.
    resolved.current = false;
    startedAt.current = Date.now();
    dispatch({ type: 'SESSION_STARTED' });
    setPlan(buildPlan());
    setIndex(0);
    setOutcomes([]);
  };

  const item = plan.items[index];
  const isComplete = index >= plan.items.length;

  // Each card owns its own attempt state and is keyed by item id, so there is nothing
  // left here to reset — the shared 'revealed' flag existed only for the reveal-then-
  // grade cards that no longer exist.
  const advance = () => setIndex(i => i + 1);

  const recordActivity = () => {
    if (state.settings.streakIncludesChapters !== false) dispatch({ type: 'RECORD_ACTIVITY' });
  };

  const gradeVerse = (planVerse: Verse, score: number, attempt: VerseAttempt) => {
    // Grade against the verse as it stands now, not as the plan snapshotted it.
    //
    // A resumed session carries a plan serialized possibly hours earlier. Writing back
    // `{ ...planVerse, sm2 }` would spread that stale snapshot over the record — silently
    // reverting a grade given in the workshop since, or an edit to the verse's own text.
    // Only the schedule fields belong to this grading; everything else belongs to the
    // verse, whoever last touched it.
    const verse = state.verses.find(v => v.id === planVerse.id) || planVerse;
    const { newSM2, newStatus } = evaluateSM2(verse.sm2, score, 'verse', state.settings.intervalScale ?? 1);
    dispatch({
      type: 'UPDATE_VERSE',
      payload: { ...verse, sm2: newSM2, status: newStatus, attempts: (verse.attempts || 0) + 1 },
    });
    dispatch({
      type: 'RECORD_REVIEW',
      payload: buildReviewEvent({
        itemKind: 'verse', itemId: verse.id, gradeSubmitted: score,
        before: verse.sm2, after: newSM2,
        // The daily loop now measures its own attempts, so this is the surface the
        // honesty gap is mostly computed from — and the cue level is whatever the item's
        // strength earned rather than a constant, so a verse still being shown in full
        // can never be mistaken in the history for one recalled cold.
        mode: 'type',
        cueLevel: attempt.cueLevel,
        measuredAccuracy: attempt.accuracy,
        committed: attempt.committed,
        elapsedMs: attempt.elapsedMs,
      }),
    });
    dispatch({ type: 'RECORD_ACTIVITY' });
    setOutcomes(o => [...o, { id: verse.id, kind: 'verse', label: verse.ref, score, interval: newSM2.interval }]);
    advance();
  };

  const gradeAnchor = (
    bookId: string, bookName: string, chapter: number, score: number,
    attempt: VerseAttempt, direction: AnchorDirection,
  ) => {
    const key = chapterProgressKey(bookId, chapter);
    const existing = state.chapterProgress[key];
    const { newSM2, newStatus } = evaluateSM2(existing?.sm2 || DEFAULT_SM2, score, 'anchor', state.settings.intervalScale ?? 1);
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
    dispatch({
      type: 'RECORD_REVIEW',
      payload: buildReviewEvent({
        itemKind: 'anchor', itemId: key, gradeSubmitted: score,
        before: existing?.sm2, after: newSM2,
        // A produced answer, and the direction it was produced in. Recording the
        // direction is what lets a chapter known cold be told apart from one only ever
        // recognised off its plate — the three are not equally hard, and nothing
        // distinguished them before.
        mode: 'type', cueLevel: 0, direction,
        measuredAccuracy: attempt.accuracy,
        committed: attempt.committed,
        elapsedMs: attempt.elapsedMs,
      }),
    });
    recordActivity();
    setOutcomes(o => [...o, { id: key, kind: 'anchor', label: `${bookName} ${chapter}`, score, interval: newSM2.interval }]);
    advance();
  };

  const gradeTheme = (bookId: string, bookName: string, score: number, attempt: VerseAttempt) => {
    const existing = state.themeProgress[bookId];
    const { newSM2, newStatus } = evaluateSM2(existing?.sm2 || DEFAULT_SM2, score, 'theme', state.settings.intervalScale ?? 1);
    const updated: ThemeProgress = {
      bookId,
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
        itemKind: 'theme', itemId: bookId, gradeSubmitted: score,
        before: existing?.sm2, after: newSM2, mode: 'type', cueLevel: 0,
        measuredAccuracy: attempt.accuracy,
        committed: attempt.committed,
        elapsedMs: attempt.elapsedMs,
      }),
    });
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

        {/* A stall the reader cannot see is the failure most likely to end the habit.
            When the backlog has pushed new chapters past their reserved share, the
            session says so rather than letting progress through a book simply stop
            without explanation. */}
        {plan.newHeldBack > 0 && (
          <p className="text-center text-[0.6875rem] text-muted px-4">
            Reviews filled today — new chapters resume as the backlog clears.
          </p>
        )}

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
          {/* A backlog this size cannot shrink faster than it grows at twenty items a
              day, and the thing readers actually reach for at that point is abandoning
              the library. Spreading it forward is the smaller loss. Nothing is marked
              recalled — only rescheduled — and the offer appears only when the arithmetic
              genuinely doesn't work. */}
          {plan.heldBackAll > SESSION_CAP * 3 && (
            <button
              onClick={() => { dispatch({ type: 'POSTPONE_BACKLOG', payload: { days: 14 } }); onExit(); }}
              className="w-full py-2.5 text-[0.6875rem] text-muted hover:text-primary transition-colors"
            >
              Too much — spread the {plan.heldBackAll} overdue across the next two weeks
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
          Everything you're learning is scheduled ahead. Coming back tomorrow is worth more
          than pushing on today — but the workshop is here if you want it.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
          {onFreePractice && (
            <button
              onClick={onFreePractice}
              className="w-full py-3 rounded-md border border-card-border text-secondary font-bold text-sm hover:text-primary transition-colors"
            >
              Practise a verse anyway
            </button>
          )}
          <button
            onClick={onExit}
            className="w-full py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
          >
            Back to Today
          </button>
        </div>
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
          key={item.id}
          bookId={item.bookId}
          blockIndex={item.blockIndex}
          label={`${item.bookName} · ${item.label}`}
          anchors={item.anchors}
          onClose={() => {
            // A chain grades itself inside the drill, so nothing here recorded that it
            // happened — the day's summary counted every other kind and silently omitted
            // chains, reporting "8 items reviewed" for a session of nine. The drill has
            // already written the grade and the review event; this is only the session's
            // own tally of what it put in front of the reader.
            // Only if it was actually graded. `onClose` also fires on the drill's X and on
            // Escape, which can happen at link two of ten — recording an outcome there
            // counted an item that was never reviewed and, with score 0, listed it under
            // "Fell back". The previous version under-counted chains by one; this one
            // over-corrected into counting closes rather than grades.
            const key = blockProgressKey(item.bookId, item.blockIndex);
            const graded = state.blockProgress[key];
            const gradedNow = graded && graded.lastAttemptDate &&
              Date.now() - new Date(graded.lastAttemptDate).getTime() < 60_000;
            if (gradedNow) {
              setOutcomes(o => [...o, {
                id: item.id, kind: 'chain', label: `${item.bookName} · ${item.label}`,
                score: graded.lastScore, interval: graded.sm2.interval,
              }]);
            }
            advance();
          }}
        />
      ) : item.kind === 'introduce' ? (
        <IntroduceCard item={item} onDone={advance} />
      ) : item.kind === 'verse' ? (
        <VerseCardPrompt
          // Keyed so the card's own part/attempt state cannot survive into the next verse.
          key={item.id}
          item={item}
          onGrade={(score, attempt) => gradeVerse(item.verse, score, attempt)}
        />
      ) : item.kind === 'theme' ? (
        <ThemeCardPrompt
          key={item.id}
          item={item}
          onGrade={(score, attempt) => gradeTheme(item.bookId, item.bookName, score, attempt)}
        />
      ) : (
        <AnchorCardPrompt
          key={item.id}
          item={item}
          onGrade={(score, attempt) => gradeAnchor(item.bookId, item.bookName, item.chapter, score, attempt, item.direction)}
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

/**
 * Four grades, and no preview of what each one buys.
 *
 * Every button used to carry the interval it would produce — Blank 1 day, Easy 2 months
 * — which turns an honest question about recall into a visible trade between a short
 * wait and a long one. Nothing in the app verifies these grades, so the schedule rests
 * entirely on the reader reporting a memory rather than choosing a reward, and printing
 * the reward beside the choice is the one thing most likely to stop them doing that.
 *
 * The interval is not hidden, only moved: the session's closing summary reports the
 * schedule the day's answers actually produced, at the point where knowing it can no
 * longer bias it.
 */
const GradeStrip: React.FC<{ onGrade: (score: number) => void; suggested?: number }> = ({ onGrade, suggested }) => (
  <div className="grid grid-cols-4 gap-2">
    {GRADES.map(g => (
      <button
        key={g.score}
        onClick={() => onGrade(g.score)}
        // The suggestion is a ring around one button, never a pre-submitted answer: the
        // reader may know they were guessing, or that a "wrong" word was a synonym the
        // diff cannot forgive.
        className={`py-3 flex items-center justify-center rounded-md border transition-colors active:scale-95 ${g.className} ${
          suggested === g.score ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''
        }`}
      >
        <span className="text-xs font-bold leading-tight">{g.label}</span>
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

/**
 * One verse, learned in parts, produced before it is shown.
 *
 * This card used to be first-letters, a "Show the verse" button, and four grade buttons
 * — the reader looked at the answer and then rated how well they had known it. That is
 * the weakest arrangement available on both counts. Judgements of learning made with the
 * answer visible are systematically inflated, and the inflated grade was converted
 * straight into a longer interval, so the error compounded through the schedule rather
 * than averaging out. And nothing was ever produced, so nothing could be checked.
 *
 * Now: the passage is split at its own phrase boundaries, each part is typed from
 * memory, and the text arrives only once there is an attempt to compare it against. The
 * cue that remains is set by the item's own repetition count rather than being the same
 * for a verse met yesterday and one held for a year. Each part after the first is cued by
 * the tail of the one before, because the join is the thing that has to work when the
 * passage is finally recited whole.
 *
 * The grade is still the reader's — a diff cannot forgive a synonym or judge a
 * right-idea-wrong-order attempt — but it is now anchored to a measurement instead of
 * to a feeling, and the gap between the two is recorded.
 */
const VerseCardPrompt: React.FC<{
  item: Extract<SessionItem, { kind: 'verse' }>;
  onGrade: (score: number, attempt: VerseAttempt) => void;
}> = ({ item, onGrade }) => {
  const chunks = useMemo(() => chunkText(item.verse.text), [item.verse.text]);
  const repetition = item.verse.sm2?.repetition ?? 0;
  const level = cueForRepetition(repetition);
  // Progressive chaining: part one, then one and two together, then one through three.
  // The span is what the item has earned; `part` extends it within this sitting.
  const earnedSpan = chainSpan(chunks.length, repetition);
  // The encoding pass: never once recalled, so the text is on screen and there is nothing
  // to test yet. cueForRepetition already returns full text at zero; this names it.
  // Matched to cueForRepetition, which returns 'full' at repetition 0 *and* 1 — not just
  // 0. With the off-by-one, a verse on its second review showed the entire text under a
  // button saying "Check", and offered "I can't get it": exactly the guaranteed blank
  // with the answer on screen that this card exists to remove. Repetition 1 is also where
  // every verse lands the day after a lapse, so it was far from an edge case.
  const isEncoding = level === 'full';
  const offline = useOffline();

  const [part, setPart] = useState(0);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  // Giving up is a commit with no credit, not a separate path. Tracked as a flag rather
  // than by pushing a zero row, because `checked` already contributes the current part to
  // the totals below — doing both would count this part twice.
  const [gaveUp, setGaveUp] = useState(false);
  const [results, setResults] = useState<{ matched: number; total: number; committed: string }[]>([]);
  // Prompt shown → answer committed. Started in an effect rather than at render so the
  // clock is read outside the render pass, and frozen at the moment of commit so it
  // measures the attempt rather than however long the correction was then looked at.
  const startedAt = useRef(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  React.useEffect(() => { startedAt.current = Date.now(); }, []);

  const span = Math.min(chunks.length, earnedSpan + part);
  const text = chainedText(chunks, span) || item.verse.text;
  const score = useMemo(() => scoreAttempt(text, input), [text, input]);
  // Done when the attempt covered the whole passage.
  const isLastPart = span >= chunks.length;

  // Totals across every part, so a three-part passage is graded on the whole thing
  // rather than on whichever fragment happened to be last.
  const thisPart = { matched: gaveUp ? 0 : score.matched, total: score.total, committed: input };
  const done = [...results, ...(checked ? [thisPart] : [])];
  // The last attempt is the widest one and already contains every earlier clause, so the
  // grade comes from it alone. Summing the attempts would count the opening of the
  // passage once for every round and quietly inflate the result.
  const widest = done.length ? done[done.length - 1] : thisPart;
  const overall = widest.total ? Math.round((widest.matched / widest.total) * 100) : 0;

  const commit = () => {
    if (checked) return;
    setElapsedMs(Date.now() - startedAt.current);
    setChecked(true);
  };

  const nextPart = () => {
    setResults(r => [...r, thisPart]);
    setPart(p => p + 1);
    setInput('');
    setChecked(false);
    setGaveUp(false);
    // Restarted per part. The field means "prompt shown until answer committed", and
    // leaving it running across a six-part passage measured time-since-mount instead —
    // which would have made the plan's median-time-per-item indicator meaningless for
    // exactly the longest items.
    startedAt.current = Date.now();
  };

  const submit = (grade: number) => {
    onGrade(grade, {
      accuracy: overall,
      committed: widest.committed,
      cueLevel: cueLevelToNumber(level),
      elapsedMs,
    });
  };

  // Giving up honestly, rather than revealing and then rating yourself against what you
  // just read. Records the blank it actually is.
  const giveUp = () => {
    setElapsedMs(Date.now() - startedAt.current);
    setGaveUp(true);
    setChecked(true);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-baseline gap-2">
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-accent">
            Verse · {item.verse.translation}
          </span>
          <LateBadge dueAt={item.dueAt} />
        </span>
        {chunks.length > 1 && (
          <span className="text-[0.6875rem] text-muted tabular-nums">
            {span === chunks.length
              ? `Whole passage · ${score.total} words`
              : `Parts 1–${span} of ${chunks.length} · ${score.total} words`}
          </span>
        )}
      </div>

      <h2 className="text-2xl font-heading font-bold text-primary leading-tight">{item.verse.ref}</h2>

      {/* The passage itself is stored with the verse and never goes missing, but the
          reader's chosen translation is fetched — and a cached fallback quietly differing
          from the version they learned reads exactly like a memory failure when it is
          nothing of the sort. */}
      {offline && (
        <p className="text-[0.6875rem] text-muted -mt-2">
          Showing the saved {item.verse.translation} text — you're offline.
        </p>
      )}

      {/* The join from the previous part — a prompt, not a re-read. */}
      {/* Nothing precedes part one, so there is no join to prompt with. The cue returns
          if a later starting point is ever introduced. */}

      <div className="flex-1 flex flex-col justify-center gap-4 min-h-0 overflow-y-auto">
        {!checked ? (
          <>
            <CueText text={text} level={level} />
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type it from memory…"
              aria-label={`Type ${item.verse.ref}${chunks.length > 1 ? `, parts 1 to ${span} of ${chunks.length}` : ''}, from memory`}
              className="w-full min-h-[120px] p-4 rounded-md bg-card border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors text-primary placeholder:text-muted/60 resize-none text-base"
            />
          </>
        ) : (
          <div className="flex flex-col gap-3" role="status" aria-live="polite">
            <p className="text-sm font-semibold text-primary tabular-nums">
              {gaveUp
                ? 'Read it once, out loud if you can.'
                : `${score.matched} of ${score.total} words matched`}
            </p>
            <p className="text-lg font-serif leading-relaxed whitespace-pre-wrap">
              {score.words.map((w, i) => (
                <React.Fragment key={i}>
                  <span className={w.ok ? 'text-primary' : 'text-red-500 underline decoration-red-500/50 underline-offset-4'}>
                    {w.word}
                  </span>{' '}
                </React.Fragment>
              ))}
            </p>
          </div>
        )}
      </div>

      {!checked ? (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={commit}
            className="w-full py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
          >
            {/* A verse never once recalled is not a test, and asking for one guarantees a
                blank — which teaches nothing and costs the reader something. The first pass
                is copying: the text is already on screen, because cueForRepetition returns
                'full' at zero, and the button now says so honestly instead of implying an
                answer is expected. The cue withdraws on its own from the next review. */}
            {isEncoding ? 'Copy it through' : 'Check'}
          </button>
          {/* Nothing to give up on while the answer is in front of you. */}
          {!isEncoding && (
            <button onClick={giveUp} className="text-[0.6875rem] text-muted hover:text-primary transition-colors py-1">
              I can't get it
            </button>
          )}
        </div>
      ) : gaveUp ? (
        // Giving up ends the attempt, whatever span it happened on — checked *before*
        // the widen branch, and the order matters.
        //
        // The other way round, giving up on part one displayed that text and then offered
        // "again, with the next part", where the next span *contains* the part just read.
        // The reader would retype what was on screen seconds earlier, that wider attempt
        // would become the one the grade is drawn from, and the blank would erase itself
        // into a strong score. Widening only ever follows an attempt the reader actually
        // made.
        //
        // No grade strip either: the answer is already visible, so there is nothing left
        // to judge, and offering four buttons here is the exact "rate yourself while
        // looking at it" move this card exists to remove. It records the blank it was.
        <button
          onClick={() => submit(1)}
          className="w-full py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
        >
          Got it — try again tomorrow
        </button>
      ) : !isLastPart ? (
        <button
          onClick={nextPart}
          className="w-full py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
        >
          Again, with the next part
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          {chunks.length > 1 && (
            <p className="text-center text-[0.6875rem] text-muted tabular-nums">
              Whole passage: {widest.matched} of {widest.total} words
            </p>
          )}
          <p className="text-center text-[0.6875rem] text-muted">
            Suggested: <span className="font-bold text-accent">{GRADE_LABEL[suggestedScore(overall)]}</span> — change it if that's not right
          </p>
          <GradeStrip onGrade={submit} suggested={suggestedScore(overall)} />
        </div>
      )}
    </div>
  );
};

/**
 * One chapter's anchor, typed from memory.
 *
 * The card used to be a blanked bar, "Tap to reveal", and four grade buttons — a cued
 * recall the reader marked themselves, with the answer already on screen when they did
 * it. For a *single word* that is an unusually cheap thing to fix: typing one word is
 * not the friction that makes typed recall unreasonable for a hundred-word passage, and
 * it converts the largest body of content in the app — 1,189 anchors — from self-report
 * into measurement.
 *
 * The answer then grades itself, so there is no four-button strip here at all. What is
 * left for the reader to judge is only whether it came instantly, which is one button.
 */
const AnchorCardPrompt: React.FC<{
  item: Extract<SessionItem, { kind: 'anchor' }>;
  onGrade: (score: number, attempt: VerseAttempt) => void;
}> = ({ item, onGrade }) => {
  const [typed, setTyped] = useState('');
  const [judged, setJudged] = useState<AnchorJudgement | null>(null);
  // The value actually put to the judge, kept so the review history records the attempt
  // that was scored rather than whatever remains in the input.
  const [answered, setAnswered] = useState('');
  const startedAt = useRef(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  React.useEffect(() => { startedAt.current = Date.now(); }, []);

  // Takes the answer explicitly rather than reading `typed` from the enclosing render.
  // "Skip this one" used to call setTyped('') and then answer() in the same handler, but
  // the state update has not applied by the time answer() runs — so it judged whatever
  // was in the box. Type the right word, press Skip, and it recorded a correct recall.
  const answer = (value: string = typed) => {
    if (judged) return;
    setAnswered(value);
    setElapsedMs(Date.now() - startedAt.current);
    // Routed through judgeByDirection so the question asked and the answer judged cannot
    // disagree: w2n asks for a chapter number and must not be checked against the word.
    setJudged(judgeByDirection(value, item));
  };

  const submit = (score: number) => {
    onGrade(score, {
      accuracy: judged?.verdict === 'correct' ? 100 : judged?.verdict === 'near' ? 60 : 0,
      // What was actually judged, not what is still in the box. Skip judges the empty
      // string; recording `typed` wrote an event saying the reader produced "HANDS" and
      // then scored it Blank.
      committed: answered,
      cueLevel: 0,
      elapsedMs,
    });
  };

  const prompt =
    item.direction === 'w2n' ? 'Which chapter is this?'
    : 'What anchors this chapter?';

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-baseline gap-2">
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-gold">
            Anchor · {item.bookName}
          </span>
          {/* Why this one came round early. The nomination has been computed since chain
              evidence was introduced and used only to reorder the queue, so an anchor could
              arrive well before its due date with nothing on screen explaining it. */}
          {item.nominated && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-gold shrink-0"
              title="Missed in the chain recently"
              aria-label="Missed in the chain recently"
              role="img"
            />
          )}
        </span>
        <LateBadge dueAt={item.dueAt} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center min-h-0 overflow-y-auto">
        {/* The cue, whichever way round the scheduler asked. */}
        {item.direction === 'w2n' ? (
          <span className="text-3xl font-heading font-bold text-accent">{item.word}</span>
        ) : item.direction === 'p2w' ? (
          <Plate bookId={item.bookId} chapter={item.chapter} className="w-36 h-36" />
        ) : (
          <span className="text-6xl font-heading font-bold text-accent leading-none">{item.chapter}</span>
        )}
        <p className="text-xs text-muted italic">{prompt}</p>

        {!judged ? (
          <input
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') answer(); }}
            placeholder={item.direction === 'w2n' ? 'chapter number' : 'one word'}
            aria-label={item.direction === 'w2n'
              ? `Which chapter of ${item.bookName} is anchored by ${item.word}?`
              : `The anchor word for ${item.bookName} chapter ${item.chapter}`}
            inputMode={item.direction === 'w2n' ? 'numeric' : 'text'}
            // iOS will otherwise quietly rewrite CIRCUMCISION, MELCHIZEDEK and EBENEZER
            // into something else entirely, which would destroy the measurement.
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full max-w-xs text-center text-xl py-3 px-4 rounded-md bg-card border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors text-primary placeholder:text-muted/60"
          />
        ) : (
          <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
            {/* The answer always arrives with its picture. Pairing an arbitrary
                number↔word association with an image is the strongest lever available,
                and 48 books of purpose-drawn plates exist for exactly this moment. */}
            {item.direction !== 'p2w' && <Plate bookId={item.bookId} chapter={item.chapter} className="w-36 h-36" />}
            <span className="text-2xl font-heading font-bold text-primary">
              {item.direction === 'w2n' ? `Chapter ${item.chapter}` : item.word}
            </span>
            <span className="text-sm text-muted italic">{item.scene}</span>

            {judged.verdict === 'correct' && (
              <span className="text-xs font-bold text-green-500">Correct</span>
            )}
            {judged.verdict === 'near' && (
              <span className="text-xs text-orange-400">Close — it's {item.word}.</span>
            )}
            {/* Naming the confusion is the useful half of a wrong answer: Genesis holds
                WELL(21)/WELLS(26) and STONE(29)/STICKS(30), and mixing those up is the
                dominant way anchors fail. */}
            {judged.verdict === 'wrong' && judged.confusedWith && (
              <span className="text-xs text-red-400">
                You wrote {judged.confusedWith.word} — that's chapter {judged.confusedWith.chapter}
              </span>
            )}
          </div>
        )}
      </div>

      {!judged ? (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => answer()}
            className="w-full py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
          >
            Answer
          </button>
          <button onClick={() => answer('')} className="text-[0.6875rem] text-muted hover:text-primary transition-colors py-1">
            Skip this one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => submit(judged.score)}
            className="py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
          >
            Continue
          </button>
          <button
            onClick={() => submit(5)}
            disabled={judged.verdict !== 'correct'}
            title={judged.verdict !== 'correct' ? 'Only for an answer that was right' : undefined}
            className="py-3 rounded-md border border-card-border text-secondary font-bold text-sm hover:text-primary transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            That was easy
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * A book's theme, typed from memory.
 *
 * The last item kind in the daily session still on reveal-then-self-grade. It was left
 * behind when the verse and anchor cards were rebuilt, which meant the session was
 * asking for a produced answer on two of its three layers and taking the reader's word
 * for it on the third — and doing so on the layer where producing is cheapest, because
 * a theme is one or two words.
 *
 * The book's name and its cover are the prompt: both are things the reader already has,
 * and neither gives the answer away.
 */
const ThemeCardPrompt: React.FC<{
  item: Extract<SessionItem, { kind: 'theme' }>;
  onGrade: (score: number, attempt: VerseAttempt) => void;
}> = ({ item, onGrade }) => {
  const [typed, setTyped] = useState('');
  const [judged, setJudged] = useState<AnchorJudgement | null>(null);
  // The value actually put to the judge, kept so the review history records the attempt
  // that was scored rather than whatever remains in the input.
  const [answered, setAnswered] = useState('');
  const startedAt = useRef(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  React.useEffect(() => { startedAt.current = Date.now(); }, []);

  const answer = (value: string = typed) => {
    if (judged) return;
    setAnswered(value);
    setElapsedMs(Date.now() - startedAt.current);
    // Judged as a word, with no siblings: a wrong theme is rarely another book's theme,
    // and naming a coincidental collision across sixty-six books would mislead more than
    // it explained.
    setJudged(judgeAnchor(value, item.themeWord));
  };

  const submit = (score: number) => onGrade(score, {
    accuracy: judged?.verdict === 'correct' ? 100 : judged?.verdict === 'near' ? 60 : 0,
    // The judged answer, not the leftover input — see the anchor card above.
    committed: answered,
    cueLevel: 0,
    elapsedMs,
  });

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <span className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-emerald-500">Theme</span>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center min-h-0 overflow-y-auto">
        <h2 className="text-3xl font-heading font-bold text-primary leading-tight">{item.bookName}</h2>
        <p className="text-xs text-muted italic">What is this book's theme?</p>

        {!judged ? (
          <input
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') answer(); }}
            placeholder="one word"
            aria-label={`The theme of ${item.bookName}`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full max-w-xs text-center text-xl py-3 px-4 rounded-md bg-card border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors text-primary placeholder:text-muted/60"
          />
        ) : (
          <div className="flex flex-col items-center gap-2" role="status" aria-live="polite">
            <span className="text-2xl font-heading font-bold text-accent tracking-wide">{item.themeWord}</span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-gold">{item.keyWord}</span>
            <p className="text-sm text-secondary italic font-serif leading-relaxed max-w-xs">{item.subtitle}</p>
            {judged.verdict === 'correct' && <span className="text-xs font-bold text-green-500">Correct</span>}
            {judged.verdict === 'near' && <span className="text-xs text-orange-400">Close — it's {item.themeWord}.</span>}
          </div>
        )}
      </div>

      {!judged ? (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => answer()}
            className="w-full py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
          >
            Answer
          </button>
          <button onClick={() => answer('')} className="text-[0.6875rem] text-muted hover:text-primary transition-colors py-1">
            Skip this one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => submit(judged.score)}
            className="py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
          >
            Continue
          </button>
          <button
            onClick={() => submit(5)}
            disabled={judged.verdict !== 'correct'}
            title={judged.verdict !== 'correct' ? 'Only for an answer that was right' : undefined}
            className="py-3 rounded-md border border-card-border text-secondary font-bold text-sm hover:text-primary transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            That was easy
          </button>
        </div>
      )}
    </div>
  );
};
