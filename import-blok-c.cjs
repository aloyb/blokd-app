#!/usr/bin/env node
/**
 * Input data iuran Blok C dari rekap "LAPORAN KEUANGAN BLOK C 2026"
 * (foto dari perwakilan Blok C, Agustus 2026).
 *
 * Rekap hanya memuat baris C004 s/d C054, dan hanya kolom Januari–Juni.
 * C1, C2, C3, dan C55 TIDAK ada di rekap -> dibiarkan belum bayar.
 *
 * Nominal tidak seragam. Rumah bertarif Rp 30.000/bulan: C006, C013, C022, C041.
 * Sel merah pada rekap = belum bayar.
 *
 * Validasi berlapis (script menolak menyimpan kalau tidak cocok):
 *   - total per bulan Jan..Apr harus sama dengan baris TOTAL di rekap
 *   - grand total harus Rp 7.600.000
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data.json');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// jumlah bulan lunas dihitung dari Januari
const LUNAS = {
  C4: 3,  C5: 3,  C6: 3,  C7: 0,  C8: 4,  C9: 0,  C10: 4, C11: 4,
  C12: 2, C13: 4, C14: 0, C15: 0, C16: 5, C17: 3, C18: 4, C19: 3,
  C20: 4, C21: 4, C22: 6, C23: 3, C24: 3, C25: 5, C26: 0, C27: 4,
  C28: 3, C29: 2, C30: 4, C31: 4, C32: 3, C33: 2, C34: 4, C35: 5,
  C36: 5, C37: 0, C38: 4, C39: 4, C40: 4, C41: 2, C42: 3, C43: 4,
  C44: 4, C45: 4, C46: 4, C47: 3, C48: 4, C49: 4, C50: 0, C51: 3,
  C52: 0, C53: 4, C54: 4,
};

const NOMINAL_KHUSUS = { C6: 30000, C13: 30000, C22: 30000, C41: 30000 };

// baris TOTAL di rekap (Mei & Juni dibiarkan kosong oleh perwakilan)
const TOTAL_PER_BULAN = { jan: 2070000, feb: 2070000, mar: 1890000, apr: 1310000 };
const EXPECTED_TOTAL = 7600000;

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const blockC = data.blocks.C;
if (!blockC) throw new Error('Blok C tidak ada di data.json');

const known = new Set(blockC.members.map(m => m.houseNumber));
const missing = Object.keys(LUNAS).filter(h => !known.has(h));
if (missing.length) throw new Error('Rumah tidak ada di data.json: ' + missing.join(', '));

let total = 0;
let terisi = 0;
const perBulan = {};
MONTHS.forEach(mo => { perBulan[mo] = 0; });

blockC.members.forEach(m => {
  const n = LUNAS[m.houseNumber];
  if (n === undefined) return;

  if (NOMINAL_KHUSUS[m.houseNumber]) {
    m.amount = NOMINAL_KHUSUS[m.houseNumber];
    m.isException = true;
  }

  MONTHS.forEach((mo, i) => {
    m.payments[mo] = i < n;
    if (i < n) perBulan[mo] += m.amount;
  });

  total += n * m.amount;
  if (n > 0) terisi += 1;
});

for (const [mo, expected] of Object.entries(TOTAL_PER_BULAN)) {
  if (perBulan[mo] !== expected) {
    throw new Error(`Total ${mo} tidak cocok: dapat ${perBulan[mo]}, rekap ${expected}`);
  }
}
if (total !== EXPECTED_TOTAL) {
  throw new Error(`Grand total tidak cocok: dapat ${total}, harusnya ${EXPECTED_TOTAL}`);
}

fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
const dalamRekap = Object.keys(LUNAS).length;
console.log(`Blok C: ${terisi} rumah sudah bayar, ${dalamRekap - terisi} belum (dari ${dalamRekap} baris di rekap).`);
console.log(`Tidak ada di rekap: C1, C2, C3, C55 -> dibiarkan belum bayar.`);
console.log(`Total terkumpul: Rp ${total.toLocaleString('id-ID')} (cocok dengan rekap)`);
