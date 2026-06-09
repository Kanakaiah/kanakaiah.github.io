const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error("Usage: node process_image.cjs <generated_path> <id> <ch>");
  process.exit(1);
}

const generatedPath = args[0];
const id = args[1];
const ch = args[2];

const targetDir = `public/chapters/${id}`;
const targetPath = `${targetDir}/ch${ch}.png`;

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.copyFileSync(generatedPath, targetPath);
console.log(`Copied to ${targetPath}`);

// Update missing.json
let missing = JSON.parse(fs.readFileSync('missing.json', 'utf8'));
missing = missing.filter(j => !(j.id === id && j.ch === ch));
fs.writeFileSync('missing.json', JSON.stringify(missing, null, 2));

if (missing.length % 5 === 0) {
  try {
    execSync(`git add public/chapters`);
    execSync(`git commit -m "Add chapter images for ${id}"`);
    execSync(`git push`);
    console.log(`Committed and pushed progress.`);
  } catch (e) {
    console.log(`Git commit failed (maybe no changes or no git repo).`);
  }
}

if (missing.length > 0) {
  console.log("NEXT_JOB: " + JSON.stringify(missing[0]));
} else {
  console.log("ALL_DONE");
}
