import { useCallback, useState } from 'react';
import { lookupStrongsDefinition, normalizeStrongsRef } from '../../utils/strongs';

interface Occurrence {
  ref: string;
  lemma: string;
}

/**
 * Opening a Strong's occurrence list, from either surface that shows definitions.
 *
 * Handles the two things that used to be got wrong independently in each: references
 * are normalized (dictionary cross-links are zero-padded, "H02584", while the
 * dictionaries and the KJV tags are not), and a reference pointing into the other
 * testament gets its lemma resolved from that dictionary rather than being labeled
 * with the bare number.
 *
 * `resolveLemma` lets a caller answer instantly for words it already has definitions
 * for; anything it doesn't know falls through to the shared dictionary.
 */
export function useStrongsOccurrences(resolveLemma?: (ref: string) => string | undefined) {
  const [occurrence, setOccurrence] = useState<Occurrence | null>(null);
  const [loadingRef, setLoadingRef] = useState<string | null>(null);

  const openOccurrences = useCallback(async (rawRef: string) => {
    const ref = normalizeStrongsRef(rawRef);

    const known = resolveLemma?.(ref);
    if (known) {
      setOccurrence({ ref, lemma: known });
      return;
    }

    setLoadingRef(ref);
    const definition = await lookupStrongsDefinition(ref);
    setLoadingRef(null);
    setOccurrence({ ref, lemma: definition?.lemma || ref });
  }, [resolveLemma]);

  const closeOccurrences = useCallback(() => setOccurrence(null), []);

  return { occurrence, loadingRef, openOccurrences, closeOccurrences };
}
