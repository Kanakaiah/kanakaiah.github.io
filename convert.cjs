const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:/Users/etipa/.gemini/antigravity/scratch/scraped_collections_books.json'));
let out = "import type { StudyGuide } from './types';\n\nexport const MV_BOOKS: StudyGuide[] = [\n";
data.forEach(col => {
    let id_str = 'mv-book-' + col.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    out += '  {\n';
    out += `    id: "${id_str}",\n`;
    out += `    title: "${col.title}",\n`;
    out += `    subtitle: "${col.subtitle}",\n`;
    out += '    icon: "📖",\n';
    out += '    type: "reference",\n';
    out += '    category: "Topical Studies",\n';
    out += '    keyVerses: [\n';
    col.refs.forEach(ref => {
        out += `      { ref: "${ref}", text: "", theme: "" },\n`;
    });
    out += '    ],\n';
    out += '    sections: []\n';
    out += '  },\n';
});
out += '];\n';
fs.writeFileSync('src/data/memoryVersesBooks.ts', out);
console.log("Done");
