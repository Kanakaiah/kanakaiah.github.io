import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, X, Copy, Trash2, BookOpen, RotateCw, Check, MoreVertical, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NT_BOOKS } from '../../data/ntBooks';
import { OT_BOOKS } from '../../data/otBooks';
import { CrossReferenceModal } from './CrossReferenceModal';
import { CommentaryModal, hasCommentaryForBook } from './StudyToolsSheet';
import { ImmersedReader } from '../practice/ImmersedReader';
import { ReviewGrades } from '../practice/PracticeFeedback';
import { Modal } from '../ui/Modal';
import { Switch } from '../ui/Switch';
import { saveReaderPosition } from '../../utils/readerPosition';
import {
  adjacentReadingChapter,
  mergeReadingWindow,
} from '../../utils/readerContinuation';
import { useKeepImmerseAwake } from '../../hooks/useWakeLock';
import { getBookName } from '../../utils/localization';
import {
  CrossReferenceIndex,
  loadCrossReferenceIndex,
  getCrossReferenceIndexIfLoaded,
  toVerseIndex,
} from '../../utils/verseConnections';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import otQuotesData from '../../data/otQuotes.json';
import { NT_STUDY_GUIDES } from '../../data/guides';
import { OT_STUDY_GUIDES } from '../../data/otGuides';
import { evaluateSM2 } from '../../utils/sm2';
import { buildReviewEvent } from '../../utils/reviewLog';
import { chapterProgressKey } from '../../types/models';
import type { ChapterProgress, UserSettings, Verse as MemoryVerse } from '../../types/models';
import { divisionForSection } from '../../data/palette';
import { useMastery } from '../../utils/mastery';

const ALL_GUIDES = [...OT_STUDY_GUIDES, ...NT_STUDY_GUIDES];

// --- Module-level caching for performance ---
const otQuotes = otQuotesData as Record<string, Record<string, number[]>>;
// bookId -> chapter number (as string) -> verse numbers that start a new paragraph.
// Sourced from NASB95 (via API.Bible), which shares the LSB's paragraph structure closely
// enough to use directly — verified against Blue Letter Bible's LSB markers for John 3
// (exact match). Poetic books have no entries here (poetry has no real "paragraph" unit at
// the USX level) and fall back to the heading/<br/> heuristic below.
let cachedParagraphBreaks: Record<string, Record<string, number[]>> | null = null;
// "version:bollsId:chapter" -> the in-flight or settled chapter request. See fetchChapterText.
const chapterTextCache = new Map<string, Promise<Verse[]>>();
// The same chapters once they've resolved, so a revisit can render without awaiting.
const chapterTextSettled = new Map<string, Verse[]>();

// How many times the end-of-chapter recall card has been dismissed (not graded) this
// session — module-level rather than component state because the reader component
// instance persists across chapter navigation (see goToChapter), and the intent is a
// per-session cap, not a per-chapter one. Resets on a full page reload, same as every
// other module-level cache in this file.
let recallCardDismissCount = 0;

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}



// Parses a "book chapter:verse" reference string (e.g. "genesis 1:1", or a multi-word
// book like "song of solomon 3:1") into a resolved book id. Anchored on the trailing
// "chapter:verse" so everything before it is treated as the book name regardless of
// how many words it has — the previous single-word-only regex silently failed to
// match multi-word books.
function parseVerseRefString(refStr: string): { bookId: string; chapter: number; verse: number } | null {
  const match = refStr.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!match) return null;
  const bookName = match[1].trim().toLowerCase();
  const foundBook = ALL_BOOKS.find(b => b.name.toLowerCase() === bookName || b.id === bookName);
  if (!foundBook) return null;
  return { bookId: foundBook.id, chapter: parseInt(match[2], 10), verse: parseInt(match[3], 10) };
}

// Comfortable reading measure for the Bible text column. Expressed in `ch` rather
// than a fixed px/rem cap so it tracks the reader's own font-size setting: 52
// zero-widths measures out to ~60 rendered characters per line (comfortably inside
// the classic 45-75 range) at *every* size step. A fixed cap can't do that — the
// previous max-w-2xl (672px) ran ~75 characters at the smallest text size and only
// ~36 at the largest. At the default size this resolves to ≈671px, i.e. visually
// identical to the old cap, so phones and desktop are unchanged; it's the extreme
// font-size settings that get materially better. min() keeps it from exceeding the
// width actually available on a narrow screen.
const READING_MEASURE = 'min(100%, 52ch)';

// Cross-reference "back" navigation, and the reader's position, used to live in URL
// query params. Both have moved: the trail is in-memory state (pendingHighlight /
// returnStack) so a stale trail can't resurface after a reload, and the position is the
// path itself (/bible/HAB.1). Nothing here has to carry unrelated query keys forward
// any more, so the pruning that guarded against that is gone with them.

interface ChapterReaderProps {
  bookId: string;
  chapter: number;
  bookTitle: string;
  /** Verse from a /bible/HAB.1.4 style link — scrolled to and flashed on arrival. */
  initialVerse?: number;
  onClose: () => void;
  onStudyOriginalWord?: (verseRef: { book: number; chapter: number; verse: number }) => void;
}

import { BOLLS_BIBLE_MAP, BOOK_SHORT, BIBLE_VERSION_LABELS, TRANSLATION_OPTIONS } from '../../data/bibleMap';
import { readerPath } from '../../utils/readerRoute';
import { readingDisplay } from '../../data/readingPresets';

interface Verse {
  pk: number;
  verse: number;
  text: string;
}

function chapterCacheKey(version: string, bollsId: number, chapter: number): string {
  return `${version}:${bollsId}:${chapter}`;
}

/**
 * Fetches a chapter, sharing one request per version/book/chapter for the session.
 *
 * Scripture text doesn't change under us, so the previous code's fetch-per-view meant
 * paging back and forth cost a fresh round trip every time — the chapter you read a
 * moment ago still sat behind a loading skeleton on the way back. Keyed on the promise
 * rather than the result so a chapter opened twice in quick succession (or React's
 * dev-only double-invoked effect) makes a single request.
 */
function fetchChapterText(version: string, bollsId: number, chapter: number): Promise<Verse[]> {
  const cacheKey = chapterCacheKey(version, bollsId, chapter);
  const cached = chapterTextCache.get(cacheKey);
  if (cached) return cached;

  // The timeout belongs to the request rather than to whichever reader started it —
  // aborting on unmount would reject a promise other views may already be awaiting.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let pending: Promise<Verse[]>;

  if (version.toUpperCase() === 'TELIRV' || version.toUpperCase() === 'TBSI' || version.toUpperCase() === 'BSB') {
    const vUpper = version.toUpperCase();
    const folder = vUpper === 'TELIRV' ? 'telugu_irv' : vUpper === 'TBSI' ? 'tamil_bsi' : 'bsb';
    const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
    const url = `${base}/bible/${folder}/${bollsId}.json`;
    
    pending = fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch verse text from local static files.');
        return res.json();
      })
      .then(bookData => {
        const verses = bookData[chapter.toString()];
        if (!verses) throw new Error('Invalid response structure or missing chapter.');
        chapterTextSettled.set(cacheKey, verses);
        return verses;
      })
      .finally(() => clearTimeout(timeoutId));
  } else {
    pending = fetch(`https://bolls.life/get-text/${version}/${bollsId}/${chapter}/`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch chapter text.');
        return res.json() as Promise<Verse[]>;
      })
      .then(data => {
        chapterTextSettled.set(cacheKey, data);
        return data;
      })
      .finally(() => clearTimeout(timeoutId));
  }

  // A rejected promise must not stay cached, or one dropped connection would pin the
  // error on that chapter for the rest of the session.
  pending.catch(() => chapterTextCache.delete(cacheKey));
  chapterTextCache.set(cacheKey, pending);
  return pending;
}

// bolls.life ships section headings (as <b> tags inside the verse text) only in its LSB
// edition — its NASB95 and NLT chapters carry no headings at all. Pulls the LSB's out of
// a chapter so they can be shown above the matching verse in those versions; headings
// always sit at a verse boundary, so they land on the same verse in any translation.
function extractHeadings(verses: Verse[]): Record<number, string[]> {
  const byVerse: Record<number, string[]> = {};

  for (const v of verses) {
    const headings = Array.from(v.text.matchAll(/<b>(.*?)<\/b>/gi))
      .map(m => m[1].trim())
      .filter(Boolean);
    if (headings.length) byVerse[v.verse] = headings;
  }

  return byVerse;
}

const HEADING_CLASSES = 'mt-10 first-of-type:mt-0 mb-4 text-xs font-bold tracking-[0.14em] text-accent uppercase not-italic leading-snug break-words w-full block';

function stripHtmlTags(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function readerFontFamilyCss(family?: UserSettings['fontFamily']): string {
  if (family === 'system') return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  if (family === 'merriweather' || family === 'serif') return "'Merriweather', Georgia, serif";
  if (family === 'atkinson' || family === 'hyper') return "'Atkinson Hyperlegible', sans-serif";
  if (family === 'mono') return "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  return "'Inter', sans-serif";
}

function readerLineHeightMultiplier(spacing?: UserSettings['lineSpacing']): number {
  if (spacing === 'tight' || spacing === 'compact') return 1.3;
  if (spacing === 'roomy' || spacing === 'spacious') return 2.05;
  if (spacing === 'relaxed') return 1.85;
  return 1.65;
}

function bionicBoldLength(wordLength: number, intensity?: UserSettings['bionicIntensity']): number {
  const ratio =
    intensity === 'light' || intensity === 'low'
      ? 0.35
      : intensity === 'strong' || intensity === 'high'
      ? 0.62
      : 0.48;
  return Math.min(wordLength, Math.max(1, Math.ceil(wordLength * ratio)));
}

const PREVIEW_PALETTE: Record<string, { bg: string; border: string; text: string }> = {
  black: { bg: '#0c0b09', border: '#27231e', text: '#f5efe3' },
  dark: { bg: '#191612', border: '#332d25', text: '#f3ede2' },
  sepia: { bg: '#f4ecd8', border: '#d8ccb0', text: '#3a2c1c' },
  white: { bg: '#ffffff', border: '#e5e0d8', text: '#1c1917' },
};

// Inline end-of-chapter recall card — flows at the foot of the chapter column so
// finishing a chapter prompts anchor retrieval right above Next chapter without
// covering the scripture text.
const RecallCard: React.FC<{
  bookId: string;
  chapter: number;
  anchor: { word: string; scene: string };
  revealed: boolean;
  graded: boolean;
  nextLabel: string | null;
  onReveal: () => void;
  onGrade: (score: number) => void;
  onDismiss: () => void;
  onNextChapter: () => void;
}> = ({ bookId, chapter, anchor, revealed, graded, nextLabel, onReveal, onGrade, onDismiss, onNextChapter }) => {
  const [imgErr, setImgErr] = useState(false);
  const imgPath = `/chapters/${bookId}/ch${chapter}.png`;

  return (
    <div
      className="mt-10 rounded-2xl border border-card-border bg-card p-5 shadow-sm flex flex-col gap-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.6875rem] font-bold text-accent uppercase tracking-widest">
          What anchors chapter {chapter}?
        </span>
        {!graded && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 -mr-1 rounded-full hover:bg-card-hover transition-colors"
            aria-label="Dismiss recall prompt"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        )}
      </div>

      {graded ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Check className="w-4 h-4 text-green-500 shrink-0" />
            <span>Chapter recall logged · {anchor.word}</span>
          </div>
          {nextLabel && (
            <button
              type="button"
              onClick={onNextChapter}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-on-accent hover:opacity-90 transition-opacity"
            >
              <span>Next chapter ({nextLabel})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3.5">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-card-elevated flex-shrink-0 border border-card-border">
              {!imgErr ? (
                <img
                  src={imgPath}
                  alt=""
                  loading="lazy"
                  onError={() => setImgErr(true)}
                  className={`absolute inset-0 w-full h-full object-cover object-top transition-all ${revealed ? '' : 'blur-[6px] scale-105'}`}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-lg font-heading font-bold text-muted/40">
                  {chapter}
                </div>
              )}
            </div>

            {!revealed ? (
              <button
                type="button"
                onClick={onReveal}
                className="flex-1 text-left px-4 py-3 rounded-xl border border-dashed border-card-border-hover text-sm font-semibold text-accent hover:border-accent/60 transition-colors"
              >
                Reveal anchor
              </button>
            ) : (
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <span className="font-heading font-bold text-accent text-base">{anchor.word}</span>
                <span className="text-xs text-secondary italic leading-snug">{anchor.scene}</span>
              </div>
            )}
          </div>

          {revealed && <ReviewGrades onGrade={onGrade} />}

          {nextLabel && (
            <div className="pt-1 border-t border-card-border/60 flex justify-end">
              <button
                type="button"
                onClick={onNextChapter}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                <span>Next chapter · {nextLabel}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Headings from other translations are used when the selected translation 
// lacks them. They are rendered without a translation tag to avoid confusion.
function renderHeading(text: string, _borrowed = false): string {
  return `<div class="${HEADING_CLASSES}">${text}</div>`;
}

interface StreamChapter {
  key: string;
  bookId: string;
  chapter: number;
  verses: Verse[];
}

function getMemorizedSetForChapter(
  savedVerses: MemoryVerse[],
  targetBookId: string,
  targetChapter: number,
  version: string,
): Set<number> {
  const memSet = new Set<number>();
  const englishBookName = ALL_BOOKS.find(b => b.id === targetBookId)?.name || targetBookId;
  const localizedBookName = getBookName(targetBookId, englishBookName, version);
  const validPrefixes = [
    `${englishBookName} ${targetChapter}:`,
    `${localizedBookName} ${targetChapter}:`,
  ];

  savedVerses.forEach(v => {
    const normalizedRef = (v.ref || '').replace(/[–—]/g, '-').trim();
    for (const prefix of validPrefixes) {
      if (normalizedRef.startsWith(prefix)) {
        const versePart = normalizedRef.substring(prefix.length).trim();
        if (versePart.includes('-')) {
          const [start, end] = versePart.split('-').map(n => parseInt(n.trim(), 10));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) memSet.add(i);
          }
        } else if (versePart.includes(',')) {
          versePart.split(',').forEach(n => {
            const num = parseInt(n.trim(), 10);
            if (!isNaN(num)) memSet.add(num);
          });
        } else {
          const num = parseInt(versePart, 10);
          if (!isNaN(num)) memSet.add(num);
        }
        break;
      }
    }
  });

  return memSet;
}

function buildChapterHtml(params: {
  bookId: string;
  chapter: number;
  verses: Verse[];
  borrowedHeadings: Record<number, string[]> | null;
  selectedVerses: number[];
  memorizedVerses: Set<number>;
  flashVerse: number | null;
  activeTtsVerse: number | null;
  settings: UserSettings;
  crossRefIndex: CrossReferenceIndex | null;
  paragraphBreaks: Record<string, Record<string, number[]>> | null;
}): string {
  const {
    bookId,
    chapter,
    verses,
    borrowedHeadings,
    selectedVerses,
    memorizedVerses,
    flashVerse,
    activeTtsVerse,
    settings,
    crossRefIndex,
    paragraphBreaks,
  } = params;
  let html = '';
  const display = readingDisplay(settings);
  const bollsId = BOLLS_BIBLE_MAP[bookId];
  let quoteLevel = 0;

  verses.forEach((v) => {
    let text = v.text;

    let heading = '';
    let hasHeading = false;
    text = text.replace(/<b>(.*?)<\/b>/gi, (_, hText) => {
      hasHeading = true;
      if (display.showSectionHeadings) heading += renderHeading(hText);
      return '';
    });

    if (!hasHeading && borrowedHeadings) {
      for (const borrowed of borrowedHeadings[v.verse] || []) {
        hasHeading = true;
        if (display.showSectionHeadings) heading += renderHeading(borrowed, true);
      }
    }

    const hasLeadingBr = /^\s*<br\s*\/?>/i.test(text);
    text = text.replace(/^(?:\s*<br\s*\/?>\s*)+/gi, '');
    text = text.replace(/(?:\s*<br\s*\/?>\s*)+$/gi, '');

    const isOtQuoteVerse = otQuotes[bollsId]?.[chapter]?.includes(v.verse);
    if (isOtQuoteVerse) {
      const parts = text.split(/([\u201c\u201d\u2018\u2019]|(?<!\w)\u2019|\u2019(?!\w))/);
      let newText = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;
        if (part === '"') {
          if (quoteLevel > 0) quoteLevel--;
          else quoteLevel++;
          newText += part;
        } else if (part === '\u201c' || part === '\u2018') {
          quoteLevel++;
          newText += part;
        } else if (part === '\u201d' || part === '\u2019') {
          quoteLevel = Math.max(0, quoteLevel - 1);
          newText += part;
        } else if (quoteLevel > 0 && part.trim().length > 0) {
          newText += `<span class="uppercase">${part}</span>`;
        } else {
          newText += part;
        }
      }
      text = newText;
    } else {
      quoteLevel = 0;
    }

    let psalmTitle = '';
    if (bookId === 'psalms' && v.verse === 1) {
      const titleMatch = text.match(/^([\s\S]*?[a-z]\.)([A-Z][\s\S]*)$/);
      if (titleMatch) {
        psalmTitle = `<div class="text-sm font-medium text-muted italic mb-2 tracking-wide leading-relaxed">${titleMatch[1]}</div>`;
        text = titleMatch[2];
      }
    }

    text = text.replace(/([a-z][.?!;:,])([A-Z])/g, '$1 $2');
    text = text.replace(/<S>\d+<\/S>/gi, '');
    text = text.replace(/<sup\b[^>]*>.*?<\/sup>/gi, '');
    text = text.replace(/<i>(.*?)<\/i>/gi, '<span class="opacity-60 italic">$1</span>');

    if (settings.bionicReading) {
      text = text.replace(/([a-zA-Z\u00C0-\u024F]+)(?![^<]*>)/g, (word) => {
        const cut = bionicBoldLength(word.length, settings.bionicIntensity);
        return `<strong class="font-bold">${word.substring(0, cut)}</strong>${word.substring(cut)}`;
      });
    }

    const chapterBreaks = paragraphBreaks?.[bookId]?.[String(chapter)];
    const isFirstVerseOfChapter = verses.length > 0 && v.verse === verses[0].verse;
    const isParagraphStart = !isFirstVerseOfChapter && (
      chapterBreaks ? chapterBreaks.includes(v.verse) : (hasHeading || hasLeadingBr)
    );

    if (heading) {
      html += heading;
    } else if (isParagraphStart) {
      html += `<div class="block w-full h-5"></div>`;
    }
    if (psalmTitle) {
      html += psalmTitle;
    }

    const inLibrary = memorizedVerses.has(v.verse);
    const isSelected = selectedVerses.includes(v.verse);
    const isSpeaking = activeTtsVerse === v.verse;

    let extraClass = '';
    if (v.verse === flashVerse) {
      extraClass = 'bg-green-500/30 rounded px-1 -mx-1 transition-colors duration-1000';
    } else if (isSelected) {
      extraClass = 'bg-accent/20 text-primary underline decoration-accent underline-offset-4 decoration-2 rounded px-1 -mx-1';
    } else if (isSpeaking) {
      extraClass = 'bg-accent/15 rounded px-1 -mx-1';
    } else if (inLibrary) {
      extraClass = 'verse-memorized rounded px-1 -mx-1';
    }

    const pilcrowHtml = isParagraphStart && display.showParagraphMarks
      ? `<span class="text-accent/40 font-sans mr-0.5 select-none pointer-events-none">¶ </span>`
      : '';
    const verseNumClass = isParagraphStart ? 'font-bold text-foreground' : 'font-normal text-muted';
    const vid = toVerseIndex(bookId, chapter, v.verse);
    const hasCrossRefs = vid !== null && !!crossRefIndex?.hasConnections(vid, 4);
    const crossRefMarker = hasCrossRefs && display.showCrossRefMarkers
      ? `<sup class="xref-marker text-[0.5em] text-accent/70 hover:text-accent ml-0.5 cursor-pointer align-super transition-colors" data-xref-book="${bookId}" data-xref-chapter="${chapter}" data-xref-verse="${v.verse}" role="button" tabindex="0" aria-label="Cross references for verse ${v.verse}">✻</sup>`
      : '';
    const verseNumHtml = display.showVerseNumbers
      ? `<sup class="text-[0.55em] ${verseNumClass} ml-0.5 mr-1.5 relative -top-[0.4em] select-none pointer-events-none">${v.verse}</sup>`
      : '';

    const bookNum = ALL_BOOKS.findIndex(b => b.id === bookId) + 1;
    const ariaLabel = `Verse ${v.verse}${isSelected ? ', selected' : ''}${inLibrary ? ', in your library' : ''}`;
    html += `<span class="inline verse-span cursor-pointer transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${extraClass}" data-verse-book="${bookId}" data-verse-chapter="${chapter}" data-verse="${v.verse}" data-verse-ref="${bookNum}-${chapter}-${v.verse}" tabindex="0" role="button" aria-pressed="${isSelected}" aria-label="${ariaLabel}">${pilcrowHtml}${verseNumHtml}<span class="inline pointer-events-none">${text}</span>${crossRefMarker} </span>`;
  });

  return html;
}

export function ChapterReader({ bookId, chapter, bookTitle, initialVerse, onClose }: ChapterReaderProps) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [chapterWindow, setChapterWindow] = useState<StreamChapter[]>([]);
  const [prefetchedHeadings, setPrefetchedHeadings] = useState<Record<string, Record<number, string[]> | null>>({});
  const [nextPrefetchLoading, setNextPrefetchLoading] = useState(false);
  const [nextPrefetchError, setNextPrefetchError] = useState<string | null>(null);
  const nextPrefetchKeyRef = useRef<string | null>(null);

  const [borrowedHeadings, setBorrowedHeadings] = useState<Record<number, string[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingHighlight, setPendingHighlight] = useState<{ book: string; chapter: number; verse: number } | null>(null);
  const [flashVerse, setFlashVerse] = useState<{ book: string; chapter: number; verse: number } | null>(null);
  const [returnStack, setReturnStack] = useState<{ book: string; chapter: number; verse: number }[]>([]);
  const [crossRefPeekSource, setCrossRefPeekSource] = useState<{ book: string; chapter: number } | null>(null);
  const navigate = useNavigate();

  const { state, dispatch } = useApp();
  const bibleVersion = state.settings.bibleVersion || 'LSB';
  const continueChapters = state.settings.continueChapters !== false;
  const { showToast } = useToast();
  const [keepImmerseAwake, setKeepImmerseAwake] = useKeepImmerseAwake();

  const [activeStreamPos, setActiveStreamPos] = useState<{ bookId: string; chapter: number; verse: number }>({
    bookId,
    chapter,
    verse: initialVerse || 1,
  });

  const activeBookId = activeStreamPos.bookId;
  const activeChapterNum = activeStreamPos.chapter;
  const activeBookObj = useMemo(() => ALL_BOOKS.find(b => b.id === activeBookId) || null, [activeBookId]);
  const activeBookTitle = activeBookObj?.name || bookTitle;

  const activeWindowEntry = useMemo(
    () => chapterWindow.find(c => c.bookId === activeBookId && c.chapter === activeChapterNum) || null,
    [chapterWindow, activeBookId, activeChapterNum]
  );
  const activeVerses = activeWindowEntry ? activeWindowEntry.verses : verses;

  // Refs to coordinate seamless cross-chapter navigation inside Immerse and TTS without tearing them down.
  const preserveModeOnRouteChangeRef = useRef(false);
  const immerseContinuationTargetRef = useRef<'first' | 'last' | null>(null);
  const immerseOpenRef = useRef(false);
  const continueChaptersRef = useRef(continueChapters);
  const bibleVersionRef = useRef(bibleVersion);
  const activeStreamPosRef = useRef(activeStreamPos);
  const programmaticScrollUntilRef = useRef(0);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    continueChaptersRef.current = continueChapters;
    bibleVersionRef.current = bibleVersion;
    activeStreamPosRef.current = activeStreamPos;
  }, [continueChapters, bibleVersion, activeStreamPos]);

  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [showOptions, setShowOptions] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showCommentaryModal, setShowCommentaryModal] = useState(false);
  const [immerseChapterOpen, setImmerseChapterOpen] = useState(false);
  const [immerseVerseIdx, setImmerseVerseIdx] = useState(0);
  const [isSpeakingChapter, setIsSpeakingChapter] = useState(false);
  const [activeTtsVerse, setActiveTtsVerse] = useState<{ bookId: string; chapter: number; verse: number } | null>(null);
  const [followAudio, setFollowAudio] = useState(true);
  const followAudioRef = useRef(true);
  const speechIdRef = useRef(0);

  const [advancedReadingOptionsOpen, setAdvancedReadingOptionsOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [selectionScope, setSelectionScope] = useState<{ bookId: string; chapter: number }>({
    bookId,
    chapter,
  });
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [asOnePassage, setAsOnePassage] = useState(true);
  const [memoryHookText, setMemoryHookText] = useState('');
  const [startLearningNow, setStartLearningNow] = useState(true);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [navigatorBook, setNavigatorBook] = useState(bookId);
  const chapterGridRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [retryCount, setRetryCount] = useState(0);
  const versesChapterRef = useRef<string>('');
  const consumedHighlightRef = useRef<{ book: string; chapter: number; verse: number } | null>(null);

  useEffect(() => {
    immerseOpenRef.current = immerseChapterOpen;
  }, [immerseChapterOpen]);

  useEffect(() => {
    followAudioRef.current = followAudio;
  }, [followAudio]);

  const goToChapter = useCallback((targetBookId: string, targetChapter: number, replace = false) => {
    const path = readerPath(targetBookId, targetChapter);
    if (path) navigate(path, { replace });
  }, [navigate]);

  const stopChapterSpeech = useCallback(() => {
    speechIdRef.current += 1;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore speech synthesis errors on unsupported runtimes.
    }
    setIsSpeakingChapter(false);
    setActiveTtsVerse(null);
  }, []);

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      stopChapterSpeech();
    };
  }, [stopChapterSpeech]);

  useEffect(() => {
    saveReaderPosition(activeBookId, activeChapterNum, activeStreamPos.verse);
  }, [activeBookId, activeChapterNum, activeStreamPos.verse]);

  useEffect(() => {
    setShowOptions(false);
    setShowOverflowMenu(false);
    setShowCommentaryModal(false);
    setNextPrefetchError(null);
    nextPrefetchKeyRef.current = null;

    if (preserveModeOnRouteChangeRef.current) {
      preserveModeOnRouteChangeRef.current = false;
      setActiveStreamPos(prev => ({
        bookId,
        chapter,
        verse: immerseContinuationTargetRef.current === 'last' ? Math.max(1, prev.verse) : (initialVerse || 1),
      }));
      return;
    }

    setImmerseChapterOpen(false);
    setImmerseVerseIdx(0);
    immerseContinuationTargetRef.current = null;
    stopChapterSpeech();
    setScrollProgress(0);
    setActiveStreamPos({ bookId, chapter, verse: initialVerse || 1 });
    setSelectionScope({ bookId, chapter });
    setSelectedVerses([]);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [bookId, chapter, initialVerse, stopChapterSpeech]);

  const buildMemoryVersesForChapter = useCallback(
    (targetBookId: string, targetChapter: number, targetVerses: Verse[]): MemoryVerse[] => {
      const targetEnglish = ALL_BOOKS.find(b => b.id === targetBookId)?.name || targetBookId;
      const localizedBook = getBookName(targetBookId, targetEnglish, bibleVersion);
      const nowIso = new Date().toISOString();
      return targetVerses.map((v) => ({
        id: `${targetBookId}-${targetChapter}-${v.verse}`,
        ref: `${localizedBook} ${targetChapter}:${v.verse}`,
        text: stripHtmlTags(v.text),
        translation: bibleVersion,
        addedDate: nowIso,
        status: 'learning',
        sm2: { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: nowIso },
        streak: 0,
        attempts: 0,
      }));
    },
    [bibleVersion]
  );

  const chapterMemoryVerses = useMemo<MemoryVerse[]>(
    () => buildMemoryVersesForChapter(activeBookId, activeChapterNum, activeVerses),
    [buildMemoryVersesForChapter, activeBookId, activeChapterNum, activeVerses]
  );

  const speakChapterQueue = useCallback(
    (
      targetBookId: string,
      targetChapter: number,
      targetVerses: Verse[],
      startIndex: number,
      boundedSelection: boolean,
    ) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        showToast('Speech synthesis is not available on this device.', 'error');
        return;
      }
      if (targetVerses.length === 0) return;

      const mySpeechId = ++speechIdRef.current;
      window.speechSynthesis.cancel();
      setIsSpeakingChapter(true);
      setFollowAudio(true);
      followAudioRef.current = true;

      const speakAt = (pos: number, queueBookId: string, queueChapter: number, queueVerses: Verse[]) => {
        if (isUnmountedRef.current || speechIdRef.current !== mySpeechId) return;

        if (pos >= queueVerses.length) {
          if (!boundedSelection && continueChaptersRef.current) {
            const nextCoord = adjacentReadingChapter(ALL_BOOKS, queueBookId, queueChapter, 1);
            if (nextCoord) {
              const bollsId = BOLLS_BIBLE_MAP[nextCoord.bookId];
              const version = bibleVersionRef.current;
              if (bollsId) {
                fetchChapterText(version, bollsId, nextCoord.chapter)
                  .then((nextVerses) => {
                    if (isUnmountedRef.current || speechIdRef.current !== mySpeechId || nextVerses.length === 0) {
                      return;
                    }
                    const nextKey = `${nextCoord.bookId}:${nextCoord.chapter}`;
                    const nextEntry: StreamChapter = {
                      key: nextKey,
                      bookId: nextCoord.bookId,
                      chapter: nextCoord.chapter,
                      verses: nextVerses,
                    };
                    if (immerseOpenRef.current) {
                      preserveModeOnRouteChangeRef.current = true;
                      immerseContinuationTargetRef.current = 'first';
                      goToChapter(nextCoord.bookId, nextCoord.chapter, true);
                    } else if (followAudioRef.current) {
                      setChapterWindow(prev => mergeReadingWindow(prev, nextEntry, nextCoord, ALL_BOOKS));
                    }
                    setActiveStreamPos({
                      bookId: nextCoord.bookId,
                      chapter: nextCoord.chapter,
                      verse: nextVerses[0].verse,
                    });
                    speakAt(0, nextCoord.bookId, nextCoord.chapter, nextVerses);
                  })
                  .catch(() => {
                    if (speechIdRef.current === mySpeechId) {
                      setIsSpeakingChapter(false);
                      setActiveTtsVerse(null);
                      showToast("Couldn't load next chapter for audio.", 'error');
                    }
                  });
                return;
              }
            }
          }
          setIsSpeakingChapter(false);
          setActiveTtsVerse(null);
          return;
        }

        const item = queueVerses[pos];
        const plain = stripHtmlTags(item.text);
        if (!plain.trim()) {
          speakAt(pos + 1, queueBookId, queueChapter, queueVerses);
          return;
        }

        setActiveTtsVerse({ bookId: queueBookId, chapter: queueChapter, verse: item.verse });
        if (immerseOpenRef.current) {
          setActiveStreamPos(prev =>
            prev.bookId === queueBookId && prev.chapter === queueChapter
              ? { ...prev, verse: item.verse }
              : { bookId: queueBookId, chapter: queueChapter, verse: item.verse }
          );
          setImmerseVerseIdx(pos);
        } else if (followAudioRef.current) {
          setActiveStreamPos({ bookId: queueBookId, chapter: queueChapter, verse: item.verse });
          programmaticScrollUntilRef.current = performance.now() + 700;
          requestAnimationFrame(() => {
            const el = document.querySelector(
              `[data-verse-book="${queueBookId}"][data-verse-chapter="${queueChapter}"][data-verse="${item.verse}"]`
            );
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        }

        const utterance = new SpeechSynthesisUtterance(plain);
        utterance.rate = 0.95;
        utterance.onend = () => {
          if (speechIdRef.current !== mySpeechId) return;
          speakAt(pos + 1, queueBookId, queueChapter, queueVerses);
        };
        utterance.onerror = () => {
          if (speechIdRef.current === mySpeechId) {
            setIsSpeakingChapter(false);
            setActiveTtsVerse(null);
          }
        };
        window.speechSynthesis.speak(utterance);
      };

      const clampedStart = Math.max(0, Math.min(startIndex, targetVerses.length - 1));
      speakAt(clampedStart, targetBookId, targetChapter, targetVerses);
    },
    [goToChapter, showToast]
  );

  const speakChapterFrom = useCallback(
    (startIndex = 0) => {
      speakChapterQueue(activeBookId, activeChapterNum, activeVerses, startIndex, false);
    },
    [speakChapterQueue, activeBookId, activeChapterNum, activeVerses]
  );

  const toggleSpeakChapter = useCallback(() => {
    if (isSpeakingChapter) {
      stopChapterSpeech();
      return;
    }
    if (!immerseChapterOpen && selectedVerses.length > 0) {
      const targetEntry = chapterWindow.find(
        c => c.bookId === selectionScope.bookId && c.chapter === selectionScope.chapter
      );
      const sourceVerses = targetEntry ? targetEntry.verses : activeVerses;
      const ordered = [...selectedVerses].sort((a, b) => a - b);
      const selectedQueue = sourceVerses.filter(v => ordered.includes(v.verse));
      if (selectedQueue.length > 0) {
        speakChapterQueue(selectionScope.bookId, selectionScope.chapter, selectedQueue, 0, true);
        return;
      }
    }
    const startIdx = Math.max(0, activeVerses.findIndex(v => v.verse >= activeStreamPos.verse));
    speakChapterQueue(activeBookId, activeChapterNum, activeVerses, startIdx, false);
  }, [
    isSpeakingChapter,
    stopChapterSpeech,
    immerseChapterOpen,
    selectedVerses,
    chapterWindow,
    selectionScope,
    activeVerses,
    activeStreamPos.verse,
    activeBookId,
    activeChapterNum,
    speakChapterQueue,
  ]);
  
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const newTopic = { id: crypto.randomUUID(), name: newGroupName.trim() };
    dispatch({ type: 'ADD_TOPIC', payload: newTopic });
    setSelectedTopicIds(prev => (prev.includes(newTopic.id) ? prev : [...prev, newTopic.id]));
    setNewGroupName('');
    setIsAddingGroup(false);
  };
  // For the navigator's book list — same theme-word/division/mastery treatment as
  // the Bible index modal (Guides.tsx), so the two most-seen book lists in the app
  // read the same way instead of one carrying mnemonic context and the other not.
  const navigatorMastery = useMastery(ALL_BOOKS);
  // The one-word chapter anchor from the book guide (e.g. "HANDS" for Genesis 27) —
  // the same mnemonic the guide page teaches, resurfaced here so it isn't lost the
  // moment a reader leaves that page. Guides key anchors by chapter number only, so
  // this doesn't apply to single-chapter books where the guide's "chapters" are
  // really verse ranges.
  const currentGuide: any = useMemo(() => ALL_GUIDES.find((g: any) => g.id === activeBookId), [activeBookId]);
  const chapterAnchor = useMemo(() => {
    return currentGuide?.anchors?.find((a: any) => Number(a.ch) === activeChapterNum) || null;
  }, [currentGuide, activeChapterNum]);
  // The neighboring chapters' own anchors, so paging becomes a repetition of the
  // chain instead of a bare number — "‹ STEW 25" tells you what's back there without
  // having to go look. Only meaningful within the same book (a book boundary already
  // shows the adjacent book's name instead — see prevLabel/nextLabel below), and not
  // for single-chapter books, whose "anchors" are verse ranges, not chapter numbers.
  const neighborAnchors = useMemo(() => {
    if (!currentGuide?.anchors) return { prev: null as string | null, next: null as string | null };
    if (state.settings.anchorReveal === 'never') return { prev: null, next: null };
    const isVerseBased = !!currentGuide.architecture?.some((b: any) => b.unit === 'verse');
    if (isVerseBased) return { prev: null, next: null };
    const find = (ch: number) => currentGuide.anchors!.find((a: any) => Number(a.ch) === ch)?.word || null;
    return { prev: find(activeChapterNum - 1), next: find(activeChapterNum + 1) };
  }, [currentGuide, activeChapterNum, state.settings.anchorReveal]);
  const [showCrossReferences, setShowCrossReferences] = useState<string[] | null>(null);
  const [crossRefInitialSection, setCrossRefInitialSection] = useState<'references' | 'referenced-by' | 'same-word' | undefined>(undefined);
  const [crossRefIndex, setCrossRefIndex] = useState<CrossReferenceIndex | null>(getCrossReferenceIndexIfLoaded);
  const [paragraphBreaks, setParagraphBreaks] = useState<Record<string, Record<string, number[]>> | null>(cachedParagraphBreaks);

  const anchorReveal = state.settings.anchorReveal || 'tap';

  const chapterKey = useMemo(() => chapterProgressKey(activeBookId, activeChapterNum), [activeBookId, activeChapterNum]);
  const chapterRecord = state.chapterProgress[chapterKey];

  const [recallCardShownThisVisit, setRecallCardShownThisVisit] = useState(false);
  const [recallRevealed, setRecallRevealed] = useState(false);
  const [recallGradedOnVisit, setRecallGradedOnVisit] = useState(false);
  const [recallDismissedOnVisit, setRecallDismissedOnVisit] = useState(false);
  useEffect(() => {
    setRecallCardShownThisVisit(false);
    setRecallRevealed(false);
    setRecallGradedOnVisit(false);
    setRecallDismissedOnVisit(false);
  }, [activeBookId, activeChapterNum]);

  const markChapterRead = useCallback(() => {
    dispatch({ type: 'MARK_CHAPTER_READ', payload: { bookId: activeBookId, chapter: activeChapterNum } });
  }, [dispatch, activeBookId, activeChapterNum]);

  const gradeChapterRecall = (score: number) => {
    const base = chapterRecord?.sm2 || { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() };
    const { newSM2, newStatus } = evaluateSM2(base, score, 'anchor', state.settings.intervalScale ?? 1);
    const updated: ChapterProgress = {
      bookId: activeBookId,
      chapter: activeChapterNum,
      sm2: newSM2,
      status: newStatus,
      attempts: (chapterRecord?.attempts || 0) + 1,
      lastScore: score,
      lastAttemptDate: new Date().toISOString(),
      readCount: chapterRecord?.readCount || 0,
      lastReadDate: chapterRecord?.lastReadDate || null,
    };
    dispatch({ type: 'GRADE_CHAPTER_PROGRESS', payload: updated });
    dispatch({
      type: 'RECORD_REVIEW',
      payload: buildReviewEvent({
        itemKind: 'anchor',
        itemId: chapterKey,
        gradeSubmitted: score,
        before: chapterRecord?.sm2, after: newSM2,
        mode: 'reveal', cueLevel: 0, direction: 'n2w',
      }),
    });
    if (state.settings.streakIncludesChapters !== false) {
      dispatch({ type: 'RECORD_ACTIVITY' });
    }
    setRecallGradedOnVisit(true);
    showToast('Chapter recall logged.', 'success');
  };

  const dismissRecallCard = () => {
    recallCardDismissCount += 1;
    setRecallDismissedOnVisit(true);
  };

  // Chrome (top header + bottom nav) visibility
  const [chromeVisible, setChromeVisible] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const scrollAnchorSnapshotRef = useRef<{ key: string; top: number; prevFirstKey: string } | null>(null);

  const revealChrome = useCallback(() => setChromeVisible(true), []);
  const toggleChrome = useCallback(() => setChromeVisible(v => !v), []);

  useEffect(() => {
    if (!chromeVisible) {
      setShowOptions(false);
      setShowOverflowMenu(false);
    }
  }, [chromeVisible]);

  const handleContentClick = (e: React.MouseEvent) => {
    if (showOptions || showOverflowMenu) {
      setShowOptions(false);
      setShowOverflowMenu(false);
      return;
    }
    const target = e.target as HTMLElement;
    const isMeaningfulTap = !!target.closest('.verse-span, button, a');
    if (isMeaningfulTap) {
      revealChrome();
    } else {
      toggleChrome();
    }
  };

  useEffect(() => {
    setChromeVisible(true);
  }, [bookId, chapter]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, []);

  React.useLayoutEffect(() => {
    const snap = scrollAnchorSnapshotRef.current;
    scrollAnchorSnapshotRef.current = null;
    if (!snap || !scrollContainerRef.current) return;
    if (chapterWindow[0]?.key === snap.prevFirstKey) return;
    const el = scrollContainerRef.current.querySelector(`[data-chapter-key="${snap.key}"]`) as HTMLElement | null;
    if (!el) return;
    const delta = el.getBoundingClientRect().top - snap.top;
    if (Math.abs(delta) > 1) {
      scrollContainerRef.current.scrollTop += delta;
    }
  }, [chapterWindow]);

  const prefetchNextStreamChapter = useCallback((retry = false) => {
    if (!continueChapters || loading || nextPrefetchLoading) return;
    const tail = chapterWindow[chapterWindow.length - 1] || { key: `${bookId}:${chapter}`, bookId, chapter, verses };
    const nextCoord = adjacentReadingChapter(ALL_BOOKS, tail.bookId, tail.chapter, 1);
    if (!nextCoord) return;
    const nextKey = `${nextCoord.bookId}:${nextCoord.chapter}`;
    if (chapterWindow.some(c => c.key === nextKey)) return;
    if (!retry && nextPrefetchError && nextPrefetchKeyRef.current === nextKey) return;

    const currentFocusIdx = chapterWindow.findIndex(
      c => c.bookId === activeStreamPosRef.current.bookId && c.chapter === activeStreamPosRef.current.chapter
    );
    if (currentFocusIdx >= 0 && chapterWindow.length - 1 - currentFocusIdx >= 2) return;

    const bollsId = BOLLS_BIBLE_MAP[nextCoord.bookId];
    if (!bollsId) return;

    nextPrefetchKeyRef.current = nextKey;
    setNextPrefetchLoading(true);
    setNextPrefetchError(null);

    fetchChapterText(bibleVersion, bollsId, nextCoord.chapter)
      .then((nextVerses) => {
        if (isUnmountedRef.current || nextPrefetchKeyRef.current !== nextKey) return;
        const lsbHeadings = bibleVersion === 'LSB'
          ? null
          : chapterTextSettled.get(chapterCacheKey('LSB', bollsId, nextCoord.chapter));
        if (lsbHeadings) {
          setPrefetchedHeadings(prev => ({ ...prev, [nextKey]: extractHeadings(lsbHeadings) }));
        }
        const focus = activeStreamPosRef.current;
        const container = scrollContainerRef.current;
        if (container && chapterWindow.length >= 5) {
          const activeKey = `${focus.bookId}:${focus.chapter}`;
          const activeEl = container.querySelector(`[data-chapter-key="${activeKey}"]`) as HTMLElement | null;
          if (activeEl) {
            scrollAnchorSnapshotRef.current = {
              key: activeKey,
              top: activeEl.getBoundingClientRect().top,
              prevFirstKey: chapterWindow[0]?.key || '',
            };
          }
        }
        const loaded: StreamChapter = {
          key: nextKey,
          bookId: nextCoord.bookId,
          chapter: nextCoord.chapter,
          verses: nextVerses,
        };
        setChapterWindow(prev => mergeReadingWindow(prev, loaded, focus, ALL_BOOKS));
      })
      .catch(() => {
        if (isUnmountedRef.current || nextPrefetchKeyRef.current !== nextKey) return;
        setNextPrefetchError(`Couldn't load the next chapter.`);
      })
      .finally(() => {
        if (!isUnmountedRef.current) setNextPrefetchLoading(false);
      });
  }, [continueChapters, loading, nextPrefetchLoading, nextPrefetchError, chapterWindow, bookId, chapter, verses, bibleVersion]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (showOptions) setShowOptions(false);
    if (showOverflowMenu) setShowOverflowMenu(false);

    if (isSpeakingChapter && performance.now() > programmaticScrollUntilRef.current) {
      setFollowAudio(false);
    }

    const target = e.currentTarget;
    const totalHeight = target.scrollHeight - target.clientHeight;
    if (totalHeight > 0) {
      const progress = (target.scrollTop / totalHeight) * 100;
      setScrollProgress(progress);

      if (progress >= 98 && !recallCardShownThisVisit) {
        setRecallCardShownThisVisit(true);
        markChapterRead();
      }
    }

    // Detect active chapter & reading verse at the reading line below header.
    const readingLineY = (headerHeight || 80) + 28;
    const verseSpans = target.querySelectorAll('.verse-span');
    let hitSpan: Element | null = null;
    for (let i = 0; i < verseSpans.length; i++) {
      const rect = verseSpans[i].getBoundingClientRect();
      if (rect.bottom >= readingLineY) {
        hitSpan = verseSpans[i];
        break;
      }
    }
    if (hitSpan) {
      const hBook = hitSpan.getAttribute('data-verse-book');
      const hCh = parseInt(hitSpan.getAttribute('data-verse-chapter') || '', 10);
      const hVerse = parseInt(hitSpan.getAttribute('data-verse') || '', 10);
      if (hBook && Number.isFinite(hCh) && Number.isFinite(hVerse)) {
        setActiveStreamPos(prev =>
          prev.bookId === hBook && prev.chapter === hCh && prev.verse === hVerse
            ? prev
            : { bookId: hBook, chapter: hCh, verse: hVerse }
        );
      }
    }

    // Prefetch next chapter when nearing the bottom in continuous mode.
    if (continueChapters && target.scrollHeight - target.scrollTop - target.clientHeight < 650) {
      prefetchNextStreamChapter(false);
    }
  };

  useEffect(() => {
    if (loading || verses.length === 0) return;

    const timer = setTimeout(() => {
      const target = scrollContainerRef.current;
      if (!target) return;

      const totalHeight = target.scrollHeight - target.clientHeight;
      if (totalHeight <= 0 && !recallCardShownThisVisit) {
        setRecallCardShownThisVisit(true);
        markChapterRead();
      }
      if (continueChapters && totalHeight < 650) {
        prefetchNextStreamChapter(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [loading, verses, chapterWindow.length, recallCardShownThisVisit, markChapterRead, continueChapters, prefetchNextStreamChapter]);

  // Compute prev/next labels for the navigation bar using active stream chapter
  const bookIndex = ALL_BOOKS.findIndex(b => b.id === activeBookId);
  const currentBook = bookIndex !== -1 ? ALL_BOOKS[bookIndex] : null;

  let prevLabel: string | null = null;
  let prevAbbrLabel: string | null = null;
  let nextLabel: string | null = null;
  let nextAbbrLabel: string | null = null;

  const getAbbr = (name: string) => {
    if (state.settings.bibleVersion === 'TELIRV' || state.settings.bibleVersion === 'TBSI') return name;
    if (name.length <= 4) return name;
    if (name.startsWith('1 ') || name.startsWith('2 ') || name.startsWith('3 ')) {
      return name.substring(0, 5).replace(' ', '');
    }
    return name.substring(0, 3);
  };

  if (currentBook) {
    if (activeChapterNum > 1) {
      const anchorPrefix = neighborAnchors.prev ? `${neighborAnchors.prev} · ` : '';
      prevLabel = `${anchorPrefix}${getBookName(activeBookId, activeBookTitle, state.settings.bibleVersion)} ${activeChapterNum - 1}`;
      prevAbbrLabel = neighborAnchors.prev ? `${neighborAnchors.prev} ${activeChapterNum - 1}` : `${getAbbr(getBookName(activeBookId, activeBookTitle, state.settings.bibleVersion))} ${activeChapterNum - 1}`;
    } else if (bookIndex > 0) {
      const prev = ALL_BOOKS[bookIndex - 1];
      prevLabel = `${getBookName(prev.id, prev.name, state.settings.bibleVersion)} ${prev.chapters}`;
      prevAbbrLabel = `${getAbbr(getBookName(prev.id, prev.name, state.settings.bibleVersion))} ${prev.chapters}`;
    }

    if (activeChapterNum < currentBook.chapters) {
      const anchorSuffix = neighborAnchors.next ? ` · ${neighborAnchors.next}` : '';
      nextLabel = `${getBookName(activeBookId, activeBookTitle, state.settings.bibleVersion)} ${activeChapterNum + 1}${anchorSuffix}`;
      nextAbbrLabel = neighborAnchors.next ? `${activeChapterNum + 1} ${neighborAnchors.next}` : `${getAbbr(getBookName(activeBookId, activeBookTitle, state.settings.bibleVersion))} ${activeChapterNum + 1}`;
    } else if (bookIndex < ALL_BOOKS.length - 1) {
      nextLabel = `${getBookName(ALL_BOOKS[bookIndex + 1].id, ALL_BOOKS[bookIndex + 1].name, state.settings.bibleVersion)} 1`;
      nextAbbrLabel = `${getAbbr(getBookName(ALL_BOOKS[bookIndex + 1].id, ALL_BOOKS[bookIndex + 1].name, state.settings.bibleVersion))} 1`;
    }
  }

  const handleNextChapter = () => {
    const nextCoord = adjacentReadingChapter(ALL_BOOKS, activeBookId, activeChapterNum, 1);
    if (!nextCoord) return;
    setReturnStack([]);
    setPendingHighlight(null);
    setCrossRefPeekSource(null);
    goToChapter(nextCoord.bookId, nextCoord.chapter);
  };

  const handlePrevChapter = () => {
    const prevCoord = adjacentReadingChapter(ALL_BOOKS, activeBookId, activeChapterNum, -1);
    if (!prevCoord) return;
    setReturnStack([]);
    setPendingHighlight(null);
    setCrossRefPeekSource(null);
    goToChapter(prevCoord.bookId, prevCoord.chapter);
  };

  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null);
  const [touchEndPos, setTouchEndPos] = useState<{x: number, y: number} | null>(null);

  // Any of these overlays sit on top of the reader as React children, so their
  // touch events bubble up to the swipe handlers below unless explicitly guarded —
  // otherwise swiping inside e.g. the chapter navigator silently changes the chapter underneath it.
  const isOverlayOpen =
    showOptions ||
    showOverflowMenu ||
    showCommentaryModal ||
    immerseChapterOpen ||
    showNavigator ||
    !!showCrossReferences ||
    showAddOptions;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isOverlayOpen) return;
    setTouchEndPos(null);
    setTouchStartPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isOverlayOpen) return;
    setTouchEndPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchEnd = () => {
    if (isOverlayOpen || !touchStartPos || !touchEndPos) return;
    const distanceX = touchStartPos.x - touchEndPos.x;
    const distanceY = touchStartPos.y - touchEndPos.y;
    const minSwipeDistance = 50;

    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
        handleNextChapter();
      } else {
        handlePrevChapter();
      }
    }
  };

  const handleNavigate = (targetBookId: string, targetChapter: number) => {
    setReturnStack([]);
    setPendingHighlight(null);
    setCrossRefPeekSource(null);
    goToChapter(targetBookId, targetChapter, true);
    setShowNavigator(false);
    setShowVersionPicker(false);
  };

  useEffect(() => {
    if (crossRefIndex) return;
    let mounted = true;
    loadCrossReferenceIndex()
      .then(index => {
        if (mounted) setCrossRefIndex(index);
      })
      .catch(console.error);
    return () => { mounted = false; };
  }, [crossRefIndex]);

  useEffect(() => {
    if (cachedParagraphBreaks) {
      setParagraphBreaks(cachedParagraphBreaks);
      return;
    }
    let mounted = true;
    fetch('/data/paragraph_breaks.json')
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          cachedParagraphBreaks = data;
          setParagraphBreaks(data);
        }
      })
      .catch(console.error);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (showNavigator && chapterGridRef.current) {
      setTimeout(() => {
        chapterGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [navigatorBook, showNavigator]);

  useEffect(() => {
    let cancelled = false;
    versesChapterRef.current = '';

    const bollsId = BOLLS_BIBLE_MAP[bookId];

    const applyChapter = (data: Verse[], lsbData: Verse[] | null) => {
      setVerses(data);
      setBorrowedHeadings(lsbData ? extractHeadings(lsbData) : null);
      versesChapterRef.current = `${bookId}-${chapter}`;
      setSelectedVerses([]);
      setSelectionScope({ bookId, chapter });

      const initialStreamEntry: StreamChapter = {
        key: `${bookId}:${chapter}`,
        bookId,
        chapter,
        verses: data,
      };
      setChapterWindow([initialStreamEntry]);

      const contTarget = immerseContinuationTargetRef.current;
      if (contTarget) {
        immerseContinuationTargetRef.current = null;
        const targetIdx = contTarget === 'last' ? Math.max(0, data.length - 1) : 0;
        setImmerseVerseIdx(targetIdx);
        setActiveStreamPos({
          bookId,
          chapter,
          verse: data[targetIdx]?.verse || 1,
        });
      }
    };

    if (bollsId) {
      const cachedData = chapterTextSettled.get(chapterCacheKey(bibleVersion, bollsId, chapter));
      const cachedLsb = bibleVersion === 'LSB'
        ? null
        : chapterTextSettled.get(chapterCacheKey('LSB', bollsId, chapter)) ?? null;

      if (cachedData) {
        setError(null);
        setLoading(false);
        applyChapter(cachedData, cachedLsb);
        return () => { cancelled = true; };
      }
    }

    const fetchChapter = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!bollsId) {
          throw new Error('Book not found in Bible API map.');
        }

        // Load only the selected edition without substituting another translation or requiring LSB headings.
        const data = await fetchChapterText(bibleVersion, bollsId, chapter);
        const lsbCached = bibleVersion === 'LSB'
          ? null
          : chapterTextSettled.get(chapterCacheKey('LSB', bollsId, chapter)) ?? null;

        if (cancelled) return;
        applyChapter(data, lsbCached);
      } catch (err: any) {
        if (cancelled) return;
        if (err.name === 'AbortError') {
          setError('This is taking longer than expected. Check your connection and try again.');
        } else {
          setError(err.message || 'An error occurred while loading the chapter.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchChapter();
    return () => { cancelled = true; };
  }, [bookId, chapter, retryCount, bibleVersion]);

  useEffect(() => {
    if (initialVerse) {
      setPendingHighlight({ book: bookId, chapter, verse: initialVerse });
    }
  }, [bookId, chapter, initialVerse]);

  useEffect(() => {
    if (!pendingHighlight) return;
    if (pendingHighlight === consumedHighlightRef.current) return;
    const isLoadedInWindow =
      versesChapterRef.current === `${pendingHighlight.book}-${pendingHighlight.chapter}` ||
      chapterWindow.some(c => c.bookId === pendingHighlight.book && c.chapter === pendingHighlight.chapter);
    if (!isLoadedInWindow) return;

    consumedHighlightRef.current = pendingHighlight;
    const targetFlash = pendingHighlight;

    const timeoutId = setTimeout(() => {
      setFlashVerse(targetFlash);
      setTimeout(
        () =>
          setFlashVerse(prev =>
            prev &&
            prev.book === targetFlash.book &&
            prev.chapter === targetFlash.chapter &&
            prev.verse === targetFlash.verse
              ? null
              : prev
          ),
        4000
      );
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [pendingHighlight, verses, loading, chapterWindow]);

  useEffect(() => {
    if (flashVerse === null) return;
    const selector =
      flashVerse.verse === 0
        ? `[data-chapter-key="${flashVerse.book}:${flashVerse.chapter}"] .verse-span, .verse-span, .alpha-verse-span`
        : `[data-verse-book="${flashVerse.book}"][data-verse-chapter="${flashVerse.chapter}"][data-verse="${flashVerse.verse}"]`;
    const el = document.querySelector(selector);
    el?.scrollIntoView({ behavior: 'smooth', block: flashVerse.verse === 0 ? 'start' : 'center' });
  }, [flashVerse]);

  const memorizedVerses = useMemo(
    () => getMemorizedSetForChapter(state.verses, selectionScope.bookId, selectionScope.chapter, bibleVersion),
    [state.verses, selectionScope.bookId, selectionScope.chapter, bibleVersion]
  );

  const selectionEnglishBookTitle = useMemo(
    () => ALL_BOOKS.find(b => b.id === selectionScope.bookId)?.name || activeBookTitle,
    [selectionScope.bookId, activeBookTitle]
  );

  const selectionChapterVerses = useMemo(() => {
    const found = chapterWindow.find(
      c => c.bookId === selectionScope.bookId && c.chapter === selectionScope.chapter
    );
    return found ? found.verses : activeVerses;
  }, [chapterWindow, selectionScope.bookId, selectionScope.chapter, activeVerses]);

  const toggleVerseSelection = useCallback((verseNum: number, scopeBookId = activeBookId, scopeChapter = activeChapterNum) => {
    if (selectionScope.bookId !== scopeBookId || selectionScope.chapter !== scopeChapter) {
      setSelectionScope({ bookId: scopeBookId, chapter: scopeChapter });
      setSelectedVerses([verseNum]);
      return;
    }
    setSelectedVerses(prev =>
      prev.includes(verseNum)
        ? prev.filter(v => v !== verseNum)
        : [...prev, verseNum].sort((a, b) => a - b)
    );
  }, [selectionScope.bookId, selectionScope.chapter, activeBookId, activeChapterNum]);

  const handleVerseClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    const marker = target.closest('.xref-marker');
    if (marker) {
      const markerVerse = marker.getAttribute('data-xref-verse');
      const markerBook = marker.getAttribute('data-xref-book') || activeBookId;
      const markerChapter = parseInt(marker.getAttribute('data-xref-chapter') || String(activeChapterNum), 10);
      const markerBookTitle = ALL_BOOKS.find(b => b.id === markerBook)?.name || activeBookTitle;
      if (markerVerse) {
        setCrossRefPeekSource(null);
        setCrossRefInitialSection(undefined);
        setShowCrossReferences([`${markerBookTitle.toLowerCase()} ${markerChapter}:${markerVerse}`]);
        return;
      }
    }

    const verseSpan = target.closest('.verse-span');
    if (verseSpan) {
      const verseNumStr = verseSpan.getAttribute('data-verse');
      const verseBook = verseSpan.getAttribute('data-verse-book') || activeBookId;
      const verseCh = parseInt(verseSpan.getAttribute('data-verse-chapter') || String(activeChapterNum), 10);
      if (verseNumStr) toggleVerseSelection(parseInt(verseNumStr, 10), verseBook, verseCh);
    }
  };

  const handleVerseKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target as HTMLElement;
    const verseSpan = target.closest('.verse-span');
    if (verseSpan) {
      e.preventDefault();
      const verseNumStr = verseSpan.getAttribute('data-verse');
      const verseBook = verseSpan.getAttribute('data-verse-book') || activeBookId;
      const verseCh = parseInt(verseSpan.getAttribute('data-verse-chapter') || String(activeChapterNum), 10);
      if (verseNumStr) toggleVerseSelection(parseInt(verseNumStr, 10), verseBook, verseCh);
    }
  };

  const handleAddClick = () => {
    setAsOnePassage(true);
    setMemoryHookText('');
    setStartLearningNow(true);
    setShowAddOptions(true);
  };

  const executeAdd = (mode: 'individual' | 'combined') => {
    let addedCount = 0;
    let skippedCount = 0;
    const nextDue = startLearningNow ? new Date().toISOString() : new Date(Date.now() + 86400000).toISOString();
    const hookKeyword = memoryHookText.trim() || undefined;
    const selCh = selectionScope.chapter;
    const selBook = selectionEnglishBookTitle;

    if (mode === 'individual') {
      selectedVerses.forEach(verseNum => {
        const v = selectionChapterVerses.find(x => x.verse === verseNum);
        if (v) {
          const cleanText = v.text
            .replace(/<b>.*?<\/b>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/([a-z][.?!;:,])([A-Z])/g, '$1 $2')
            .replace(/[ \t]+/g, ' ')
            .trim();
          const ref = `${selBook} ${selCh}:${verseNum}`;

          if (state.verses.some(verse => verse.ref === ref)) {
            skippedCount++;
            return;
          }

          dispatch({
            type: 'ADD_VERSE',
            payload: {
              id: crypto.randomUUID(),
              ref,
              text: cleanText,
              translation: bibleVersion,
              addedDate: new Date().toISOString(),
              status: 'learning',
              sm2: { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: nextDue },
              streak: 0,
              attempts: 0,
              topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
              keyword: hookKeyword
            }
          });
          addedCount++;
        }
      });
    } else {
      const sorted = [...selectedVerses].sort((a, b) => a - b);
      if (sorted.length === 0) return;

      const groups: number[][] = [];
      let currentGroup = [sorted[0]];

      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
          currentGroup.push(sorted[i]);
        } else {
          groups.push(currentGroup);
          currentGroup = [sorted[i]];
        }
      }
      groups.push(currentGroup);

      groups.forEach(group => {
        const textParts: string[] = [];
        group.forEach(verseNum => {
          const v = selectionChapterVerses.find(x => x.verse === verseNum);
          if (v) {
            textParts.push(
              v.text
                .replace(/<b>.*?<\/b>/gi, '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/([a-z][.?!;:,])([A-Z])/g, '$1 $2')
                .replace(/[ \t]+/g, ' ')
                .trim()
            );
          }
        });

        const combinedText = textParts.join(' ');
        const refStr = group.length === 1 ? `${group[0]}` : `${group[0]}-${group[group.length - 1]}`;
        const ref = `${selBook} ${selCh}:${refStr}`;

        if (state.verses.some(verse => verse.ref === ref)) {
          skippedCount++;
          return;
        }

        dispatch({
          type: 'ADD_VERSE',
          payload: {
            id: crypto.randomUUID(),
            ref,
            text: combinedText,
            translation: bibleVersion,
            addedDate: new Date().toISOString(),
            status: 'learning',
            sm2: { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: nextDue },
            streak: 0,
            attempts: 0,
            topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
            keyword: hookKeyword
          }
        });
        addedCount++;
      });
    }

    const actionObj = {
      label: 'Go to Library',
      onClick: () => {
        setTimeout(() => {
          onClose();
          navigate(`/?search=${encodeURIComponent(selBook + ' ' + selCh + ':')}`);
        }, 300);
      }
    };

    if (addedCount > 0 && skippedCount > 0) {
      showToast(`Added ${addedCount} ${addedCount === 1 ? 'entry' : 'entries'} (${skippedCount} skipped as duplicate)`, 'success', actionObj);
    } else if (addedCount > 0) {
      showToast(`Added ${addedCount} ${addedCount === 1 ? 'entry' : 'entries'} to your library!`, 'success', actionObj);
    } else if (skippedCount > 0) {
      showToast(`${skippedCount} ${skippedCount === 1 ? 'entry' : 'entries'} already in your library!`, 'info', actionObj);
    }

    setSelectedVerses([]);
    setShowAddOptions(false);
  };

  const handleDeleteSelected = () => {
    const prefix = `${selectionEnglishBookTitle} ${selectionScope.chapter}:`;

    const versesToDelete = state.verses.filter(v => {
      if (!v.ref.startsWith(prefix)) return false;
      const versePart = v.ref.substring(prefix.length);
      const memSet = new Set<number>();
      if (versePart.includes('-')) {
        const [start, end] = versePart.split('-').map(n => parseInt(n.trim(), 10));
        for (let i = start; i <= end; i++) memSet.add(i);
      } else if (versePart.includes(',')) {
        versePart.split(',').forEach(n => memSet.add(parseInt(n.trim(), 10)));
      } else {
        memSet.add(parseInt(versePart, 10));
      }

      return selectedVerses.some(sv => memSet.has(sv));
    });

    if (versesToDelete.length > 0) {
      versesToDelete.forEach(v => {
        dispatch({ type: 'DELETE_VERSE', payload: v.id });
      });
      showToast(`Removed ${versesToDelete.length} ${versesToDelete.length === 1 ? 'entry' : 'entries'} from your library.`, 'success');
    }

    setSelectedVerses([]);
    setShowAddOptions(false);
  };

  const handleCopySelected = () => {
    if (selectedVerses.length === 0) return;

    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const textParts: string[] = [];

    sorted.forEach(verseNum => {
      const v = selectionChapterVerses.find(x => x.verse === verseNum);
      if (v) {
        const plainText = v.text
          .replace(/<b>.*?<\/b>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/([a-z][.?!;:,])([A-Z])/g, '$1 $2')
          .replace(/[ \t]+/g, ' ')
          .trim();
        textParts.push(plainText);
      }
    });

    const combinedText = textParts.join(' ');
    let refStr = '';
    const isContiguous = sorted.length > 1 && (sorted[sorted.length - 1] - sorted[0] === sorted.length - 1);

    if (sorted.length === 1) {
      refStr = `${sorted[0]}`;
    } else if (isContiguous) {
      refStr = `${sorted[0]}-${sorted[sorted.length - 1]}`;
    } else {
      refStr = sorted.join(',');
    }

    const finalString = `'${combinedText}'\n\n${selectionEnglishBookTitle} ${selectionScope.chapter}:${refStr} (${BIBLE_VERSION_LABELS[bibleVersion] || bibleVersion})`;

    navigator.clipboard.writeText(finalString).then(() => {
      showToast('Copied to clipboard!', 'success');
      setSelectedVerses([]);
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  const renderedChapters = useMemo<StreamChapter[]>(() => {
    const primary: StreamChapter = { key: `${bookId}:${chapter}`, bookId, chapter, verses };
    if (!continueChapters) {
      if (activeBookId !== bookId || activeChapterNum !== chapter) {
        const found = chapterWindow.find(c => c.bookId === activeBookId && c.chapter === activeChapterNum);
        return found ? [found] : [primary];
      }
      return [primary];
    }
    if (chapterWindow.length > 0) return chapterWindow;
    return [primary];
  }, [continueChapters, chapterWindow, bookId, chapter, verses, activeBookId, activeChapterNum]);

  const renderedChapterHtmls = useMemo(() => {
    const out: Record<string, string> = {};
    for (const entry of renderedChapters) {
      const entryMemorized = getMemorizedSetForChapter(state.verses, entry.bookId, entry.chapter, bibleVersion);
      const entryHeadings =
        entry.bookId === bookId && entry.chapter === chapter
          ? borrowedHeadings
          : prefetchedHeadings[entry.key] ?? null;
      const entrySelected =
        selectionScope.bookId === entry.bookId && selectionScope.chapter === entry.chapter
          ? selectedVerses
          : [];
      const entryFlash =
        flashVerse && flashVerse.book === entry.bookId && flashVerse.chapter === entry.chapter
          ? flashVerse.verse
          : null;
      const entryTtsVerse =
        activeTtsVerse && activeTtsVerse.bookId === entry.bookId && activeTtsVerse.chapter === entry.chapter
          ? activeTtsVerse.verse
          : null;

      out[entry.key] = buildChapterHtml({
        bookId: entry.bookId,
        chapter: entry.chapter,
        verses: entry.verses,
        borrowedHeadings: entryHeadings,
        selectedVerses: entrySelected,
        memorizedVerses: entryMemorized,
        flashVerse: entryFlash,
        activeTtsVerse: entryTtsVerse,
        settings: state.settings,
        crossRefIndex,
        paragraphBreaks,
      });
    }
    return out;
  }, [
    renderedChapters,
    state.verses,
    state.settings,
    bibleVersion,
    bookId,
    chapter,
    borrowedHeadings,
    prefetchedHeadings,
    selectionScope.bookId,
    selectionScope.chapter,
    selectedVerses,
    flashVerse,
    activeTtsVerse,
    crossRefIndex,
    paragraphBreaks,
  ]);

  const hasRefs = !crossRefIndex || selectedVerses.some(v => {
    const vid = toVerseIndex(selectionScope.bookId, selectionScope.chapter, v);
    return vid !== null && crossRefIndex.hasConnections(vid, -Infinity);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background animate-[fadeIn_0.2s_ease-out]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reading Progress Bar */}
      <div
        className="reading-progress"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Fixed header — tap-to-toggle chrome, same trigger as the bottom nav below */}
      <div
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-30 bg-background border-b border-card-border/60 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${chromeVisible ? 'translate-y-0' : '-translate-y-full'} px-4 sm:px-8`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <div className="max-w-2xl mx-auto w-full pb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] -ml-1.5 rounded-full flex items-center justify-center hover:bg-card-hover transition-colors shrink-0"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
          </button>

          <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 max-w-full min-w-0">
              <button
                type="button"
                onClick={() => {
                  setNavigatorBook(activeBookId);
                  setShowNavigator(true);
                }}
                className="min-w-0 truncate text-xl sm:text-3xl font-bold tracking-tight text-primary font-heading hover:text-accent transition-colors"
                title="Jump to book or chapter"
              >
                {getBookName(activeBookId, activeBookTitle, state.settings.bibleVersion)} {activeChapterNum}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOverflowMenu(false);
                  setShowOptions(false);
                  setShowVersionPicker((v) => !v);
                }}
                className="shrink-0 inline-flex items-center gap-0.5 text-[11px] sm:text-xs font-bold tracking-wider uppercase px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full transition-colors text-accent bg-accent/10 border border-accent/25 hover:bg-accent/20"
                title="Change Bible version"
                aria-label={`Bible version ${BIBLE_VERSION_LABELS[bibleVersion] || bibleVersion}. Tap to change.`}
              >
                <span>{BIBLE_VERSION_LABELS[bibleVersion] || bibleVersion}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
            </div>
            {chapterRecord && chapterRecord.readCount > 0 && (
              <p className="text-[11px] text-muted mt-0.5 tabular-nums truncate max-w-full">
                Read {chapterRecord.readCount} time{chapterRecord.readCount === 1 ? '' : 's'}
                {chapterRecord.lastReadDate ? ` · last ${formatShortDate(chapterRecord.lastReadDate)}` : ''}
              </p>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setShowOverflowMenu(false);
                setShowVersionPicker(false);
                setShowOptions((v) => !v);
              }}
              className={`min-w-[40px] min-h-[40px] rounded-full border border-card-border flex items-center justify-center font-bold text-sm transition-colors ${showOptions ? 'bg-accent/20 border-accent text-accent' : 'bg-card text-accent hover:border-accent'}`}
              title="Reading Settings"
              aria-label="Reading settings"
            >
              Aa
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowOptions(false);
                  setShowVersionPicker(false);
                  setShowOverflowMenu((v) => !v);
                }}
                aria-label="Reader actions"
                aria-haspopup="menu"
                aria-expanded={showOverflowMenu}
                className={`min-w-[40px] min-h-[40px] rounded-full border border-card-border flex items-center justify-center transition-colors ${showOverflowMenu ? 'bg-accent/20 border-accent text-accent' : 'bg-card text-secondary hover:text-primary hover:border-accent/50'}`}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showOverflowMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowOverflowMenu(false)}
                    onTouchStart={() => setShowOverflowMenu(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-card-border bg-card shadow-xl z-50 p-1.5 flex flex-col gap-0.5 animate-[fadeScaleIn_0.12s_ease-out]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowOverflowMenu(false);
                        toggleSpeakChapter();
                      }}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-primary hover:bg-card-hover transition-colors"
                    >
                      {isSpeakingChapter ? (
                        <VolumeX className="w-4 h-4 text-accent" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-accent" />
                      )}
                      <span>{isSpeakingChapter ? 'Stop listening' : 'Listen'}</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowOverflowMenu(false);
                        if (chapterMemoryVerses.length > 0) {
                          const targetVerse = selectedVerses.length > 0
                            ? Math.min(...selectedVerses)
                            : activeStreamPos.verse;
                          const startIdx = Math.max(
                            0,
                            activeVerses.findIndex(v => v.verse >= targetVerse)
                          );
                          setImmerseVerseIdx(startIdx);
                          setImmerseChapterOpen(true);
                        }
                      }}
                      disabled={chapterMemoryVerses.length === 0}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-primary hover:bg-card-hover disabled:opacity-40 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span>Immerse Reading</span>
                    </button>

                    {hasCommentaryForBook(activeBookId) && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowOverflowMenu(false);
                          setShowCommentaryModal(true);
                        }}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-primary hover:bg-card-hover transition-colors"
                      >
                        <BookOpen className="w-4 h-4 text-accent" />
                        <span>Commentary</span>
                      </button>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowOverflowMenu(false);
                        setChromeVisible(false);
                      }}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-secondary hover:text-primary hover:bg-card-hover transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                      <span>Hide controls</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned Reading settings Bottom Sheet */}
      <Modal
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        variant="sheet"
        size="md"
        title="Reading settings"
        subtitle="These settings apply to reading and Immerse. The palette also changes the app theme."
      >
        <div className="flex flex-col gap-5 p-5">
          {/* Live Preview Card */}
          {(() => {
            const palette = PREVIEW_PALETTE[state.theme || 'black'] || PREVIEW_PALETTE.black;
            const sampleWords = ['Sample', 'text', 'stands', 'in', 'for', 'scripture', 'so', 'the', 'layout', 'can', 'be', 'judged.'];
            return (
              <div
                className="rounded-2xl border p-4 transition-all"
                style={{
                  backgroundColor: palette.bg,
                  borderColor: palette.border,
                  color: palette.text,
                  fontSize: `${Math.round(16 * (state.settings.fontSize || 1))}px`,
                  lineHeight: readerLineHeightMultiplier(state.settings.lineSpacing),
                  fontFamily: readerFontFamilyCss(state.settings.fontFamily),
                }}
              >
                {state.settings.showVerseNumbers !== false && (
                  <sup className="text-accent text-[0.65em] font-bold mr-1.5 align-super">12</sup>
                )}
                {sampleWords.map((word, idx) => {
                  const cut = state.settings.bionicReading
                    ? bionicBoldLength(word.length, state.settings.bionicIntensity)
                    : 0;
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && ' '}
                      {cut > 0 ? (
                        <>
                          <strong className="font-bold">{word.slice(0, cut)}</strong>
                          {word.slice(cut)}
                        </>
                      ) : (
                        word
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })()}

          {/* Scripture text size */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-primary">Scripture text size</span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Small', value: 0.88 },
                { label: 'Default', value: 1.0 },
                { label: 'Large', value: 1.15 },
                { label: 'Extra Large', value: 1.3 },
                { label: 'Huge', value: 1.5 },
              ].map((size) => {
                const current = state.settings.fontSize || 1.0;
                const isSelected = Math.abs(current - size.value) < 0.05;
                return (
                  <button
                    key={size.label}
                    type="button"
                    onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontSize: size.value } })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent text-on-accent'
                        : 'border-card-border bg-card-elevated text-secondary hover:text-primary'
                    }`}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted">Interface text size follows your device settings.</p>
          </div>

          {/* Typeface */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-primary">Typeface</span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'inter', label: 'Inter' },
                { id: 'merriweather', label: 'Merriweather' },
                { id: 'atkinson', label: 'Atkinson' },
                { id: 'mono', label: 'Monospace' },
                { id: 'system', label: 'System' },
              ].map((f) => {
                const isSelected = (state.settings.fontFamily || 'inter') === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontFamily: f.id as UserSettings['fontFamily'] } })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent text-on-accent'
                        : 'border-card-border bg-card-elevated text-secondary hover:text-primary'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Line spacing */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-primary">Line spacing</span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'tight', label: 'Tight' },
                { id: 'normal', label: 'Normal' },
                { id: 'roomy', label: 'Roomy' },
              ].map((spacing) => {
                const isSelected = (state.settings.lineSpacing || 'normal') === spacing.id;
                return (
                  <button
                    key={spacing.id}
                    type="button"
                    onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { lineSpacing: spacing.id as UserSettings['lineSpacing'] } })}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent text-on-accent'
                        : 'border-card-border bg-card-elevated text-secondary hover:text-primary'
                    }`}
                  >
                    {spacing.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-primary">Palette</span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'black', label: 'Midnight' },
                { id: 'dark', label: 'Walnut' },
                { id: 'sepia', label: 'Sepia' },
                { id: 'white', label: 'Paper' },
              ].map((t) => {
                const isSelected = (state.theme || 'black') === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_THEME', payload: t.id as 'black' | 'dark' | 'sepia' | 'white' })}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent text-on-accent'
                        : 'border-card-border bg-card-elevated text-secondary hover:text-primary'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Verse numbers switch */}
          <div
            onClick={() =>
              dispatch({
                type: 'UPDATE_SETTINGS',
                payload: { showVerseNumbers: state.settings.showVerseNumbers === false },
              })
            }
            className="flex items-center justify-between gap-3 py-1 cursor-pointer"
          >
            <span className="text-sm font-medium text-primary">Verse numbers</span>
            <Switch
              checked={state.settings.showVerseNumbers !== false}
              onChange={(next) =>
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: { showVerseNumbers: next },
                })
              }
              ariaLabel="Verse numbers"
            />
          </div>

          {/* Keep Immerse awake switch */}
          <div
            onClick={() => setKeepImmerseAwake(!keepImmerseAwake)}
            className="flex items-center justify-between gap-3 py-1 cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-primary">Keep Immerse awake</span>
              <span className="text-xs text-muted">While Immerse is on screen</span>
            </div>
            <Switch
              checked={keepImmerseAwake}
              onChange={setKeepImmerseAwake}
              ariaLabel="Keep Immerse awake"
            />
          </div>

          {/* Continue chapters switch */}
          <div className="flex flex-col gap-1 py-1">
            <div
              onClick={() =>
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: { continueChapters: !continueChapters },
                })
              }
              className="flex items-center justify-between gap-3 cursor-pointer"
            >
              <span className="text-sm font-medium text-primary">Continue chapters</span>
              <Switch
                checked={continueChapters}
                onChange={(next) =>
                  dispatch({
                    type: 'UPDATE_SETTINGS',
                    payload: { continueChapters: next },
                  })
                }
                ariaLabel="Continue chapters"
              />
            </div>
            <p className="text-xs text-muted">
              Scroll or listen into the next chapter. Immerse continues when you tap Next.
            </p>
          </div>

          {/* Collapsible Advanced reading options */}
          <div className="border-t border-card-border pt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setAdvancedReadingOptionsOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-accent hover:underline"
            >
              <span>{advancedReadingOptionsOpen ? 'Hide advanced reading options' : 'Advanced reading options'}</span>
              {advancedReadingOptionsOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {advancedReadingOptionsOpen && (
              <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card-elevated/40 p-3.5">
                <div
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_SETTINGS',
                      payload: { bionicReading: !state.settings.bionicReading },
                    })
                  }
                  className="flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="text-sm font-medium text-primary">Bionic reading</span>
                  <Switch
                    checked={Boolean(state.settings.bionicReading)}
                    onChange={(next) =>
                      dispatch({
                        type: 'UPDATE_SETTINGS',
                        payload: { bionicReading: next },
                      })
                    }
                    ariaLabel="Bionic reading"
                  />
                </div>

                {state.settings.bionicReading && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-secondary">Bionic intensity</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'light', label: 'Light' },
                        { id: 'medium', label: 'Medium' },
                        { id: 'strong', label: 'Strong' },
                      ].map((lvl) => {
                        const current = state.settings.bionicIntensity || 'medium';
                        const isSelected =
                          current === lvl.id ||
                          (lvl.id === 'light' && current === 'low') ||
                          (lvl.id === 'strong' && current === 'high');
                        return (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() =>
                              dispatch({
                                type: 'UPDATE_SETTINGS',
                                payload: { bionicIntensity: lvl.id as UserSettings['bionicIntensity'] },
                              })
                            }
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                              isSelected
                                ? 'border-accent bg-accent text-on-accent'
                                : 'border-card-border bg-card text-secondary hover:text-primary'
                            }`}
                          >
                            {lvl.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-muted">
            Reset restores text size, typeface, spacing, palette, bionic reading and verse numbers.
          </p>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: {
                    fontSize: 1.0,
                    fontFamily: 'inter',
                    lineSpacing: 'normal',
                    bionicReading: false,
                    bionicIntensity: 'medium',
                    showVerseNumbers: true,
                    continueChapters: true,
                  },
                });
                dispatch({ type: 'SET_THEME', payload: 'black' });
              }}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Reset reading settings
            </button>
            <button
              type="button"
              onClick={() => setShowOptions(false)}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-on-accent shadow-sm hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      <div
        ref={scrollContainerRef}
        // Side padding steps up through the foldable range: an unfolded foldable sits
        // around 670-840px, where the reading measure alone doesn't bind, so without
        // this the text would run edge-to-edge with only a phone's 20px gutter.
        className="flex-1 overflow-y-auto overscroll-y-contain px-5 sm:px-8 md:px-12 pb-6"
        style={{ paddingTop: headerHeight ? `${headerHeight + 16}px` : 'calc(env(safe-area-inset-top, 0px) + 6rem)' }}
        onScroll={handleScroll}
        onClick={handleContentClick}
      >

        {loading ? (
          <div
            className="mx-auto flex flex-col gap-6"
            // Same font-size context as the real column so the skeleton occupies the
            // identical width and the text doesn't jump sideways when it loads in.
            style={{ fontSize: `${1.25 * (state.settings.fontSize || 1)}rem`, maxWidth: READING_MEASURE }}
          >
            <div className="h-4 w-32 skeleton mb-4 mt-8" />
            <div className="flex flex-col gap-3">
              <div className="h-6 w-full skeleton" />
              <div className="h-6 w-11/12 skeleton" />
              <div className="h-6 w-full skeleton" />
              <div className="h-6 w-5/6 skeleton" />
            </div>
            <div className="h-4 w-24 skeleton mt-6 mb-2" />
            <div className="flex flex-col gap-3">
              <div className="h-6 w-full skeleton" />
              <div className="h-6 w-4/5 skeleton" />
              <div className="h-6 w-full skeleton" />
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <div className="h-6 w-11/12 skeleton" />
              <div className="h-6 w-full skeleton" />
              <div className="h-6 w-2/3 skeleton" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-red-400 px-6 text-center">
            <p>{error}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setRetryCount(c => c + 1)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-md bg-accent text-on-accent hover:bg-accent-hover transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" /> Try Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-md border border-card-border hover:bg-card-hover transition-colors text-secondary"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          /* Normal reading mode (selected Bible version, continuous bounded stream) */
          <div
            className="mx-auto pb-32 select-text"
            // fontSize lives on this wrapper (not the inner div) so the `ch` unit in
            // READING_MEASURE resolves against the reader's actual text size.
            style={{
              fontSize: `${1.25 * (state.settings.fontSize || 1)}rem`,
              maxWidth: READING_MEASURE,
              fontFamily: readerFontFamilyCss(state.settings.fontFamily),
            }}
            onClick={handleVerseClick}
            onKeyDown={handleVerseKeyDown}
          >
            {renderedChapters.map((entry, entryIndex) => {
              const entryBookObj = ALL_BOOKS.find(b => b.id === entry.bookId);
              const entryBookTitle = getBookName(entry.bookId, entryBookObj?.name || entry.bookId, bibleVersion);
              const isLastStreamEntry = entryIndex === renderedChapters.length - 1;
              const entryNext = adjacentReadingChapter(ALL_BOOKS, entry.bookId, entry.chapter, 1);

              return (
                <section
                  key={entry.key}
                  data-chapter-key={entry.key}
                  className={entryIndex > 0 ? 'mt-12 pt-8 border-t border-card-border/60' : ''}
                >
                  {entryIndex > 0 && (
                    <h3 className="font-heading font-bold text-2xl text-primary mb-5 tracking-tight">
                      {entryBookTitle} {entry.chapter}
                    </h3>
                  )}

                  <div
                    className="tracking-[-0.01em] text-primary/95 [&>div:first-child]:mt-0"
                    style={{ lineHeight: readerLineHeightMultiplier(state.settings.lineSpacing) }}
                    dangerouslySetInnerHTML={{ __html: renderedChapterHtmls[entry.key] || '' }}
                  />

                  {entry.bookId === activeBookId &&
                    entry.chapter === activeChapterNum &&
                    chapterAnchor &&
                    anchorReveal !== 'always' &&
                    !recallDismissedOnVisit &&
                    (recallCardDismissCount < 2 || recallGradedOnVisit) && (
                      <RecallCard
                        bookId={activeBookId}
                        chapter={activeChapterNum}
                        anchor={chapterAnchor}
                        revealed={recallRevealed}
                        graded={recallGradedOnVisit}
                        nextLabel={nextLabel}
                        onReveal={() => setRecallRevealed(true)}
                        onGrade={gradeChapterRecall}
                        onDismiss={dismissRecallCard}
                        onNextChapter={handleNextChapter}
                      />
                    )}

                  {isLastStreamEntry && !continueChapters && nextLabel && (
                    (!chapterAnchor || anchorReveal === 'always' || recallDismissedOnVisit || recallCardDismissCount >= 2) &&
                    !recallGradedOnVisit
                  ) && (
                    <div className="mt-10 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={handleNextChapter}
                        className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-on-accent shadow-sm hover:opacity-90 transition-opacity"
                      >
                        <span>Next chapter · {nextLabel}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {isLastStreamEntry && continueChapters && (
                    <div className="mt-8 pt-4 flex items-center justify-center gap-2 text-xs text-muted" onClick={(e) => e.stopPropagation()}>
                      {nextPrefetchLoading ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin text-accent" />
                          <span>Loading next chapter…</span>
                        </>
                      ) : nextPrefetchError ? (
                        <div className="flex items-center gap-2">
                          <span className="text-red-400">{nextPrefetchError}</span>
                          <button
                            type="button"
                            onClick={() => prefetchNextStreamChapter(true)}
                            className="text-accent font-semibold hover:underline"
                          >
                            Retry next chapter
                          </button>
                        </div>
                      ) : !entryNext ? (
                        <span>End of Bible</span>
                      ) : null}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Bar for Selected Verses */}
      {selectedVerses.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-[fadeScaleIn_0.2s_ease-out] px-3 pb-3 sm:pb-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)' }}>
          <div className="bg-accent text-on-accent rounded-2xl shadow-lg max-w-lg mx-auto overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="font-bold text-base">
                {selectedVerses.length} {selectedVerses.length === 1 ? 'verse' : 'verses'} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedVerses([])}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-on-accent/15 transition-colors"
                aria-label="Cancel selection"
                title="Cancel Selection"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2.5 px-5 pb-4 flex-wrap">
              <button
                type="button"
                onClick={handleCopySelected}
                className="bg-on-accent/15 hover:bg-on-accent/25 min-h-[42px] px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>

              {hasRefs && (
                <button
                  type="button"
                  onClick={() => {
                    const sorted = [...selectedVerses].sort((a, b) => a - b);
                    setCrossRefPeekSource(null);
                    setCrossRefInitialSection(undefined);
                    setShowCrossReferences(sorted.map(v => `${selectionEnglishBookTitle.toLowerCase()} ${selectionScope.chapter}:${v}`));
                  }}
                  className="bg-on-accent/15 hover:bg-on-accent/25 min-h-[42px] px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" /> Refs
                </button>
              )}
              {selectedVerses.every(v => memorizedVerses.has(v)) ? (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="bg-red-600 hover:bg-red-700 text-white min-h-[42px] px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddClick}
                  className="bg-on-accent/15 hover:bg-on-accent/25 min-h-[42px] px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add to memory Modal — theme-native semantic tokens */}
      {showAddOptions && (
        <Modal
          isOpen={showAddOptions}
          onClose={() => setShowAddOptions(false)}
          variant="sheet"
          size="sm"
          zIndexClass="z-[60]"
          title="Add to memory"
          subtitle={
            selectedVerses.length > 1
              ? `${selectionEnglishBookTitle} ${selectionScope.chapter}:${[...selectedVerses].sort((a, b) => a - b)[0]}–${[...selectedVerses].sort((a, b) => a - b).slice(-1)[0]}`
              : `${selectionEnglishBookTitle} ${selectionScope.chapter}:${selectedVerses[0] || ''}`
          }
        >
          <div className="flex flex-col gap-4 p-5">
            {/* Segmented Mode Selector (When > 1 verse) */}
            {selectedVerses.length > 1 && (
              <div className="flex bg-card-elevated border border-card-border rounded-full p-1 h-12">
                <button
                  type="button"
                  onClick={() => setAsOnePassage(true)}
                  className={`flex-1 rounded-full text-sm font-bold transition-all ${
                    asOnePassage
                      ? 'bg-accent text-on-accent shadow-sm'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  As one passage
                </button>
                <button
                  type="button"
                  onClick={() => setAsOnePassage(false)}
                  className={`flex-1 rounded-full text-sm font-bold transition-all ${
                    !asOnePassage
                      ? 'bg-accent text-on-accent shadow-sm'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  As {selectedVerses.length} verses
                </button>
              </div>
            )}

            {/* Collections */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Collections</span>
              <div className="flex flex-wrap items-center gap-2 max-h-36 overflow-y-auto no-scrollbar">
                {state.topics?.map(topic => {
                  const isActive = selectedTopicIds.includes(topic.id);
                  return (
                    <button
                      type="button"
                      key={topic.id}
                      onClick={() => {
                        setSelectedTopicIds(prev => 
                          isActive ? prev.filter(id => id !== topic.id) : [...prev, topic.id]
                        );
                      }}
                      className={`text-xs min-h-[38px] px-3.5 py-2 rounded-full font-medium transition-all border flex items-center gap-2 ${
                        isActive 
                          ? 'bg-accent/15 text-primary border-accent' 
                          : 'bg-card-elevated text-secondary border-card-border hover:border-card-border-hover hover:text-primary'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded flex items-center justify-center border ${
                        isActive ? 'bg-accent border-accent text-on-accent' : 'border-card-border-hover'
                      }`}>
                        {isActive && <Check className="w-3 h-3" />}
                      </span>
                      <span>{topic.name}</span>
                    </button>
                  );
                })}
                
                {isAddingGroup ? (
                  <form onSubmit={handleCreateGroup} className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="New collection..."
                      className="text-xs px-3 py-1.5 min-h-[38px] rounded-full bg-card-elevated border border-accent text-primary placeholder:text-muted focus:outline-none w-32"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setIsAddingGroup(false);
                      }}
                      onBlur={() => {
                        if (!newGroupName.trim()) setIsAddingGroup(false);
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!newGroupName.trim()}
                      className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-full text-accent hover:bg-accent/10 disabled:opacity-50 transition-colors"
                      aria-label="Save collection"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingGroup(true)}
                    className="text-xs min-h-[38px] px-3.5 py-2 rounded-full font-semibold transition-colors border border-dashed border-accent/60 text-accent hover:border-solid hover:border-accent"
                  >
                    + New collection
                  </button>
                )}
              </div>
            </div>

            {/* Keyword (Your Memory Hook) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="memory-hook-input" className="text-xs font-bold text-muted uppercase tracking-wider">
                Keyword (Your Memory Hook)
              </label>
              <input
                id="memory-hook-input"
                type="text"
                value={memoryHookText}
                onChange={(e) => setMemoryHookText(e.target.value)}
                placeholder="Forever"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-card-elevated border border-card-border text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Accessible Radio Options */}
            <div className="flex flex-col gap-2 pt-1" role="radiogroup" aria-label="Review schedule">
              {[
                { value: true, title: 'Start learning now', desc: 'Queues immediately in today’s review' },
                { value: false, title: 'First review tomorrow', desc: 'Saves to library without queuing today' },
              ].map((opt) => {
                const selected = startLearningNow === opt.value;
                return (
                  <button
                    key={opt.title}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setStartLearningNow(opt.value)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                      selected
                        ? 'bg-accent/12 border-accent text-primary'
                        : 'bg-card-elevated border-card-border text-secondary hover:border-card-border-hover'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selected ? 'border-accent' : 'border-muted'
                      }`}
                    >
                      {selected && <span className="w-2.5 h-2.5 rounded-full bg-accent" />}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold text-primary">{opt.title}</span>
                      <span className="text-xs text-muted">{opt.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action CTA Button */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => executeAdd(selectedVerses.length > 1 && asOnePassage ? 'combined' : 'individual')}
                className="w-full min-h-[48px] py-3 rounded-[14px] bg-accent text-on-accent font-bold text-base hover:bg-accent-hover transition-colors shadow-sm active:scale-[0.99] flex items-center justify-center"
              >
                {selectedVerses.length <= 1
                  ? 'Add verse'
                  : asOnePassage
                  ? 'Add passage'
                  : `Add ${selectedVerses.length} verses`}
              </button>

              <button 
                type="button"
                onClick={() => setShowAddOptions(false)}
                className="w-full min-h-[40px] py-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {isSpeakingChapter && !followAudio && !immerseChapterOpen && selectedVerses.length === 0 && returnStack.length === 0 && (
        <button
          type="button"
          onClick={() => {
            setFollowAudio(true);
            followAudioRef.current = true;
            if (activeTtsVerse) {
              programmaticScrollUntilRef.current = performance.now() + 700;
              const inWindow = renderedChapters.some(
                c => c.bookId === activeTtsVerse.bookId && c.chapter === activeTtsVerse.chapter
              );
              if (inWindow) {
                requestAnimationFrame(() => {
                  document
                    .querySelector(`[data-verse-book="${activeTtsVerse.bookId}"][data-verse-chapter="${activeTtsVerse.chapter}"][data-verse="${activeTtsVerse.verse}"]`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
              } else {
                preserveModeOnRouteChangeRef.current = true;
                goToChapter(activeTtsVerse.bookId, activeTtsVerse.chapter, true);
              }
            }
          }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 rounded-full bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-lg flex items-center gap-1.5 hover:opacity-95 transition-opacity"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Return to audio</span>
        </button>
      )}

      {/* Bottom Chapter Navigation Bar — hidden while the "Go back to..." return
          pill is showing (below), since both are fixed to the bottom edge and
          would otherwise stack on top of each other. */}
      {!loading && !error && selectedVerses.length === 0 && returnStack.length === 0 && (
        <div
          className={`fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-10 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${chromeVisible ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-2.5">
            <button
              type="button"
              onClick={handlePrevChapter}
              disabled={!prevLabel}
              className="flex items-center gap-1 min-h-[40px] px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-hover text-secondary hover:text-primary"
              aria-label={prevLabel ? `Previous: ${prevLabel}` : 'No previous chapter'}
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:block truncate max-w-[120px]">{prevLabel || 'Start'}</span>
              <span className="sm:hidden truncate max-w-[80px]">{prevAbbrLabel || 'Start'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setNavigatorBook(activeBookId); setShowNavigator(true); }}
              className="flex items-center gap-1 min-h-[40px] text-xs font-bold text-primary uppercase tracking-wider hover:border-accent transition-colors bg-card-elevated border border-card-border rounded-xl px-3.5 py-2"
              aria-label="Jump to a different book or chapter"
            >
              Ch {activeChapterNum}
              <ChevronDown className="w-3.5 h-3.5 text-secondary" />
            </button>

            <button
              type="button"
              onClick={handleNextChapter}
              disabled={!nextLabel}
              className="flex items-center gap-1 min-h-[40px] px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-hover text-secondary hover:text-primary"
              aria-label={nextLabel ? `Next: ${nextLabel}` : 'No next chapter'}
            >
              <span className="hidden sm:block truncate max-w-[120px]">{nextLabel || 'End'}</span>
              <span className="sm:hidden truncate max-w-[80px]">{nextAbbrLabel || 'End'}</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Book/Chapter Navigator */}
      {showNavigator && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Go to book or chapter"
          className="fixed inset-0 z-[70] flex flex-col bg-background animate-[fadeIn_0.2s_ease-out]"
        >
          {/* Header — clears iPhone Dynamic Island / status bar */}
          <div
            className="flex items-center justify-between gap-2 px-4 sm:px-5 pb-3.5 border-b border-card-border shrink-0"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
          >
            <button
              type="button"
              onClick={() => { setShowNavigator(false); setShowVersionPicker(false); }}
              className="min-w-[44px] min-h-[44px] -ml-1.5 rounded-xl flex items-center justify-center hover:bg-card-hover transition-colors shrink-0"
              aria-label="Close navigator"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
            <span className="flex-1 text-center text-base font-heading font-bold text-primary tracking-tight truncate">
              Go to...
            </span>
            <button
              type="button"
              onClick={() => setShowVersionPicker(true)}
              className="shrink-0 min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-accent bg-accent/10 hover:bg-accent/20 transition-colors border border-accent/30"
              aria-label="Change Bible version"
              title="Change Bible version"
            >
              <span>{BIBLE_VERSION_LABELS[bibleVersion] || bibleVersion}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Book list */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
          >
            {/* Column headers */}
            <div className="grid grid-cols-2 mb-2">
              <span className="text-right pr-4 text-[10px] font-bold text-muted uppercase tracking-widest">Old Testament</span>
              <span className="text-left pl-4 text-[10px] font-bold text-muted uppercase tracking-widest">New Testament</span>
            </div>

            {/* Book rows with inline chapter grid */}
            <div className="grid grid-cols-2">
              {(() => {
                const rows: React.ReactNode[] = [];
                const maxLen = Math.max(OT_BOOKS.length, NT_BOOKS.length);
                const selectedBookData = ALL_BOOKS.find(b => b.id === navigatorBook);

                for (let i = 0; i < maxLen; i++) {
                  const ot = i < OT_BOOKS.length ? OT_BOOKS[i] : null;
                  const nt = i < NT_BOOKS.length ? NT_BOOKS[i] : null;
                  const isOtSelected = ot?.id === navigatorBook;
                  const isNtSelected = nt?.id === navigatorBook;

                  const otDivision = ot ? divisionForSection(ot.section) : null;
                  const ntDivision = nt ? divisionForSection(nt.section) : null;
                  const otMastery = ot ? navigatorMastery[ot.id] : undefined;
                  const ntMastery = nt ? navigatorMastery[nt.id] : undefined;

                  rows.push(
                    <React.Fragment key={`row-${i}`}>
                      <button
                        onClick={() => ot && setNavigatorBook(ot.id)}
                        className={`flex items-center justify-end gap-1.5 pr-4 py-2 transition-colors ${
                          isOtSelected
                            ? 'text-accent bg-accent/10 rounded-r-lg'
                            : ot ? 'text-secondary hover:text-primary' : 'pointer-events-none'
                        }`}
                        disabled={!ot}
                      >
                        {ot && (
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${otMastery && otMastery.secure > 0 ? otDivision!.color.bg : 'bg-card-border'}`} aria-hidden="true" />
                        )}
                        <span className="flex flex-col items-end min-w-0">
                          <span className={`text-[15px] leading-tight ${isOtSelected ? 'font-bold' : 'font-medium'}`}>{ot ? getBookName(ot.id, BOOK_SHORT[ot.id] || ot.name, state.settings.bibleVersion) : ""}</span>
                          {ot && <span className={`text-[0.625rem] leading-tight truncate max-w-[110px] ${otDivision!.color.text} opacity-80`}>{ot.themeWord}</span>}
                        </span>
                      </button>
                      <button
                        onClick={() => nt && setNavigatorBook(nt.id)}
                        className={`flex items-center justify-start gap-1.5 pl-4 py-2 transition-colors ${
                          isNtSelected
                            ? 'text-accent bg-accent/10 rounded-l-lg'
                            : nt ? 'text-secondary hover:text-primary' : 'pointer-events-none'
                        }`}
                        disabled={!nt}
                      >
                        <span className="flex flex-col items-start min-w-0">
                          <span className={`text-[15px] leading-tight ${isNtSelected ? 'font-bold' : 'font-medium'}`}>{nt ? getBookName(nt.id, BOOK_SHORT[nt.id] || nt.name, state.settings.bibleVersion) : ""}</span>
                          {nt && <span className={`text-[0.625rem] leading-tight truncate max-w-[110px] ${ntDivision!.color.text} opacity-80`}>{nt.themeWord}</span>}
                        </span>
                        {nt && (
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ntMastery && ntMastery.secure > 0 ? ntDivision!.color.bg : 'bg-card-border'}`} aria-hidden="true" />
                        )}
                      </button>
                    </React.Fragment>
                  );

                  {/* Full-width chapter grid if this row's book is selected */}
                  if ((isOtSelected || isNtSelected) && selectedBookData) {
                    rows.push(
                      <div
                        key="chapter-grid"
                        ref={chapterGridRef}
                        className="py-3 px-2 border-y border-card-border my-1"
                        style={{ gridColumn: '1 / -1' }}
                      >
                        <div className="grid grid-cols-7 gap-1.5 max-w-xs mx-auto">
                          {Array.from({ length: selectedBookData.chapters }, (_, j) => j + 1).map(ch => {
                            const isCurrent = navigatorBook === activeBookId && ch === activeChapterNum;
                            return (
                              <button
                                key={ch}
                                onClick={() => handleNavigate(navigatorBook, ch)}
                                className={`aspect-square rounded-md text-base font-bold transition-colors flex items-center justify-center ${
                                  isCurrent
                                    ? 'bg-accent text-on-accent'
                                    : 'text-secondary hover:bg-card-hover hover:text-primary'
                                }`}
                              >
                                {ch}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                }

                return rows;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Shared Bible Version Picker Sheet — works cleanly from both Reader Header and "Go to..." Navigator on portrait phones */}
      <Modal
        isOpen={showVersionPicker}
        onClose={() => setShowVersionPicker(false)}
        variant="sheet"
        size="sm"
        zIndexClass="z-[85]"
        title="Bible Version"
        subtitle="Choose your preferred translation"
      >
        <div className="p-3 flex flex-col gap-1">
          {TRANSLATION_OPTIONS.map(opt => {
            const isSelected = bibleVersion === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  dispatch({ type: 'UPDATE_SETTINGS', payload: { bibleVersion: opt.value as any } });
                  setShowVersionPicker(false);
                }}
                className={`w-full min-h-[48px] px-4 py-3 rounded-xl text-left text-sm flex items-center justify-between gap-3 transition-colors ${
                  isSelected
                    ? 'bg-accent/15 text-accent font-bold'
                    : 'text-primary hover:bg-card-hover'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 shrink-0 text-accent" />}
              </button>
            );
          })}
        </div>
      </Modal>

      {showCrossReferences && (
        <CrossReferenceModal
          verseRefs={showCrossReferences}
          crossRefIndex={crossRefIndex}
          initialSection={crossRefInitialSection}
          onClose={() => {
            setShowCrossReferences(null);
            setCrossRefInitialSection(undefined);
            setCrossRefPeekSource(null);
          }}
          onNavigateToVerse={(navBookId, ch, v, fromRef) => {
            setShowCrossReferences(null);
            setCrossRefInitialSection(undefined);
            setSelectedVerses([]); // Ensure we drop the previous selection so the toast disappears!

            // A peek (opened via the return pill's own "Refs") is re-browsing the list
            // belonging to the verse that's already the top of the trail — picking a
            // different entry from it is lateral movement within that same exploration,
            // not a new hop away from somewhere. So the trail is left untouched and
            // "back" keeps meaning the original source verse. Pushing here instead
            // (as this used to) both inflated the trail depth and recorded the user's
            // current chapter as a "stop", producing a pill offering to send them back
            // to the very chapter they were already reading.
            const isPeek = !!crossRefPeekSource;
            setCrossRefPeekSource(null);

            if (!isPeek) {
              // fromRef is the exact verse-group this reference was listed under — always
              // correct even when several verses were selected together (previously this
              // fell back to "the first selected verse" regardless of which group's
              // reference was actually clicked).
              const parsed = parseVerseRefString(fromRef);
              const sourceEntry = parsed
                ? { book: parsed.bookId, chapter: parsed.chapter, verse: parsed.verse }
                : { book: activeBookId, chapter: activeChapterNum, verse: 0 }; // best-effort fallback; shouldn't normally happen

              // Never record a "stop" for a jump that doesn't actually go anywhere —
              // landing on the verse you're already reading would otherwise leave a
              // trail entry pointing at the current position.
              const isSelfJump = sourceEntry.book === navBookId && sourceEntry.chapter === ch && sourceEntry.verse === v;
              if (!isSelfJump) setReturnStack(prev => [...prev, sourceEntry]);
            }

            setPendingHighlight({ book: navBookId, chapter: ch, verse: v });

            goToChapter(navBookId, ch, true);
          }}
        />
      )}

      {returnStack.length > 0 && selectedVerses.length === 0 && (() => {
        const topReturn = returnStack[returnStack.length - 1];
        const topReturnBookEnglish = ALL_BOOKS.find(b => b.id === topReturn.book)?.name || topReturn.book;
        const topReturnBookName = getBookName(topReturn.book, topReturnBookEnglish, state.settings.bibleVersion);
        return (
          <div
            className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pt-6 px-4 pointer-events-none animate-[fadeScaleIn_0.2s_ease-out] bg-gradient-to-t from-background via-background/80 to-transparent"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
          >
            <div className="bg-card-elevated border border-card-border text-primary shadow-md rounded-full px-5 py-3.5 flex items-center gap-4 pointer-events-auto">
              <button
                onClick={() => {
                  // Pop, not clear — a deeper trail (e.g. two cross-reference jumps in a
                  // row) still has an older stop to offer after this one.
                  setReturnStack(prev => prev.slice(0, -1));
                  setPendingHighlight({ book: topReturn.book, chapter: topReturn.chapter, verse: topReturn.verse });
                  goToChapter(topReturn.book, topReturn.chapter, true);
                }}
                className="text-[15px] font-medium transition-colors flex items-center gap-2 hover:text-accent"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
                {/* verse 0 means "somewhere in this chapter, exact position not tracked"
                    — worded as "top of" rather than silently dropping the verse suffix,
                    so it doesn't read as a no-op return to the chapter the user may
                    already be standing in. Only reachable now via the rare
                    parseVerseRefString fallback, since peeks no longer push a stop. */}
                {topReturn.verse > 0 ? (
                  <>Go back to <span className="font-bold">{topReturnBookName} {topReturn.chapter}:{topReturn.verse}</span></>
                ) : (
                  <>Go back to top of <span className="font-bold">{topReturnBookName} {topReturn.chapter}</span></>
                )}
                {/* Counts the stops *beyond* the one already named above, so the number
                    never double-counts what the user can already read in the label —
                    "· 1 more" means one further step back after this one. The old
                    "· N stops" showed the whole trail depth including the named target,
                    which read as if there were more history than there actually was. */}
                {returnStack.length > 1 && (
                  <span className="text-xs text-muted font-normal">· {returnStack.length - 1} more</span>
                )}
              </button>

              {topReturn.verse > 0 && (
                <>
                  <div className="w-[1px] h-4 bg-card-border" />
                  <button
                    onClick={() => {
                      setCrossRefPeekSource({ book: activeBookId, chapter: activeChapterNum });
                      setShowCrossReferences([`${topReturnBookEnglish.toLowerCase()} ${topReturn.chapter}:${topReturn.verse}`]);
                    }}
                    className="text-[15px] font-medium transition-colors flex items-center gap-2 hover:text-accent"
                    title="View references for original verse"
                  >
                    <BookOpen className="w-4 h-4" /> Refs
                  </button>
                </>
              )}

              <div className="w-[1px] h-4 bg-card-border" />

              <button
                onClick={() => setReturnStack([])}
                className="p-1 -mr-2 -my-2 rounded-full hover:bg-card-hover transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-[18px] h-[18px] opacity-80" />
              </button>
            </div>
          </div>
        );
      })()}
      <CommentaryModal
        isOpen={showCommentaryModal}
        onClose={() => setShowCommentaryModal(false)}
        bookId={activeBookId}
        bookName={getBookName(activeBookId, activeBookTitle, state.settings.bibleVersion)}
      />

      {immerseChapterOpen && chapterMemoryVerses.length > 0 && (() => {
        const safeIdx = Math.min(immerseVerseIdx, chapterMemoryVerses.length - 1);
        const prevCoord = adjacentReadingChapter(ALL_BOOKS, activeBookId, activeChapterNum, -1);
        const nextCoord = adjacentReadingChapter(ALL_BOOKS, activeBookId, activeChapterNum, 1);
        const nextBookObj = nextCoord ? ALL_BOOKS.find(b => b.id === nextCoord.bookId) : null;
        const nextShortBoundary = nextCoord
          ? getBookName(nextCoord.bookId, BOOK_SHORT[nextCoord.bookId] || nextBookObj?.name || nextCoord.bookId, bibleVersion)
          : null;
        const boundaryLabel = safeIdx === chapterMemoryVerses.length - 1
          ? !nextCoord
            ? 'End of Bible'
            : continueChapters && nextShortBoundary
            ? `Next · ${nextShortBoundary} ${nextCoord!.chapter}:1`
            : 'End of chapter'
          : null;

        return (
          <ImmersedReader
            verse={chapterMemoryVerses[safeIdx]}
            index={safeIdx}
            total={chapterMemoryVerses.length}
            onPrev={() => {
              stopChapterSpeech();
              if (safeIdx > 0) {
                const nextIdx = safeIdx - 1;
                setImmerseVerseIdx(nextIdx);
                const vNum = activeVerses[nextIdx]?.verse;
                if (vNum) setActiveStreamPos(prev => ({ ...prev, verse: vNum }));
              } else if (continueChapters && prevCoord) {
                preserveModeOnRouteChangeRef.current = true;
                immerseContinuationTargetRef.current = 'last';
                goToChapter(prevCoord.bookId, prevCoord.chapter, true);
              }
            }}
            onNext={() => {
              stopChapterSpeech();
              if (safeIdx < chapterMemoryVerses.length - 1) {
                const nextIdx = safeIdx + 1;
                setImmerseVerseIdx(nextIdx);
                const vNum = activeVerses[nextIdx]?.verse;
                if (vNum) setActiveStreamPos(prev => ({ ...prev, verse: vNum }));
              } else if (continueChapters && nextCoord) {
                preserveModeOnRouteChangeRef.current = true;
                immerseContinuationTargetRef.current = 'first';
                goToChapter(nextCoord.bookId, nextCoord.chapter, true);
              }
            }}
            onExit={() => {
              stopChapterSpeech();
              immerseContinuationTargetRef.current = null;
              setImmerseChapterOpen(false);
            }}
            isAutoPlaying={isSpeakingChapter}
            onToggleAutoPlay={() => {
              if (isSpeakingChapter) {
                stopChapterSpeech();
              } else {
                speakChapterFrom(safeIdx);
              }
            }}
            bibleVersion={bibleVersion}
            previousAvailable={safeIdx > 0 || (continueChapters && Boolean(prevCoord))}
            nextAvailable={safeIdx < chapterMemoryVerses.length - 1 || (continueChapters && Boolean(nextCoord))}
            boundaryLabel={boundaryLabel}
            isLoadingChapter={loading}
            chapterError={error}
            onRetryChapter={() => setRetryCount(c => c + 1)}
            backgroundPlayback={true}
            continueChapters={continueChapters}
            onContinueChaptersChange={(enabled) => {
              dispatch({ type: 'UPDATE_SETTINGS', payload: { continueChapters: enabled } });
            }}
          />
        );
      })()}
    </div>
  );
};
