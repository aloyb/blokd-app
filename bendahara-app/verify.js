const fs = require('fs');
const d = JSON.parse(fs.readFileSync('/tmp/stats.json','utf8'));
console.log('D members count:', d.blocks.D.members.length);
const d37 = d.blocks.D.members.find(m => m.houseNumber === 'D37');
console.log('D37 paid:', JSON.stringify(d37.payments));
console.log('D37 unpaid:', Object.entries(d37.payments).filter(([,v])=>!v).map(([k])=>k).join(', ')||'(semua lunas)');
console.log('KAS BERSIH:', d.global.bendahara);
const sep = d.pengeluaranHistory.filter(p=>p.date && p.date.startsWith('2026-09'));
console.log('Sep pengeluaran:', JSON.stringify(sep));
