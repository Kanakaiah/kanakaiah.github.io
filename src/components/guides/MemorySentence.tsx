import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Check, CaseSensitive } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { evaluateSM2, formatInterval } from '../../utils/sm2';

import type { MemorySentenceProgress } from '../../types/models';
import { FirstLetterMode } from '../practice/FirstLetterMode';

interface Anchor {
  ch: number | string;
  word: string;
}

interface MemorySentenceProps {
  sentence: string;
  anchors?: Anchor[];
  /** Guide id (e.g. "genesis") this sentence belongs to — omit for guides with
   * no stable id of their own. Required for the recall test to be scheduled;
   * without it "Test Yourself" still works, it just isn't graded or scheduled. */
  guideId?: string;
}

const DEFAULT_SM2 = { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() };

type Segment =
  | { type: 'text'; content: string }
  | { type: 'anchor'; content: string; index: number; ch: number | string | null };

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Splits a memory sentence into ordered text/anchor segments. Anchor segments
 * get a stable `index` (their position among anchors only) so revealed-state
 * can be tracked independent of the surrounding prose, plus a `ch` (chapter
 * number) whenever it can be determined.
 *
 * Two source conventions exist in the guide data:
 *
 *  1. "...**WORD**..." — explicit bold markers. Only ~a third of the guides
 *     use this.
 *  2. "...WORD..." — the anchor word simply written in caps inline, with the
 *     real anchor list living in the guide's `anchors` array. This is what
 *     most guides (all of the Old Testament ones, and the NT book guides) do.
 *
 * Only form 1 used to be recognised, so every form-2 guide rendered as flat
 * prose: no accent colouring, no chapter numbers, and a Test Yourself button
 * with nothing to hide. Form 2 is now resolved by locating each `anchors[]`
 * word in the sentence, in order, which also yields the correct chapter for
 * each one rather than relying on the counts happening to line up.
 *
 * Guides with neither (topical ones like "Roman Road", which have a
 * memorySentence but no anchors) still render as plain prose, which is right.
 */
// The sentence is prose, so it inflects an anchor to fit: DANCING is written "DANCES",
// FASTING as "a FAST", READING as "READ", GENTLE as "GENTLY". Matching the anchor
// literally left those unmarked in eleven guides — the word was right there on screen,
// just conjugated. Tries the whole word first, then progressively shorter stems, so
// STONES still prefers STONES over STONE where both appear.
const MIN_STEM = 4;

function matchAnchor(sentence: string, cursor: number, word: string): { index: number; text: string } | null {
  const haystack = sentence.slice(cursor);

  for (let len = word.length; len >= Math.min(MIN_STEM, word.length); len--) {
    const stem = word.slice(0, len);
    // Still anchored at a word start, and still case-sensitive: these words are written
    // in caps in both places, and matching loosely would latch onto ordinary prose.
    const found = haystack.match(new RegExp(`\\b${escapeRegExp(stem)}[A-Z]*\\b`));
    if (found && found.index !== undefined) return { index: cursor + found.index, text: found[0] };
  }

  return null;
}

function parseSentence(sentence: string, anchors?: Anchor[]): Segment[] {
  const parts = sentence.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  const boldCount = parts.filter(p => /^\*\*[^*]+\*\*$/.test(p)).length;

  if (boldCount > 0) {
    const chaptersLineUp = !!anchors && anchors.length === boldCount;
    let anchorIndex = 0;
    return parts.map(part => {
      const match = part.match(/^\*\*([^*]+)\*\*$/);
      if (!match) return { type: 'text', content: part };
      const segment: Segment = {
        type: 'anchor',
        content: match[1],
        index: anchorIndex,
        ch: chaptersLineUp ? anchors![anchorIndex].ch : null,
      };
      anchorIndex++;
      return segment;
    });
  }

  if (!anchors?.length) return [{ type: 'text', content: sentence }];

  // Matching is case-sensitive: both the anchors array and the sentence write
  // these words in caps, and a case-insensitive search would happily latch onto
  // an ordinary lowercase occurrence of the same word earlier in the prose.
  // Searching forward from a cursor also means a word used as the anchor for
  // two different chapters resolves to a different occurrence each time.
  const segments: Segment[] = [];
  let cursor = 0;
  let anchorIndex = 0;

  for (const anchor of anchors) {
    const word = String(anchor.word ?? '').trim();
    if (!word) continue;
    const match = matchAnchor(sentence, cursor, word);
    if (!match) continue; // genuinely not in the sentence — leave it unmarked
    const start = match.index;
    if (start > cursor) segments.push({ type: 'text', content: sentence.slice(cursor, start) });
    segments.push({ type: 'anchor', content: match.text, index: anchorIndex++, ch: anchor.ch });
    cursor = start + match.text.length;
  }

  if (cursor < sentence.length) segments.push({ type: 'text', content: sentence.slice(cursor) });
  return segments.length ? segments : [{ type: 'text', content: sentence }];
}

export const MemorySentence: React.FC<MemorySentenceProps> = ({ sentence, anchors, guideId }) => {
  const [testMode, setTestMode] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [isGrading, setIsGrading] = useState(false);
  // First-Letter drill — the same component Practice uses for a verse, pointed at
  // this sentence's plain text instead. Nearly free: FirstLetterMode already takes
  // a bare string, and parseSentence's own bold-marker stripping gives that string
  // for free too. A separate memorization aid from Test Yourself above (no SM2
  // grading of its own), toggled independently so the two don't fight over state.
  const [showFirstLetter, setShowFirstLetter] = useState(false);
  const { state, dispatch } = useApp();
  const { showToast } = useToast();

  const segments = useMemo(() => parseSentence(sentence, anchors), [sentence, anchors]);
  const anchorCount = useMemo(() => segments.filter(s => s.type === 'anchor').length, [segments]);
  const plainSentence = useMemo(() => sentence.replace(/\*\*/g, ''), [sentence]);

  const progress = guideId ? state.memorySentenceProgress[guideId] : undefined;
  const daysUntilDue = progress
    ? Math.ceil((new Date(progress.sm2.nextDueDate).getTime() - Date.now()) / 86400000)
    : null;

  const revealOne = (index: number) => {
    setRevealed(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const toggleTestMode = () => {
    if (testMode) {
      // "Show All" — leave test mode and clear any partial progress so the
      // next attempt starts fresh rather than picking up where this left off.
      setTestMode(false);
      setRevealed(new Set());
      setIsGrading(false);
    } else {
      setTestMode(true);
    }
  };

  const handleScore = (score: number) => {
    if (!guideId) return;
    const { newSM2, newStatus } = evaluateSM2(progress?.sm2 || DEFAULT_SM2, score);
    const updated: MemorySentenceProgress = {
      guideId,
      sm2: newSM2,
      status: newStatus,
      attempts: (progress?.attempts || 0) + 1,
      lastScore: score,
      lastAttemptDate: new Date().toISOString(),
    };
    dispatch({ type: 'UPDATE_MEMORY_SENTENCE_PROGRESS', payload: updated });

    // Tapping a blurred word to reveal it is the reader admitting they didn't have
    // it — a genuinely useful per-chapter signal. It used to be written as a full
    // SM2 grade against every chapter the sentence mentions, which meant one button
    // press scheduled fifty chapters (a hundred and fifty for Psalms) on the strength
    // of a task none of them had actually been tested by: inside the chain the
    // neighbours are adjacent, the prose constrains the answer, and the chapter number
    // is printed right there as a superscript. Six passes marked a whole book secure.
    //
    // The signal is kept; its authority is not. It now records chain evidence only —
    // see RECORD_CHAIN_PASS — so a chapter's schedule and its mastery level stay
    // derived entirely from isolated cued recall, and a word that had to be revealed
    // becomes a candidate for real drilling rather than a graded failure.
    const results = segments
      .filter((seg): seg is Extract<Segment, { type: 'anchor' }> =>
        seg.type === 'anchor' && typeof seg.ch === 'number')
      .map(seg => ({ chapter: seg.ch as number, revealed: revealed.has(seg.index) }));

    if (results.length > 0) {
      dispatch({ type: 'RECORD_CHAIN_PASS', payload: { bookId: guideId, results } });
    }
    if (state.settings.streakIncludesChapters !== false) {
      dispatch({ type: 'RECORD_ACTIVITY' });
    }

    setIsGrading(false);
    setTestMode(false);
    setRevealed(new Set());
    showToast(`Score logged. Next review in ${formatInterval(newSM2.interval)}.`, 'success');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTestMode}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent hover:text-accent-hover transition-colors relative after:absolute after:-inset-y-3.5 after:inset-x-0 after:content-['']"
          >
            {testMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {testMode ? 'Show All' : 'Test Yourself'}
          </button>
          {!testMode && (
            <button
              onClick={() => setShowFirstLetter(v => !v)}
              aria-pressed={showFirstLetter}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors relative after:absolute after:-inset-y-3.5 after:inset-x-0 after:content-[''] ${
                showFirstLetter ? 'text-accent' : 'text-muted hover:text-primary'
              }`}
            >
              <CaseSensitive className="w-3.5 h-3.5" />
              First Letters
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {testMode && (
            <span className="text-[0.6875rem] text-muted font-medium tabular-nums">
              {revealed.size} / {anchorCount} revealed
            </span>
          )}
          {!testMode && guideId && progress && (
            <span className={`text-[0.6875rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              daysUntilDue !== null && daysUntilDue <= 0
                ? 'text-accent bg-accent/10'
                : 'text-muted bg-card-elevated'
            }`}>
              {daysUntilDue !== null && daysUntilDue <= 0
                ? 'Due for review'
                : `Reviewed · next in ${formatInterval(daysUntilDue || 0)}`}
            </span>
          )}
        </div>
      </div>

      <div
        className="rounded-lg p-5 bg-card-elevated border border-card-border font-serif"
        style={{ borderLeft: '3px solid var(--accent-light)' }}
      >
        {showFirstLetter && !testMode ? (
          <FirstLetterMode text={plainSentence} />
        ) : (
          <>
        {testMode && revealed.size === 0 && (
          <p className="mb-3 text-xs font-sans text-muted italic">
            Tap each hidden word to test your recall — or "Show All" to bail out.
          </p>
        )}
        <p className="text-base leading-loose text-secondary">
          {segments.map(seg => {
            if (seg.type === 'text') return seg.content;

            const isHidden = testMode && !revealed.has(seg.index);
            return (
              <span key={seg.index} className="whitespace-nowrap">
                {seg.ch !== null && (
                  <sup className="text-[0.625rem] font-sans font-bold text-muted mr-px">{seg.ch}</sup>
                )}
                {/* A hidden anchor is *replaced*, not blurred.
                    Blur is not a mask: word length, ascender profile and initial-letter
                    shape all survive it, and these anchors are highly distinctive
                    (CIRCUMCISION vs STEW vs RAINBOW), so recognition was quietly doing
                    the work recall was supposed to. Blurred text also remains real text
                    — selectable, copyable, and read out verbatim by a screen reader,
                    which meant assistive-tech users got no test at all.
                    The bar is a fixed six characters wide regardless of the word behind
                    it, so length leaks nothing either. EraserMode already masks this way. */}
                {isHidden ? (
                  <button
                    type="button"
                    onClick={() => revealOne(seg.index)}
                    aria-label={`Reveal the anchor for chapter ${seg.ch ?? '?'}`}
                    className="align-baseline cursor-pointer select-none rounded-sm bg-card-border hover:bg-card-border-hover transition-colors px-[0.15em] tracking-[-0.05em] text-transparent"
                  >
                    <span aria-hidden="true">▮▮▮▮▮▮</span>
                  </button>
                ) : (
                  <span className="font-bold text-accent transition-all duration-200">
                    {seg.content}
                  </span>
                )}
              </span>
            );
          })}
        </p>
          </>
        )}
      </div>

      {testMode && guideId && anchorCount > 0 && (
        !isGrading ? (
          <button
            onClick={() => setIsGrading(true)}
            className="self-center flex items-center gap-2 px-6 py-2.5 rounded-md bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors active:scale-95"
          >
            <Check className="w-4 h-4" /> Score My Recall
          </button>
        ) : (
          <div className="max-w-md w-full self-center bg-card-elevated border border-card-border rounded-lg p-4 flex flex-col gap-3 animate-[fadeScaleIn_0.2s_ease-out]">
            <p className="text-center text-sm font-semibold text-primary">How well did you know the sentence?</p>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => handleScore(1)} className="py-2.5 flex flex-col items-center justify-center rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/20 active:scale-95">
                <span className="text-xs font-bold leading-tight">Blank</span>
                <span className="text-[0.625rem] opacity-80 font-medium">{formatInterval(evaluateSM2(progress?.sm2 || DEFAULT_SM2, 1).newSM2.interval)}</span>
              </button>
              <button onClick={() => handleScore(3)} className="py-2.5 flex flex-col items-center justify-center rounded-md bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors border border-orange-500/20 active:scale-95">
                <span className="text-xs font-bold leading-tight">Hard</span>
                <span className="text-[0.625rem] opacity-80 font-medium">{formatInterval(evaluateSM2(progress?.sm2 || DEFAULT_SM2, 3).newSM2.interval)}</span>
              </button>
              <button onClick={() => handleScore(4)} className="py-2.5 flex flex-col items-center justify-center rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors border border-blue-500/20 active:scale-95">
                <span className="text-xs font-bold leading-tight">Good</span>
                <span className="text-[0.625rem] opacity-80 font-medium">{formatInterval(evaluateSM2(progress?.sm2 || DEFAULT_SM2, 4).newSM2.interval)}</span>
              </button>
              <button onClick={() => handleScore(5)} className="py-2.5 flex flex-col items-center justify-center rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors border border-green-500/20 active:scale-95">
                <span className="text-xs font-bold leading-tight">Easy</span>
                <span className="text-[0.625rem] opacity-80 font-medium">{formatInterval(evaluateSM2(progress?.sm2 || DEFAULT_SM2, 5).newSM2.interval)}</span>
              </button>
            </div>
            <button onClick={() => setIsGrading(false)} className="text-muted text-xs font-medium hover:text-primary transition-colors py-0.5">Cancel</button>
          </div>
        )
      )}
    </div>
  );
};
