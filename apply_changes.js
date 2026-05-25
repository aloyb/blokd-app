const fs = require('fs');
let content = fs.readFileSync('/home/ubuntu/.openclaw/skills/meridian/index.js', 'utf8');

// 1. Add confirmIndicatorPreset to chart-indicators import
content = content.split(
  'import { fetchChartIndicatorsForMint } from "./tools/chart-indicators.js";'
).join(
  'import { fetchChartIndicatorsForMint, confirmIndicatorPreset } from "./tools/chart-indicators.js";'
);

// 2. Add waitlist functions to state.js import
content = content.split(
  'import { getLastBriefingDate, setLastBriefingDate, getTrackedPosition, getTrackedPositions, setPositionInstruction, updatePnlAndCheckExits, queuePeakConfirmation, resolvePendingPeak, queueTrailingDropConfirmation, resolvePendingTrailingDrop } from "./state.js";'
).join(
  'import { getLastBriefingDate, setLastBriefingDate, getTrackedPosition, getTrackedPositions, setPositionInstruction, updatePnlAndCheckExits, queuePeakConfirmation, resolvePendingPeak, queueTrailingDropConfirmation, resolvePendingTrailingDrop, pruneWaitlist, getEndorsedSymbols, addToWaitlist, confirmFib, updateWaitlistBB } from "./state.js";'
);

fs.writeFileSync('/home/ubuntu/.openclaw/skills/meridian/index.js', content);
console.log('Step 1 done: imports updated');