import json

with open('C:/Users/etipa/.gemini/antigravity/scratch/scraped_collections.json', 'r') as f:
    data = json.load(f)

out = "import type { StudyGuide } from './types';\n\nexport const MV_COLLECTIONS: StudyGuide[] = [\n"

for col in data:
    id_str = 'mv-' + ''.join(c for c in col['title'].lower() if c.isalnum() or c.isspace()).replace(' ', '-')
    out += '  {\n'
    out += f'    id: "{id_str}",\n'
    out += f'    title: "{col["title"]}",\n'
    out += f'    subtitle: "{col["subtitle"]}",\n'
    out += '    icon: "📖",\n'
    out += '    type: "reference",\n'
    out += '    category: "Topical Studies",\n'
    out += '    keyVerses: [\n'
    for ref in col['refs']:
        out += f'      {{ ref: "{ref}", text: "", theme: "" }},\n'
    out += '    ],\n'
    out += '    sections: []\n'
    out += '  },\n'

out += '];\n'

with open('src/data/memoryVersesCollections.ts', 'w') as f:
    f.write(out)

print("Done")
