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
  blocks?: { label: string; chapters: string }[];
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

/** One narrative block's anchor chain, due for another pass. Sequence has its own
 * schedule because it is its own skill — knowing every word of PRIMEVAL individually
 * is not the same as being able to run the chain. */
export interface ChainItem { kind: 'chain'; id: string; bookId: string; bookName: string; blockIndex: number; label: string; anchors: { ch: number; word: string }[] }

export type SessionItem = VerseItem | AnchorItem | IntroduceItem | ThemeItem | ChainItem;

export interface SessionPlan {
  items: SessionItem[];
  /** Everything that was due but did not fit the cap — surfaced as "keep going". */
  heldBack: number;
  /** New chapters that were offered but did not fit their reserved share. Reported
   * separately from `heldBack` so the session can say the specific true thing rather
   * than folding new material into one undifferentiated count. */
  newHeldBack: number;
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

  // Chapters a chain pass exposed as shaky, promoted to the front of the anchor queue.
  //
  // chainHits/chainMisses were introduced when the Memory Sentence stopped bulk-grading
  // chapters, precisely so a word that had to be revealed mid-chain could *nominate*
  // that chapter for real isolated recall rather than pretend to have tested it. Until
  // now nothing read them, so the signal was collected and dropped.
  //
  // A miss inside the chain is strong evidence: the chain is the *easy* version of the
  // task, with neighbours adjacent and the sequence carrying you. Failing there means
  // the cold question will almost certainly fail too. Only recent misses count — an old
  // one has usually been answered by the ordinary schedule since.
  const NOMINATION_WINDOW_MS = 14 * 86400000;
  const nominated = new Set(
    Object.values(state.chapterProgress)
      .filter(p =>
        (p.chainMisses || 0) > 0 &&
        p.lastChainDate &&
        now.getTime() - new Date(p.lastChainDate).getTime() < NOMINATION_WINDOW_MS)
      .map(p => chapterProgressKey(p.bookId, p.chapter))
  );

  // Due chapters, plus nominated ones that aren't due yet. A chapter nominated by a
  // chain miss is pulled forward rather than left sitting on a schedule that was set
  // before the evidence arrived.
  const anchorCandidates: { bookId: string; chapter: number }[] = [];
  const seenAnchors = new Set<string>();
  const addAnchor = (bookId: string, chapter: number) => {
    const key = chapterProgressKey(bookId, chapter);
    if (seenAnchors.has(key)) return;
    seenAnchors.add(key);
    anchorCandidates.push({ bookId, chapter });
  };

  for (const p of Object.values(state.chapterProgress)) {
    if (nominated.has(chapterProgressKey(p.bookId, p.chapter))) addAnchor(p.bookId, p.chapter);
  }
  for (const d of dueChapters(state.chapterProgress, now)) addAnchor(d.bookId, d.chapter);

  const anchorItems: AnchorItem[] = anchorCandidates
    .map(({ bookId: bId, chapter }) => {
      const anchor = anchorsOf(bId).find(a => a.ch === chapter);
      const book = bookFor(bId);
      if (!anchor || !book) return null;
      return {
        kind: 'anchor' as const,
        id: `anchor:${bId}:${chapter}`,
        bookId: bId, bookName: book.name, chapter,
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

  const chainItems: ChainItem[] = Object.values(state.blockProgress || {})
    .filter(b => b.attempts > 0 && isDue(b.sm2, now))
    .sort((a, b) => new Date(a.sm2.nextDueDate).getTime() - new Date(b.sm2.nextDueDate).getTime())
    .map(b => {
      const book = bookFor(b.bookId);
      const block = guideFor(b.bookId)?.blocks?.[b.blockIndex];
      if (!book || !block) return null;
      const [start, end] = String(block.chapters).split(/[-–]/).map(Number);
      const anchors = anchorsOf(b.bookId)
        .filter(a => a.ch >= start && a.ch <= (end || start))
        .map(a => ({ ch: a.ch, word: a.word }));
      if (anchors.length < 2) return null;
      return {
        kind: 'chain' as const,
        id: `chain:${b.bookId}:${b.blockIndex}`,
        bookId: b.bookId, bookName: book.name,
        blockIndex: b.blockIndex, label: b.label, anchors,
      };
    })
    .filter((x): x is ChainItem => !!x);

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

  // New material gets a reserved share of the session, taken before reviews are trimmed.
  //
  // Reviews used to fill the cap first, with new pairs admitted only from whatever was
  // left over. That sounds conservative and is: past about nineteen due items the
  // leftover is always zero, so a reader with any real backlog is quietly served nothing
  // new — indefinitely, and with nothing on screen saying so. They believe they are
  // working through Genesis; they are not. A queue that can never reach the end of a
  // book is not a schedule, and a stall the reader cannot see is the failure most likely
  // to end the habit altogether.
  //
  // So the daily chapter target is treated as a commitment rather than a leftover, held
  // to a third of the session so that it can never swallow the day's reviews either. The
  // floor of one pair means even a very small cap still teaches something.
  const RESERVE_FRACTION = 0.3;
  const maxNewSlots = Math.max(2, Math.floor(options.cap * RESERVE_FRACTION));

  const admittedPairs: SessionItem[][] = [];
  let newSlots = 0;
  for (const pair of newPairs) {
    // Whole or not at all: a cap that cut between an Introduce and its retrieval would
    // leave a chapter taught and never tested, the one shape this session exists to avoid.
    if (newSlots + pair.length > maxNewSlots) break;
    admittedPairs.push(pair);
    newSlots += pair.length;
  }

  const review = interleave([...verseItems, ...anchorItems, ...themeItems, ...chainItems], shuffle);
  const admittedReview = review.slice(0, Math.max(0, options.cap - newSlots));

  // Placement: a short warm-up of familiar items, then the new material, then the rest.
  // Appending new pairs to the very end would reproduce the same bug in a milder form —
  // an abandoned session still never reaches them — and meeting an unfamiliar chapter as
  // the very first thing of the day is its own kind of discouraging.
  const WARM_UP = 3;
  const items: SessionItem[] = [
    ...admittedReview.slice(0, WARM_UP),
    ...admittedPairs.flat(),
    ...admittedReview.slice(WARM_UP),
  ];

  const newOffered = newPairs.flat().length;
  return {
    items,
    heldBack: Math.max(0, review.length + newOffered - items.length),
    newHeldBack: Math.max(0, newOffered - newSlots),
  };
}
