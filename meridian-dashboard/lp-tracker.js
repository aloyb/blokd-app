/**
 * Helius LP Position Tracker
 * Tracks wallet's LP positions, token balances, and PNL on close
 * Run via cron every 5 minutes or on-demand
 */

import fs from 'fs';

const HELIUS_API_KEY = 'ac6fa08c-32fd-414c-afc9-fd70149a974a';
const WALLET = '6qSukCpLp5kg8jMMTXVG2zy2d1XNpF7n8c8xvoaaJEej';
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Storage file for tracking
const TRACKER_FILE = '/home/ubuntu/.openclaw/workspace/meridian-dashboard/lp-tracker-state.json';

async function rpcCall(method, params) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  return res.json();
}

// Helius DAS API for rich token balances
async function getTokenBalances(address) {
  const res = await fetch(`https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`);
  if (!res.ok) {
    console.error(`Helius API error: ${res.status}`);
    return { tokens: [], nativeBalance: 0 };
  }
  return res.json();
}

// Get transaction history from Helius Enhanced API
async function getTransactionHistory(address, limit = 50) {
  try {
    const res = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: [{
          account: address,
          before: undefined,
          limit: limit
        }]
      })
    });
    if (!res.ok) {
      console.error(`Helius txs API error: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data.transactions || [];
  } catch (err) {
    console.error('Helius txs API error:', err.message);
    return [];
  }
}

function loadState() {
  if (fs.existsSync(TRACKER_FILE)) {
    return JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
  }
  return { positions: [], history: [], lastCheck: null, lastLP: null };
}

function saveState(state) {
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(state, null, 2));
}

async function track() {
  console.log(`[${new Date().toISOString()}] Checking wallet: ${WALLET.slice(0,8)}...`);
  
  try {
    // Get current token balances
    const balancesData = await getTokenBalances(WALLET);
    const tokens = balancesData.tokens || [];
    console.log(`Found ${tokens.length} tokens in wallet`);
    
    // Get SOL balance (in lamports, convert to SOL)
    const solLamports = balancesData.nativeBalance || 0;
    const solBalance = solLamports / 1e9; // lamports to SOL
    
    // Get transaction history for LP detection
    const txHistory = await getTransactionHistory(WALLET, 50);
    
    // Filter for LP-related transactions (Add/Remove Liquidity)
    const lpTxs = txHistory.filter(tx => {
      const type = (tx.type || '').toLowerCase();
      const name = (tx.name || '').toLowerCase();
      const sig = (tx.signature || '').toLowerCase();
      return type.includes('liquidity') || name.includes('liquidity') || 
             type.includes('add') || name.includes('add') ||
             type.includes('remove') || name.includes('remove') ||
             sig.includes('addliquidity') || sig.includes('removeliquidity') ||
             sig.includes('addliq') || sig.includes('rmliq');
    });
    
    console.log(`Found ${lpTxs.length} LP-related transactions`);
    
    const state = loadState();
    state.lastCheck = new Date().toISOString();
    
    // Filter for significant tokens (non-zero, non-SOL)
    const significantTokens = tokens.filter(t => {
      const amount = BigInt(t.amount || 0);
      return amount > BigInt(0) && t.symbol !== 'SOL' && t.tokenSymbol !== 'SOL';
    });
    
    // Store summary
    const summary = {
      timestamp: new Date().toISOString(),
      solBalance: solBalance,
      solLamports: solLamports,
      tokenCount: tokens.length,
      significantTokens: significantTokens.length,
      lpTxCount: lpTxs.length,
      topTokens: significantTokens.slice(0, 10).map(t => ({
        symbol: t.symbol || t.tokenSymbol || 'UNKNOWN',
        amount: t.uiAmount || (Number(t.amount) / Math.pow(10, t.decimals || 9)).toFixed(4),
        decimals: t.decimals,
        mint: t.mint
      }))
    };
    
    // Check for new LP activity
    if (lpTxs.length > 0) {
      const latest = lpTxs[0];
      if (state.lastLP !== latest.signature) {
        const isAdd = (latest.type || '').toLowerCase().includes('add') || 
                      (latest.name || '').toLowerCase().includes('add');
        state.lastLP = latest.signature;
        
        const activity = {
          type: isAdd ? 'ADD_LP' : 'REMOVE_LP',
          signature: latest.signature,
          time: latest.blockTime || Date.now() / 1000,
          detected: new Date().toISOString()
        };
        
        state.history = state.history || [];
        state.history.unshift(activity);
        state.history = state.history.slice(0, 50); // Keep last 50
        
        console.log(`🐤 LP Activity detected: ${activity.type}`);
        console.log(`   Signature: ${latest.signature?.slice(0,16)}...`);
      }
    }
    
    saveState(state);
    
    console.log('\n=== LP TRACKER SUMMARY ===');
    console.log(`Wallet: ${WALLET}`);
    console.log(`SOL Balance: ${summary.solBalance}`);
    console.log(`Tokens held: ${summary.tokenCount}`);
    console.log(`LP Txs found: ${summary.lpTxCount}`);
    if (summary.topTokens.length > 0) {
      console.log('\nTop tokens:');
      summary.topTokens.forEach(t => console.log(`  ${t.symbol}: ${t.amount}`));
    }
    
    return summary;
    
  } catch (err) {
    console.error('Tracker error:', err.message);
    return null;
  }
}

// Run if called directly
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''));
if (isMain || process.argv[1]?.includes('lp-tracker.js')) {
  track().then(r => {
    if (r) {
      console.log('\n✅ Tracker ran successfully');
    } else {
      console.log('\n❌ Tracker failed');
      process.exit(1);
    }
  });
}

export { track };
