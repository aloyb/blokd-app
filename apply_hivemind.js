const fs = require('fs');
let content = fs.readFileSync('/home/ubuntu/.openclaw/skills/meridian/index.js', 'utf8');

// Build the hivemindOnly block
const hivemindBlock = `
// ─── hivemindOnly mode: Fib → BB sequential check ───
    if (config.screening.hivemindOnly) {
      log("screening", "[HIVEMIND_ONLY] Mode active — skipping discoverPools");
      let waitlist = pruneWaitlist();

      // Pull latest lessons from network
      try {
        await pullHiveMindLessons();
        log("screening", "[HIVEMIND_ONLY] Pulled latest lessons from network");
      } catch (e) {
        log("screening_warn", \`[HIVEMIND_ONLY] Failed to pull lessons: \${e.message}\`);
      }

      const endorsedSymbols = getEndorsedSymbols();
      log("screening", \`[HIVEMIND_ONLY] Endorsed symbols: \${endorsedSymbols.join(", ") || "none"}\`);

      // Separate waitlist by Fib + BB status
      const pendingFib = waitlist.filter(w => !w.fib_confirmed);
      const pendingBB = waitlist.filter(w => w.fib_confirmed && !w.bb_confirmed);
      const readyToDeploy = waitlist.filter(w => w.fib_confirmed && w.bb_confirmed);

      log("screening", \`[HIVEMIND_ONLY] Waitlist: \${waitlist.length} total | Fib-pending: \${pendingFib.length} | BB-pending: \${pendingBB.length} | Ready: \${readyToDeploy.length}\`);

      const hivemindCandidates = [];

      // Step 1: Check BB for Fib-confirmed-but-BB-pending entries
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
      }

      // Step 2: Re-check Fib for pending entries
      for (const entry of pendingFib) {
        try {
          const fibResult = await confirmIndicatorPreset({
            mint: entry.symbol,
            pool_address: entry.pool_address,
            side: "entry",
            preset: "fib_0236",
            intervals: ["5_MINUTE"],
          });
          if (fibResult.confirmed) {
            confirmFib(entry.pool_address);
            log("screening", \`[HIVEMIND_ONLY] \${entry.symbol}: Fib 0.236 confirmed — \${fibResult.reason}\`);
            // Now check BB
            const bbResult = await confirmIndicatorPreset({
              mint: entry.symbol,
              pool_address: entry.pool_address,
              side: "entry",
              preset: "bollinger_reversion",
              intervals: ["5_MINUTE"],
            });
            if (bbResult.confirmed) {
              updateWaitlistBB(entry.pool_address, true);
              hivemindCandidates.push({
                pool: { pool: entry.pool_address, name: entry.pool_name, base_mint: entry.symbol },
                hivemind_override: true,
                source: "waitlist_fib_then_bb",
              });
            } else {
              log("screening", \`[HIVEMIND_ONLY] \${entry.symbol}: Fib OK, BB pending — \${bbResult.reason}\`);
            }
          }
        } catch (e) {
          log("screening_warn", \`[HIVEMIND_ONLY] Fib re-check failed for \${entry.symbol}: \${e.message}\`);
        }
        await new Promise(r => setTimeout(r, 200));
      }

      // Step 3: Add ready-to-deploy from previous cycle
      for (const entry of readyToDeploy) {
        hivemindCandidates.push({
          pool: { pool: entry.pool_address, name: entry.pool_name, base_mint: entry.symbol },
          hivemind_override: true,
          source: "waitlist_ready",
        });
      }

      // Step 4: If no candidates, scan endorsed symbols (new pools)
      if (hivemindCandidates.length === 0 && endorsedSymbols.length > 0) {
        log("screening", "[HIVEMIND_ONLY] No waitlist candidates. Fetching new pools for endorsed symbols...");
        let fetchedPools = [];
        try {
          const wideResult = await getTopCandidates({ source: "meteora", limit: 50, poolTypeFilter: "dmm" });
          fetchedPools = wideResult?.pools || wideResult?.candidates || [];
          log("screening", \`[HIVEMIND_ONLY] Wide fetch returned \${fetchedPools.length} pools\`);
        } catch (e) {
          log("screening_warn", \`[HIVEMIND_ONLY] Wide fetch failed: \${e.message}\`);
        }

        const matchedPools = fetchedPools.filter(p => {
          const sym = p.name?.toUpperCase().replace(/-(SOL|USDC|USDT)$/i, "") || "";
          return endorsedSymbols.some(es => sym.includes(es) || es.includes(sym));
        });
        log("screening", \`[HIVEMIND_ONLY] Matched \${matchedPools.length} pools against endorsed symbols\`);

        const safetyFiltered = [];
        for (const p of matchedPools) {
          if (p.volatility === 0 || p.volatility == null) {
            log("screening", \`[HIVEMIND_ONLY] Skipping \${p.name} — volatility=0/null\`);
            continue;
          }
          if (recallForPool(p.pool)) {
            log("screening", \`[HIVEMIND_ONLY] Skipping \${p.name} — already tracked/occupied\`);
            continue;
          }
          if (waitlist.find(w => w.pool_address === p.pool)) {
            continue;
          }
          safetyFiltered.push(p);
        }

        // Check Fib + BB for new pools via confirmIndicatorPreset
        for (const pool of safetyFiltered) {
          try {
            const fibResult = await confirmIndicatorPreset({
              mint: pool.base?.mint,
              pool_address: pool.pool,
              side: "entry",
              preset: "fib_0236",
              intervals: ["5_MINUTE"],
            });
            if (fibResult.confirmed) {
              log("screening", \`[HIVEMIND_ONLY] \${pool.name}: Fib 0.236 confirmed — \${fibResult.reason}\`);
              const bbResult = await confirmIndicatorPreset({
                mint: pool.base?.mint,
                pool_address: pool.pool,
                side: "entry",
                preset: "bollinger_reversion",
                intervals: ["5_MINUTE"],
              });
              if (bbResult.confirmed) {
                hivemindCandidates.push({
                  pool: { pool: pool.pool, name: pool.name, base_mint: pool.base?.mint },
                  hivemind_override: true,
                  source: "new_pool_fib_bb_confirmed",
                });
              } else {
                addToWaitlist({
                  symbol: pool.name,
                  pool_address: pool.pool,
                  pool_name: pool.name,
                  added_by: "fib_ok_bb_pending",
                });
                log("screening", \`[HIVEMIND_ONLY] \${pool.name}: Fib OK, BB pending — \${bbResult.reason}\`);
              }
            } else {
              addToWaitlist({
                symbol: pool.name,
                pool_address: pool.pool,
                pool_name: pool.name,
                added_by: "fib_pending",
              });
              log("screening", \`[HIVEMIND_ONLY] \${pool.name} added to waitlist — \${fibResult.reason}\`);
            }
          } catch (e) {
            log("screening_warn", \`[HIVEMIND_ONLY] Check failed for \${pool.name}: \${e.message}\`);
          }
          await new Promise(r => setTimeout(r, 200));
        }
      }

      if (hivemindCandidates.length === 0) {
        const waitlistSummary = waitlist.length > 0
          ? \`Waitlist: \${pendingFib.length} Fib-pending, \${pendingBB.length} BB-pending\`
          : "No waitlist entries";
        screenReport = \`No candidates ready.\${endorsedSymbols.length > 0 ? \`\\nEndorsed: \${endorsedSymbols.join(", ")}\` : ""}\n\${waitlistSummary}\`;
        log("screening", \`[HIVEMIND_ONLY] \${screenReport}\`);
        appendDecision({ type: "no_deploy", actor: "SCREENER", summary: "No Fib+BB confirmed candidates", reason: "hivemindOnly mode, waiting for Fib and/or BB confirmation" });
        _screeningBusy = false;
        return screenReport;
      }

      log("screening", \`[HIVEMIND_ONLY] Proceeding with \${hivemindCandidates.length} Fib+BB confirmed candidates\`);
      candidates = hivemindCandidates;
    }
`;

const oldLine = '    // Fetch top candidates, then recon each sequentially with a small delay to avoid 429s';
const newLines = oldLine + '\n' + hivemindBlock;

content = content.split(oldLine).join(newLines);
fs.writeFileSync('/home/ubuntu/.openclaw/skills/meridian/index.js', content);
console.log('Done - hivemindOnly block inserted');