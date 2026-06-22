const fs = require('fs');

const reportPath = 'C:/Users/etipa/.gemini/antigravity/brain/c4e0d273-1f10-4c43-ad02-d1d0b66b3d91/image_generation_report.md';
let content = fs.readFileSync(reportPath, 'utf8');

content = content.replace('| Matthew | 28 | 18 | 🔄 Partial (10 left) |', '| Matthew | 28 | 28 | ✅ Done |');
content = content.replace('| Mark | 16 | 0 | ❌ Not Started |', '| Mark | 16 | 6 | 🔄 Partial (10 left) |');
content = content.replace('| Revelation | 22 | 20 | 🔄 Partial (2 left) |', '| Revelation | 22 | 22 | ✅ Done |');
content = content.replace('- **Total Completed:** 132', '- **Total Completed:** 150');
content = content.replace('- **Total Remaining:** 128', '- **Total Remaining:** 110');

fs.writeFileSync(reportPath, content);
console.log('Report updated.');
