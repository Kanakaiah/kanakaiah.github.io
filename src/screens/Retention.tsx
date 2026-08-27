import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { retentionByInterval, honestyGap, firstTryRetention, wasRecalled } from '../utils/reviewLog';
import { leeches, activeDays } from '../utils/leeches';
import { useNow } from '../utils/useNow';
import { coldCheckAvailable, COLD_DAYS, COLD_CHECK_SIZE } from '../utils/coldCheck';
import { ColdCheck } from '../components/practice/ColdCheck';

/**
 * What would I still know if I stopped today?
 *
 * Every number the app showed before this was activity: verses memorized, chapters
 * secure, a streak, a shape meter — all of them counting things done rather than things
 * held. Worse, two of them were activity wearing retention's name, because "secure" and
 * "Memorized" are both `repetition >= 6`, a count of consecutive successful *self-grades*
 * that an item can reach with its efactor pinned at the floor.
 *
 * This screen only shows numbers that are about memory, and says plainly when it does
 * not yet have enough to say anything.
 */

const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);

const LAYERS: { kind: 'theme' | 'anchor' | 'verse'; label: string }[] = [
  { kind: 'theme', label: 'Theme' },
  { kind: 'anchor', label: 'Anchor' },
  { kind: 'verse', label: 'Verse' },
];

export const Retention: React.FC = () => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const now = useNow();
  // Memoized rather than defaulted inline: `x || []` builds a fresh array on every render
  // when the key is absent, which would change the identity every memo below depends on
  // and re-walk the whole history each time — up to 4,000 events, four times over.
  const log = useMemo(() => state.reviewLog || [], [state.reviewLog]);

  const headline = useMemo(() => firstTryRetention(log, 30, now), [log, now]);
  const curve = useMemo(() => retentionByInterval(log, 90, now), [log, now]);
  const gap = useMemo(() => honestyGap(log, 30, now), [log, now]);
  const worst = useMemo(() => leeches(state).slice(0, 5), [state]);
  const active = useMemo(() => activeDays(state, 45, now), [state, now]);
  const coldAvailable = useMemo(() => coldCheckAvailable(state, now), [state, now]);
  const coldChecks = state.coldChecks || [];
  const lastCold = coldChecks[coldChecks.length - 1];
  const [checking, setChecking] = useState(false);
  const scale = state.settings.intervalScale ?? 1;
  // Only offered when the curve has actually asked for it: a dial that is always on
  // screen invites fiddling with the schedule on a hunch, which is the opposite of
  // letting the measurement drive the change.
  const longest = curve.filter(b => b.rate !== null).slice(-1)[0];
  // Shown when the curve asks for it — or whenever the dial is already turned, so a
  // reader whose retention has recovered can turn it back. Gating purely on the warning
  // meant the control vanished the moment it worked, leaving the scale stuck on forever.
  const needsShortening = (!!longest && (longest.rate ?? 1) < 0.8) || scale !== 1;

  // Adherence. A memory technique people stop using has an effect size of zero, so a rise
  // in retention alongside a fall in completion is a loss — and these are the only
  // numbers here that could reveal it.
  const a = state.adherence;
  const completionRate = a.started > 0 ? a.completed / a.started : null;
  const meanMinutes = a.completed > 0 ? Math.round(a.completedMs / a.completed / 60000) : null;
  const meanAbandonAt = a.abandonedCount > 0 ? Math.round(a.abandonedAtSum / a.abandonedCount) : null;

  const byLayer = useMemo(() => LAYERS.map(l => {
    const rows = log.filter(e => e.itemKind === l.kind && e.intervalBefore > 0 && e.cueLevel <= 1);
    const recalled = rows.filter(wasRecalled).length;
    return { ...l, attempts: rows.length, rate: rows.length >= 5 ? recalled / rows.length : null };
  }), [log]);

  const overdue = useMemo(() => {
    let n = 0;
    for (const v of state.verses) if (new Date(v.sm2.nextDueDate) <= now) n++;
    for (const p of Object.values(state.chapterProgress)) {
      if (p.attempts > 0 && new Date(p.sm2.nextDueDate) <= now) n++;
    }
    return n;
  }, [state.verses, state.chapterProgress, now]);

  // Below this there is nothing honest to report, and a headline drawn from four reviews
  // would be noise presented as a finding.
  const tooEarly = headline.attempts < 5;

  return (
    <div className="flex flex-col gap-7 max-w-2xl mx-auto w-full pb-16">
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-card-hover transition-colors" aria-label="Back to Today">
          <ArrowLeft className="w-5 h-5 text-secondary" />
        </button>
        <h1 className="text-2xl font-heading font-semibold text-primary">Retention</h1>
      </div>

      {tooEarly ? (
        <div className="flex flex-col gap-3 border border-card-border rounded-md p-6">
          <p className="text-lg font-heading font-semibold text-primary">Not enough reviews yet</p>
          <p className="text-secondary leading-relaxed">
            Retention needs about a week of reviews before it can tell you anything. Keep going.
          </p>
          <p className="text-sm text-muted leading-relaxed">
            This screen will show what you'd still recall unaided — not how much you've practised.
          </p>
        </div>
      ) : (
        <>
          {/* The one number that is actually about memory. */}
          <div className="flex flex-col gap-1">
            <span className="text-5xl font-heading font-bold text-primary tabular-nums">
              {pct(headline.rate)}
            </span>
            <span className="text-sm text-secondary">recalled on the first try, last 30 days</span>
            <span className="text-xs text-muted tabular-nums">across {headline.attempts} reviews</span>
            {overdue > 0 && (
              // A large backlog makes the number above optimistic — it counts only what
              // was actually reviewed — and the screen should say so rather than let it
              // read as good news.
              <span className="text-xs text-orange-400 mt-1">
                {overdue} items overdue. This counts only what you've actually reviewed.
              </span>
            )}
          </div>

          {/* The forgetting curve — the diagnostic the scheduler has never had. */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[10px] font-bold text-accent tracking-[0.2em] uppercase">How long it holds</h2>
            <div className="flex items-end gap-2 h-32" role="img" aria-label={
              `Retention by interval: ${curve.filter(b => b.rate !== null)
                .map(b => `${pct(b.rate)} at ${b.label}`).join(', ') || 'not enough data yet'}`
            }>
              {curve.map(b => (
                <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[0.625rem] text-muted tabular-nums">{pct(b.rate)}</span>
                  <div
                    className={`w-full rounded-t-sm ${b.rate === null ? 'bg-card-border' : b.rate >= 0.85 ? 'bg-emerald-500/70' : b.rate >= 0.7 ? 'bg-gold/70' : 'bg-red-500/60'}`}
                    style={{ height: `${Math.max(4, (b.rate ?? 0) * 100)}%` }}
                  />
                  <span className="text-[0.625rem] text-muted">{b.label}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              {curveRead(curve)}
            </p>

            {/* The dial that answers the measurement.
                SM-2 assumes a forgetting curve; the chart above is the first thing in this
                app able to say whether this reader matches it. When it says intervals run
                past what they hold, the honest response is to shorten every interval a
                little — not to grade harder, which corrupts the record, and not to review
                more often, which is the same schedule with more effort spent on it.
                Offered only when the curve has actually asked for it. */}
            {needsShortening && (
              <div className="flex flex-col gap-2 border border-orange-400/30 bg-orange-400/5 rounded-md p-4">
                <p className="text-sm text-secondary leading-relaxed">
                  You're forgetting faster than the schedule assumes. Shortening every
                  interval brings reviews forward across the board.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[0.7, 0.85, 1].map(v => (
                    <button
                      key={v}
                      onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { intervalScale: v } })}
                      aria-pressed={scale === v}
                      className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-colors ${
                        scale === v
                          ? 'bg-accent text-white border-accent'
                          : 'border-card-border text-secondary hover:text-primary'
                      }`}
                    >
                      {v === 1 ? 'Normal' : `${Math.round((1 - v) * 100)}% shorter`}
                    </button>
                  ))}
                </div>
                <p className="text-[0.6875rem] text-muted">
                  Applies to intervals as they're earned. Nothing already scheduled moves.
                </p>
              </div>
            )}
          </section>

          {/* The honesty gap: what was claimed against what was produced. */}
          {gap && (
            <section className="flex flex-col gap-2 border border-card-border rounded-md p-4">
              <h2 className="text-[10px] font-bold text-accent tracking-[0.2em] uppercase">Are your grades honest?</h2>
              <p className="text-sm text-secondary leading-relaxed">
                {gap.gap >= 0.5
                  ? `You grade yourself about ${gap.gap.toFixed(1)} of a grade above what you actually
                     typed, across ${gap.n} measured attempts. Intervals are running longer than the
                     recall behind them.`
                  : gap.gap <= -0.5
                  ? `You grade yourself harder than the words you produced, across ${gap.n} measured
                     attempts. Nothing is broken — you may just be scoring on meaning rather than
                     wording.`
                  : `Your grades match what you actually produced, across ${gap.n} measured attempts.`}
              </p>
            </section>
          )}

          {/* Retention per layer, not counts per layer. */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[10px] font-bold text-accent tracking-[0.2em] uppercase">By layer</h2>
            <div className="flex flex-col divide-y divide-card-border border-y border-card-border">
              {byLayer.map(l => (
                <div key={l.kind} className="flex items-baseline justify-between py-2.5">
                  <span className="text-sm text-primary font-medium">{l.label}</span>
                  <span className="flex items-baseline gap-3">
                    <span className="text-sm font-bold text-primary tabular-nums">{pct(l.rate)}</span>
                    <span className="text-xs text-muted tabular-nums w-16 text-right">{l.attempts} reviews</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* The Cold Check — the one number here that is not measured on the scheduler's
          own terms. Everything above asks items when they are due, so a healthy rate
          partly reports that the scheduler chose good moments; this asks things the
          schedule is not asking for and records the answer without acting on it. */}
      <section className="flex flex-col gap-3 border border-card-border rounded-md p-4">
        <h2 className="text-[10px] font-bold text-accent tracking-[0.2em] uppercase">Cold check</h2>
        {coldAvailable > 0 ? (
          <>
            <p className="text-sm text-secondary leading-relaxed">
              {coldAvailable} {coldAvailable === 1 ? 'item has' : 'items have'} gone {COLD_DAYS}+ days
              without a successful recall. A check asks {COLD_CHECK_SIZE} of them and changes nothing —
              no grades, no schedule.
            </p>
            <button
              onClick={() => setChecking(true)}
              className="self-start px-4 py-2 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
            >
              Run a cold check
            </button>
          </>
        ) : (
          <p className="text-sm text-secondary leading-relaxed">
            Nothing has been away long enough yet. This becomes available once something you
            once knew has had {COLD_DAYS} days to fade — the waiting is what makes it mean anything.
          </p>
        )}
        {lastCold && (
          <p className="text-xs text-muted tabular-nums">
            Last check: {lastCold.correct} of {lastCold.total}, after a median{' '}
            {lastCold.medianColdFor} days away · {new Date(lastCold.ts).toLocaleDateString()}
          </p>
        )}
      </section>

      {/* Adherence — the guardrail on everything else. */}
      {a.started > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[10px] font-bold text-accent tracking-[0.2em] uppercase">Are you finishing?</h2>
          <div className="flex flex-col divide-y divide-card-border border-y border-card-border">
            <div className="flex items-baseline justify-between py-2.5">
              <span className="text-sm text-primary font-medium">Sessions finished</span>
              <span className="text-sm font-bold text-primary tabular-nums">
                {completionRate === null ? '—' : `${Math.round(completionRate * 100)}%`}
                <span className="text-xs text-muted font-normal"> of {a.started}</span>
              </span>
            </div>
            {meanMinutes !== null && (
              <div className="flex items-baseline justify-between py-2.5">
                <span className="text-sm text-primary font-medium">Typical session</span>
                <span className="text-sm font-bold text-primary tabular-nums">{meanMinutes} min</span>
              </div>
            )}
            {meanAbandonAt !== null && (
              <div className="flex items-baseline justify-between py-2.5">
                <span className="text-sm text-primary font-medium">When you stop early</span>
                <span className="text-sm font-bold text-primary tabular-nums">item {meanAbandonAt}</span>
              </div>
            )}
          </div>
          {completionRate !== null && completionRate < 0.6 && (
            <p className="text-sm text-orange-400 leading-relaxed">
              More than a third of sessions go unfinished. If that started recently, the day's
              work has probably become too long or too hard — shorten it before trusting any
              retention number above.
            </p>
          )}
        </section>
      )}

      {checking && <ColdCheck onClose={() => setChecking(false)} />}

      {/* The leech list — the only place the app suggests changing the material rather
          than reviewing it harder. Omitted entirely when empty: an absent problem should
          be absent, not shown as a hopeful empty state. */}
      {worst.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[10px] font-bold text-accent tracking-[0.2em] uppercase">Costing you the most</h2>
          <ul className="flex flex-col divide-y divide-card-border border-y border-card-border">
            {worst.map(l => (
              <li key={l.key} className="flex items-baseline justify-between py-2.5 gap-3">
                <span className="text-sm text-primary truncate">{l.label}</span>
                <span className="text-xs text-muted tabular-nums whitespace-nowrap">
                  {l.lapses} lapses · {l.attempts} reviews
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-secondary leading-relaxed">
            These keep slipping. Reword the hook, split the passage, or set it aside —
            more repetitions is the one thing that reliably won't help.
          </p>
        </section>
      )}

      <p className="text-sm text-muted">
        Reviewed on <span className="font-semibold text-secondary tabular-nums">{active}</span> of the last 45 days.
      </p>
    </div>
  );
};

/** The chart in words. A graph nobody can interpret is decoration. */
function curveRead(curve: ReturnType<typeof retentionByInterval>): string {
  const known = curve.filter(b => b.rate !== null);
  if (known.length < 2) return 'Not enough reviews at long intervals yet to draw a curve.';
  const longest = known[known.length - 1];
  if ((longest.rate ?? 1) < 0.7) {
    return `Below target at ${longest.label}. Intervals are running longer than your recall — consider grading harder, or reviewing sooner.`;
  }
  if ((longest.rate ?? 0) >= 0.9) {
    return `Holding well out to ${longest.label}. There may be room to let intervals run longer.`;
  }
  return `Roughly on target out to ${longest.label}.`;
}
