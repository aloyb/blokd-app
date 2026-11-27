/**
 * Menambahkan `pemasukanKas` ke data.json.
 *
 * LATAR BELAKANG
 * Sampai sekarang angka "Pemasukan" di app dihitung dari `blocks.X.members[].payments`
 * (bulan mana yang sudah lunas). Itu BUKAN arus kas: warga bisa bayar 3 bulan di muka
 * atau menunggak 3 bulan dulu, dan blok B/F/G sama sekali belum ada data per rumah
 * sehingga terbaca Rp 0. Akibatnya kas bersih tampil minus Rp 18,5 juta padahal
 * uangnya ada di tangan bendahara.
 *
 * `pemasukanKas` adalah catatan uang yang BENAR-BENAR diterima per bulan, terpisah dari
 * `payments`. Ini yang dipakai untuk menghitung kas bersih.
 *
 * ATURAN DARI USER (dikonfirmasi 2026-08-14, pesan #1702):
 * - Total Januari-April SUDAH TERMASUK Blok D. Jangan ditambah lagi.
 *   Rincian Blok D-nya tetap ditampilkan, sisanya jadi "blok lainnya".
 * - Mei-Juli: angka per blok yang dikirim user TIDAK termasuk Blok D,
 *   jadi Blok D ditambahkan.
 * - Angka Blok D diambil dari catatan `payments` Blok D (blok ini dipegang user
 *   sendiri dan tercatat rapi per rumah).
 * - "BLOK E 10320.000" bulan Juni = 1.320.000 (dikonfirmasi user 2026-08-14).
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data.json');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// --- Blok D: turunkan uang masuk per bulan dari catatan per rumah ---------
function amountForMonth(member, month) {
  const override = member.paidAmounts && member.paidAmounts[month];
  if (typeof override === 'number' && override > 0) return override;
  return member.isException ? member.amount : (member.amount || 50000);
}

function blokDPerBulan() {
  const members = (data.blocks.D.members || []).filter(m => !m.vacant);
  const out = {};
  MONTHS.forEach(mo => {
    let sum = 0;
    members.forEach(m => {
      if (m.payments && m.payments[mo]) sum += amountForMonth(m, mo);
    });
    out[mo] = sum;
  });
  return out;
}

const D = blokDPerBulan();

// --- Angka dari user ------------------------------------------------------
// Januari-April: total seluruh komplek, SUDAH termasuk Blok D.
const TOTAL_SEMUA = { jan: 6340000, feb: 10350000, mar: 5300000, apr: 7430000 };

// Mei-Juli: rincian per blok, BELUM termasuk Blok D.
const PER_BLOK = {
  may: { A: 780000, B: 790000, C: 1780000, E: 1290000, F: 890000 },
  jun: { A: 1360000, B: 940000, C: 2070000, E: 1320000, F: 1030000 },
  jul: { A: 760000, B: 1440000, C: 1790000, E: 1340000, F: 960000, G: 630000 },
};

const months = {};
MONTHS.forEach(mo => {
  const entry = { perBlock: {} };
  if (D[mo] > 0) entry.perBlock.D = D[mo];

  if (TOTAL_SEMUA[mo] != null) {
    // Total sudah termasuk D -> porsi blok lain = total - D.
    const sisa = TOTAL_SEMUA[mo] - (D[mo] || 0);
    if (sisa < 0) {
      throw new Error(
        `Total ${mo} (${TOTAL_SEMUA[mo]}) lebih kecil dari uang masuk Blok D (${D[mo]}). Periksa datanya.`
      );
    }
    entry.lainnyaTotal = sisa;
    entry.lainnyaNote = 'Gabungan Blok A,B,C,E,F,G - rincian per blok belum tersedia';
  }
  if (PER_BLOK[mo]) {
    // Angka Mei-Juli belum termasuk D, jadi digabung apa adanya.
    Object.assign(entry.perBlock, PER_BLOK[mo]);
  }

  const adaIsi = Object.keys(entry.perBlock).length > 0 || entry.lainnyaTotal != null;
  if (adaIsi) months[mo] = entry;
});

// Catatan: Blok E Juni 1.320.000 sudah dikonfirmasi user (2026-08-14),
// jadi tidak ada lagi angka yang menunggu review.

data.pemasukanKas = {
  catatan:
    'Uang masuk NYATA yang diterima bendahara per bulan. Berbeda dari `payments` ' +
    'yang hanya menandai bulan mana yang sudah lunas per rumah. Angka inilah yang ' +
    'dipakai menghitung kas bersih, karena blok B/F/G belum punya data per rumah.',
  months,
};

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// --- Laporan -------------------------------------------------------------
const rp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
let grand = 0;
console.log('Bulan    Blok D      Lain-lain    Total');
MONTHS.forEach(mo => {
  const m = months[mo];
  if (!m) return;
  const d = m.perBlock.D || 0;
  const lain = Object.entries(m.perBlock)
    .filter(([k]) => k !== 'D')
    .reduce((s, [, v]) => s + v, 0) + (m.lainnyaTotal || 0);
  const tot = d + lain;
  grand += tot;
  console.log(mo.padEnd(8), rp(d).padEnd(12), rp(lain).padEnd(13), rp(tot));
});
console.log('-'.repeat(50));
console.log('TOTAL UANG MASUK :', rp(grand));

let keluar = 0;
(data.pengeluaran || []).forEach(i => { keluar += Number(i.amount || 0); });
Object.keys(data.blocks).forEach(k => {
  (data.blocks[k].setorHistory || []).forEach(i => {
    if (i.type !== 'transfer') keluar += Number(i.amount || 0);
  });
});
console.log('TOTAL PENGELUARAN:', rp(keluar));
console.log('KAS BERSIH       :', rp(grand - keluar));
