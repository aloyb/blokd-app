import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { totalPeriods: 12, blocks: {} };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const data = loadData();
  const blocks = data.blocks || {};
  const { block } = req.query;

  if (block) {
    const b = blocks[block];
    if (!b) return res.status(404).json({ error: 'Block not found' });
    return res.status(200).json({ block, label: b.label || block, members: b.members || [] });
  }

  // Return list of available blocks (metadata only)
  const list = Object.keys(blocks).map(key => {
    const all = blocks[key].members || [];
    const vacant = all.filter(m => m.vacant).length;
    // Perwakilan blok: ada penghuni tapi dibebaskan iuran.
    const exempt = all.filter(m => m.exempt && !m.vacant).length;
    return {
      block: key,
      label: blocks[key].label || key,
      // memberCount = rumah yang wajib iuran (rumah kosong & perwakilan tidak dihitung)
      memberCount: all.length - vacant - exempt,
      vacantCount: vacant,
      exemptCount: exempt,
      totalHouses: all.length,
    };
  });

  res.status(200).json({ blocks: list });
}
