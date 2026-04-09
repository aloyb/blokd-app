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
  if (req.method === 'GET') {
    const data = loadData();
    res.status(200).json(data);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
