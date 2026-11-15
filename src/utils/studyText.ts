/**
 * Text segmentation, initial-letter cueing, and plain verse cleanup ported from
 * Android's StudyText.kt, ReadingSentences.kt, ImmersedReader.kt, and MemoryVerseText.kt.
 */

const ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&mdash;': '—',
  '&ndash;': '–',
};

function decodeBasicEntities(s: string): string {
  if (typeof document !== 'undefined') {
    const decoder = document.createElement('textarea');
    decoder.innerHTML = s;
    return decoder.value;
  }
  return s.replace(/&(nbsp|amp|quot|#39|apos|lt|gt|mdash|ndash);/gi, (m) => ENTITY_MAP[m.toLowerCase()] ?? m);
}

/** Detect BCP-47 locale hint for Telugu, Tamil, or English scripts. */
function detectLocale(text: string): string {
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  return 'en';
}

type SegmenterLike = {
  segment(input: string): Iterable<{ segment: string; index: number }>;
};

function getSegmenter(locale: string, granularity: 'sentence' | 'grapheme'): SegmenterLike | null {
  const Seg = (Intl as unknown as { Segmenter?: new (loc?: string | string[], opts?: { granularity: string }) => SegmenterLike }).Segmenter;
  if (!Seg) return null;
  try {
    return new Seg(locale, { granularity });
  } catch {
    return null;
  }
}

/** Conservative thought segmentation: complete sentences, never automatic breaks at every comma. */
export function studyThoughts(text: string): string[] {
  const cleaned = (text || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return [];

  const locale = detectLocale(cleaned);
  const seg = getSegmenter(locale, 'sentence');
  let rawParts: string[] = [];

  if (seg) {
    for (const s of seg.segment(cleaned)) {
      if (s.segment) rawParts.push(s.segment);
    }
  } else {
    rawParts = cleaned.match(/[^.!?]+[.!?]+[\])"'\u2019\u201D]*\s*|[^.!?]+$/g) || [cleaned];
  }

  const merged: string[] = [];
  for (const part of rawParts) {
    if (!part) continue;
    const prev = merged[merged.length - 1];
    if (
      prev &&
      (part.trim().length === 0 ||
        prev.trim().length === 0 ||
        (/\bSt\.$/i.test(prev.trimEnd()) && /^\s*[\p{Lu}]/u.test(part)))
    ) {
      merged[merged.length - 1] = `${prev}${part}`;
    } else {
      merged.push(part);
    }
  }

  const result = merged.map((p) => p.trim()).filter(Boolean);
  return result.length > 0 ? result : [cleaned];
}

function splitClauses(text: string): string[] {
  const blocks: string[] = [];
  let start = 0;
  let index = 0;

  while (index < text.length) {
    const ch = text[index];
    const prev = index > 0 ? text[index - 1] : '';
    const next = index + 1 < text.length ? text[index + 1] : '';
    const numericComma = ch === ',' && /\d/.test(prev) && /\d/.test(next);

    if ((ch === ',' && !numericComma) || ch === ';') {
      let end = index + 1;
      while (end < text.length && ',;.!?"\'\u201d\u2019)]'.includes(text[end])) {
        end++;
      }
      while (end < text.length && /\s/.test(text[end])) {
        end++;
      }
      blocks.push(text.slice(start, end));
      start = end;
      index = end;
    } else {
      index++;
    }
  }

  if (start < text.length) {
    blocks.push(text.slice(start));
  }
  return blocks.filter((b) => b.length > 0);
}

/** Reading blocks at sentences, commas, and semicolons; preserves every source character. */
export function readingSentences(text: string): string[] {
  if (!text) return [];
  const locale = detectLocale(text);
  const seg = getSegmenter(locale, 'sentence');
  const rawParts: string[] = [];

  if (seg) {
    for (const s of seg.segment(text)) {
      if (s.segment) rawParts.push(s.segment);
    }
  } else {
    const fallback = text.match(/[^.!?]+[.!?]+[\])"'\u2019\u201D]*\s*|[^.!?]+$/g);
    if (fallback) rawParts.push(...fallback);
  }

  const sentences: string[] = [];
  for (const slice of rawParts) {
    const prev = sentences[sentences.length - 1];
    const followsSaintTitle =
      locale === 'en' &&
      Boolean(prev) &&
      /\bSt\.$/.test(prev.trimEnd()) &&
      /^\s*[\p{Lu}]/u.test(slice);
    if (prev !== undefined && (slice.trim().length === 0 || prev.trim().length === 0 || followsSaintTitle)) {
      sentences[sentences.length - 1] = `${prev}${slice}`;
    } else {
      sentences.push(slice);
    }
  }

  const base = sentences.length > 0 ? sentences : [text];
  return base.flatMap(splitClauses);
}

/**
 * Keeps Telugu/Tamil/Hindi vowel signs and combining marks attached to the initial grapheme
 * while stripping trailing letters/digits and retaining surrounding punctuation.
 */
export function initialCue(word: string): string {
  if (!word) return '';
  const seg = getSegmenter('und', 'grapheme');
  const clusters: string[] = seg
    ? Array.from(seg.segment(word), (s) => s.segment)
    : Array.from(word);

  let out = '';
  let found = false;
  for (const cluster of clusters) {
    if (/[\p{L}\p{N}]/u.test(cluster)) {
      if (!found) out += cluster;
      found = true;
    } else {
      out += cluster;
    }
  }
  return out;
}

function stripTagsToText(source: string): string {
  const withoutNotes = source
    .replace(/<S>\d+<\/S>/gi, '')
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, '')
    .replace(/<div\b[^>]*class="[^"]*heading[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  const withBreaks = !withoutNotes.includes('<')
    ? withoutNotes
    : withoutNotes
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]*>/g, '');

  return decodeBasicEntities(withBreaks)
    .replace(/\u00a0/g, ' ')
    .replace(/([a-z][.?!;:,])([A-Z])/g, '$1 $2')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface PracticePassageResult {
  text: string;
  scoringText: string;
}

/**
 * Leading <b>...</b> spans and those following a line break are section headings and are
 * excluded from recall scoring while inline <b> words remain part of the passage.
 */
export function practicePassage(source: string): PracticePassageResult {
  const raw = source || '';
  const START = '\uE000';
  const END = '\uE001';
  const headingRegex = /<b\b[^>]*>[\s\S]*?<\/b\s*>/gi;

  const marked = raw.replace(headingRegex, (match, offset: number) => {
    const prefix = raw.slice(0, offset).trimEnd();
    if (!prefix || /<br\s*\/?>$/i.test(prefix)) {
      return `${START}${match}${END}`;
    }
    return match;
  });

  const decoded = stripTagsToText(marked);
  let display = '';
  let recall = '';
  let headingDepth = 0;

  for (const ch of decoded) {
    if (ch === START) {
      headingDepth++;
    } else if (ch === END) {
      headingDepth = Math.max(0, headingDepth - 1);
    } else {
      display += ch;
      recall += headingDepth > 0 && !/\s/.test(ch) ? ' ' : ch;
    }
  }

  return {
    text: display.replace(/[ \t]+/g, ' ').trim(),
    scoringText: recall.replace(/\s+/g, ' ').trim(),
  };
}

/** Plain verse content for previews and memorization, without editorial headings or LSB Psalm titles. */
export function memoryVerseText(
  raw: string,
  bookId?: string | number,
  verse?: number,
  version?: string,
): string {
  let text = (raw || '')
    .replace(/<b\b[^>]*>[\s\S]*?<\/b>/gi, '')
    .replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, '')
    .replace(/<div\b[^>]*class="[^"]*heading[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<S>\d+<\/S>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '');

  text = decodeBasicEntities(text)
    .replace(/([a-z][.?!;:,])([A-Z])/g, '$1 $2')
    .replace(/\u00a0/g, ' ')
    .trim();

  const isPsalms = bookId === 19 || String(bookId || '').toLowerCase().replace(/[^a-z]/g, '') === 'psalms' || String(bookId || '').toLowerCase() === 'psalm';
  if (isPsalms && verse === 1 && String(version || '').toUpperCase() === 'LSB') {
    const titlePrefix = /^(?:For the choir director\.|Of David\.|A Maskil\.|A Psalm of David\.)\s*/;
    while (titlePrefix.test(text)) {
      text = text.replace(titlePrefix, '');
    }
  }

  return text.replace(/\s+/g, ' ').trim();
}
