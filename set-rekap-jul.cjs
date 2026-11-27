/**
 * set-rekap-jul.cjs
 *
 * Menulis ulang arus kas Januari-Juli 2026 dari rekapan resmi yang dikirim
 * user (IkyNulil, 2026-08-14 pesan #1712). Script ini idempoten - aman
 * dijalankan berulang, hasilnya selalu sama.
 *
 * ATURAN DARI USER (pesan #1712):
 * 1. Angka uang masuk di bawah SUDAH TERMASUK Blok D. Jangan tambahkan lagi
 *    hasil hitungan dari `blocks.D.payments`.
 * 2. Iuran per rumah/perorangan DITIADAKAN dulu sebagai sumber uang masuk -
 *    yang dipakai hanya total per bulan. Data `payments` per rumah TIDAK
 *    dihapus (masih dipakai untuk statistik Lunas/Telat/Nunggak), tapi tidak
 *    lagi memengaruhi saldo.
 * 3. Rekap ini hanya Januari-Juli. Pembayaran di muka Agustus-Desember
 *    (Rp 900.000 dari Blok D) TIDAK dihitung karena tidak ada di rekap.
 *
 * CATATAN PENTING - "KEPERLUAN WAKAR 203.000" bulan Juli:
 * Angka ini sebelumnya tercatat di `blocks.D.setorHistory` sebagai "Konsumsi
 * wakar" (27 Juli). Di rekap baru dia sudah masuk daftar pengeluaran kompleks,
 * jadi `setorHistory` Blok D dikosongkan supaya tidak dihitung dua kali.
 *
 * "Konsumsi gotong royong Rp 100.000" (20 Juni) TIDAK ada di rekap baru.
 * Ikut dikeluarkan. Kalau ternyata memang keluar, tambahkan lagi dan saldo
 * berkurang Rp 100.000.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data.json');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const NAMA = {
  jan: 'Januari', feb: 'Februari', mar: 'Maret', apr: 'April',
  may: 'Mei', jun: 'Juni', jul: 'Juli', aug: 'Agustus',
  sep: 'September', oct: 'Oktober', nov: 'November', dec: 'Desember',
};

// --- Uang masuk per bulan (sudah termasuk semua blok, termasuk D) ----------
const MASUK = {
  jan: 6340000,
  feb: 10350000,
  mar: 5300000,
  apr: 7430000,
  may: 6744000,
  jun: 8270000,
  jul: 5580000,
};

// --- Uang keluar per bulan ------------------------------------------------
const KELUAR = {
  jan: [
    ['Sampah', 1300000],
    ['Wakar', 1200000],
    ['Keperluan', 3100000],
  ],
  feb: [
    ['Sampah', 2600000],
  ],
  mar: [
    ['Wakar', 3600000],
  ],
  apr: [
    ['Sampah', 1300000],
    ['Wakar', 3600000],
    ['Dan lain-lain', 200000],
  ],
  may: [
    ['Wakar', 3600000],
    ['Pondasi Blok A', 1600000],
    ['Pasir Blok A', 950000],
    ['Perbaikan jalan', 1150000],
    ['Pasir lapangan', 950000],
    ['Keperluan wakar', 210000],
    ['Listrik pos', 400000],
  ],
  jun: [
    ['Wakar', 3600000],
    ['Sampah', 2600000],
    ['Keperluan wakar', 219000],
    ['Lampu dan taso lapangan', 506000],
    ['Pasir lapangan', 950000],
  ],
  jul: [
    ['Wakar', 3600000],
    ['Sampah', 1300000],
    ['Serba suruh Barabai', 6000000],
    ['Keperluan wakar', 203000],
    ['Acara lomba 17 Agustus', 5000000],
  ],
};

const rp = (n) => (n < 0 ? '-' : '') + 'Rp ' + Math.abs(Number(n || 0)).toLocaleString('id-ID');

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// 1. Uang masuk: hanya total per bulan, tanpa rincian per blok.
const months = {};
Object.entries(MASUK).forEach(([mo, total]) => {
  months[mo] = {
    total,
    catatan: 'Rekap resmi bendahara, gabungan seluruh blok (A-G)',
  };
});
data.pemasukanKas = {
  catatan:
    'Uang masuk NYATA yang diterima bendahara per bulan, dari rekap resmi ' +
    'bendahara. Sudah termasuk semua blok (A-G). Angka ini yang dipakai untuk ' +
    'menghitung saldo, BUKAN hasil penjumlahan `blocks.X.payments` - field itu ' +
    'hanya menandai bulan mana yang lunas per rumah dan datanya belum lengkap ' +
    'untuk blok selain D.',
  sumber: 'Rekap bendahara IAMR, dikirim 2026-08-14 (Januari-Juli 2026)',
  months,
};

// 2. Uang keluar: rekap ini jadi satu-satunya sumber.
const pengeluaran = [];
MONTHS.forEach((mo) => {
  (KELUAR[mo] || []).forEach(([keterangan, amount]) => {
    const bulanKe = String(MONTHS.indexOf(mo) + 1).padStart(2, '0');
    pengeluaran.push({ date: `2026-${bulanKe}-01`, amount, keterangan });
  });
});
data.pengeluaran = pengeluaran;

// 3. Kosongkan setorHistory tiap blok supaya tidak dihitung dua kali.
//    "Keperluan wakar 203.000" sekarang ada di daftar kompleks di atas.
Object.values(data.blocks || {}).forEach((b) => {
  b.setorHistory = [];
});

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');

// --- Laporan hasil --------------------------------------------------------
let totalMasuk = 0;
let totalKeluar = 0;
let saldo = 0;

console.log('Bulan'.padEnd(11) + 'Masuk'.padEnd(16) + 'Keluar'.padEnd(16) + 'Selisih'.padEnd(16) + 'Saldo jalan');
console.log('-'.repeat(75));
MONTHS.forEach((mo) => {
  const masuk = MASUK[mo] || 0;
  const keluar = (KELUAR[mo] || []).reduce((s, [, n]) => s + n, 0);
  if (!masuk && !keluar) return;
  totalMasuk += masuk;
  totalKeluar += keluar;
  const selisih = masuk - keluar;
  saldo += selisih;
  console.log(
    NAMA[mo].padEnd(11) + rp(masuk).padEnd(16) + rp(keluar).padEnd(16) +
    rp(selisih).padEnd(16) + rp(saldo)
  );
});
console.log('-'.repeat(75));
console.log('TOTAL'.padEnd(11) + rp(totalMasuk).padEnd(16) + rp(totalKeluar).padEnd(16) + rp(totalMasuk - totalKeluar));
console.log();
console.log('KAS BERSIH: ' + rp(totalMasuk - totalKeluar));
console.log();
console.log('Catatan: "Konsumsi gotong royong Rp 100.000" (20 Juni) tidak ada di');
console.log('rekap ini, jadi tidak dihitung. Kalau memang keluar, saldo jadi ' + rp(totalMasuk - totalKeluar - 100000) + '.');
