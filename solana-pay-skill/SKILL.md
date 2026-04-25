---
name: solana-pay
description: Solana wallet manager with Jupiter swap and Moonshot balance monitoring. Send SOL/USDC, swap tokens, and monitor API credits.
metadata:
  {
    "openclaw":
      {
        "emoji": "💳",
        "requires": { "bins": ["node"], "node_modules": ["@solana/web3.js", "@solana/spl-token", "bs58", "cross-fetch"] },
        "install":
          [
            {
              "id": "npm-install",
              "kind": "npm",
              "workdir": "./",
              "label": "Install dependencies",
            },
          ],
      },
  }
---

# Solana Pay Skill (BETA)

Manage Solana wallet, swap via Jupiter, and monitor Moonshot API balance.

⚠️ **BETA VERSION** - Use at your own risk for mainnet.

## Quick Start

```bash
# Setup
node index.js setup <PRIVATE_KEY> <AVICI_ADDRESS> <RPC_URL>

# Check balances
node index.js balance

# Send SOL
node index.js send-sol <ADDRESS> <AMOUNT>

# Swap SOL to USDC
node index.js swap <AMOUNT_SOL> <JUPITER_API_KEY>
```

## Config

Edit `config.json`:
```json
{
  "rpcUrl": "https://api.mainnet-beta.solana.com",
  "privateKey": "YOUR_BASE58_PRIVATE_KEY",
  "aviciAddress": "YOUR_AVICI_ADDRESS",
  "moonshotApiKey": "YOUR_MOONSHOT_KEY",
  "telegramBotToken": "OPTIONAL",
  "telegramChatId": "OPTIONAL"
}
```

## Monitor

```bash
# Start Moonshot monitor (alerts when balance < $10)
node moonshot-daemon.js
```

## API Keys Required

- **Helius RPC** (free): helius.dev
- **Jupiter** (free): portal.jup.ag
- **Moonshot** (free): platform.moonshot.ai

## Security

- Private key stored in `config.json` (not committed)
- API keys loaded at runtime
- No telemetry or analytics

## License

MIT
