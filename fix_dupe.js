const fs = require('fs');
let content = fs.readFileSync('/home/ubuntu/.openclaw/skills/meridian/index.js', 'utf8');

// Find and remove the duplicated import block (after line 649)
const lines = content.split('\n');
console.log('Total lines:', lines.length);
console.log('Line 649:', lines[648]?.substring(0, 80));
console.log('Line 650:', lines[649]?.substring(0, 80));
console.log('Line 651:', lines[650]?.substring(0, 80));
console.log('Line 652:', lines[651]?.substring(0, 80));
console.log('Line 693:', lines[692]?.substring(0, 80));

// Remove lines 649-692 (indices) - the duplicated code block after the hivemind block closes
// We want to keep lines 0-648, then skip to line 693 onwards
const newLines = [...lines.slice(0, 649), ...lines.slice(692)];
console.log('New total lines:', newLines.length);

fs.writeFileSync('/home/ubuntu/.openclaw/skills/meridian/index.js', newLines.join('\n'));
console.log('Done - removed duplicated imports block');