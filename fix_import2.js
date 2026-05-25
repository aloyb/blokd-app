const fs = require('fs');
let content = fs.readFileSync('/home/ubuntu/.openclaw/skills/meridian/index.js', 'utf8');
const old = 'import { fetchChartIndicatorsForMint } from "./tools/chart-indicators.js";';
const newS = 'import { fetchChartIndicatorsForMint, confirmIndicatorPreset } from "./tools/chart-indicators.js";';
content = content.split(old).join(newS);
fs.writeFileSync('/home/ubuntu/.openclaw/skills/meridian/index.js', content);
console.log('Done');