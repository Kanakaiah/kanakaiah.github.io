/**
 * Strong's references show up in two shapes across the data. The KJV text tags and the
 * dictionary keys use plain numbers (<S>2584</S>, "H2584"), but the cross-references
 * written inside the Greek dictionary's own definitions are zero-padded to five digits
 * ("of Hebrew origin H02584"). Normalizing to the unpadded form is what lets a padded
 * reference find its dictionary entry — and its occurrences, since the KJV tags it gets
 * searched against are unpadded too.
 */
export function normalizeStrongsRef(ref: string): string {
  const match = ref.trim().match(/^([GHgh])0*(\d+)$/);
  if (!match) return ref.trim().toUpperCase();
  return `${match[1].toUpperCase()}${match[2]}`;
}

/** The digits alone, unpadded — what the KJV text is tagged with. */
export function strongsNumberPart(ref: string): string {
  return normalizeStrongsRef(ref).replace(/[^0-9]/g, '');
}

/** H numbers are Hebrew (Old Testament), G numbers Greek (New Testament). */
export function isHebrewStrongs(ref: string): boolean {
  return normalizeStrongsRef(ref).startsWith('H');
}

export interface StrongsDefinition {
  lemma: string;
  xlit?: string;
  pron?: string;
  strongs_def: string;
  kjv_def: string;
  derivation?: string;
  pos?: string;
}

export type StrongsDictionary = Record<string, StrongsDefinition>;

// Both dictionaries are multi-megabyte, so they're cached for the session and fetched
// only when a reference actually needs one. A verse only needs its own testament's
// dictionary, but Greek entries cite Hebrew origins for proper nouns (Ἄννα -> H2584),
// and following one of those needs the other dictionary too.
const dictionaryCache: Record<string, StrongsDictionary> = {};

export async function loadStrongsDictionary(prefix: string): Promise<StrongsDictionary> {
  if (dictionaryCache[prefix]) return dictionaryCache[prefix];

  const res = await fetch(prefix === 'H' ? '/strongs-hebrew.json' : '/strongs-greek.json');
  if (!res.ok) throw new Error('Failed to load Strongs dictionary. (Are the JSON files in the public directory?)');

  const data: StrongsDictionary = await res.json();
  dictionaryCache[prefix] = data;
  return data;
}

/** Resolves a reference — padded or not, either testament — to its dictionary entry. */
export async function lookupStrongsDefinition(ref: string): Promise<StrongsDefinition | undefined> {
  const normalized = normalizeStrongsRef(ref);
  try {
    const dict = await loadStrongsDictionary(normalized.charAt(0));
    return dict[normalized];
  } catch {
    return undefined;
  }
}
