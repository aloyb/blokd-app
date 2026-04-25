#!/usr/bin/env node
/**
 * Quick Swap - Fast SOL ↔ Token swap script
 * Usage:
 *   node quick-swap.js buy <SOL_amount> <token_mint>   - Buy token with SOL
 *   node quick-swap.js sell <token_amount> <token_mint> - Sell token for SOL
 *   node quick-swap.js balance [token_mint]          - Check ALL balances (SOL + all tokens, or specific token)
 */

const fetch = require("cross-fetch");
const { Connection, Keypair, PublicKey, VersionedTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const bs58 = require("bs58").default;

const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=ac6fa08c-32fd-414c-afc9-fd70149a974a';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const WALLET_KEY = 'R6A33yxAH58tB3gWoCAKkbyBbCpNPV4qV8d1FFhQMVvWwWSAhRaRmeTBQ6ACMuDX5Ewst3pDMtLEDh52La6c7rX';

const kp = Keypair.fromSecretKey(new Uint8Array(bs58.decode(WALLET_KEY)));
const connection = new Connection(HELIUS_RPC, 'confirmed');

const [,, cmd, amountStr, tokenMint] = process.argv;

async function rpcRequest(method, params) {
  const res = await fetch(HELIUS_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    timeout: 15000
  });
  return (await res.json()).result;
}

async function getAllBalances() {
  // Get SOL balance
  const solBalance = await connection.getBalance(kp.publicKey);
  const balances = { sol: (solBalance / LAMPORTS_PER_SOL).toFixed(6), tokens: {} };

  // Get all token accounts
  const tokenAccounts = await rpcRequest('getTokenAccountsByOwner', [
    kp.publicKey.toBase58(),
    { programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' },
    { encoding: 'jsonParsed' }
  ]);

  if (tokenAccounts && tokenAccounts.value) {
    for (const acc of tokenAccounts.value) {
      const info = acc.account.data.parsed.info;
      const mint = info.mint;
      const amount = info.tokenAmount;
      if (parseInt(amount.amount) > 0) {
        balances.tokens[mint] = {
          amount: amount.uiAmount,
          decimals: amount.decimals
        };
      }
    }
  }

  return balances;
}

async function getTokenBalance(mint) {
  const accounts = await rpcRequest('getTokenAccountsByOwner', [
    kp.publicKey.toBase58(),
    { mint },
    { encoding: 'jsonParsed' }
  ]);

  if (accounts && accounts.value && accounts.value.length > 0) {
    const info = accounts.value[0].account.data.parsed.info;
    return { amount: info.tokenAmount.uiAmount, decimals: info.tokenAmount.decimals };
  }
  return null;
}

async function doSwap(inputMint, outputMint, amount, slippageBps = 500) {
  const url = `https://api.jup.ag/swap/v2/order?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}&taker=${kp.publicKey.toBase58()}`;

  const quoteRes = await fetch(url, { timeout: 15000 });
  const data = await quoteRes.json();
  if (data.error) throw new Error(data.error);

  const txBuf = Buffer.from(data.transaction, 'base64');
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([kp]);
  const signedTx = Buffer.from(tx.serialize()).toString('base64');

  const execRes = await fetch('https://api.jup.ag/swap/v2/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedTransaction: signedTx, requestId: data.requestId }),
    timeout: 20000
  });

  const result = await execRes.json();
  if (result.error) throw new Error(JSON.stringify(result.error));

  return { txid: result.signature, inAmount: data.inAmount, outAmount: data.outAmount };
}

async function main() {
  const start = Date.now();

  if (cmd === 'balance') {
    if (tokenMint) {
      // Specific token balance
      const bal = await getTokenBalance(tokenMint);
      console.log(JSON.stringify({ sol: (await connection.getBalance(kp.publicKey)) / LAMPORTS_PER_SOL, token: bal }));
    } else {
      // ALL balances
      const balances = await getAllBalances();
      console.log(JSON.stringify(balances));
    }
    console.log(`⏱ ${Date.now() - start}ms`);
    return;
  }

  if (cmd === 'buy') {
    const solAmount = parseFloat(amountStr);
    if (!solAmount || solAmount <= 0) throw new Error('Invalid SOL amount');
    const amountLamport = Math.floor(solAmount * LAMPORTS_PER_SOL);

    console.log(`Buying ${solAmount} SOL of ${tokenMint}...`);
    const result = await doSwap(SOL_MINT, tokenMint, amountLamport);
    console.log(JSON.stringify({ success: true, tx: result.txid, inAmount: result.inAmount, outAmount: result.outAmount }));
    console.log(`⏱ ${Date.now() - start}ms`);
    return;
  }

  if (cmd === 'sell') {
    const tokenAmount = parseFloat(amountStr);
    if (!tokenAmount || tokenAmount <= 0) throw new Error('Invalid token amount');
    const decimals = 6;
    const amountLamport = Math.floor(tokenAmount * Math.pow(10, decimals));

    console.log(`Selling ${tokenAmount} tokens of ${tokenMint}...`);
    const result = await doSwap(tokenMint, SOL_MINT, amountLamport);
    console.log(JSON.stringify({ success: true, tx: result.txid, inAmount: result.inAmount, outAmount: result.outAmount }));
    console.log(`⏱ ${Date.now() - start}ms`);
    return;
  }

  console.log(JSON.stringify({ error: 'Usage: quick-swap.js [buy|sell|balance] [amount] [token_mint]' }));
  console.log(`⏱ ${Date.now() - start}ms`);
}

main().catch(e => {
  console.log(JSON.stringify({ error: e.message }));
  console.log(`⏱ ${Date.now() - start}ms`);
});
