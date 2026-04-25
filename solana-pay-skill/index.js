const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL, VersionedTransaction } = require("@solana/web3.js");
const { getAssociatedTokenAddress, createTransferInstruction, getAccount } = require("@solana/spl-token");
const bs58 = require("bs58").default || require("bs58");
const fs = require("fs");
const path = require("path");
const fetch = require("cross-fetch");

// Config
const CONFIG_PATH = path.join(__dirname, "config.json");
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { rpcUrl: "https://api.mainnet-beta.solana.com", privateKey: "", aviciAddress: "", maxSolPerTx: 5, maxUsdcPerTx: 500 };
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function getConnection() {
  const cfg = loadConfig();
  return new Connection(cfg.rpcUrl, "confirmed");
}

function getKeypair() {
  const cfg = loadConfig();
  if (!cfg.privateKey) throw new Error("Private key not configured. Run: node index.js setup <base58-private-key>");
  const secret = bs58.decode(cfg.privateKey);
  return Keypair.fromSecretKey(secret);
}

// ── Commands ──

async function getMoonshotBalance(apiKey) {
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.moonshot.ai/v1/users/me/balance', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const data = await res.json();
    if (data.data && data.data.available_balance !== undefined) {
      return {
        available: parseFloat(data.data.available_balance),
        cash: parseFloat(data.data.cash_balance || 0),
        voucher: parseFloat(data.data.voucher_balance || 0)
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function getBalance() {
  const conn = getConnection();
  const kp = getKeypair();
  const cfg = loadConfig();
  
  // Solana balance
  const sol = await conn.getBalance(kp.publicKey);
  let usdc = 0;
  try {
    const ata = await getAssociatedTokenAddress(new PublicKey(USDC_MINT), kp.publicKey);
    const acc = await getAccount(conn, ata);
    usdc = Number(acc.amount) / 1e6;
  } catch {}
  
  // Moonshot balance
  const moonshot = await getMoonshotBalance(cfg.moonshotApiKey);
  
  return { 
    pubkey: kp.publicKey.toBase58(), 
    sol: sol / LAMPORTS_PER_SOL, 
    usdc,
    moonshot
  };
}

async function sendSol(to, amount) {
  const cfg = loadConfig();
  if (amount > cfg.maxSolPerTx) return { error: `Max ${cfg.maxSolPerTx} SOL per tx` };
  const conn = getConnection();
  const kp = getKeypair();
  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: new PublicKey(to), lamports: Math.round(amount * LAMPORTS_PER_SOL) }));
  const sig = await sendAndConfirmTransaction(conn, tx, [kp]);
  return { success: true, txHash: sig, explorer: `https://solscan.io/tx/${sig}` };
}

async function sendUsdc(to, amount) {
  const cfg = loadConfig();
  if (amount > cfg.maxUsdcPerTx) return { error: `Max ${cfg.maxUsdcPerTx} USDC per tx` };
  const conn = getConnection();
  const kp = getKeypair();
  const mint = new PublicKey(USDC_MINT);
  const srcAta = await getAssociatedTokenAddress(mint, kp.publicKey);
  const destAta = await getAssociatedTokenAddress(mint, new PublicKey(to));
  try { await getAccount(conn, destAta); } catch { return { error: "Destination has no USDC account" }; }
  const tx = new Transaction().add(createTransferInstruction(srcAta, destAta, kp.publicKey, Math.round(amount * 1e6)));
  const sig = await sendAndConfirmTransaction(conn, tx, [kp]);
  return { success: true, txHash: sig, explorer: `https://solscan.io/tx/${sig}` };
}

async function topupAvici(amount) {
  const cfg = loadConfig();
  if (!cfg.aviciAddress) return { error: "Avici address not configured" };
  return sendUsdc(cfg.aviciAddress, amount);
}

// ── Jupiter Swap ──

async function swapSolToToken(amountSol, outputMint = USDC_MINT, jupiterApiKey = null) {
  const JUPITER_BASE_URL = 'https://api.jup.ag/swap/v2';
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  
  const kp = getKeypair();
  const amountLamports = Math.floor(amountSol * 1e9);
  const headers = jupiterApiKey ? { 'x-api-key': jupiterApiKey } : {};
  
  // Get order
  const orderUrl = `${JUPITER_BASE_URL}/order?inputMint=${SOL_MINT}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=50&taker=${kp.publicKey.toString()}`;
  const orderRes = await fetch(orderUrl, { headers });
  const orderData = await orderRes.json();
  
  if (!orderData.transaction) {
    return { error: orderData.error || 'No transaction returned', requestId: orderData.requestId };
  }
  
  // Sign transaction
  const transactionBuf = Buffer.from(orderData.transaction, 'base64');
  const transaction = VersionedTransaction.deserialize(transactionBuf);
  transaction.sign([kp]);
  const signedTxBase64 = Buffer.from(transaction.serialize()).toString('base64');
  
  // Execute
  const executeRes = await fetch(`${JUPITER_BASE_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ signedTransaction: signedTxBase64, requestId: orderData.requestId })
  });
  
  const executeData = await executeRes.json();
  
  if (executeData.status !== 'Success') {
    return { error: executeData.error || 'Swap failed', details: executeData };
  }
  
  return { 
    success: true, 
    txHash: executeData.signature, 
    explorer: `https://solscan.io/tx/${executeData.signature}`,
    inputAmount: executeData.totalInputAmount,
    outputAmount: executeData.totalOutputAmount
  };
}

// ── CLI ──

async function main() {
  const cmd = process.argv[2];
  try {
    if (cmd === "setup") {
      const cfg = loadConfig();
      cfg.privateKey = process.argv[3] || cfg.privateKey;
      cfg.aviciAddress = process.argv[4] || cfg.aviciAddress;
      cfg.rpcUrl = process.argv[5] || cfg.rpcUrl;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
      const kp = Keypair.fromSecretKey(bs58.decode(cfg.privateKey));
      console.log(JSON.stringify({ success: true, pubkey: kp.publicKey.toBase58() }));
    } else if (cmd === "balance") {
      console.log(JSON.stringify(await getBalance()));
    } else if (cmd === "send-sol") {
      console.log(JSON.stringify(await sendSol(process.argv[3], parseFloat(process.argv[4]))));
    } else if (cmd === "send-usdc") {
      console.log(JSON.stringify(await sendUsdc(process.argv[3], parseFloat(process.argv[4]))));
    } else if (cmd === "topup-avici") {
      console.log(JSON.stringify(await topupAvici(parseFloat(process.argv[3]))));
    } else if (cmd === "swap") {
      const amount = parseFloat(process.argv[3]);
      const outputMint = process.argv[4] || USDC_MINT;
      const jupiterKey = process.argv[5] || process.env.JUPITER_API_KEY;
      if (!amount || amount <= 0) throw new Error("Invalid amount");
      if (!jupiterKey) throw new Error("Jupiter API key required. Set JUPITER_API_KEY env var or pass as 5th arg");
      console.log(JSON.stringify(await swapSolToToken(amount, outputMint, jupiterKey)));
    } else {
      console.log(JSON.stringify({ commands: ["setup <privkey> [avici-addr] [rpc-url]", "balance", "send-sol <to> <amount>", "send-usdc <to> <amount>", "topup-avici <amount>", "swap <amount-sol> [output-mint] [jupiter-api-key]"] }));
    }
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }));
  }
}

main();
