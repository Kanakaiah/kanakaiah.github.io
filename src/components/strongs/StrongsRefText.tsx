import type { ReactNode } from 'react';
import { normalizeStrongsRef } from '../../utils/strongs';

interface StrongsRefTextProps {
  /** A definition or derivation string, e.g. "from G1 (Α) and G2964 (κυρόω);" */
  text: string;
  onRefClick: (ref: string) => void;
  /** The reference currently being resolved, dimmed while its dictionary loads. */
  loadingRef?: string | null;
}

/**
 * Renders a Strong's definition with its G####/H#### references as links.
 *
 * Both the word popup and the per-verse list used to carry their own copy of this
 * parsing, which is how a padded reference (H02584) ended up mishandled in two
 * different ways at once.
 */
export function StrongsRefText({ text, onRefClick, loadingRef }: StrongsRefTextProps): ReactNode[] {
  if (!text) return [];

  // Matches "G1234", "H5678", and the parenthetical gloss that often follows.
  const regex = /([GH]\d+)(\s*\([^)]*\))?/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const ref = match[1];
    const isLoading = loadingRef != null && loadingRef === normalizeStrongsRef(ref);

    parts.push(
      <span
        key={`ref-${match.index}`}
        className={`text-accent font-medium cursor-pointer hover:underline${isLoading ? ' opacity-50' : ''}`}
        onClick={() => onRefClick(ref)}
      >
        {fullMatch}
      </span>
    );

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
