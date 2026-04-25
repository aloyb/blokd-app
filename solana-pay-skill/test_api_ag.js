const fetch = require("cross-fetch");
const { Connection, Keypair, VersionedTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const bs58 = require("bs58").default;

const SOL_MINT = 'So11111111111111111111111111111111111111111112';
const TOKEN_MINT = 'GSErga4VnqbmHSe9SPpyb7iAp3gkbU8oeDT6M1BQpump';
const SWAP_AMOUNT = 0.03;
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=ac6fa08c-32fd-414c-afc9-fd70149a974a';
const WALLET_KEY = 'R6A33yxAH58tB3gWoCAKkbyBbCpNPV4qV8d1FFhQMVvWwWSAhRaRmeTBQ6ACMuDX5Ewst3pDMtLEDh52La6c7rX';

const kp = Keypair.fromSecretKey(new Uint8Array(bs58.decode(WALLET_KEY)));
console.log('Wallet:', kp.publicKey.toBase58());

async function doSwap() {
  const amountLamport = Math.floor(SWAP_AMOUNT * LAMPORTS_PER_SOL);
  
  // Try api.jup.ag/swap/v2/order
  console.log('\n[1] Testing api.jup.ag/swap/v2/order...');
  const url = `https://api.jup.ag/swap/v2/order?inputMint=${SOL_MINT}&outputMint=${TOKEN_MINT}&amount=${amountLamport}&slippageBps=500&taker=${kp.publicKey.toBase58()}`;
  
  try {
    const res = await fetch(url, { timeout: 15000 });
    const data = await res.json().catch(() => ({ raw: res.text() }));
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data).substring(0, 500));
  } catch(e) {
    console.log('Error:', e.message);
  }
}

doSwap();
