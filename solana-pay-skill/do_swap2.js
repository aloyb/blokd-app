const fetch = require("cross-fetch");
const { Connection, Keypair, VersionedTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const bs58 = require("bs58").default;

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const TOKEN_MINT = 'GSErga4VnqbmHSe9SPpyb7iAp3gkbU8oeDT6M1BQpump';
const SWAP_AMOUNT = 0.03;
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=ac6fa08c-32fd-414c-afc9-fd70149a974a';
const WALLET_KEY = 'R6A33yxAH58tB3gWoCAKkbyBbCpNPV4qV8d1FFhQMVvWwWSAhRaRmeTBQ6ACMuDX5Ewst3pDMtLEDh52La6c7rX';

const kp = Keypair.fromSecretKey(new Uint8Array(bs58.decode(WALLET_KEY)));
console.log('Wallet:', kp.publicKey.toBase58());

async function doSwap() {
  const amountLamport = Math.floor(SWAP_AMOUNT * LAMPORTS_PER_SOL);
  
  // Step 1: Get Quote
  console.log('\n[1] Getting quote...');
  const quoteRes = await fetch(`https://api.jup.ag/swap/v2/order?inputMint=${SOL_MINT}&outputMint=${TOKEN_MINT}&amount=${amountLamport}&slippageBps=500&taker=${kp.publicKey.toBase58()}`, { timeout: 15000 });
  const data = await quoteRes.json();
  
  if (data.error) {
    console.error('Quote error:', data.error);
    return;
  }
  console.log('✅ Got quote! In:', data.inAmount, '→ Out:', data.outAmount);
  
  // Step 2: Sign Transaction
  console.log('\n[2] Signing transaction...');
  const transactionBuf = Buffer.from(data.transaction, 'base64');
  const transaction = VersionedTransaction.deserialize(transactionBuf);
  transaction.sign([kp]);
  const signedTx = Buffer.from(transaction.serialize()).toString('base64');
  console.log('Transaction signed');
  
  // Step 3: Execute with different body format
  console.log('\n[3] Executing swap...');
  const execBody = {
    signedTransaction: signedTx,
    requestId: data.requestId
  };
  console.log('Body:', JSON.stringify(execBody).substring(0, 100));
  
  const execRes = await fetch('https://api.jup.ag/swap/v2/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(execBody),
    timeout: 15000
  });
  
  const execData = await execRes.json();
  console.log('Response:', JSON.stringify(execData).substring(0, 500));
}

doSwap().catch(console.error);
