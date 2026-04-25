const fetch = require("cross-fetch");
const { Connection, Keypair, PublicKey, VersionedTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const bs58 = require("bs58").default;

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const TOKEN_MINT = 'GSErga4VnqbmHSe9SPpyb7iAp3gkbU8oeDT6M1BQpump';
const SELL_AMOUNT = 25000;  // tokens to sell
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=ac6fa08c-32fd-414c-afc9-fd70149a974a';
const WALLET_KEY = 'R6A33yxAH58tB3gWoCAKkbyBbCpNPV4qV8d1FFhQMVvWwWSAhRaRmeTBQ6ACMuDX5Ewst3pDMtLEDh52La6c7rX';

const kp = Keypair.fromSecretKey(new Uint8Array(bs58.decode(WALLET_KEY)));
console.log('Wallet:', kp.publicKey.toBase58());

async function doSell() {
  // Token decimals = 6, so 25000 tokens = 25000 * 10^6 lamports
  const amountLamport = Math.floor(SELL_AMOUNT * 1e6);
  console.log('Selling', SELL_AMOUNT, 'tokens (', amountLamport, 'lamports)');
  
  // Step 1: Get Quote (sell GSErga4 for SOL)
  console.log('\n[1] Getting quote...');
  const quoteRes = await fetch(`https://api.jup.ag/swap/v2/order?inputMint=${TOKEN_MINT}&outputMint=${SOL_MINT}&amount=${amountLamport}&slippageBps=500&taker=${kp.publicKey.toBase58()}`, { timeout: 15000 });
  const data = await quoteRes.json();
  
  if (data.error) {
    console.error('Quote error:', data.error);
    return;
  }
  console.log('✅ Got quote!');
  console.log('In:', data.inAmount, '(tokens) → Out:', (data.outAmount / 1e9).toFixed(9), 'SOL');
  
  // Step 2: Sign
  console.log('\n[2] Signing transaction...');
  const transactionBuf = Buffer.from(data.transaction, 'base64');
  const transaction = VersionedTransaction.deserialize(transactionBuf);
  transaction.sign([kp]);
  const signedTx = Buffer.from(transaction.serialize()).toString('base64');
  
  // Step 3: Execute
  console.log('\n[3] Executing sell...');
  const execRes = await fetch('https://api.jup.ag/swap/v2/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedTransaction: signedTx, requestId: data.requestId }),
    timeout: 20000
  });
  
  const execData = await execRes.json();
  if (execData.error) {
    console.error('Execute error:', JSON.stringify(execData.error));
    return;
  }
  
  console.log('\n✅ SELL SUCCESS!');
  console.log('TX:', execData.signature || execData.txid);
  console.log('SOL received:', (execData.totalOutputAmount || data.outAmount) / 1e9);
}

doSell().catch(console.error);
