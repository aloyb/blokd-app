import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { members: [], totalPeriods: 12 };
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

  const { name, month, amount, status } = req.body;
  
  if (!name || !month) {
    return res.status(400).json({ error: 'name and month required' });
  }
  
  const data = loadData();
  const member = data.members.find(m => m.name.toLowerCase() === name.toLowerCase());
  
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }
  
  member.payments[month] = status !== false;
  if (amount !== undefined) {
    member.amountPaid = amount;
  }
  
  saveData(data);
  res.json({ success: true, member });
}
