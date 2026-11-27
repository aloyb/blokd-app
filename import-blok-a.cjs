#!/usr/bin/env node
/**
 * Input data iuran Blok A dari foto rekap yang dikirim 2026-08-26.
 *
 * Foto memuat 33 rumah (A1-A33), semuanya sudah terdaftar di data.json.
 * Tidak ada baris JUMLAH, jadi total dihitung dari rincian dan
 * dicetak untuk dicek manual.
 *
 * Ciri khas Blok A:
 *  - A5 Gazali: tarif 30rb sepanjang tahun -> isException.
 *  - A30 Ari Darlan: tarif 30rb sepanjang tahun -> isException.
 *  - A13 Samani: nominal berubah-ubah di tengah tahun (30rb/50rb) -> pakai paidAmounts.
 *  - A1, A3, A9, A10, A14, A15, A16, A19, A24, A32: belum bayar sama sekali.
 *  - A27, A28, A29: sudah lunas 12 bulan.
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data.json');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Nominal per bulan sesuai rekap, urut Januari ke depan. 0 = sel kosong.
// Array bisa lebih pendek dari 12; sisanya dianggap belum bayar.
const RINCIAN = {
  A1:   [],
  A2:   [50000,50000,50000,50000,50000,50000],
  A3:   [],
  A4:   [50000,50000,50000,50000,50000,50000],
  A5:   [30000,30000,30000,30000,30000,30000],
  A6:   [50000,50000,50000,50000,50000,50000,50000,50000],
  A7:   [50000,50000,50000,50000,50000,50000,50000,50000],
  A8:   [50000,50000,50000,50000,50000,50000,50000,50000],
  A9:   [],
  A10:  [],
  A11:  [50000],
  A12:  [50000],
  A13:  [30000,30000,50000,50000,30000,50000,50000,50000],
  A14:  [],
  A15:  [],
  A16:  [],
  A17:  [50000,50000,50000,50000,50000],
  A18:  [50000,50000],
  A19:  [],
  A20:  [50000,50000,50000,50000,50000,50000],
  A21:  [50000,50000,50000,50000,50000,50000,50000,50000],
  A22:  [50000,50000,50000,50000,50000,50000,50000,50000],
  A23:  [50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000],
  A24:  [],
  A25:  [50000,50000,50000,50000,50000,50000,50000],
  A26:  [50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000],
  A27:  [50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000],
  A28:  [50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000],
  A29:  [50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000],
  A30:  [30000,30000,30000,30000,30000,30000,30000],
  A31:  [50000,50000,50000,50000,50000,50000,50000,50000],
  A32:  [],
  A33:  [50000,50000],
};

// Nama pemilik dari kolom kedua rekap.
const NAMA = {
  A1: '-', A2: 'Hidayatullah', A3: 'Fitriyadi', A4: 'Hasmi Elyas',
  A5: 'Gazali', A6: 'Siti Fiteriani', A7: 'Ita Sari', A8: 'M Akbar Maula',
  A9: 'Hajiri Rifan', A10: '-', A11: 'Alpian Rinjani',
  A12: 'M Virgiawan Riyandi', A13: 'Samani', A14: '-', A15: '-', A16: '-',
  A17: 'Aspar', A18: "Adjie Massya'idh", A19: '-',
  A20: 'Budi Irawan', A21: 'Noor Ikhsan', A22: 'Rahman Nazir',
  A23: 'Nor Asna', A24: 'Zailani Amin', A25: 'Syaiful Rasyid',
  A26: 'Syarif Hidayat', A27: 'Yarkasi', A28: 'Endang Sulistyawati',
  A29: 'Muhammad Bahid', A30: 'Ari Darlan', A31: 'Damanhuri Rahman',
  A32: 'Muhammad Maulidi Ansyari', A33: 'Sutrisno',
};

// Rumah dengan tarif 30rb sepanjang tahun (bukan potongan sementara).
const EXCEPTION_30K = ['A5', 'A30'];

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const block = data.blocks && data.blocks.A;
if (!block) {
  console.error('Blok A tidak ada di data.json');
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
console.log('Blok A tersimpan.\n');
console.log('Total per bulan:');
MONTHS.forEach((m, mi) => {
  if (totalPerBulan[mi] > 0) console.log(`  ${m}: ${rupiah(totalPerBulan[mi])}`);
});
console.log(`\nGrand total: ${rupiah(grandTotal)}`);
console.log(`Rumah terisi data: ${Object.keys(RINCIAN).length} dari ${block.members.length}`);
