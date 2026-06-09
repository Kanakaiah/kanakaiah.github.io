const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const missing = JSON.parse(fs.readFileSync('missing_images.json', 'utf-8'));
if (missing.length === 0) process.exit(0);

const current = missing.shift();
const sourceImage = process.argv[2];

if (!fs.existsSync(current.dirPath)) {
    fs.mkdirSync(current.dirPath, { recursive: true });
}

fs.copyFileSync(sourceImage, current.imagePath);

fs.writeFileSync('missing_images.json', JSON.stringify(missing, null, 2));

try {
    cp.execSync('git add public/chapters', { stdio: 'ignore' });
    cp.execSync(`git commit -m "Add chapter image for ${current.guideId}"`, { stdio: 'ignore' });
    // cp.execSync('git push', { stdio: 'ignore' }); // push every time is slow, let's just commit
} catch (e) {
    // Ignore commit errors
}
console.log(missing.length + " remaining.");
