# Solana Pay Skill (BETA)

Skill untuk manage Solana wallet + Jupiter swap + Moonshot monitoring.

⚠️ **BETA VERSION** - Masih dalam pengembangan. Report bug ke author.

## Features

- ✅ Cek balance SOL + USDC + Moonshot
- ✅ Kirim SOL & USDC
- ✅ Top-up Avici Visa (USDC)
- ✅ Swap SOL → token via Jupiter API
- ✅ Monitor Moonshot balance (alert < $10)

## Install

```bash
cd ~/.openclaw/skills
git clone <repo> solana-pay
cd solana-pay
npm install
```

## Setup

1. Copy config template:
```bash
cp config.example.json config.json
```

2. Edit `config.json`:
```json
{
  "rpcUrl": "https://api.mainnet-beta.solana.com",
  "privateKey": "YOUR_BASE58_PRIVATE_KEY",
  "aviciAddress": "YOUR_AVICI_ADDRESS",
  "moonshotApiKey": "YOUR_MOONSHOT_API_KEY",
  "telegramBotToken": "YOUR_BOT_TOKEN",
  "telegramChatId": "YOUR_CHAT_ID",
  "maxSolPerTx": 5,
  "maxUsdcPerTx": 500
}
```

3. Atau setup via CLI:
```bash
node index.js setup <PRIVATE_KEY_BASE58> <AVICI_ADDRESS> <RPC_URL>
```

## Commands

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `balance` | Cek semua balance | `node index.js balance` |
| `send-sol` | Kirim SOL | `node index.js send-sol <address> 0.01` |
| `send-usdc` | Kirim USDC | `node index.js send-usdc <address> 5` |
| `topup-avici` | Top-up Avici Visa | `node index.js topup-avici 10` |
| `swap` | Swap SOL → token | `node index.js swap 0.01 <JUPITER_API_KEY>` |

## Monitor

Jalankan Moonshot monitor (alert kalau saldo < $10):
```bash
node moonshot-daemon.js
```

## Security Checklist

- [ ] Private key disimpan aman (config.json, gak di-commit)
- [ ] API keys tidak di-hardcode
- [ ] config.json di-.gitignore
- [ ] npm audit sebelum install

## API Keys Needed

| Service | URL | Free Tier |
|---------|-----|-----------|
| Helius RPC | helius.dev | ✅ Yes |
| Jupiter | portal.jup.ag | ✅ Yes |
| Moonshot | platform.moonshot.ai | ✅ Yes |

## License

MIT

## Beta Notice

This is a beta release. Features may change. Use at your own risk for mainnet transactions.
