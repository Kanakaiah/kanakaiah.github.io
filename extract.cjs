const fs = require('fs');
const content = fs.readFileSync('src/data/guides.ts', 'utf8');

let jobs = [];

const guideSplits = content.split('id: "');
for (let i = 1; i < guideSplits.length; i++) {
  const chunk = guideSplits[i];
  const id = chunk.substring(0, chunk.indexOf('"'));
  
  const anchorIndex = chunk.indexOf('anchors: [');
  if (anchorIndex === -1) continue;
  
  const endAnchorIndex = chunk.indexOf('],', anchorIndex);
  if (endAnchorIndex === -1) continue;
  
  const anchorsText = chunk.substring(anchorIndex, endAnchorIndex);
  
  const anchorRegex = /\{\s*ch:\s*(\d+)\s*,\s*word:\s*["'](.*?)["']\s*,\s*scene:\s*["'](.*?)["']\s*\}/g;
  let aMatch;
  while ((aMatch = anchorRegex.exec(anchorsText)) !== null) {
    jobs.push({
      id,
      ch: aMatch[1],
      word: aMatch[2],
      scene: aMatch[3]
    });
  }
}

fs.writeFileSync('jobs.json', JSON.stringify(jobs, null, 2));
console.log('Wrote ' + jobs.length + ' jobs');
