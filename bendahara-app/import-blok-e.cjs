#!/usr/bin/env node
/**
 * Input data iuran Blok E dari PDF "IURAN BULANAN KOMPLEK BLOK E"
 * (Istana Anugerah Murakata Regency), diterima 2026-08-13.
 *
 * Rekap memuat E1..E43, kolom Januari s/d Desember penuh.
 *
 * Ciri khas Blok E dibanding blok lain:
 *  - Sel bertuliskan "KOSONG" (merah) = rumah belum ada penghuni -> vacant.
 *  - Nominal bisa BERUBAH di tengah tahun untuk rumah yang sama
 *    (mis. E6: Jan 50rb lalu Feb-Mar 30rb). Karena itu dipakai `paidAmounts`
 *    per bulan, bukan satu `amount` rata-rata.
 *  - E7 dan E17 sudah LUNAS 12 bulan (Rp 600.000 masing-masing).
 *
 * Validasi berlapis: total per bulan + grand total harus sama dengan baris
 * JUMLAH di rekap, kalau tidak script menolak menyimpan.
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data.json');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Nominal per bulan sesuai rekap. Urut Januari ke depan; nilai 0 = belum bayar.
// Rumah yang selnya "KOSONG" di rekap ditandai vacant (lihat VACANT).
const RINCIAN = {
  E1:  [30000, 30000, 30000, 30000],
  E2:  [50000, 50000, 50000, 50000],
  E3:  [50000, 50000, 50000, 50000],
  E4:  [50000, 50000, 50000, 50000],
  E5:  [50000, 50000, 50000],
  E6:  [50000, 30000, 30000],
  E7:  [50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000],
  E8:  [50000, 50000, 50000, 50000],
  E9:  [50000, 50000, 50000, 50000],
  E10: [50000, 50000, 50000, 50000],
  E11: [50000, 50000, 30000],
  E12: [50000, 50000, 50000, 50000],
  E13: [30000, 30000, 30000, 30000],
  E14: [],
  E15: [50000, 50000, 50000, 50000],
  E16: [50000, 30000, 30000, 30000],
  E17: [50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000],
  E18: [50000],
  E19: [50000, 50000, 50000],
  E20: [50000],
  E21: [0, 30000, 50000, 50000],
  E22: [50000, 50000, 50000, 50000],
  E23: [50000],
  E24: [50000, 50000, 50000, 50000, 50000, 50000],
  E25: [50000, 50000, 50000, 50000],
  E26: [50000, 50000, 50000, 50000],
  E27: [50000, 50000, 50000, 50000],
  E28: [50000, 50000, 50000, 50000],
  E29: [50000, 50000, 50000, 50000],
  E30: [],
  E31: [50000, 50000, 50000, 50000],
  E32: [],
  E33: [0, 50000, 50000, 50000],
  E34: [],
  E35: [50000, 50000, 50000, 50000],
  E36: [50000, 50000, 50000, 50000],
  E37: [0, 0, 50000, 50000],
  E38: [],
  E39: [],
  E40: [],
  E41: [],
  E42: [],
  E43: [50000, 50000, 50000, 50000, 50000],
};

// Rumah yang di rekap seluruh selnya bertuliskan KOSONG = belum ada penghuni.
const VACANT = ['E14', 'E30', 'E32', 'E34', 'E38', 'E39', 'E40', 'E41', 'E42'];

// Baris JUMLAH di rekap.
const TOTAL_PER_BULAN = {
  jan: 1510000, feb: 1400000, mar: 1450000, apr: 1290000,
  may: 200000, jun: 150000, jul: 100000, aug: 100000,
  sep: 100000, oct: 100000, nov: 100000, dec: 100000,
};
const EXPECTED_TOTAL = 6600000;

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const blockE = data.blocks.E;
if (!blockE) throw new Error('Blok E tidak ada di data.json');

const known = new Set(blockE.members.map(m => m.houseNumber));
const missing = Object.keys(RINCIAN).filter(h => !known.has(h));
if (missing.length) throw new Error('Rumah tidak ada di data.json: ' + missing.join(', '));

let total = 0;
let terisi = 0;
const perBulan = {};
MONTHS.forEach(mo => { perBulan[mo] = 0; });

blockE.members.forEach(m => {
  const rincian = RINCIAN[m.houseNumber];
  if (!rincian) return;

  if (VACANT.includes(m.houseNumber)) {
    m.vacant = true;
  } else {
    delete m.vacant;
  }

  const paidAmounts = {};
  let sudahBayar = 0;

  MONTHS.forEach((mo, i) => {
    const nominal = rincian[i] || 0;
    const lunas = nominal > 0;
    m.payments[mo] = lunas;
    if (lunas) {
      paidAmounts[mo] = nominal;
      perBulan[mo] += nominal;
      total += nominal;
      sudahBayar += 1;
    }
  });

  // Simpan rincian per bulan hanya kalau nominalnya tidak seragam,
  // supaya data.json tidak membengkak tanpa alasan.
  const unik = [...new Set(Object.values(paidAmounts))];
  if (unik.length > 1) {
    m.paidAmounts = paidAmounts;
    m.amount = unik.sort((a, b) => b - a)[0];
    m.isException = true;
  } else {
    delete m.paidAmounts;
    if (unik.length === 1) {
      m.amount = unik[0];
      m.isException = unik[0] !== 50000;
    }
  }

  if (sudahBayar > 0) terisi += 1;
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
const jumlahRumah = Object.keys(RINCIAN).length;
const aktif = jumlahRumah - VACANT.length;
console.log(`Blok E: ${jumlahRumah} rumah di rekap, ${VACANT.length} kosong -> ${aktif} rumah aktif.`);
console.log(`Sudah bayar: ${terisi} rumah. Belum bayar: ${aktif - terisi} rumah.`);
console.log(`Total terkumpul: Rp ${total.toLocaleString('id-ID')} (cocok dengan baris JUMLAH)`);
