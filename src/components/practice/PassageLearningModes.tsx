import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Verse } from '../../types/models';
import { OT_BOOKS } from '../../data/otBooks';
import { NT_BOOKS } from '../../data/ntBooks';
import { getBookName } from '../../utils/localization';
import { parseVerseRef } from '../../utils/verseText';
import { studyThoughts } from '../../utils/studyText';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

function normalizeBookAliasInput(raw: string): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  for (const book of ALL_BOOKS) {
    for (const ver of ['TBSI', 'TELIRV'] as const) {
      const local = getBookName(book.id, book.name, ver);
      if (local && local !== book.name && lower.startsWith(local.toLowerCase())) {
        return book.name + trimmed.slice(local.length);
      }
    }
  }
  return trimmed;
}

export function referenceMatches(input: string, verseRef: string): boolean {
  const expected = parseVerseRef(verseRef);
  if (!expected) return false;
  const normalizedInput = normalizeBookAliasInput(input);
  const parsed = parseVerseRef(normalizedInput);
  if (!parsed) return false;
  if (parsed.bollsId !== expected.bollsId || parsed.chapter !== expected.chapter) {
    return false;
  }
  if (parsed.verses.length !== expected.verses.length) return false;
  const a = [...parsed.verses].sort((x, y) => x - y);
  const b = [...expected.verses].sort((x, y) => x - y);
  return a.every((v, idx) => v === b[idx]);
}

export const BuildPassageMode: React.FC<{
  text: string;
  onComplete: () => void;
}> = ({ text, onComplete }) => {
  const initialParts = useMemo(() => studyThoughts(text), [text]);
  const [parts, setParts] = useState<string[]>(initialParts);
  const [span, setSpan] = useState(1);
  const [hidden, setHidden] = useState(false);
  const [checking, setChecking] = useState(false);
  const [chooseBreakOpen, setChooseBreakOpen] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showReflection, setShowReflection] = useState(false);

  useEffect(() => {
    setParts(studyThoughts(text));
    setSpan(1);
    setHidden(false);
    setChecking(false);
    setChooseBreakOpen(false);
    setShowContext(false);
    setShowReflection(false);
  }, [text]);

  const safeSpan = Math.min(Math.max(1, span), Math.max(1, parts.length));
  const currentChunk = parts[safeSpan - 1] || '';

  const wordTokens = useMemo(() => {
    const tokens: { text: string; endIndex: number }[] = [];
    const regex = /\S+\s*/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(currentChunk)) !== null) {
      tokens.push({ text: match[0], endIndex: match.index + match[0].length });
    }
    return tokens;
  }, [currentChunk]);

  const handlePrimaryAction = () => {
    if (hidden) {
      setHidden(false);
      setChecking(true);
    } else if (checking && safeSpan >= parts.length) {
      onComplete();
    } else if (checking) {
      setSpan(s => Math.min(parts.length, s + 1));
      setChecking(false);
    } else {
      setHidden(true);
    }
  };

  const primaryLabel = hidden
    ? 'Check recall'
    : checking && safeSpan >= parts.length
    ? 'Check whole passage'
    : checking
    ? 'Add next thought'
    : 'Hide and recall';

  const handleSplitAt = (endIdx: number) => {
    const left = currentChunk.slice(0, endIdx);
    const right = currentChunk.slice(endIdx);
    if (!left.trim() || !right.trim()) return;
    setParts(prev => [
      ...prev.slice(0, safeSpan - 1),
      left,
      right,
      ...prev.slice(safeSpan),
    ]);
    setChecking(false);
    setChooseBreakOpen(false);
  };

  const handleJoinNext = () => {
    if (safeSpan >= parts.length) return;
    setParts(prev => [
      ...prev.slice(0, safeSpan - 1),
      `${prev[safeSpan - 1]}${prev[safeSpan]}`,
      ...prev.slice(safeSpan + 1),
    ]);
    setChecking(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
        With help · {safeSpan === 1 ? 'Part 1' : `Parts 1–${safeSpan}`} of {parts.length}
      </p>

      <div className="rounded-2xl bg-card-elevated border border-card-border p-5">
        {hidden ? (
          <p className="font-heading font-bold text-xl text-primary">
            Recall these thoughts together, without looking.
          </p>
        ) : (
          <p className="font-serif text-lg sm:text-xl leading-relaxed text-primary whitespace-pre-wrap">
            {parts.slice(0, safeSpan).join('').trim()}
          </p>
        )}
      </div>

      <p className="text-sm text-secondary">
        {checking
          ? 'Compare your recall, then connect the next thought.'
          : 'Read a complete thought, hide it, and say it back.'}
      </p>

      <button
        type="button"
        onClick={handlePrimaryAction}
        className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-accent text-on-accent font-bold text-sm hover:opacity-95 transition-opacity"
      >
        {primaryLabel}
      </button>

      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold">
        {!hidden && wordTokens.length > 1 && (
          <button
            type="button"
            onClick={() => setChooseBreakOpen(true)}
            className="text-accent hover:underline"
          >
            Choose a smaller part
          </button>
        )}
        {!hidden && safeSpan < parts.length && (
          <button
            type="button"
            onClick={handleJoinNext}
            className="text-accent hover:underline"
          >
            Join the next thought
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const next = !showContext;
            setShowContext(next);
            if (next) setHidden(false);
          }}
          className="text-secondary hover:text-primary"
        >
          {showContext ? 'Close whole passage' : 'See the whole passage'}
        </button>
        <button
          type="button"
          onClick={() => setShowReflection(r => !r)}
          className="text-secondary hover:text-primary"
        >
          Reflect on the meaning
        </button>
      </div>

      {showContext && !hidden && (
        <div className="rounded-xl bg-card border border-card-border p-4 font-serif text-base text-secondary whitespace-pre-wrap">
          {text}
        </div>
      )}

      {showReflection && (
        <p className="text-sm text-secondary rounded-xl bg-card border border-card-border p-4">
          How would you explain this passage in your own words? Reflect quietly or aloud. This is separate from remembering the exact wording.
        </p>
      )}

      <p className="text-xs text-muted">
        Return in a later session to check what you remember without help.
      </p>

      {chooseBreakOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setChooseBreakOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[80vh] bg-card-elevated border border-card-border rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
              <h3 className="font-heading font-bold text-lg text-primary">
                End this thought after…
              </h3>
              <button
                type="button"
                onClick={() => setChooseBreakOpen(false)}
                className="p-1 text-secondary hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
              {wordTokens.slice(0, -1).map((tok, i) => {
                const snippet = wordTokens
                  .slice(0, i + 1)
                  .slice(-5)
                  .map(t => t.text)
                  .join('')
                  .trim();
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSplitAt(tok.endIndex)}
                    className="w-full text-left px-3.5 py-2.5 rounded-lg text-sm text-primary hover:bg-card-hover transition-colors"
                  >
                    … {snippet}
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-card-border flex justify-end">
              <button
                type="button"
                onClick={() => setChooseBreakOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-accent hover:underline"
              >
                Keep current part
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ReferenceRecallMode: React.FC<{
  verse: Verse;
  text: string;
  onSave: (score: number) => void;
  disabled?: boolean;
}> = ({ verse, text, onSave, disabled = false }) => {
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [matched, setMatched] = useState(false);

  useEffect(() => {
    setInput('');
    setChecked(false);
    setMatched(false);
  }, [verse.id, text]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card-elevated border border-card-border p-5">
        <p className="font-serif text-lg sm:text-xl leading-relaxed text-primary whitespace-pre-wrap">
          {text}
        </p>
      </div>

      {!checked ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-secondary">
              Book chapter:verse
            </span>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 200))}
              onKeyDown={e => {
                if (e.key === 'Enter' && input.trim()) {
                  setMatched(referenceMatches(input, verse.ref));
                  setChecked(true);
                }
              }}
              placeholder="e.g. John 3:16"
              className="w-full px-3.5 py-3 rounded-xl bg-card-elevated border border-card-border text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </label>

          <button
            type="button"
            disabled={!input.trim()}
            onClick={() => {
              setMatched(referenceMatches(input, verse.ref));
              setChecked(true);
            }}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-accent text-on-accent font-bold text-sm disabled:opacity-40 transition-opacity"
          >
            Check reference
          </button>

          <button
            type="button"
            onClick={() => {
              setMatched(false);
              setChecked(true);
            }}
            className="self-start text-xs font-semibold text-accent hover:underline"
          >
            Show reference
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl bg-card border border-card-border p-4">
          <span
            className={`text-sm font-bold ${
              matched ? 'text-emerald-400' : 'text-primary'
            }`}
          >
            {matched ? 'Correct reference' : 'Compare the reference'}
          </span>
          <p className="font-heading font-bold text-2xl text-accent">{verse.ref}</p>
          {input.trim() && (
            <p className="text-xs text-secondary">Your answer: {input}</p>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSave(matched ? 4 : 1)}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-accent text-on-accent font-bold text-sm disabled:opacity-40 transition-opacity"
          >
            Save reference practice
          </button>
        </div>
      )}

      <p className="text-xs text-secondary">
        Tracked separately from recalling the passage&apos;s words.
      </p>
    </div>
  );
};
