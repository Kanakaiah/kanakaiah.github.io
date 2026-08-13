import React, { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface Anchor {
  ch: number | string;
  word: string;
}

interface MemorySentenceProps {
  sentence: string;
  anchors?: Anchor[];
}

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
    const match = sentence.slice(cursor).match(new RegExp(`\\b${escapeRegExp(word)}\\b`));
    if (!match || match.index === undefined) continue; // not present — skip it
    const start = cursor + match.index;
    if (start > cursor) segments.push({ type: 'text', content: sentence.slice(cursor, start) });
    segments.push({ type: 'anchor', content: match[0], index: anchorIndex++, ch: anchor.ch });
    cursor = start + match[0].length;
  }

  if (cursor < sentence.length) segments.push({ type: 'text', content: sentence.slice(cursor) });
  return segments.length ? segments : [{ type: 'text', content: sentence }];
}

export const MemorySentence: React.FC<MemorySentenceProps> = ({ sentence, anchors }) => {
  const [testMode, setTestMode] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const segments = useMemo(() => parseSentence(sentence, anchors), [sentence, anchors]);
  const anchorCount = useMemo(() => segments.filter(s => s.type === 'anchor').length, [segments]);

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
    } else {
      setTestMode(true);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={toggleTestMode}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent hover:text-accent-hover transition-colors"
        >
          {testMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {testMode ? 'Show All' : 'Test Yourself'}
        </button>
        {testMode && (
          <span className="text-[0.6875rem] text-muted font-medium tabular-nums">
            {revealed.size} / {anchorCount} revealed
          </span>
        )}
      </div>

      <div
        className="rounded-lg p-5 bg-card-elevated border border-card-border font-serif"
        style={{ borderLeft: '3px solid var(--accent-light)' }}
      >
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
                <span
                  onClick={isHidden ? () => revealOne(seg.index) : undefined}
                  className={`font-bold text-accent transition-all duration-200 ${
                    isHidden
                      ? 'cursor-pointer select-none blur-[5px] hover:blur-[3px]'
                      : ''
                  }`}
                >
                  {seg.content}
                </span>
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
};
