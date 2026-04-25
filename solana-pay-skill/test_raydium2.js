const fetch = require("cross-fetch");
const { Connection, Keypair, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const bs58 = require("bs58").default;

const SOL_MINT = 'So11111111111111111111111111111111111111111112';
const TOKEN_MINT = 'GSErga4VnqbmHSe9SPpyb7iAp3gkbU8oeDT6M1BQpump';
const SWAP_AMOUNT = 0.03;
const WALLET_KEY = 'R6A33yxAH58tB3gWoCAKkbyBbCpNPV4qV8d1FFhQMVvWwWSAhRaRmeTBQ6ACMuDX5Ewst3pDMtLEDh52La6c7rX';

const kp = Keypair.fromSecretKey(new Uint8Array(bs58.decode(WALLET_KEY)));
console.log('Wallet:', kp.publicKey.toBase58());

async function testEndpoints() {
  const amountLamport = Math.floor(SWAP_AMOUNT * LAMPORTS_PER_SOL);
  
  const endpoints = [
    ['Raydium v1', `https://api.raydium.io/v2/quote?inputMint=${SOL_MINT}&outputMint=${TOKEN_MINT}&amount=${amountLamport}&slippage=1`],
    ['Raydium v2 swap', `https://api.raydium.io/v2/swap?inputMint=${SOL_MINT}&outputMint=${TOKEN_MINT}&amount=${amountLamport}&slippage=1`],
    ['Raydium main', `https://api.raydium.io/main/v2/quote?inputMint=${SOL_MINT}&outputMint=${TOKEN_MINT}&amount=${amountLamport}`],
  ];
  
  for (const [name, url] of endpoints) {
    try {
      console.log(`\nTesting ${name}...`);
      const res = await fetch(url, { timeout: 10000 });
      const data = await res.json().catch(() => ({}));
      console.log(`  Status: ${res.status}`);
      console.log(`  Response: ${JSON.stringify(data).substring(0, 200)}`);
    } catch(e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

testEndpoints();
