import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { BIBLE_VERSION_LABELS } from '../../data/bibleMap';
import { NT_BOOKS } from '../../data/ntBooks';
import { OT_BOOKS } from '../../data/otBooks';
import { fetchVerseText, formatVerseNumbers, parseVerseRef, stripWrappingQuotes } from '../../utils/verseText';
import type { GuideVerse } from '../../data/types';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

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
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const bibleVersion = state.settings.bibleVersion || 'LSB';

  const parsedRef = useMemo(() => parseVerseRef(verse.ref, bookId), [verse.ref, bookId]);
  const storedText = useMemo(() => stripWrappingQuotes(verse.text), [verse.text]);

  // Holds the version the live text was loaded in, so the badge can never label a
  // verse with a version it wasn't fetched in (during a switch, or on fallback).
  const [live, setLive] = useState<{ version: string; text: string } | null>(null);

  useEffect(() => {
    if (!parsedRef) return;

    let cancelled = false;
    fetchVerseText(bibleVersion, parsedRef)
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

  // Written in the chapter reader's ref format ("Habakkuk 2:4") so the library treats
  // both entry points as the same passage.
  const libraryRef = useMemo(() => {
    if (!parsedRef) return null;
    const book = ALL_BOOKS.find(b => b.id === parsedRef.bookId);
    if (!book) return null;
    return `${book.name} ${parsedRef.chapter}:${formatVerseNumbers(parsedRef.verses)}`;
  }, [parsedRef]);

  const alreadySaved = Boolean(libraryRef && state.verses.some(v => v.ref === libraryRef));

  const goToLibrary = (ref: string) => ({
    label: 'Go to Library',
    onClick: () => navigate(`/?search=${encodeURIComponent(ref)}`),
  });

  const handleAdd = () => {
    if (!libraryRef || !live || alreadySaved) return;

    dispatch({
      type: 'ADD_VERSE',
      payload: {
        id: crypto.randomUUID(),
        ref: libraryRef,
        text: live.text,
        translation: live.version,
        addedDate: new Date().toISOString(),
        status: 'learning',
        sm2: { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() },
        streak: 0,
        attempts: 0,
      },
    });

    showToast(`Added ${libraryRef} to your library!`, 'success', goToLibrary(libraryRef));
  };

  // Adding is gated on live text: the stored snippet is an abridged quote with no
  // recorded translation, so saving it would put an unlabeled wording in the library.
  const canAdd = Boolean(libraryRef && live);

  if (!displayText) return null;

  return (
    <div
      className="rounded-lg p-4 bg-card-elevated border border-card-border"
      style={{ borderLeft: '2px solid var(--accent-light)' }}
    >
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <p className="font-bold text-primary text-sm">{verse.ref}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {versionLabel && (
            <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted">
              {versionLabel}
            </span>
          )}
          {canAdd && (
            <button
              onClick={handleAdd}
              disabled={alreadySaved}
              className={`p-1.5 rounded-full transition-colors self-center ${
                alreadySaved
                  ? 'text-accent-light cursor-default'
                  : 'text-secondary hover:text-accent-light hover:bg-card-hover'
              }`}
              title={alreadySaved ? `${libraryRef} is in your library` : `Add ${libraryRef} to memorization list`}
              aria-label={alreadySaved ? `${libraryRef} is in your library` : `Add ${libraryRef} to memorization list`}
            >
              {alreadySaved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          )}
        </div>
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
