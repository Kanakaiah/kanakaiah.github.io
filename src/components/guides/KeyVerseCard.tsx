import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BIBLE_VERSION_LABELS } from '../../data/bibleMap';
import { fetchKeyVerseText, parseKeyVerseRef, stripWrappingQuotes } from '../../utils/keyVerseText';
import type { GuideVerse } from '../../data/types';

interface KeyVerseCardProps {
  verse: GuideVerse;
  /** Guide id, used as the book for book-relative refs like "2:4". */
  bookId?: string;
}

// Verse text that already opens with a quotation mark is quoting a speaker inside the
// passage (LSB's Habakkuk 2:4 starts mid-oracle, for one). Wrapping that in the card's
// own decorative quotes reads as a stutter, so the card only supplies quotes when the
// text doesn't bring its own.
const hasOpeningQuote = (text: string) => /^["“„«]/.test(text);

export const KeyVerseCard: React.FC<KeyVerseCardProps> = ({ verse, bookId }) => {
  const { state } = useApp();
  const bibleVersion = state.settings.bibleVersion || 'LSB';

  const parsedRef = useMemo(() => parseKeyVerseRef(verse.ref, bookId), [verse.ref, bookId]);
  const storedText = useMemo(() => stripWrappingQuotes(verse.text), [verse.text]);

  // Holds the version the live text was loaded in, so the badge can never label a
  // verse with a version it wasn't fetched in (during a switch, or on fallback).
  const [live, setLive] = useState<{ version: string; text: string } | null>(null);

  useEffect(() => {
    if (!parsedRef) return;

    let cancelled = false;
    fetchKeyVerseText(bibleVersion, parsedRef)
      .then(text => {
        if (!cancelled) setLive({ version: bibleVersion, text });
      })
      .catch(() => {
        // Offline, or the reference doesn't exist in this translation — the stored
        // snippet below stays on screen rather than blanking the card.
        if (!cancelled) setLive(null);
      });

    return () => { cancelled = true; };
  }, [parsedRef, bibleVersion]);

  // Keep the previous translation's text up while the new one loads — swapping to the
  // stored snippet first would flash a third wording between the two.
  const displayText = live?.text || storedText;
  const versionLabel = live ? (BIBLE_VERSION_LABELS[live.version] || live.version) : null;

  if (!displayText) return null;

  return (
    <div
      className="rounded-lg p-4 bg-card-elevated border border-card-border"
      style={{ borderLeft: '2px solid var(--accent-light)' }}
    >
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <p className="font-bold text-primary text-sm">{verse.ref}</p>
        {versionLabel && (
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted flex-shrink-0">
            {versionLabel}
          </span>
        )}
      </div>
      <p className="text-lg text-secondary italic font-serif mb-1.5 leading-relaxed">
        {hasOpeningQuote(displayText) ? displayText : `"${displayText}"`}
      </p>
      {verse.theme && (
        <p className="text-[0.6875rem] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-light)' }}>
          {verse.theme}
        </p>
      )}
    </div>
  );
};
