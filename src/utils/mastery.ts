import { useMemo } from 'react';
import type { ChapterProgress } from '../types/models';
import { chapterProgressKey } from '../types/models';
import { useApp } from '../context/AppContext';

/**
 * The one scale every mastery visual in the app reads from — the shape meter, the
 * book card's progress rule, the distribution bar fill, the index dots. Matches the
 * ratio Dashboard.tsx already uses for verse mastery (repetition / 6), rather than
 * inventing a second scale that could disagree with it.
 *
 *   untouched — no record at all
 *   seen      — attempted at least once, not yet graded well (repetition 0)
 *   learning  — 1–5 successful recalls
 *   secure    — 6+ successful recalls (mirrors the verse "Memorized" threshold)
 */
export type MasteryLevel = 'untouched' | 'seen' | 'learning' | 'secure';

export function masteryOf(progress: ChapterProgress | undefined): MasteryLevel {
  // `attempts <= 0`, not merely "no record": MARK_CHAPTER_READ creates a record with
  // repetition 0 the moment a chapter is scrolled to its end, which used to fall
  // through to 'seen' below and tint the shape meter. Reading a chapter is not
  // evidence of recalling it, and this is the line that decides which of the two the
  // rest of the app believes.
  if (!progress || progress.attempts <= 0) return 'untouched';
  if (progress.sm2.repetition <= 0) return 'seen';
  if (progress.sm2.repetition >= 6) return 'secure';
  return 'learning';
}

export interface BookMasteryCounts {
  total: number;
  untouched: number;
  seen: number;
  learning: number;
  secure: number;
  dueCount: number;
  /** 0–1, secure chapters over total. What the progress rule / ring fills to. */
  securePct: number;
}

export function bookMastery(
  chapterProgress: Record<string, ChapterProgress>,
  bookId: string,
  chapterCount: number,
  now: Date = new Date()
): BookMasteryCounts {
  let untouched = 0, seen = 0, learning = 0, secure = 0, dueCount = 0;

  for (let ch = 1; ch <= chapterCount; ch++) {
    const progress = chapterProgress[chapterProgressKey(bookId, ch)];
    const level = masteryOf(progress);
    if (level === 'untouched') untouched++;
    else if (level === 'seen') seen++;
    else if (level === 'learning') learning++;
    else secure++;

    if (progress && new Date(progress.sm2.nextDueDate) <= now) dueCount++;
  }

  return {
    total: chapterCount,
    untouched,
    seen,
    learning,
    secure,
    dueCount,
    securePct: chapterCount > 0 ? secure / chapterCount : 0,
  };
}

export interface DueChapter {
  bookId: string;
  chapter: number;
  progress: ChapterProgress;
}

/** Every graded chapter whose SM2 schedule has come due, most-overdue first. */
export function dueChapters(chapterProgress: Record<string, ChapterProgress>, now: Date = new Date()): DueChapter[] {
  return Object.values(chapterProgress)
    .filter(p => p.attempts > 0 && new Date(p.sm2.nextDueDate) <= now)
    .sort((a, b) => new Date(a.sm2.nextDueDate).getTime() - new Date(b.sm2.nextDueDate).getTime())
    .map(p => ({ bookId: p.bookId, chapter: p.chapter, progress: p }));
}

/**
 * Per-book mastery rollups for every book, memoized against chapterProgress so a
 * 66-cell shape meter or a grid of book cards doesn't recompute a rollup per card
 * per render — Psalms alone would otherwise re-walk 150 chapters on every keystroke
 * in an unrelated search box.
 */
export function useMastery(books: { id: string; chapters: number }[]): Record<string, BookMasteryCounts> {
  const { state } = useApp();
  return useMemo(() => {
    const now = new Date();
    const result: Record<string, BookMasteryCounts> = {};
    for (const book of books) {
      result[book.id] = bookMastery(state.chapterProgress, book.id, book.chapters, now);
    }
    return result;
  }, [state.chapterProgress, books]);
}
