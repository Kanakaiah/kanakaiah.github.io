const fs = require('fs');

const code = fs.readFileSync('src/data/guides.ts', 'utf8');

const guides = [];
// More precise regex
const blocks = code.split('id: "');
for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const idMatch = block.match(/^([^"]+)"/);
    if (!idMatch) continue;
    const id = idMatch[1];
    
    const anchorsMatch = block.match(/anchors:\s*\[([\s\S]*?)\]/);
    if (!anchorsMatch) continue;
    
    const anchorsBlock = anchorsMatch[1];
    const anchorRegex = /\{\s*ch:\s*(\d+),\s*word:\s*"([^"]+)",\s*scene:\s*"([^"]+)"\s*\}/g;
    let aMatch;
    while ((aMatch = anchorRegex.exec(anchorsBlock)) !== null) {
        guides.push({
            id: id,
            ch: aMatch[1],
            word: aMatch[2],
            scene: aMatch[3]
        });
    }
}

let count = 0;
for (const guide of guides) {
    const filePath = `public/chapters/${guide.id}/ch${guide.ch}.png`;
    if (!fs.existsSync(filePath)) {
        console.log(`${guide.id}|${guide.ch}|${guide.word}|${guide.scene}`);
        count++;
        if (count >= 25) break;
    }
}
