import fs from 'fs';
import path from 'path';
import { rejectUnauthorized } from '../../lib/guard';

const DATA_FILE = path.join(process.cwd(), 'data.json');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { totalPeriods: 12, blocks: {} };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (rejectUnauthorized(req, res)) return;

  const { block, houseNumber, name, amount, isException } = req.body;

  if (!block || !name) {
    return res.status(400).json({ error: 'block and name required' });
  }

  const data = loadData();
  const b = (data.blocks || {})[block];
  if (!b) return res.status(404).json({ error: 'Block not found' });

  b.members = b.members || [];
  if (b.members.find(m => (m.name || '').toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: 'Member already exists' });
  }

  const payments = {};
  MONTHS.forEach(m => payments[m] = false);

  b.members.push({
    houseNumber: houseNumber || '',
    name,
    amount: amount || b.iuranDefault || 50000,
    isException: isException || false,
    payments,
  });

  // Log to activityLog
  if (!data.activityLog) data.activityLog = [];
  data.activityLog.push({
    icon: '🏠',
    text: `Anggota baru: ${b.label || block} ${houseNumber || ''} ${name}`,
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    ts: Date.now(),
  });

  saveData(data);
  res.json({ success: true, member: b.members[b.members.length - 1] });
}
