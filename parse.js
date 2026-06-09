const fs = require('fs');
const content = fs.readFileSync('src/data/guides.ts', 'utf-8');
const lines = content.split('\n');

let currentGuide = null;
let inAnchors = false;
let anchors = [];

for (let line of lines) {
    let matchId = line.match(/id:\s*"([^"]+)"/);
    if (matchId) {
        currentGuide = matchId[1];
    }
    if (line.includes('anchors: [')) {
        inAnchors = true;
    } else if (inAnchors && line.includes('],')) {
        inAnchors = false;
    } else if (inAnchors) {
        // Handle single or double quotes for word and scene
        let m = line.match(/{.*?ch:\s*(\d+).*?word:\s*(["'])(.*?)\2.*?scene:\s*(["'])(.*?)\4/);
        if (m) {
            anchors.push({
                guide_id: currentGuide,
                ch: parseInt(m[1]),
                word: m[3],
                scene: m[5]
            });
        }
    }
}

fs.writeFileSync('anchors.json', JSON.stringify(anchors, null, 2));
console.log("Parsed " + anchors.length + " anchors.");
