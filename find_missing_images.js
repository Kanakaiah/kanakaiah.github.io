import fs from 'fs';
import path from 'path';

// Load all guides
const ntText = fs.readFileSync('src/data/guides.ts', 'utf8');

// I will parse the missing images by regexing the guide files
const guidesFile = fs.readFileSync('src/data/guides.ts', 'utf8');
const otGuidesDir = fs.readdirSync('src/data/otGuides');

let allGuides = [];

// A simple approach is to search for `ch: \d+` and `id: '...'`
// But we can also execute ts-node to get the exact data.
