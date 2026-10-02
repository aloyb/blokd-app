#!/usr/bin/env node
/**
 * Input data pengeluaran tingkat KOMPLEKS (bukan per blok), Januari–Juli 2026.
 * Dilaporkan user 2026-08-13 via Telegram.
 *
 * Catatan penting soal tanggal:
 * user hanya menyebut BULAN, tidak tanggal. Jadi tiap entry diberi tanggal 1
 * dan ditandai `dateApprox: true` supaya tampilan tidak mengarang tanggal
 * persis. Kalau nanti tanggal aslinya diketahui, hapus flag itu.
 *
 * Pengeluaran ini disimpan di top-level `pengeluaran`, TERPISAH dari
 * `blocks.X.setorHistory` (yang isinya catatan lama khusus Blok D).
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data.json');

// [bulan(1-12), nominal, keterangan, kategori]
const ITEMS = [
  [1, 1300000, 'Sampah', 'Sampah'],
  [1, 1200000, 'Wakar', 'Wakar'],
  [1, 3100000, 'Keperluan', 'Keperluan'],

  [2, 2600000, 'Sampah', 'Sampah'],

  [3, 3600000, 'Wakar', 'Wakar'],

  [4, 1300000, 'Sampah', 'Sampah'],
  [4, 3600000, 'Wakar', 'Wakar'],
  [4, 200000, 'Dan lain-lain', 'Lain-lain'],

  [5, 3600000, 'Wakar', 'Wakar'],
  [5, 1600000, 'Pondasi Blok A', 'Infrastruktur'],
  [5, 950000, 'Pasir Blok A', 'Infrastruktur'],
  [5, 1150000, 'Perbaikan jalan', 'Infrastruktur'],
  [5, 950000, 'Pasir lapangan', 'Infrastruktur'],
  [5, 210000, 'Keperluan wakar', 'Wakar'],
  [5, 400000, 'Listrik pos', 'Listrik'],

  [6, 3600000, 'Wakar', 'Wakar'],
  [6, 2600000, 'Sampah Mei & Juni', 'Sampah'],
  [6, 219000, 'Keperluan wakar', 'Wakar'],
  [6, 506000, 'Lampu dan taso lapangan', 'Infrastruktur'],
  [6, 950000, 'Pasir lapangan', 'Infrastruktur'],

  [7, 3600000, 'Wakar', 'Wakar'],
  [7, 1300000, 'Sampah', 'Sampah'],
  [7, 6000000, 'Serba suruh Barabai', 'Kegiatan'],
  [7, 5000000, 'Hadiah lomba 17 Agustus', 'Kegiatan'],
];

// Total per bulan hasil hitung ulang dari laporan, dipakai sebagai pagar
// supaya salah ketik nominal langsung ketahuan.
const EXPECTED_PER_BULAN = {
  1: 5600000,
  2: 2600000,
  3: 3600000,
  4: 5100000,
  5: 8860000,
  6: 7875000,
  7: 15900000,
};
const EXPECTED_TOTAL = 49535000;

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

const perBulan = {};
let total = 0;
const pengeluaran = ITEMS.map(([bulan, amount, keterangan, kategori]) => {
  perBulan[bulan] = (perBulan[bulan] || 0) + amount;
  total += amount;
  return {
    date: `2026-${String(bulan).padStart(2, '0')}-01`,
    dateApprox: true,
    amount,
    keterangan,
    kategori,
    scope: 'kompleks',
  };
});

for (const [bulan, expected] of Object.entries(EXPECTED_PER_BULAN)) {
  if (perBulan[bulan] !== expected) {
    throw new Error(`Total bulan ${bulan} tidak cocok: dapat ${perBulan[bulan]}, harusnya ${expected}`);
  }
}
if (total !== EXPECTED_TOTAL) {
  throw new Error(`Grand total tidak cocok: dapat ${total}, harusnya ${EXPECTED_TOTAL}`);
}

data.pengeluaran = pengeluaran;
fs.writeFileSync(DATA, JSON.stringify(data, null, 2));

console.log(`Tersimpan ${pengeluaran.length} entry pengeluaran kompleks.`);
Object.keys(EXPECTED_PER_BULAN).forEach(b => {
  const nama = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli'][b];
  console.log(`  ${nama.padEnd(9)}: Rp ${perBulan[b].toLocaleString('id-ID')}`);
});
console.log(`TOTAL: Rp ${total.toLocaleString('id-ID')}`);

const perKategori = {};
pengeluaran.forEach(p => { perKategori[p.kategori] = (perKategori[p.kategori] || 0) + p.amount; });
console.log('\nPer kategori:');
Object.entries(perKategori).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(`  ${k.padEnd(15)}: Rp ${v.toLocaleString('id-ID')}`);
});
