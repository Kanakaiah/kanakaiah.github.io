const fs = require('fs');
const path = require('path');

let tsContent = fs.readFileSync('src/data/guides.ts', 'utf-8');

// remove imports
tsContent = tsContent.replace(/^import\s+.*$/gm, '');
// replace export const NT_STUDY_GUIDES = [ with const NT_STUDY_GUIDES = [
tsContent = tsContent.replace(/export\s+const\s+NT_STUDY_GUIDES\s*=\s*/, 'const NT_STUDY_GUIDES = ');

// we need to provide a mock PREACHERS_GUIDE since it is imported
const PREACHERS_GUIDE = { id: 'preachers', anchors: [] };

let missing = [];
try {
    eval(tsContent + '\n\n' + `
        NT_STUDY_GUIDES.forEach(guide => {
            if (!guide.anchors) return;
            guide.anchors.forEach(anchor => {
                const guideId = guide.id;
                const ch = anchor.ch;
                const word = anchor.word;
                const scene = anchor.scene;
                
                const dirPath = path.join('public', 'chapters', guideId);
                const imagePath = path.join(dirPath, \`ch\${ch}.png\`);
                
                if (!fs.existsSync(imagePath)) {
                    missing.push({ guideId, ch, word, scene, imagePath, dirPath });
                }
            });
        });
    `);
    fs.writeFileSync('missing_images.json', JSON.stringify(missing, null, 2));
    console.log("Success! Found", missing.length, "missing images.");
} catch(e) {
    console.error("Eval failed:", e);
}
