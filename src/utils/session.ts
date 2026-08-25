import type { AppState, Verse, ChapterProgress } from '../types/models';
import { chapterProgressKey } from '../types/models';
import { isDue } from './sm2';
import { dueChapters } from './mastery';
import { OT_BOOKS } from '../data/otBooks';
import { NT_BOOKS } from '../data/ntBooks';
import { OT_STUDY_GUIDES } from '../data/otGuides';
import { NT_STUDY_GUIDES } from '../data/guides';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
/** The shape this module actually needs from a guide. The guide files carry more than
 * StudyGuide declares (blocks, architecture, structureFormula) and the two testaments
 * are typed differently, so this narrows to the fields used here rather than widening
 * everything to `any` the way the older drill screens do. */
interface GuideLike {
  id: string;
  anchors?: { ch: number | string; word: string; scene: string }[];
  architecture?: { unit?: string }[];
}

const ALL_GUIDES = [...OT_STUDY_GUIDES, ...NT_STUDY_GUIDES] as unknown as GuideLike[];

/**
 * A day's work, as one bounded list.
 *
 * Before this, no queue in the app ever ended: the drill wrapped to index 0 forever,
 * and the verse session's "due" list only shrank if you happened to grade something
 * out of it. A bounded session with a visible end is the main adherence mechanism in
 * every spaced system that works — it is the thing that gives a reason to come back
 * tomorrow rather than to keep going until bored.
 *
 * Three item kinds share the list, deliberately interleaved. Anchors used to be
 * drilled strictly in canonical order, which lets ordinal position act as a covert
 * cue ("this is the one after 26, so it's 27") that vanishes the moment the chapter
 * is asked about on its own.
 */

export interface VerseItem { kind: 'verse'; id: string; verse: Verse }
export interface AnchorItem { kind: 'anchor'; id: string; bookId: string; bookName: string; chapter: number; word: string; scene: string }
/** Encoding, not testing. Shown once for a chapter with no attempts, and always
 * immediately followed by that same chapter's first cold retrieval. */
export interface IntroduceItem { kind: 'introduce'; id: string; bookId: string; bookName: string; chapter: number; word: string; scene: string; prevWord: string | null }

/** A book's theme word, reviewed on the same loop. Only ever a *review* here: new
 * themes are met in the Theme deck, the way new verses are met by adding them. */
export interface ThemeItem { kind: 'theme'; id: string; bookId: string; bookName: string; themeWord: string; keyWord: string; subtitle: string }

export type SessionItem = VerseItem | AnchorItem | IntroduceItem | ThemeItem;

export interface SessionPlan {
  items: SessionItem[];
  /** Everything that was due but did not fit the cap — surfaced as "keep going". */
  heldBack: number;
}

export interface SessionOptions {
  /** Chapters to introduce fresh this session. Reuses settings.dailyChapterTarget. */
  newChapters: number;
  /** Ceiling on the whole list, so a large backlog can't produce an endless session. */
  cap: number;
  /** Injectable for tests and for a stable order in a single render. */
  now?: Date;
  shuffle?: <T>(xs: T[]) => T[];
}

const guideFor = (bookId: string) => ALL_GUIDES.find(g => g.id === bookId);
const bookFor = (bookId: string) => ALL_BOOKS.find(b => b.id === bookId);

/** Single-chapter books (Obadiah, Philemon, Jude, 2–3 John) express their anchors as
 * verse ranges rather than chapters, so there is nothing to drill by chapter number. */
const isVerseBased = (guide: GuideLike | undefined) =>
  !!guide?.architecture?.some(b => b.unit === 'verse');

function anchorsOf(bookId: string): { ch: number; word: string; scene: string }[] {
  const guide = guideFor(bookId);
  if (!guide?.anchors?.length || isVerseBased(guide)) return [];
  return guide.anchors
    .map(a => ({ ch: Number(a.ch), word: a.word, scene: a.scene }))
    .filter(a => Number.isFinite(a.ch));
}

/**
 * The book the reader is currently working through: most recently touched, and not
 * yet finished. Without this the app can only ever review what you already started —
 * there is no path that teaches a book's anchors from scratch, which is exactly the
 * gap that leaves a library of 66 authored books sitting at zero.
 */
export function currentBookId(chapterProgress: Record<string, ChapterProgress>): string | null {
  let best: { bookId: string; when: number } | null = null;

  for (const p of Object.values(chapterProgress)) {
    const stamp = Math.max(
      p.lastAttemptDate ? new Date(p.lastAttemptDate).getTime() : 0,
      p.lastReadDate ? new Date(p.lastReadDate).getTime() : 0,
    );
    if (!stamp) continue;
    if (!best || stamp > best.when) best = { bookId: p.bookId, when: stamp };
  }

  if (!best) return null;
  // Finished books hand over to nothing — the reader picks what's next themselves
  // rather than being marched into Leviticus because it happened to be adjacent.
  const untouched = anchorsOf(best.bookId).some(
    a => !chapterProgress[chapterProgressKey(best!.bookId, a.ch)]?.attempts
  );
  return untouched ? best.bookId : null;
}

/**
 * Mixes the review items so one kind doesn't run in a block. Anchors used to be drilled
 * strictly in canonical order, which lets ordinal position stand in for the answer.
 */
function interleave(items: SessionItem[], shuffle: <T>(xs: T[]) => T[]): SessionItem[] {
  return shuffle(items);
}

const defaultShuffle = <T,>(xs: T[]): T[] => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export function buildSession(state: AppState, options: SessionOptions): SessionPlan {
  const now = options.now || new Date();
  const shuffle = options.shuffle || defaultShuffle;

  const verseItems: VerseItem[] = state.verses
    .filter(v => isDue(v.sm2, now))
    .map(v => ({ kind: 'verse', id: `verse:${v.id}`, verse: v }));

  const anchorItems: AnchorItem[] = dueChapters(state.chapterProgress, now)
    .map(d => {
      const anchor = anchorsOf(d.bookId).find(a => a.ch === d.chapter);
      const book = bookFor(d.bookId);
      if (!anchor || !book) return null;
      return {
        kind: 'anchor' as const,
        id: `anchor:${d.bookId}:${d.chapter}`,
        bookId: d.bookId, bookName: book.name, chapter: d.chapter,
        word: anchor.word, scene: anchor.scene,
      };
    })
    .filter((x): x is AnchorItem => !!x);

  const themeItems: ThemeItem[] = Object.values(state.themeProgress || {})
    .filter(p => p.attempts > 0 && isDue(p.sm2, now))
    .sort((a, b) => new Date(a.sm2.nextDueDate).getTime() - new Date(b.sm2.nextDueDate).getTime())
    .map(p => {
      const book = bookFor(p.bookId);
      if (!book) return null;
      return {
        kind: 'theme' as const,
        id: `theme:${p.bookId}`,
        bookId: p.bookId, bookName: book.name,
        themeWord: book.themeWord, keyWord: book.keyWord, subtitle: book.subtitle,
      };
    })
    .filter((x): x is ThemeItem => !!x);

  // New material: the next few untouched chapters of the book underway, each taught
  // and then immediately tested. Built as [introduce, anchor] pairs so the encoding
  // step and the retrieval it exists to set up can never be separated.
  const newPairs: SessionItem[][] = [];
  const bookId = currentBookId(state.chapterProgress);
  if (bookId && options.newChapters > 0) {
    const book = bookFor(bookId);
    const anchors = anchorsOf(bookId);
    if (book) {
      const fresh = anchors
        .filter(a => !state.chapterProgress[chapterProgressKey(bookId, a.ch)]?.attempts)
        .sort((a, b) => a.ch - b.ch)
        .slice(0, options.newChapters);

      for (const a of fresh) {
        const prev = anchors.find(x => x.ch === a.ch - 1);
        newPairs.push([
          {
            kind: 'introduce', id: `introduce:${bookId}:${a.ch}`,
            bookId, bookName: book.name, chapter: a.ch, word: a.word, scene: a.scene,
            prevWord: prev?.word ?? null,
          },
          {
            kind: 'anchor', id: `anchor:${bookId}:${a.ch}`,
            bookId, bookName: book.name, chapter: a.ch, word: a.word, scene: a.scene,
          },
        ]);
      }
    }
  }

  // Reviews come first when trimming: an overdue item has already lost more retention
  // than a new one has to lose, and new material not reached today is simply offered
  // again tomorrow. New pairs are then admitted whole or not at all — a cap that cut
  // between an Introduce and its retrieval would leave a chapter taught but never
  // tested, which is the one shape this session is built to avoid.
  const review = interleave([...verseItems, ...anchorItems, ...themeItems], shuffle);
  const items: SessionItem[] = review.slice(0, options.cap);

  for (const pair of newPairs) {
    if (items.length + pair.length > options.cap) break;
    items.push(...pair);
  }

  const totalOffered = review.length + newPairs.flat().length;
  return { items, heldBack: Math.max(0, totalOffered - items.length) };
}
