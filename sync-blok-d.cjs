#!/usr/bin/env node
/**
 * Sinkronkan data Blok D dari blokd-app (app lama, masih dipakai mencatat
 * harian) ke bendahara-app (app multi-blok yang sekarang jadi acuan).
 *
 * Arah sinkron: blokd-app  ->  bendahara-app.blocks.D
 * Alasan: pembayaran di blokd-app lebih baru. Salinan Blok D di bendahara-app
 * dibuat waktu app itu lahir dan sejak itu tidak ikut diperbarui, jadi
 * ketinggalan beberapa bulan pembayaran.
 *
 * Yang TIDAK ditimpa: flag `type:'transfer'` pada setorHistory, karena itu
 * penanda khusus bendahara-app supaya setoran ke Ketua tidak dihitung dobel
 * dengan pengeluaran kompleks.
 */
const fs = require('fs');
const path = require('path');

const SRC = '/home/ubuntu/.openclaw/workspace/blokd-app/data.json';
const DST = path.join(__dirname, 'data.json');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const dst = JSON.parse(fs.readFileSync(DST, 'utf8'));
const blockD = dst.blocks.D;
if (!blockD) throw new Error('blocks.D tidak ada di bendahara-app/data.json');

const srcByHouse = new Map(src.members.map(m => [m.houseNumber, m]));
const dstByHouse = new Map(blockD.members.map(m => [m.houseNumber, m]));

// Pagar: jangan jalan kalau daftar rumahnya beda, berarti asumsinya salah.
const hilang = [...srcByHouse.keys()].filter(h => !dstByHouse.has(h));
const asing = [...dstByHouse.keys()].filter(h => !srcByHouse.has(h));
if (hilang.length || asing.length) {
  throw new Error(`Daftar rumah tidak sama. Hanya di blokd-app: ${hilang.join(',') || '-'}; hanya di bendahara: ${asing.join(',') || '-'}`);
}

const perubahan = [];

for (const [house, s] of srcByHouse) {
  const d = dstByHouse.get(house);
  const sebelum = MONTHS.filter(m => d.payments[m]);
  const sesudah = MONTHS.filter(m => s.payments[m]);

  if (sebelum.join(',') !== sesudah.join(',')) {
    perubahan.push(`${house}: ${sebelum.length} bulan -> ${sesudah.length} bulan`);
  }

  MONTHS.forEach(m => { d.payments[m] = !!s.payments[m]; });
  d.name = s.name;
  d.amount = s.amount;
  d.isException = !!s.isException;
}

// setorHistory: ambil dari blokd-app, tapi pertahankan flag transfer.
const flagLama = new Map(
  (blockD.setorHistory || []).map(i => [`${i.date}|${i.amount}|${i.keterangan}`, i.type])
);
const setorBaru = (src.setorHistory || []).map(i => {
  const kunci = `${i.date}|${i.amount}|${i.keterangan}`;
  const entry = { date: i.date, amount: i.amount, keterangan: i.keterangan };
  const type = flagLama.get(kunci)
    || ((i.keterangan || '').toLowerCase().includes('setor ke ketua') ? 'transfer' : undefined);
  if (type) entry.type = type;
  return entry;
});

const setorSebelum = (blockD.setorHistory || []).length;
blockD.setorHistory = setorBaru;

fs.writeFileSync(DST, JSON.stringify(dst, null, 2));

console.log(`Rumah disinkron: ${srcByHouse.size}`);
console.log(`Pembayaran berubah di ${perubahan.length} rumah:`);
perubahan.forEach(p => console.log('  ' + p));
console.log(`setorHistory: ${setorSebelum} -> ${setorBaru.length} entry`);
const transfer = setorBaru.filter(i => i.type === 'transfer');
console.log(`  ditandai transfer: ${transfer.length} (Rp ${transfer.reduce((s, i) => s + i.amount, 0).toLocaleString('id-ID')})`);

let total = 0;
blockD.members.forEach(m => {
  MONTHS.forEach(mo => { if (m.payments[mo]) total += m.amount; });
});
console.log(`Total iuran Blok D sekarang: Rp ${total.toLocaleString('id-ID')}`);
