import fs from 'fs';
import path from 'path';
import { rejectUnauthorized } from '../../lib/guard';

const DATA_FILE = path.join(process.cwd(), 'data.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { totalPeriods: 12, blocks: {}, setoranBlok: {} };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (rejectUnauthorized(req, res)) return;

  const { block, month, amount, date, keterangan } = req.body || {};

  if (!block || !month || amount == null) {
    return res.status(400).json({ error: 'block, month, dan amount wajib diisi' });
  }
  const bKey = String(block).toUpperCase();
  if (!MONTHS.includes(String(month).toLowerCase())) {
    return res.status(400).json({ error: 'month tidak valid' });
  }
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'amount harus angka positif' });
  }

  const data = loadData();
  if (!data.blocks[bKey]) return res.status(404).json({ error: 'Block tidak ditemukan' });

  const m = String(month).toLowerCase();
  data.setoranBlok = data.setoranBlok || {};
  data.setoranBlok[bKey] = data.setoranBlok[bKey] || [];

  // Kalau sudah ada setoran untuk bulan itu, ganti (update), kalau belum tambah
  const idx = data.setoranBlok[bKey].findIndex(s => s.month === m);
  const entry = {
    month: m,
    amount: numAmount,
    date: date || new Date().toISOString().slice(0, 10),
    keterangan: keterangan || `Setoran ${data.blocks[bKey].label || bKey}`,
  };
  if (idx >= 0) data.setoranBlok[bKey][idx] = entry;
  else data.setoranBlok[bKey].push(entry);

  data.activityLog = data.activityLog || [];
  data.activityLog.push({
    icon: '💰',
    text: `${data.blocks[bKey].label || bKey}: Setoran perwakilan ${numAmount.toLocaleString('id-ID')}`,
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    ts: Date.now(),
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  return res.status(200).json({ ok: true, setoranBlok: data.setoranBlok });
}
