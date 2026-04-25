const { Connection, Keypair, PublicKey, VersionedTransaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const bs58 = require("bs58");
const fetch = require("cross-fetch");

const SOL_MINT = 'So11111111111111111111111111111111111111111112';
const TOKEN_MINT = 'GSErga4VnqbmHSe9SPpyb7iAp3gkbU8oeDT6M1BQpump';
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
  
  // Build URL with proper encoding
  const params = new URLSearchParams({
    inputMint: SOL_MINT,
    outputMint: TOKEN_MINT,
    amount: amountLamports.toString(),
    slippageBps: '500',
    taker: kp.publicKey.toString()
  });
  
  const url = `${JUPITER_URL}/order?${params.toString()}`;
  console.log('URL:', url);
  
  const res = await fetch(url);
  const data = await res.json();
  console.log('Response status:', res.status);
  console.log('Response:', JSON.stringify(data).substring(0, 500));
  
  if (data.error) {
    console.error('Error:', data.error);
    return;
  }
  
  if (data.transaction) {
    console.log('✅ Got transaction! Signing...');
    const transactionBuf = Buffer.from(data.transaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuf);
    transaction.sign([kp]);
    const signedTxBase64 = Buffer.from(transaction.serialize()).toString('base64');
    
    // Execute
    const execRes = await fetch(`${JUPITER_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedTransaction: signedTxBase64, requestId: data.requestId })
    });
    const execData = await execRes.json();
    console.log('Execute response:', JSON.stringify(execData).substring(0, 300));
  }
}

trySwap().catch(console.error);
