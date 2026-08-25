import { useEffect, useState } from 'react';

/**
 * The current time, as a value React can actually depend on.
 *
 * Every "is this due?" question in the app was answered by calling `new Date()` inside
 * a `useMemo` keyed only on the data. Two things follow from that, both bad. Due-ness
 * is frozen at whatever the clock said on the last render — open the app at 11pm, leave
 * it open, and at 7am it still believes it is yesterday, with the day's work invisible
 * until some unrelated re-render happens to shake it loose. And a memo body that reads
 * the wall clock is impure: its result depends on something not in its dependency list,
 * which is precisely the bug.
 *
 * Returning the time as state fixes both. The memo becomes a pure function of its
 * inputs, and it recomputes when those inputs change — including this one.
 *
 * Refreshed on an interval and, more usefully, whenever the tab comes back to the
 * foreground, which is what actually happens when someone picks their phone up the next
 * morning. A minute of staleness is irrelevant to schedules measured in days.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Only replaces the value when the minute actually changed, so this doesn't
    // re-render every tick for nothing.
    const tick = () => {
      setNow(prev => {
        const next = new Date();
        return Math.floor(prev.getTime() / intervalMs) === Math.floor(next.getTime() / intervalMs)
          ? prev
          : next;
      });
    };

    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs]);

  return now;
}
