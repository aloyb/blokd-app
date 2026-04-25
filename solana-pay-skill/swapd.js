#!/usr/bin/env node
/**
 * Swap Daemon - Fast background service for SOL ↔ Token swaps
 * Pre-loads modules and keeps connections warm for ~50ms response
 */

const http = require('http');
const { Connection, Keypair, PublicKey, VersionedTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const bs58 = require("bs58").default;
const fetch = require("cross-fetch");

// Config
const PORT = 3456;
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=ac6fa08c-32fd-414c-afc9-fd70149a974a';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const WALLET_KEY = 'R6A33yxAH58tB3gWoCAKkbyBbCpNPV4qV8d1FFhQMVvWwWSAhRaRmeTBQ6ACMuDX5Ewst3pDMtLEDh52La6c7rX';
const SPL_TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

// Pre-initialized connections
const connection = new Connection(HELIUS_RPC, 'confirmed');
const kp = Keypair.fromSecretKey(new Uint8Array(bs58.decode(WALLET_KEY)));

console.log('🚀 Swap Daemon started');
console.log('📦 Wallet:', kp.publicKey.toBase58());
console.log('📡 Listening on port', PORT);

// Helper: RPC request
async function rpcRequest(method, params) {
  const res = await fetch(HELIUS_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    timeout: 15000
  });
  return (await res.json()).result;
}

// Get all balances
async function getAllBalances() {
  const solBalance = await connection.getBalance(kp.publicKey);
  const balances = { sol: (solBalance / LAMPORTS_PER_SOL).toFixed(6), tokens: {} };

  const tokenAccounts = await rpcRequest('getTokenAccountsByOwner', [
    kp.publicKey.toBase58(),
    { programId: SPL_TOKEN_2022 },
    { encoding: 'jsonParsed' }
  ]);

  if (tokenAccounts && tokenAccounts.value) {
    for (const acc of tokenAccounts.value) {
      const info = acc.account.data.parsed.info;
      const amount = info.tokenAmount;
      if (parseInt(amount.amount) > 0) {
        balances.tokens[info.mint] = { amount: amount.uiAmount, decimals: amount.decimals };
      }
    }
  }
  return balances;
}

// Get specific token balance
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

// Do swap
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

// HTTP Server
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'POST only' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    const start = Date.now();
    try {
      const { cmd, amount, tokenMint, decimals } = JSON.parse(body);

      if (cmd === 'balance') {
        const result = tokenMint 
          ? { ...(await getAllBalances()), specific: await getTokenBalance(tokenMint) }
          : await getAllBalances();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: result, timeMs: Date.now() - start }));

      } else if (cmd === 'buy') {
        const amountLamport = Math.floor(amount * LAMPORTS_PER_SOL);
        const result = await doSwap(SOL_MINT, tokenMint, amountLamport);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, tx: result.txid, inAmount: result.inAmount, outAmount: result.outAmount, timeMs: Date.now() - start }));

      } else if (cmd === 'sell') {
        const dec = decimals || 6;
        const amountLamport = Math.floor(amount * Math.pow(10, dec));
        const result = await doSwap(tokenMint, SOL_MINT, amountLamport);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, tx: result.txid, inAmount: result.inAmount, outAmount: result.outAmount, timeMs: Date.now() - start }));

      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unknown command' }));
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('✅ Daemon ready!');
});
