import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { evaluateSM2, formatInterval } from '../../utils/sm2';
import { buildReviewEvent } from '../../utils/reviewLog';
import { dueChapters } from '../../utils/mastery';
import { chapterProgressKey } from '../../types/models';
import type { ChapterProgress } from '../../types/models';
import { OT_BOOKS } from '../../data/otBooks';
import { NT_BOOKS } from '../../data/ntBooks';
import { OT_STUDY_GUIDES } from '../../data/otGuides';
import { NT_STUDY_GUIDES } from '../../data/guides';
import { CustomSelect } from '../ui/CustomSelect';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
const ALL_GUIDES = [...OT_STUDY_GUIDES, ...NT_STUDY_GUIDES];
const DEFAULT_SM2 = { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() };

type Direction = 'number-to-word' | 'word-to-number' | 'plate-to-word';

const DIRECTIONS: { id: Direction; label: string; prompt: string }[] = [
  { id: 'number-to-word', label: 'Number → Word', prompt: 'What anchors this chapter?' },
  { id: 'word-to-number', label: 'Word → Number', prompt: 'Which chapter is this?' },
  { id: 'plate-to-word', label: 'Plate → Word', prompt: 'What anchors this chapter?' },
];

const DIRECTION_TO_LOG: Record<Direction, 'n2w' | 'w2n' | 'p2w'> = {
  'number-to-word': 'n2w',
  'word-to-number': 'w2n',
  'plate-to-word': 'p2w',
};

interface QueueItem {
  bookId: string;
  bookName: string;
  chapter: number;
  word: string;
  scene: string;
}

// Practice's Verses/Chapters subject switch. This is the "Chapters" side: three
// self-graded drill directions run against the same anchor data the book guide's
// grid teaches, using the same SM2 loop and the same GRADE_CHAPTER_PROGRESS record
// every other recall surface writes to — a session started here shows up as
// progress on the book guide, the shape meter, and the next due queue alike.
export const AnchorDrill: React.FC<{
  onExit: () => void;
  /** A whole testament (or any book list) to sweep through in order, passed via
   * navigation state from the testament browser's "Test me on these N" button.
   * Takes priority over the due queue below it: choosing a sweep is a deliberate
   * request for that specific set, not a fallback for having nothing else to do. */
  sweepBookIds?: string[];
}> = ({ onExit, sweepBookIds }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();

  const [pickedBookId, setPickedBookId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>('number-to-word');
  const [revealed, setRevealed] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  // A deliberately requested testament (or other book list) sweep — every chapter
  // of every listed book, in canonical order. Skips verse-based single-chapter
  // books and any book with no anchors authored yet, same as the picker below.
  const sweepQueue: QueueItem[] = useMemo(() => {
    if (!sweepBookIds?.length) return [];
    return sweepBookIds.flatMap(bookId => {
      const guide: any = ALL_GUIDES.find(g => g.id === bookId);
      const book = ALL_BOOKS.find(b => b.id === bookId);
      if (!guide?.anchors?.length || !book) return [];
      const isVerseBased = !!guide.architecture?.some((b: any) => b.unit === 'verse');
      if (isVerseBased) return [];
      return guide.anchors.map((a: any) => ({ bookId: book.id, bookName: book.name, chapter: Number(a.ch), word: a.word, scene: a.scene }));
    });
  }, [sweepBookIds]);

  // Chapters already due, most-overdue first — the same review queue a verse
  // session opens to. Capped so a reader with a large, neglected library doesn't
  // get a queue that never ends.
  const dueQueue: QueueItem[] = useMemo(() => {
    return dueChapters(state.chapterProgress)
      .slice(0, 30)
      .map(d => {
        const guide: any = ALL_GUIDES.find(g => g.id === d.bookId);
        const anchor = guide?.anchors?.find((a: any) => Number(a.ch) === d.chapter);
        const book = ALL_BOOKS.find(b => b.id === d.bookId);
        return anchor && book
          ? { bookId: d.bookId, bookName: book.name, chapter: d.chapter, word: anchor.word, scene: anchor.scene }
          : null;
      })
      .filter((x): x is QueueItem => !!x);
  }, [state.chapterProgress]);

  // Nothing due — fall back to a book the reader picks, drilling its whole chain
  // in order. Single-chapter books (Obadiah, Philemon, Jude, 2–3 John) are excluded
  // from the picker below: their "anchors" are verse ranges, not chapters, so there
  // is nothing here to drill by chapter number.
  const pickedGuide: any = pickedBookId ? ALL_GUIDES.find(g => g.id === pickedBookId) : null;
  const pickedBookQueue: QueueItem[] = useMemo(() => {
    if (!pickedBookId || !pickedGuide?.anchors) return [];
    const book = ALL_BOOKS.find(b => b.id === pickedBookId);
    if (!book) return [];
    return pickedGuide.anchors.map((a: any) => ({
      bookId: book.id, bookName: book.name, chapter: Number(a.ch), word: a.word, scene: a.scene,
    }));
  }, [pickedBookId, pickedGuide]);

  // An explicitly picked book outranks the due queue.
  //
  // The order used to be sweep → due → picked, and the picker only rendered when the
  // resolved queue was empty — so as long as a single chapter anywhere was due, the
  // picker was unreachable and "I want to work on Exodus today" was not expressible.
  // Choosing a book is a deliberate request for that book, exactly as a sweep is.
  const resolvedQueue = sweepQueue.length > 0
    ? sweepQueue
    : pickedBookQueue.length > 0
      ? pickedBookQueue
      : dueQueue;

  // The work list is frozen once grading starts, rather than read live on every render.
  //
  // dueQueue is memoized on chapterProgress, and grading pushes nextDueDate into the
  // future — a minimum of +1 day even for a score of 1 — so the graded item dropped
  // straight out of the queue and every later item shifted left one place. handleGrade
  // then *also* advanced the index, and the two moves compounded: a ten-item queue
  // graded five and declared itself finished.
  //
  // The snapshot is taken inside handleGrade (below) at the moment it first matters,
  // not in an effect — before the first grade there is nothing to protect and a live
  // queue is the more truthful thing to show.
  const [sessionQueue, setSessionQueue] = useState<QueueItem[] | null>(null);
  const queue = sessionQueue ?? resolvedQueue;
  const current = queue[index];

  useEffect(() => { setRevealed(false); setIsGrading(false); }, [index, direction]);
  useEffect(() => { setIndex(0); }, [pickedBookId]);
  useEffect(() => { setImgErr(false); }, [current?.bookId, current?.chapter]);

  const bookOptions = useMemo(() => ALL_BOOKS
    .filter(b => {
      const guide: any = ALL_GUIDES.find(g => g.id === b.id);
      const isVerseBased = !!guide?.architecture?.some((blk: any) => blk.unit === 'verse');
      return guide?.anchors?.length && !isVerseBased;
    })
    .map(b => ({ value: b.id, label: b.name })), []);

  const existing = current ? state.chapterProgress[chapterProgressKey(current.bookId, current.chapter)] : undefined;

  const handleGrade = (score: number) => {
    if (!current) return;
    // Freeze the work list on the first grade of this session — see sessionQueue above.
    const workList = sessionQueue ?? queue;
    if (!sessionQueue) setSessionQueue(workList);
    const { newSM2, newStatus } = evaluateSM2(existing?.sm2 || DEFAULT_SM2, score, 'anchor', state.settings.intervalScale ?? 1);
    const updated: ChapterProgress = {
      bookId: current.bookId,
      chapter: current.chapter,
      sm2: newSM2,
      status: newStatus,
      attempts: (existing?.attempts || 0) + 1,
      lastScore: score,
      lastAttemptDate: new Date().toISOString(),
      readCount: existing?.readCount || 0,
      lastReadDate: existing?.lastReadDate || null,
    };
    dispatch({ type: 'GRADE_CHAPTER_PROGRESS', payload: updated });
    dispatch({
      type: 'RECORD_REVIEW',
      payload: buildReviewEvent({
        itemKind: 'anchor',
        itemId: chapterProgressKey(current.bookId, current.chapter),
        gradeSubmitted: score,
        before: existing?.sm2, after: newSM2,
        mode: 'reveal', cueLevel: 0,
        // Which way round the question was asked. Worth recording because the three
        // directions are not equally hard, and until now nothing distinguished a chapter
        // known cold from one only ever recognised off its plate.
        direction: DIRECTION_TO_LOG[direction],
      }),
    });
    if (state.settings.streakIncludesChapters !== false) {
      dispatch({ type: 'RECORD_ACTIVITY' });
    }
    showToast(`Score logged. Next review in ${formatInterval(newSM2.interval)}.`, 'success');
    if (index < workList.length - 1) {
      setIndex(i => i + 1);
    } else {
      // End of the list. Drop the snapshot so the next pass is rebuilt from whatever
      // is genuinely due now, rather than replaying the list this session started with.
      setIndex(0);
      setSessionQueue(null);
      if (dueQueue.length === 0) setPickedBookId(null);
    }
  };

  const directionMeta = DIRECTIONS.find(d => d.id === direction)!;
  const imgPath = current ? `/chapters/${current.bookId}/ch${current.chapter}.png` : '';

  // One plate, used as the prompt in plate-to-word and as part of the answer in the
  // other two. The 18 books with no art yet fall back to the large numeral, which
  // still reads as a plate-shaped thing rather than a broken image.
  const plateEl = (
    <div className="w-40 h-40 rounded-lg overflow-hidden bg-card-elevated border border-card-border flex items-center justify-center flex-shrink-0">
      {!imgErr ? (
        <img src={imgPath} alt="" onError={() => setImgErr(true)} className="w-full h-full object-cover" />
      ) : (
        <span className="text-5xl font-heading font-bold text-muted/25">{current?.chapter}</span>
      )}
    </div>
  );

  // Book picker — shown whenever there's nothing due and nothing picked yet.
  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 pt-20 gap-4">
        <h2 className="text-xl font-bold text-primary">
          {dueQueue.length === 0 && !pickedBookId ? 'No chapter anchors due' : "You're all caught up"}
        </h2>
        <p className="text-secondary max-w-sm">Pick a book to drill its whole chapter chain instead.</p>
        <div className="w-full max-w-xs">
          <CustomSelect
            value={pickedBookId || ''}
            onChange={(v) => { setPickedBookId(v); setSessionQueue(null); }}
            options={[{ value: '', label: 'Choose a book…' }, ...bookOptions]}
          />
        </div>
        <button onClick={onExit} className="text-sm font-medium text-muted hover:text-primary transition-colors mt-2">
          Back to Verses
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full w-full pb-6 lg:pb-8">
      {queue.length > 1 && (
        <div className="reading-progress" style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button onClick={onExit} className="p-2 -ml-2 rounded-full hover:bg-card-hover transition-colors" aria-label="Back to Verses">
          <ArrowLeft className="w-5 h-5 text-secondary" />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-heading font-bold text-lg text-primary">{current.bookName} {current.chapter}</span>
          <span className="text-[0.6875rem] text-muted uppercase tracking-widest">
            {sweepQueue.length > 0 ? 'Sweep' : pickedBookQueue.length > 0 ? 'Chosen book' : 'Due for review'} &middot; {index + 1} of {queue.length}
          </span>
        </div>
        <div className="w-9" />
      </div>

      {/* Book picker, always present — not only in the empty state it used to hide in.
          Clearing it hands the session back to whatever is due. */}
      <div className="px-5 pb-3 flex items-center gap-2 max-w-md mx-auto w-full">
        <CustomSelect
          value={pickedBookId || ''}
          onChange={(v) => { setPickedBookId(v); setSessionQueue(null); setIndex(0); }}
          options={[{ value: '', label: 'Whatever is due' }, ...bookOptions]}
        />
      </div>

      {/* Direction switcher */}
      <div className="flex justify-center gap-2 px-5 pb-4 flex-wrap">
        {DIRECTIONS.map(d => (
          <button
            key={d.id}
            onClick={() => setDirection(d.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-colors ${
              direction === d.id ? 'bg-accent text-white' : 'text-muted hover:text-primary border border-card-border'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Prompt card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <p className="text-xs font-sans text-muted italic">{directionMeta.prompt}</p>

        {direction === 'plate-to-word' && plateEl}

        {direction === 'number-to-word' && (
          <span className="text-6xl font-heading font-bold text-accent">{current.chapter}</span>
        )}

        {direction === 'word-to-number' && (
          <span className="text-3xl font-heading font-bold text-accent text-center">{current.word}</span>
        )}

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="px-6 py-3 rounded-md border border-dashed border-card-border-hover text-sm font-semibold text-secondary hover:text-primary hover:border-accent/40 transition-colors"
          >
            Tap to reveal
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            {/* The answer arrives with its picture, in every direction — not only in
                plate-to-word, where the image was the prompt. Pairing the word with an
                image is the strongest lever available for learning an arbitrary
                number↔word association, and 48 books of purpose-drawn chapter art were
                being withheld from the two directions people actually drill. */}
            {direction !== 'plate-to-word' && plateEl}
            {direction === 'word-to-number' ? (
              <span className="text-4xl font-heading font-bold text-primary">Chapter {current.chapter}</span>
            ) : (
              <span className="text-2xl font-heading font-bold text-primary">{current.word}</span>
            )}
            <span className="text-sm text-muted italic">{current.scene}</span>
          </div>
        )}
      </div>

      {/* Grading */}
      <div className="px-5 pb-4">
        {!revealed ? null : !isGrading ? (
          <button
            onClick={() => setIsGrading(true)}
            className="w-full max-w-md mx-auto flex items-center justify-center gap-2 py-3 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
          >
            <Check className="w-4 h-4" /> Score My Recall
          </button>
        ) : (
          <div className="max-w-md w-full mx-auto bg-card-elevated border border-card-border rounded-lg p-4 flex flex-col gap-3 animate-[fadeScaleIn_0.2s_ease-out]">
            <p className="text-center text-sm font-semibold text-primary">How well did you know it?</p>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => handleGrade(1)} className="py-2.5 flex flex-col items-center justify-center rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/20 active:scale-95">
                <span className="text-xs font-bold">Blank</span>
              </button>
              <button onClick={() => handleGrade(3)} className="py-2.5 flex flex-col items-center justify-center rounded-md bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors border border-orange-500/20 active:scale-95">
                <span className="text-xs font-bold">Hard</span>
              </button>
              <button onClick={() => handleGrade(4)} className="py-2.5 flex flex-col items-center justify-center rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors border border-blue-500/20 active:scale-95">
                <span className="text-xs font-bold">Good</span>
              </button>
              <button onClick={() => handleGrade(5)} className="py-2.5 flex flex-col items-center justify-center rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors border border-green-500/20 active:scale-95">
                <span className="text-xs font-bold">Easy</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual skip — matches the verse session's Prev/Next, minus Prev: this
          queue is a work list, not a browsable sequence. */}
      {!isGrading && (
        <div className="flex justify-center pb-2">
          <button
            onClick={() => { if (index < queue.length - 1) setIndex(i => i + 1); else setIndex(0); }}
            className="flex items-center gap-1 text-xs font-medium text-muted hover:text-primary transition-colors px-3 py-2"
          >
            Skip <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
