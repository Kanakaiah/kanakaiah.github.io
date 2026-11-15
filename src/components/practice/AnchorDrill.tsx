import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { evaluateSM2, formatInterval } from '../../utils/sm2';
import { buildReviewEvent } from '../../utils/reviewLog';
import { dueChapters } from '../../utils/mastery';
import {
  judgeByDirection,
  type AnchorDirection,
  type AnchorJudgement,
} from '../../utils/anchorAnswer';
import { getBookName } from '../../utils/localization';
import { chapterProgressKey, type ChapterProgress } from '../../types/models';
import { OT_BOOKS } from '../../data/otBooks';
import { NT_BOOKS } from '../../data/ntBooks';
import { OT_STUDY_GUIDES } from '../../data/otGuides';
import { NT_STUDY_GUIDES } from '../../data/guides';
import { hasChapterArt } from '../../data/chapterArt';
import { PracticeHeader, ReviewGrades } from './PracticeFeedback';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_GUIDES: any[] = [...OT_STUDY_GUIDES, ...NT_STUDY_GUIDES];
const DEFAULT_SM2 = {
  interval: 0,
  repetition: 0,
  efactor: 2.5,
  nextDueDate: new Date().toISOString(),
};

type Direction = 'number-to-word' | 'word-to-number' | 'plate-to-word';

const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: 'number-to-word', label: 'Number → Word' },
  { id: 'word-to-number', label: 'Word → Number' },
  { id: 'plate-to-word', label: 'Plate → Word' },
];

const DIRECTION_TO_LOG: Record<Direction, AnchorDirection> = {
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
  siblings: { ch: number; word: string }[];
}

function buildBookQueue(bookId: string, bibleVersion: string): QueueItem[] {
  const guide = ALL_GUIDES.find(g => g.id === bookId);
  const book = ALL_BOOKS.find(b => b.id === bookId);
  if (!guide?.anchors?.length || !book) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isVerseBased = Boolean(guide.architecture?.some((b: any) => b.unit === 'verse'));
  if (isVerseBased) return [];
  const bookName = getBookName(book.id, book.name, bibleVersion);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const siblings = guide.anchors.map((a: any) => ({ ch: Number(a.ch), word: a.word }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return guide.anchors.map((a: any) => ({
    bookId: book.id,
    bookName,
    chapter: Number(a.ch),
    word: a.word,
    scene: a.scene,
    siblings,
  }));
}

export const AnchorDrill: React.FC<{
  onExit: () => void;
  sweepBookIds?: string[];
}> = ({ onExit, sweepBookIds }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();

  const [pickedBookId, setPickedBookId] = useState<string | null>(() =>
    sweepBookIds?.length === 1 ? sweepBookIds[0] : null
  );
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>('number-to-word');
  const [typedInput, setTypedInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [judgement, setJudgement] = useState<AnchorJudgement | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const [bookMenuOpen, setBookMenuOpen] = useState(false);
  const [directionMenuOpen, setDirectionMenuOpen] = useState(false);

  const sweepQueue: QueueItem[] = useMemo(() => {
    if (!sweepBookIds?.length) return [];
    const version = state.settings.bibleVersion || 'LSB';
    return sweepBookIds.flatMap(bookId =>
      buildBookQueue(bookId, version)
    );
  }, [sweepBookIds, state.settings.bibleVersion]);

  const dueQueue: QueueItem[] = useMemo(() => {
    return dueChapters(state.chapterProgress)
      .slice(0, 30)
      .map(d => {
        const guide = ALL_GUIDES.find(g => g.id === d.bookId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anchor = guide?.anchors?.find((a: any) => Number(a.ch) === d.chapter);
        const book = ALL_BOOKS.find(b => b.id === d.bookId);
        if (!anchor || !book) return null;
        return {
          bookId: d.bookId,
          bookName: getBookName(book.id, book.name, state.settings.bibleVersion),
          chapter: d.chapter,
          word: anchor.word,
          scene: anchor.scene,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          siblings: guide.anchors.map((a: any) => ({ ch: Number(a.ch), word: a.word })),
        };
      })
      .filter((x): x is QueueItem => Boolean(x));
  }, [state.chapterProgress, state.settings.bibleVersion]);

  const pickedBookQueue: QueueItem[] = useMemo(() => {
    if (!pickedBookId) return [];
    return buildBookQueue(pickedBookId, state.settings.bibleVersion || 'LSB');
  }, [pickedBookId, state.settings.bibleVersion]);

  const resolvedQueue =
    pickedBookQueue.length > 0
      ? pickedBookQueue
      : sweepQueue.length > 0
      ? sweepQueue
      : dueQueue;

  const [sessionQueue, setSessionQueue] = useState<QueueItem[] | null>(null);
  const queue = sessionQueue ?? resolvedQueue;
  const current = queue[index];

  useEffect(() => {
    setTypedInput('');
    setRevealed(false);
    setJudgement(null);
    setImgErr(false);
  }, [index, direction, current?.bookId, current?.chapter]);

  const bookOptions = useMemo(
    () =>
      ALL_BOOKS.filter(b => {
        const guide = ALL_GUIDES.find(g => g.id === b.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isVerseBased = Boolean(guide?.architecture?.some((blk: any) => blk.unit === 'verse'));
        return Boolean(guide?.anchors?.length && !isVerseBased);
      }).map(b => ({
        id: b.id,
        label: getBookName(b.id, b.name, state.settings.bibleVersion),
      })),
    [state.settings.bibleVersion]
  );

  const plateAvailable = Boolean(
    current && hasChapterArt(current.bookId, current.chapter)
  );
  const effectiveDirection: Direction =
    direction === 'plate-to-word' && !plateAvailable ? 'number-to-word' : direction;

  const handleCheckAnswer = () => {
    if (!current || !typedInput.trim()) return;
    const res = judgeByDirection(typedInput, {
      direction: DIRECTION_TO_LOG[effectiveDirection],
      word: current.word,
      chapter: current.chapter,
      siblings: current.siblings,
    });
    setJudgement(res);
    setRevealed(true);
  };

  const handleReveal = () => {
    setJudgement(null);
    setRevealed(true);
  };

  const handleGrade = (score: number) => {
    if (!current) return;
    const workList = sessionQueue ?? queue;
    if (!sessionQueue) setSessionQueue(workList);

    const key = chapterProgressKey(current.bookId, current.chapter);
    const existing = state.chapterProgress[key];
    const { newSM2, newStatus } = evaluateSM2(
      existing?.sm2 || DEFAULT_SM2,
      score,
      'anchor',
      state.settings.intervalScale ?? 1
    );
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
        itemId: key,
        gradeSubmitted: score,
        before: existing?.sm2,
        after: newSM2,
        mode: typedInput.trim() ? 'type' : 'reveal',
        cueLevel: 0,
        direction: DIRECTION_TO_LOG[effectiveDirection],
      }),
    });
    if (state.settings.streakIncludesChapters !== false) {
      dispatch({ type: 'RECORD_ACTIVITY' });
    }
    showToast(
      `Score logged. Next review in ${formatInterval(newSM2.interval)}.`,
      'success'
    );

    if (index < workList.length - 1) {
      setIndex(i => i + 1);
    } else {
      setIsFinished(true);
      setSessionQueue(null);
    }
  };

  const handleRestart = () => {
    setIsFinished(false);
    setSessionQueue(null);
    setIndex(0);
    setTypedInput('');
    setRevealed(false);
    setJudgement(null);
  };

  const selectedBookLabel =
    bookOptions.find(b => b.id === pickedBookId)?.label || 'All books';
  const selectedDirLabel =
    DIRECTIONS.find(d => d.id === direction)?.label || 'Number → Word';

  const imgPath = current ? `/chapters/${current.bookId}/ch${current.chapter}.png` : '';
  const plateEl = (
    <div className="w-full max-w-[420px] aspect-[1.7] rounded-2xl overflow-hidden bg-card-elevated border border-card-border flex items-center justify-center">
      {!imgErr ? (
        <img
          src={imgPath}
          alt={revealed ? `${current?.bookName} ${current?.chapter}` : 'Chapter illustration cue'}
          onError={() => setImgErr(true)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <span className="text-5xl font-heading font-bold text-muted/30">
          {current?.chapter}
        </span>
      )}
    </div>
  );

  return (
    <div className="max-w-xl mx-auto w-full px-5 py-6 flex flex-col gap-4 pb-20">
      <PracticeHeader
        title="Chapter anchors"
        subtitle="Connect each chapter with its anchor word."
        index={index}
        total={isFinished ? 0 : queue.length}
        onExit={onExit}
        exitLabel="Back to verse practice"
      />

      {/* Book Selector Dropdown */}
      <div className="relative self-start">
        <button
          type="button"
          onClick={() => {
            setBookMenuOpen(o => !o);
            setDirectionMenuOpen(false);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-card-border bg-card text-xs sm:text-sm font-semibold text-primary hover:border-accent/60"
        >
          <span>Book: {selectedBookLabel}</span>
          <ChevronDown className="w-4 h-4 text-secondary" />
        </button>

        {bookMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setBookMenuOpen(false)} />
            <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[220px] max-h-72 overflow-y-auto rounded-xl bg-card-elevated border border-card-border shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setPickedBookId(null);
                  setSessionQueue(null);
                  setIsFinished(false);
                  setIndex(0);
                  setBookMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-card-hover ${
                  !pickedBookId ? 'text-accent font-semibold' : 'text-primary'
                }`}
              >
                All books
              </button>
              {bookOptions.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setPickedBookId(b.id);
                    setSessionQueue(null);
                    setIsFinished(false);
                    setIndex(0);
                    setBookMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-card-hover ${
                    pickedBookId === b.id ? 'text-accent font-semibold' : 'text-primary'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {isFinished || !current ? (
        <div className="rounded-2xl bg-card border border-card-border p-6 flex flex-col gap-4 text-center items-center mt-2">
          <h2 className="text-2xl font-heading font-bold text-primary">
            {queue.length === 0 ? 'No chapter anchors due' : 'Anchor practice complete'}
          </h2>
          <p className="text-sm text-secondary max-w-sm">
            Pick a book above to drill its chapter chain, or return to verses.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            {queue.length > 0 && (
              <button
                type="button"
                onClick={handleRestart}
                className="flex-1 min-h-[48px] rounded-2xl bg-accent text-[#141414] font-bold text-sm hover:opacity-95"
              >
                Practice again
              </button>
            )}
            <button
              type="button"
              onClick={onExit}
              className="flex-1 min-h-[48px] rounded-2xl border border-card-border text-secondary hover:text-primary font-semibold text-sm"
            >
              Back to verses
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Direction Selector */}
          <div className="relative self-start">
            <button
              type="button"
              disabled={revealed}
              onClick={() => {
                setDirectionMenuOpen(o => !o);
                setBookMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-card-elevated border border-card-border text-xs font-semibold text-primary hover:border-accent/60 disabled:opacity-50"
            >
              <span>{selectedDirLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-secondary" />
            </button>

            {directionMenuOpen && !revealed && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDirectionMenuOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[180px] rounded-xl bg-card-elevated border border-card-border shadow-xl overflow-hidden">
                  {DIRECTIONS.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setDirection(d.id);
                        setDirectionMenuOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-card-hover ${
                        direction === d.id ? 'text-accent font-semibold' : 'text-primary'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-secondary">{current.bookName}</span>
            <h2 className="text-3xl font-heading font-bold text-primary">
              {effectiveDirection === 'word-to-number'
                ? current.word
                : `Chapter ${current.chapter}`}
            </h2>
            <p className="text-sm text-primary">
              {effectiveDirection === 'word-to-number'
                ? 'Which chapter has this anchor word?'
                : 'What is this chapter’s anchor word?'}
            </p>
          </div>

          {effectiveDirection === 'plate-to-word' && !revealed && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Chapter cue
              </span>
              {plateEl}
            </div>
          )}

          {!revealed ? (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-secondary">
                  {effectiveDirection === 'word-to-number'
                    ? 'Chapter number'
                    : 'Anchor word'}
                </span>
                <input
                  type="text"
                  inputMode={
                    effectiveDirection === 'word-to-number' ? 'numeric' : 'text'
                  }
                  value={typedInput}
                  onChange={e => setTypedInput(e.target.value.slice(0, 120))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && typedInput.trim()) {
                      handleCheckAnswer();
                    }
                  }}
                  placeholder={
                    effectiveDirection === 'word-to-number' ? 'e.g. 12' : 'Type anchor word'
                  }
                  className="w-full px-3.5 py-3 rounded-xl bg-card-elevated border border-card-border text-sm sm:text-base text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </label>

              <button
                type="button"
                disabled={!typedInput.trim()}
                onClick={handleCheckAnswer}
                className="w-full min-h-[48px] rounded-2xl bg-accent text-[#141414] font-bold text-sm hover:opacity-95 disabled:opacity-40 transition-opacity"
              >
                Check answer
              </button>

              <button
                type="button"
                onClick={handleReveal}
                className="w-full min-h-[48px] rounded-2xl border border-card-border text-primary font-semibold text-sm hover:border-accent/50 transition-colors"
              >
                Show anchor
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {judgement && (
                <p
                  className={`text-sm font-bold ${
                    judgement.verdict === 'correct'
                      ? 'text-emerald-400'
                      : judgement.verdict === 'near'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {judgement.verdict === 'correct'
                    ? 'Correct answer'
                    : judgement.verdict === 'near'
                    ? 'Close — compare your answer below'
                    : judgement.confusedWith
                    ? `That anchor belongs to Chapter ${judgement.confusedWith.chapter}: ${judgement.confusedWith.word}`
                    : 'Review the anchor below'}
                </p>
              )}

              <div className="rounded-2xl bg-card-elevated border border-card-border p-5 flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  Chapter {current.chapter}
                </span>
                <p className="text-2xl font-heading font-extrabold text-primary">
                  {current.word}
                </p>
                <p className="text-sm text-secondary italic font-serif">
                  {current.scene}
                </p>
              </div>

              {plateEl}

              {typedInput.trim() && (
                <p className="text-sm text-secondary">
                  Your answer: <span className="text-primary font-medium">{typedInput}</span>
                </p>
              )}

              <ReviewGrades ceiling={5} onGrade={handleGrade} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
