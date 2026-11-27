#!/usr/bin/env node
/**
 * Input data iuran Blok G dari foto rekap yang dikirim 2026-08-26.
 *
 * Foto hanya memuat 8 rumah yang SUDAH pernah bayar (G2, G3, G4, G6, G10,
 * G20, G22, G32). Rumah G lain tidak muncul di rekap, jadi dibiarkan apa
 * adanya (nama "-", belum ada pembayaran) sesuai arahan user: rumah tanpa
 * nama dibiarkan karena bendahara belum dapat nama pemiliknya.
 *
 * Ciri khas Blok G:
 *  - Nominal berubah di tengah tahun untuk beberapa rumah (mis. G2: Feb-Apr
 *    30rb lalu Mei-Agu 50rb). Karena itu dipakai `paidAmounts` per bulan.
 *  - G6 Vitaa bertarif 30rb sepanjang tahun -> isException.
 *  - G10 Isna sudah LUNAS 12 bulan (Rp 600.000).
 *  - G3 Yuli terdaftar namanya tapi belum bayar sama sekali.
 *
 * TIDAK ada baris JUMLAH di foto, jadi total dihitung dari rincian dan
 * dicetak untuk dicek manual (tidak bisa divalidasi silang seperti Blok E).
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data.json');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Nominal per bulan sesuai rekap, urut Januari ke depan. 0 = sel kosong.
// Array boleh lebih pendek dari 12; sisanya dianggap belum bayar.
const RINCIAN = {
  G2:  [0, 30000, 30000, 30000, 50000, 50000, 50000, 50000],
  G3:  [],
  G4:  [30000, 50000, 50000, 50000, 50000, 50000, 50000, 50000],
  G6:  [30000, 30000, 30000, 30000, 30000, 30000, 30000, 30000],
  G10: [50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000],
  G20: [0, 0, 30000, 30000, 50000, 50000, 50000, 50000],
  G22: [0, 30000, 30000, 30000, 30000, 30000, 50000],
  G32: [0, 0, 0, 0, 0, 50000, 50000, 50000],
};

// Nama pemilik dari kolom kedua rekap.
const NAMA = {
  G2: 'Fikri',
  G3: 'Yuli',
  G4: 'Hartati',
  G6: 'Vitaa',
  G10: 'Isna',
  G20: 'Nurul',
  G22: 'Abdurrahman',
  G32: 'Rifki',
};

// Rumah yang tarifnya 30rb sepanjang tahun (bukan potongan sementara).
const EXCEPTION_30K = ['G6'];

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const block = data.blocks && data.blocks.G;
if (!block) {
  console.error('Blok G tidak ada di data.json');
  process.exit(1);
}

const byHouse = new Map(block.members.map(m => [m.houseNumber, m]));
const missing = Object.keys(RINCIAN).filter(h => !byHouse.has(h));
if (missing.length) {
  console.error('Nomor rumah tidak ditemukan di data.json:', missing.join(', '));
  process.exit(1);
}

const totalPerBulan = MONTHS.map(() => 0);
let grandTotal = 0;

Object.entries(RINCIAN).forEach(([house, nominals]) => {
  const member = byHouse.get(house);
  member.name = NAMA[house] || member.name;

  const isException = EXCEPTION_30K.includes(house);
  member.isException = isException;
  member.amount = isException ? 30000 : 50000;

  const payments = {};
  const paidAmounts = {};
  MONTHS.forEach((month, mi) => {
    const nominal = Number(nominals[mi] || 0);
    payments[month] = nominal > 0;
    if (nominal > 0) {
      totalPerBulan[mi] += nominal;
      grandTotal += nominal;
      // Simpan override hanya kalau beda dari tarif dasar rumah itu.
      if (nominal !== member.amount) paidAmounts[month] = nominal;
    }
  });
  member.payments = payments;

  if (Object.keys(paidAmounts).length) {
    member.paidAmounts = paidAmounts;
  } else {
    delete member.paidAmounts;
  }
});

fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');

const rupiah = n => 'Rp ' + n.toLocaleString('id-ID');
console.log('Blok G tersimpan.\n');
console.log('Total per bulan:');
MONTHS.forEach((m, mi) => {
  if (totalPerBulan[mi] > 0) console.log(`  ${m}: ${rupiah(totalPerBulan[mi])}`);
});
console.log(`\nGrand total: ${rupiah(grandTotal)}`);
console.log(`Rumah terisi data: ${Object.keys(RINCIAN).length} dari ${block.members.length}`);
