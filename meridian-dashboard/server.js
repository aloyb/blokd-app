import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Config
const HELIUS_API_KEY = 'ac6fa08c-32fd-414c-afc9-fd70149a974a';
const WALLET = '6qSukCpLp5kg8jMMTXVG2zy2d1XNpF7n8c8xvoaaJEej';
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const AGENT_STATE_FILE = '/home/ubuntu/.openclaw/skills/meridian/state.json';

// Cache for SOL price
let solPriceCache = 80;
let solPriceCacheTime = 0;
const SOL_PRICE_CACHE_MS = 60000; // 1 minute

// ─── HELPER: RPC Call ───────────────────────────────────────
async function rpcCall(method, params = []) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  const data = await res.json();
  return data.result;
}

// ─── HELPER: Get SOL Balance ────────────────────────────────
async function getSolBalance() {
  const balance = await rpcCall('getBalance', [WALLET]);
  return balance.value / 1e9;
}

// ─── HELPER: Get SOL Price ────────────────────────────────
async function getSolPrice() {
  const now = Date.now();
  if (now - solPriceCacheTime < SOL_PRICE_CACHE_MS) {
    return solPriceCache;
  }
  
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await res.json();
    solPriceCache = data.solana?.usd || 80;
    solPriceCacheTime = now;
    return solPriceCache;
  } catch {
    return solPriceCache;
  }
}

// ─── HELPER: Read Agent State ───────────────────────────────
function getAgentState() {
  try {
    if (fs.existsSync(AGENT_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(AGENT_STATE_FILE, 'utf8'));
    }
  } catch {
    // ignore
  }
  return { positions: {} };
}

// ─── API: GET /api/positions ───────────────────────────────
app.get('/api/positions', async (req, res) => {
  try {
    const solPrice = await getSolPrice();
    const agentState = getAgentState();
    const positions = Object.values(agentState.positions || {});
    
    const activePositions = positions.filter(p => !p.closed).map(pos => {
      const amountUsd = (pos.amount_sol || 0) * solPrice;
      const pnlUsd = amountUsd * ((pos.peak_pnl_pct || 0) / 100);
      
      return {
        name: pos.pool_name,
        pool: pos.pool,
        status: 'ACTIVE',
        amount_sol: pos.amount_sol,
        amount_usd: amountUsd,
        pnl_pct: pos.peak_pnl_pct || 0,
        pnl_usd: pnlUsd,
        deployed_at: pos.deployed_at
      };
    });
    
    res.json({ success: true, positions: activePositions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── API: GET /api/wallet ───────────────────────────────────
app.get('/api/wallet', async (req, res) => {
  try {
    const [solBalance, solPrice, agentState] = await Promise.all([
      getSolBalance(),
      getSolPrice(),
      new Promise(r => r(getAgentState()))
    ]);
    
    const walletUsd = solBalance * solPrice;
    
    // Calculate LP value from active positions
    const positions = Object.values(agentState.positions || {});
    const activePositions = positions.filter(p => !p.closed);
    let lpValueUsd = 0;
    activePositions.forEach(pos => {
      lpValueUsd += (pos.amount_sol || 0) * solPrice;
    });
    
    const totalNetWorth = walletUsd + lpValueUsd;
    
    res.json({
      success: true,
      wallet: WALLET,
      solBalance,
      walletUsd,
      lpValueUsd,
      totalNetWorth,
      solPrice
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── API: GET /api/stats ────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const solPrice = await getSolPrice();
    const agentState = getAgentState();
    const positions = Object.values(agentState.positions || {});
    
    const closedPositions = positions.filter(p => p.closed);
    const activePositions = positions.filter(p => !p.closed);
    
    let wins = 0;
    let losses = 0;
    let realizedPnlUsd = 0;
    let unrealizedPnlUsd = 0;
    
    // From closed positions
    closedPositions.forEach(pos => {
      const amountUsd = (pos.amount_sol || 0) * solPrice;
      const pnlPct = pos.peak_pnl_pct || 0;
      const pnlUsd = amountUsd * (pnlPct / 100);
      const reason = (pos.notes?.[pos.notes.length - 1] || '').toLowerCase();
      
      realizedPnlUsd += pnlUsd;
      
      // LOSS: stop loss, low yield, out of range, rugged
      const isStopLoss = reason.includes('stop loss');
      const isLowYield = reason.includes('low yield');
      const isOutRange = reason.includes('out of range');
      const isRugged = reason.includes('rugged') || reason.includes('rug pull');
      
      if (isStopLoss || isLowYield || isOutRange || isRugged) {
        losses++;
      } else {
        wins++;
      }
    });
    
    // From active positions
    activePositions.forEach(pos => {
      const amountUsd = (pos.amount_sol || 0) * solPrice;
      const pnlPct = pos.peak_pnl_pct || 0;
      const pnlUsd = amountUsd * (pnlPct / 100);
      unrealizedPnlUsd += pnlUsd;
    });
    
    const totalPnlUsd = realizedPnlUsd + unrealizedPnlUsd;
    const totalTrades = closedPositions.length; // All positions ever closed
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100).toFixed(1) : 0;
    
    res.json({
      success: true,
      stats: {
        totalPnlUsd,
        realizedPnlUsd,
        unrealizedPnlUsd,
        totalTrades: closedPositions.length + activePositions.length, // 15 total
        wins,
        losses,
        winRate: parseFloat(winRate),
        activeCount: activePositions.length,
        closedCount: closedPositions.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── API: GET /api/all-positions ────────────────────────────
app.get('/api/all-positions', async (req, res) => {
  try {
    const solPrice = await getSolPrice();
    const agentState = getAgentState();
    const positions = Object.values(agentState.positions || {});
    
    const mapped = positions.map(p => {
      const amountUsd = (p.amount_sol || 0) * solPrice;
      const pnlPct = p.peak_pnl_pct || 0;
      const pnlUsd = amountUsd * (pnlPct / 100);
      
      return {
        name: p.pool_name,
        pool: p.pool,
        status: p.closed ? 'CLOSED' : 'ACTIVE',
        amount_sol: p.amount_sol,
        amount_usd: amountUsd,
        pnl_pct: pnlPct,
        pnl_usd: pnlUsd,
        deployed_at: p.deployed_at,
        closed_at: p.closed_at,
        closed_reason: p.notes?.[p.notes.length - 1] || null
      };
    });
    
    res.json({
      success: true,
      positions: mapped
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Start Server ────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Meridian Dashboard running on http://0.0.0.0:${PORT}`);
});
