import fs from 'fs';

let data = fs.readFileSync('src/screens/Guides.tsx', 'utf8');

// The marker lines
const containerStart = '<div className="flex flex-col gap-8 pb-12">';
const resourceStart = '{resourceSections.map(section => {';
const containerEnd = '</div>\n    </div>\n  );\n}';

const idx1 = data.indexOf(containerStart);
if (idx1 !== -1) {
  const insert1 = '<div className="flex flex-col gap-8 pb-12">\n        {activeTab === \'books\' && (\n          <>';
  data = data.slice(0, idx1) + insert1 + data.slice(idx1 + containerStart.length);
}

const idx2 = data.indexOf(resourceStart);
if (idx2 !== -1) {
  const lineStart = data.lastIndexOf('\n', idx2);
  const insert2 = '\n          </>\n        )}\n\n        {activeTab === \'guides\' && (\n          <>\n';
  data = data.slice(0, lineStart) + insert2 + data.slice(lineStart);
}

const idx3 = data.lastIndexOf(containerEnd);
if (idx3 !== -1) {
  const insert3 = '          </>\n        )}\n      ' + containerEnd;
  data = data.slice(0, idx3) + insert3;
}

fs.writeFileSync('src/screens/Guides.tsx', data);
console.log('done');
