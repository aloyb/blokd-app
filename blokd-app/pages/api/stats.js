import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { members: [], totalPeriods: 12 };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const data = loadData();
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  let totalPaid = 0;
  const totalMembers = data.members.length;
  
  data.members.forEach(member => {
    const monthlyAmount = member.isException ? 40000 : member.amount;
    totalPaid += monthlyAmount * data.totalPeriods * 12;
    
    months.forEach(month => {
      if (member.payments[month]) {
        totalPaid += member.isException ? 40000 : member.amount;
      }
    });
  });
  
  const totalExpected = 45 * 50000 * 12;
  const setorKeKetua = data.setorKeKetua || 0;
  const bendahara = data.bendahara || 0;
  
  res.status(200).json({
    totalMembers,
    totalExpected,
    totalPaid,
    totalArrears: totalExpected - totalPaid,
    bendahara,
    setorKeKetua,
    collectedPercent: totalExpected > 0 ? ((totalPaid / totalExpected) * 100).toFixed(1) : 0
  });
}
