#!/usr/bin/env node
/**
 * Input data iuran Blok B dari foto rekap yang dikirim 2026-08-26.
 *
 * Foto memuat 23 rumah (B2-B29), semuanya sudah terdaftar di data.json.
 * Tidak ada baris JUMLAH, jadi total dihitung dari rincian dan
 * dicetak untuk dicek manual.
 *
 * Ciri khas Blok B:
 *  - B7 Herni: tarif 40rb sepanjang tahun -> isException.
 *  - B8 ARI: baru bayar Juni (1x).
 *  - B2, B20: belum bayar sama sekali.
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data.json');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Nominal per bulan sesuai rekap, urut Januari ke depan. 0 = sel kosong.
const RINCIAN = {
  B2:  [0,0,0,0,0,0,0,0,0,0,0,0],
  B3:  [50000,50000,50000,50000,50000,0,50000,50000,0,0,0,0],
  B4:  [50000,50000,50000,50000,50000,50000,0,0,0,0,0,0],
  B5:  [50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000],
  B6:  [50000,50000,50000,50000,0,50000,50000,50000,0,0,0,0],
  B7:  [40000,40000,40000,40000,40000,40000,40000,40000,0,0,0,0],
  B8:  [0,0,0,0,0,50000,0,0,0,0,0,0],
  B10: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
  B11: [50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000],
  B12: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
  B13: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
  B14: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
  B16: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
  B17: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
  B19: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
  B20: [0,0,0,0,0,0,0,0,0,0,0,0],
  B21: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
  B23: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
  B25: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
  B26: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
  B27: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
  B28: [50000,50000,50000,50000,50000,50000,50000,0,0,0,0,0],
  B29: [50000,50000,50000,50000,50000,50000,50000,50000,0,0,0,0],
};

// Nama pemilik dari kolom kedua rekap.
const NAMA = {
  B2: '-',
  B3: 'GUNADI',
  B4: 'HADYAN',
  B5: 'UTHA',
  B6: 'DEPI',
  B7: 'HERNI',
  B8: 'ARI',
  B10: 'LIYULI',
  B11: 'HALIS',
  B12: 'FATIM',
  B13: 'YULI',
  B14: 'NURUL',
  B16: 'AMI',
  B17: 'YULI FAHMI',
  B19: 'YENI',
  B20: 'ARIA',
  B21: 'LATIFAH',
  B23: 'KHAIRUN',
  B25: 'RACHMA',
  B26: 'BUDHI',
  B27: 'HUSIN',
  B28: 'RAHMAN',
  B29: 'IMAN',
};

// Rumah dengan tarif 40rb sepanjang tahun (bukan potongan sementara).
const EXCEPTION_40K = ['B7'];

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const block = data.blocks && data.blocks.B;
if (!block) {
  console.error('Blok B tidak ada di data.json');
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

  const isException = EXCEPTION_40K.includes(house);
  member.isException = isException;
  member.amount = isException ? 40000 : 50000;

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
console.log('Blok B tersimpan.\n');
console.log('Total per bulan:');
MONTHS.forEach((m, mi) => {
  if (totalPerBulan[mi] > 0) console.log(`  ${m}: ${rupiah(totalPerBulan[mi])}`);
});
console.log(`\nGrand total: ${rupiah(grandTotal)}`);
console.log(`Rumah terisi data: ${Object.keys(RINCIAN).length} dari ${block.members.length}`);
