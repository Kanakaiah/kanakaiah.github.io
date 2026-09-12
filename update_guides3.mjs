import fs from 'fs';

const lines = fs.readFileSync('src/screens/Guides.tsx', 'utf8').split('\n');

const gapIndex = lines.findLastIndex(l => l.includes('<div className="flex flex-col gap-8 pb-12">'));
if (gapIndex !== -1) {
  lines.splice(gapIndex + 1, 0, "        {activeTab === 'books' && (", "          <>");
}

const resourcesIndex = lines.findLastIndex(l => l.includes('{resourceSections.map(section => {'));
if (resourcesIndex !== -1) {
  lines.splice(resourcesIndex - 1, 0, "          </>", "        )}", "", "        {activeTab === 'guides' && (", "          <>");
}

let lastDivIndex = -1;
for (let i = lines.length - 1; i >= 2; i--) {
  if (lines[i].trim() === '};' && lines[i-1].trim() === ');' && lines[i-2].trim() === '</div>' && lines[i-3].trim() === '</div>') {
    lastDivIndex = i - 3;
    break;
  }
}

if (lastDivIndex !== -1) {
  lines.splice(lastDivIndex, 0, "          </>", "        )}");
} else {
  console.log("Could not find the end divs");
}

fs.writeFileSync('src/screens/Guides.tsx', lines.join('\n'));
console.log('done');
