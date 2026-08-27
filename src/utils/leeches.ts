import type { AppState, SM2Data } from '../types/models';
import { OT_BOOKS } from '../data/otBooks';
import { NT_BOOKS } from '../data/ntBooks';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
const bookName = (id: string) => ALL_BOOKS.find(b => b.id === id)?.name || id;

/**
 * The items costing the most and returning the least.
 *
 * `lapses` has been computed by the scheduler since it was written, and its own comment
 * says what it is for: "the signal that an item is a leech, i.e. one that keeps being
 * forgotten and probably needs rewording or breaking up rather than more repetitions".
 * Nothing in the app has ever read it. This does.
 *
 * The distinction matters because SM-2 has exactly one response to failure — show it
 * again, sooner — and for a genuine leech that response is wrong. An anchor the reader
 * keeps missing usually needs a different hook; a passage they keep losing usually needs
 * splitting. Neither is a scheduling problem, and no amount of scheduling fixes them.
 */
export interface Leech {
  key: string;
  kind: 'verse' | 'anchor' | 'theme' | 'chain';
  label: string;
  lapses: number;
  /** Total graded attempts, so "8 lapses in 9 reviews" reads differently from "8 in 40". */
  attempts: number;
  interval: number;
}

const lapsesOf = (sm2: SM2Data | undefined) => sm2?.lapses || 0;

/** Below this an item is having a bad week, not being a leech. */
const LEECH_THRESHOLD = 3;

export function leeches(state: AppState, threshold = LEECH_THRESHOLD): Leech[] {
  const out: Leech[] = [];

  for (const v of state.verses || []) {
    const n = lapsesOf(v.sm2);
    if (n >= threshold) {
      out.push({ key: `verse:${v.id}`, kind: 'verse', label: v.ref, lapses: n,
        attempts: v.attempts || 0, interval: v.sm2?.interval || 0 });
    }
  }

  for (const p of Object.values(state.chapterProgress || {})) {
    const n = lapsesOf(p.sm2);
    if (n >= threshold) {
      out.push({ key: `anchor:${p.bookId}:${p.chapter}`, kind: 'anchor',
        label: `${bookName(p.bookId)} ${p.chapter}`, lapses: n,
        attempts: p.attempts || 0, interval: p.sm2?.interval || 0 });
    }
  }

  for (const p of Object.values(state.themeProgress || {})) {
    const n = lapsesOf(p.sm2);
    if (n >= threshold) {
      out.push({ key: `theme:${p.bookId}`, kind: 'theme', label: `${bookName(p.bookId)} — theme`,
        lapses: n, attempts: p.attempts || 0, interval: p.sm2?.interval || 0 });
    }
  }

  for (const b of Object.values(state.blockProgress || {})) {
    const n = lapsesOf(b.sm2);
    if (n >= threshold) {
      out.push({ key: `chain:${b.bookId}:${b.blockIndex}`, kind: 'chain',
        label: `${bookName(b.bookId)} · ${b.label}`, lapses: n,
        attempts: b.attempts || 0, interval: b.sm2?.interval || 0 });
    }
  }

  // Worst first, and among equals the one that has cost the most attempts to get nowhere.
  return out.sort((a, b) => b.lapses - a.lapses || b.attempts - a.attempts);
}

/**
 * How many of the last N calendar days had at least one graded review.
 *
 * The streak answers a harsher question — "how many in an unbroken run" — and resets to
 * one on a single missed day, which in a devotional habit is the moment people stop.
 * This is the same information without the cliff: 43 of the last 45 days is an honest
 * and considerably kinder description of the same fortnight.
 */
export function activeDays(state: AppState, windowDays = 45, now: Date = new Date()): number {
  const cutoff = now.getTime() - windowDays * 86400000;
  const days = new Set<string>();
  for (const e of state.reviewLog || []) {
    const t = new Date(e.ts).getTime();
    if (t >= cutoff) days.add(new Date(e.ts).toDateString());
  }
  return days.size;
}
