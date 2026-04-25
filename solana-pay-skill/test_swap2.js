const { Connection, Keypair, PublicKey, VersionedTransaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const bs58 = require("bs58");
const fetch = require("cross-fetch");

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_MINT = 'So11111111111111111111111111111111111111111112';
const SWAP_AMOUNT = 0.03;
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=ac6fa08c-32fd-414c-afc9-fd70149a974a';
const WALLET_KEY = 'R6A33yxAH58tB3gWoCAKkbyBbCpNPV4qV8d1FFhQMVvWwWSAhRaRmeTBQ6ACMuDX5Ewst3pDMtLEDh52La6c7rX';

const connection = new Connection(HELIUS_RPC, 'confirmed');
const secretKey = typeof bs58.decode === 'function' ? bs58.decode(WALLET_KEY) : bs58.default.decode(WALLET_KEY);
const kp = Keypair.fromSecretKey(new Uint8Array(secretKey));
console.log('Wallet:', kp.publicKey.toBase58());

async function trySwap() {
  const JUPITER_URL = 'https://api.jup.ag/swap/v2';
  const amountLamports = Math.floor(SWAP_AMOUNT * LAMPORTS_PER_SOL);
  
  // Test SOL to USDC first
  const params = new URLSearchParams({
    inputMint: SOL_MINT,
    outputMint: USDC_MINT,
    amount: amountLamports.toString(),
    slippageBps: '500',
    taker: kp.publicKey.toString()
  });
  
  const url = `${JUPITER_URL}/order?${params.toString()}`;
  console.log('Testing SOL -> USDC...');
  
  const res = await fetch(url);
  const data = await res.json();
  console.log('Response status:', res.status);
  console.log('Response:', JSON.stringify(data).substring(0, 500));
}

trySwap().catch(console.error);
