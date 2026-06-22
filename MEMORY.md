# MEMORY.md — Long-Term Context (v3)
# Auto-injected every session. Compact format — token-budget aware.
# Private/main sessions only. Never inject in shared/group contexts.

---

## OWNER

Name:    [name]
Niche:   [primary domain]
Audience: [who they serve]
Model:   [how they make money]

---

## STACK BIASES

Server:  [preferred OS]
Runtime: [preferred language]
DB:      [preferred storage]
Deploy:  [pm2 / systemd / etc.]

---

## ACTIVE PROJECTS

```
[name] | [status] | [stack] | [current blocker or next milestone]
[name] | [status] | [stack] | [current blocker or next milestone]
```

---

## LOCKED DECISIONS

```
[date] | [decision] | [reason — 1 line]
[date] | [decision] | [reason]
```

---

## OPERATOR PREFERENCES (revealed over sessions)

```
- [pref 1]
- [pref 2]
```

---

## RECENT CONTEXT (rolling — last 30 days)

<!-- SUPERAGENT appends compact summaries here. Auto-prune entries > 30 days. -->

<!-- Format: [YYYY-MM-DD] [topic] | [outcome/decision] | [open?] -->

---

## COMPACTION RULES

- Total file ≤ 2000 tokens. Compact when approaching limit.
- Each entry ≤ 1 line.
- Prune entries > 30 days unless flagged "permanent".
- On session end with significant new context → append, don't rewrite.

## 2026-05-26 Update

### Meridian Dashboard (Rust/Axum)
- Location: `/home/ubuntu/meridian-dashboard/`
- Running: screen `meridian-dash` (port 3001)
- Fix: Layout positioning, nav click handler, terminal page flex
- Status: Navigation works, layout correct, content APIs still need work

## 2026-05-27 Update

- Xiaomi LLM fixed: installed new valid `tp-...` key, normalized provider to `/v1` + `openai-completions`, replaced unsupported `mimo-v2-flash` with `mimo-v2.5`, set BlokD primary to `xiaomi/mimo-v2.5-pro`; runtime probe returned OK.
- Meridian bot: gateway restart killed old screen, restarted screen `meridian-bot`; Telegram polling active.

## IMPORTANT — Meridian Post-Update Restore

- After any Meridian update/git pull, immediately verify/restore these patches before deploy: `fib_0236` entry preset in `tools/chart-indicators.js` with fib236 extracted and zoneLow/zoneHigh via Math.min/max; BB only for exit (`bollinger_reversion`), not entry; `strategyConfig` wired into `config.strategy`; volatility rule enforced in prompt + `tools/executor.js` + `tools/dlmm.js` with vol < 5 => `bid_ask`, vol >= 5 => `spot`, single-side SOL deploy `amount_y`, `bins_above=0`, min floor 35 bins and max cap `maxBinsBelow` (currently 69) to avoid Meteora `ReallocExceedMaxLengthPerInstruction`; `requestedBinsBelow` must be mutable and final deploy args must receive overridden `bins_below`/`strategy`.
- Also verify management guards after update: positive `stopLossPct` from user config must normalize to negative (e.g. `15` => `-15%`) so new positions do not instantly close; when `trailingTakeProfit=true`, deterministic fixed `takeProfitPct` close must be bypassed so trailing TP controls profit exits after confirmed peak/drop.
- Keep Meridian Telegram screening output compact: report only deploy/no-deploy status, best candidate if relevant, and flat reject reasons like `ZINC-SOL: fib_0236 rejected on 15m`; no long analysis/funnel sections in chat. Funnel/detail can stay in logs.
- Current Meridian wallet after replacement: `BsEpL7...992AC`; verify decrypt/balance with `import "./envcrypt.js"` before judging wallet status. Last verified: 0 open positions, bot screen `2980533.meridian-bot`.
- **2026-06-08 Strategy Overhaul**: Strategy = `mixed` (30% spot + 70% bid_ask, two positions per pool). Bins_below = FIB-based (fib 0.618-0.786 support zone), NOT volatility-based. Screening source = GMGN (minMcap=50k). Entry = fib_0236 (0.236-0.382 zone). `maxPositions=4` to fit mixed. Key files: `fibBinsBelow()` in chart-indicators.js, `extractFibSignal()` in fib-waitlist.js, mixed guard in executor.js.
