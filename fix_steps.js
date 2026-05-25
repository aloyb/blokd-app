const fs = require('fs');
let content = fs.readFileSync('/home/ubuntu/.openclaw/skills/meridian/index.js', 'utf8');

// Fix Step 1 BB check - add pool_address and update logs
const old1 = `      // Step 1: Check BB for Fib-confirmed-but-BB-pending entries
      for (const entry of pendingBB) {
        try {
          const bbResult = await confirmIndicatorPreset({
            mint: entry.symbol,
            side: "entry",
            preset: "bollinger_reversion",
            intervals: ["5_MINUTE"],
          });
          if (bbResult.confirmed) {
            // BB confirmed → update state and add to candidates
            updateWaitlistBB(entry.pool_address, true);
            log("screening", \`[HIVEMIND_ONLY] \${entry.symbol}: BB confirmed — READY TO DEPLOY\`);
            hivemindCandidates.push({
              pool: { pool: entry.pool_address, name: entry.pool_name, base_mint: entry.symbol },
              hivemind_override: true,
              source: "waitlist_bb_confirmed",
            });
          } else {
            log("screening", \`[HIVEMIND_ONLY] \${entry.symbol}: BB not confirmed yet — keep waiting\`);
          }
        } catch (e) {
          log("screening_warn", \`[HIVEMIND_ONLY] BB check failed for \${entry.symbol}: \${e.message}\`);
        }
        await new Promise(r => setTimeout(r, 200));
      }`;

const new1 = `      // Step 1: Check BB for Fib-confirmed-but-BB-pending entries
      for (const entry of pendingBB) {
        try {
          const bbResult = await confirmIndicatorPreset({
            mint: entry.symbol,
            pool_address: entry.pool_address,
            side: "entry",
            preset: "bollinger_reversion",
            intervals: ["5_MINUTE"],
          });
          if (bbResult.confirmed) {
            // BB confirmed → update state and add to candidates
            updateWaitlistBB(entry.pool_address, true);
            log("screening", \`[HIVEMIND_ONLY] \${entry.symbol}: BB confirmed — \${bbResult.reason}\`);
            hivemindCandidates.push({
              pool: { pool: entry.pool_address, name: entry.pool_name, base_mint: entry.symbol },
              hivemind_override: true,
              source: "waitlist_bb_confirmed",
            });
          } else {
            log("screening", \`[HIVEMIND_ONLY] \${entry.symbol}: BB pending — \${bbResult.reason}\`);
          }
        } catch (e) {
          log("screening_warn", \`[HIVEMIND_ONLY] BB check failed for \${entry.symbol}: \${e.message}\`);
        }
        await new Promise(r => setTimeout(r, 200));
      }`;

content = content.split(old1).join(new1);
fs.writeFileSync('/home/ubuntu/.openclaw/skills/meridian/index.js', content);
console.log('Done - fixed Step 1 BB check');