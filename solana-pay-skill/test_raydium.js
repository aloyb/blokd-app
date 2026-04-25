const fetch = require("cross-fetch");
const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const bs58 = require("bs58").default;

const SOL_MINT = 'So11111111111111111111111111111111111111111112';
const TOKEN_MINT = 'GSErga4VnqbmHSe9SPpyb7iAp3gkbU8oeDT6M1BQpump';
const SWAP_AMOUNT = 0.03;
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=ac6fa08c-32fd-414c-afc9-fd70149a974a';
const WALLET_KEY = 'R6A33yxAH58tB3gWoCAKkbyBbCpNPV4qV8d1FFhQMVvWwWSAhRaRmeTBQ6ACMuDX5Ewst3pDMtLEDh52La6c7rX';

const connection = new Connection(HELIUS_RPC, 'confirmed');
const kp = Keypair.fromSecretKey(new Uint8Array(bs58.decode(WALLET_KEY)));
console.log('Wallet:', kp.publicKey.toBase58());

async function getRaydiumSwapTx() {
  const amountLamport = Math.floor(SWAP_AMOUNT * LAMPORTS_PER_SOL);
  
  // Raydium v2 API
  const url = `https://api.raydium.io/v2/swap`;
  const params = new URLSearchParams({
    inputMint: SOL_MINT,
    outputMint: TOKEN_MINT,
    amount: amountLamport.toString(),
    slippage: '1'
  });
  
  console.log('Fetching Raydium swap...');
  const res = await fetch(`${url}?${params.toString()}`);
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(data).substring(0, 500));
}

getRaydiumSwapTx().catch(console.error);
