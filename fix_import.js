const fs = require('fs');
let content = fs.readFileSync('/home/ubuntu/.openclaw/skills/meridian/index.js', 'utf8');
const old = 'getTrackedPosition, getTrackedPositions, setPositionInstruction, updatePnlAndCheckExits, queuePeakConfirmation, resolvePendingPeak, queueTrailingDropConfirmation, resolvePendingTrailingDrop, pruneWaitlist, getEndorsedSymbols, addToWaitlist, confirmFib } from "./state.js";';
const newS = 'getTrackedPosition, getTrackedPositions, setPositionInstruction, updatePnlAndCheckExits, queuePeakConfirmation, resolvePendingPeak, queueTrailingDropConfirmation, resolvePendingTrailingDrop, pruneWaitlist, getEndorsedSymbols, addToWaitlist, confirmFib, updateWaitlistBB } from "./state.js";';
const count = (content.match(/getTrackedPosition/g) || []).length;
console.log('Found', count, 'occurrences of getTrackedPosition');
content = content.split(old).join(newS);
fs.writeFileSync('/home/ubuntu/.openclaw/skills/meridian/index.js', content);
console.log('Done - replaced both occurrences');
