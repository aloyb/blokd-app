const fetch = require("cross-fetch");
const { Connection, Keypair, VersionedTransaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const bs58 = require("bs58").default;

const SOL_MINT = 'So11111111111111111111111111111111111111111112';
const TOKEN_MINT = 'GSErga4VnqbmHSe9SPpyb7iAp3gkbU8oeDT6M1BQpump';
const SWAP_AMOUNT = 0.03;
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=ac6fa08c-32fd-414c-afc9-fd70149a974a';
const WALLET_KEY = 'R6A33yxAH58tB3gWoCAKkbyBbCpNPV4qV8d1FFhQMVvWwWSAhRaRmeTBQ6ACMuDX5Ewst3pDMtLEDh52La6c7rX';

const connection = new Connection(HELIUS_RPC, 'confirmed');
const kp = Keypair.fromSecretKey(new Uint8Array(bs58.decode(WALLET_KEY)));
console.log('Wallet:', kp.publicKey.toBase58());

async function doSwap() {
  const amountLamport = Math.floor(SWAP_AMOUNT * LAMPORTS_PER_SOL);
  
  // Step 1: Get quote
  console.log('\n[1] Getting quote...');
  const quoteUrl = `https://quote-api.jup.ag/v6/swap?inputMint=${SOL_MINT}&outputMint=${TOKEN_MINT}&amount=${amountLamport}&slippageBps=500&taker=${kp.publicKey.toBase58()}`;
  console.log('URL:', quoteUrl);
  
  const quoteRes = await fetch(quoteUrl, { timeout: 15000 });
  const quoteData = await quoteRes.json();
  console.log('Quote status:', quoteRes.status);
  console.log('Quote response:', JSON.stringify(quoteData).substring(0, 500));
  
  if (quoteData.error) {
    console.error('Quote error:', quoteData.error);
    return;
  }
  
  if (!quoteData.transaction) {
    console.error('No transaction in response');
    return;
  }
  
  console.log('\n[2] Signing transaction...');
  const transactionBuf = Buffer.from(quoteData.transaction, 'base64');
  const transaction = VersionedTransaction.deserialize(transactionBuf);
  transaction.sign([kp]);
  
  console.log('\n[3] Sending transaction...');
  const signature = await connection.sendTransaction(transaction, { skipPreflight: false });
  console.log('✅ Swap submitted!');
  console.log('Signature:', signature);
  console.log('Explorer: https://solscan.io/tx/' + signature);
}

doSwap().catch(console.error);
