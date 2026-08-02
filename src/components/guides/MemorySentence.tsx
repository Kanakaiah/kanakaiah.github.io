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

/**
 * Splits "...**WORD**..." into ordered text/anchor segments. Anchor segments
 * get a stable `index` (their position among anchors only) so revealed-state
 * can be tracked independent of the surrounding prose, and a `ch` (chapter
 * number) when the source guide's `anchors` array lines up 1:1 with the bold
 * markers — which is true for book guides, but not for topical/reference
 * guides (e.g. "Roman Road"), which have a memorySentence but no per-chapter
 * anchors at all.
 */
function parseSentence(sentence: string, anchors?: Anchor[]): Segment[] {
  const parts = sentence.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  const boldCount = parts.filter(p => /^\*\*[^*]+\*\*$/.test(p)).length;
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
