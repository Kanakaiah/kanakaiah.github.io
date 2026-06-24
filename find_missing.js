const fs = require('fs');
const path = require('path');

// Read guides.ts
const guidesContent = fs.readFileSync(path.join(__dirname, '../src/data/guides.ts'), 'utf8');

// We can't simply require it because it's TypeScript. But we can extract the anchors using regex.
// Wait, it might be easier to use ts-node.
