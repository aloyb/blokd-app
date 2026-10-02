import fs from 'fs';
import path from 'path';
import { rejectUnauthorized } from '../../lib/guard';

const DATA_FILE = path.join(process.cwd(), 'data.json');

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

  const { block, name, month, amount, status } = req.body;

  if (!block || !name || !month) {
    return res.status(400).json({ error: 'block, name and month required' });
  }

  const data = loadData();
  const b = (data.blocks || {})[block];
  if (!b) return res.status(404).json({ error: 'Block not found' });

  const member = (b.members || []).find(m => (m.name || '').toLowerCase() === name.toLowerCase());
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const wasAlreadyPaid = member.payments[month] === true;
  member.payments[month] = status !== false;
  if (amount !== undefined) {
    member.amountPaid = amount;
  }

  // Log to activityLog
  if (!wasAlreadyPaid && member.payments[month]) {
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    const bl = b.label || block;
    if (!data.activityLog) data.activityLog = [];
    data.activityLog.push({
      icon: '💰',
      text: `${bl} ${member.houseNumber} ${member.name || '-'} bayar iuran ${monthName} 2026`,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      ts: Date.now(),
    });
  }

  saveData(data);
  res.json({ success: true, member });
}
