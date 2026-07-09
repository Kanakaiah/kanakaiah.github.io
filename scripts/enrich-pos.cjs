/**
 * Enriches Strong's dictionary JSON files with inferred Part-of-Speech (POS) tags.
 * Run: node scripts/enrich-pos.cjs
 */
const fs = require('fs');

function inferPOS(entry, isHebrew) {
  const der = (entry.derivation || '').toLowerCase();
  const def = (entry.strongs_def || '').toLowerCase();
  const kjv = (entry.kjv_def || '').toLowerCase();

  // --- Verb patterns ---
  if (der.includes('a primary verb') || der.includes('a prolonged form of a primary verb') || der.includes('apparently a primary verb'))
    return 'verb';
  if (der.includes('a primitive root'))
    return 'verb';
  if (def.startsWith(' to ') || def.startsWith('to '))
    return 'verb';

  // --- Adverb patterns ---
  if (der.startsWith('adverb'))
    return 'adverb';
  if (der.includes('adverbially'))
    return 'adverb';

  // --- Pronoun patterns ---
  if (def.includes('pronoun') || der.includes('pronoun'))
    return 'pronoun';

  // --- Conjunction ---
  if (def.includes('conjunction') || der.includes('conjunction'))
    return 'conjunction';

  // --- Preposition ---
  if (def.includes('a primary preposition') || der.includes('a primary preposition'))
    return 'preposition';
  if (der.includes('preposition'))
    return 'preposition';

  // --- Interjection ---
  if (def.includes('interjection') || der.includes('interjection'))
    return 'interjection';

  // --- Particle ---
  if (def.includes('a primary particle') || der.includes('a primary particle'))
    return 'particle';
  if (der.includes('particle'))
    return 'particle';

  // --- Adjective patterns ---
  if (der.startsWith('comparative of') || der.startsWith('superlative of'))
    return 'adjective';
  if (der.includes('adjective'))
    return 'adjective';

  // --- Noun patterns (check after verb to avoid false positives) ---
  if (der.startsWith('feminine of') || der.startsWith('feminine singular'))
    return 'noun';
  if (der.startsWith('neuter of'))
    return 'noun';
  if (der.startsWith('masculine of') || der.startsWith('masculine plural'))
    return 'noun';
  if (der.startsWith('plural of') || der.startsWith('plural from'))
    return 'noun';
  if (der.startsWith('dative') || der.startsWith('genitive') || der.startsWith('accusative') || der.startsWith('nominative'))
    return 'pronoun';

  // --- Proper noun / name patterns ---
  if (der.includes('of hebrew origin') || der.includes('of chaldee origin') || der.includes('of latin origin') || der.includes('of foreign origin')) {
    // Names tend to have a capital letter in strongs_def and short kjv_def
    const rawDef = (entry.strongs_def || '').trim();
    if (rawDef.match(/^[A-Z]/) && !rawDef.includes(','))
      return 'proper noun';
  }

  // --- Heuristic: if kjv_def is very short and definition starts with a capital, likely a proper noun ---
  const rawDef = (entry.strongs_def || '').trim();
  if (rawDef.match(/^[A-Z][a-z]+$/) || rawDef.match(/^[A-Z][a-z]+,\s*an?\s/))
    return 'proper noun';

  // Hebrew specific
  if (isHebrew) {
    if (der.includes('a primitive root'))
      return 'verb';
    if (der.includes('a primitive word'))
      return 'noun';
  }

  // --- Fallback: check definition text (trimmed) for patterns ---
  const defTrimmed = def.trim();
  
  // Noun patterns: starts with article or describes a thing/person/place
  if (defTrimmed.match(/^(a |an |the )/)) {
    return 'noun';
  }

  // Adjective: definition describes quality (e.g., "anointed", "beloved")
  if (defTrimmed.match(/^[a-z]+ed,/) || defTrimmed.match(/^[a-z]+ful,/) || defTrimmed.match(/^[a-z]+ous,/) || defTrimmed.match(/^[a-z]+ive,/)) {
    return 'adjective';
  }

  // Noun: definition contains "i.e." describing a thing
  if (defTrimmed.match(/^[a-z]+,?\s+i\.e\./)) {
    return 'noun';
  }

  return null; // Unknown
}

function enrichDictionary(inputPath, outputPath, isHebrew) {
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  let enriched = 0;
  let total = 0;

  for (const key of Object.keys(data)) {
    total++;
    const pos = inferPOS(data[key], isHebrew);
    if (pos) {
      data[key].pos = pos;
      enriched++;
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(data));
  console.log(`${isHebrew ? 'Hebrew' : 'Greek'}: ${enriched}/${total} entries enriched with POS (${Math.round(enriched/total*100)}%)`);
}

// Enrich both dictionaries
enrichDictionary('public/strongs-greek.json', 'public/strongs-greek.json', false);
enrichDictionary('public/strongs-hebrew.json', 'public/strongs-hebrew.json', true);

console.log('Done! POS tags added to dictionary files.');
