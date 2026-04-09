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

  const { name, amount, isException } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'name required' });
  }
  
  const data = loadData();
  
  if (data.members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: 'Member already exists' });
  }
  
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const payments = {};
  months.forEach(m => payments[m] = false);
  
  data.members.push({
    name,
    amount: amount || 50000,
    isException: isException || false,
    payments
  });
  
  saveData(data);
  res.json({ success: true, member: data.members[data.members.length - 1] });
}
