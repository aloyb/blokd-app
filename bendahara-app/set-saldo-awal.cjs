/**
 * set-saldo-awal.cjs
 *
 * Mengisi saldo awal 2026 = sisa kas dari tahun 2025.
 *
 * Kenapa dipisah, tidak digabung ke uang masuk Januari:
 * Rekap bulanan 2026 (Januari-Juli) harus tetap cocok satu-satu dengan
 * catatan bendahara. Kalau sisa 2025 ditambahkan ke Januari, angka Januari
 * jadi tidak sama dengan rekap dan bikin bingung waktu dicek ulang.
 * Jadi saldo awal berdiri sendiri:
 *
 *   Kas bersih = saldoAwal + uang masuk 2026 - pengeluaran 2026
 *
 * TIGA CARA PAKAI:
 *
 * 1. Kalau sudah tahu angka sisa 2025:
 *      node set-saldo-awal.cjs 1500000 "Sisa kas iuran 2025"
 *
 * 2. Kalau TIDAK tahu angka 2025 tapi tahu jumlah uang yang sekarang
 *    dipegang (hasil hitung uang fisik + saldo rekening). Script akan
 *    menghitung sendiri sisa 2025 = uang sekarang - arus kas 2026:
 *      node set-saldo-awal.cjs --dari-fisik 5000000
 *
 * 3. Kalau belum tahu sama sekali, tandai supaya jelas di website bahwa
 *    angka yang tampil murni 2026 dan belum termasuk sisa 2025:
 *      node set-saldo-awal.cjs --belum-tahu
 *
 *    Hapus saldo awal / tanda:
 *      node set-saldo-awal.cjs 0
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data.json');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const rp = (n) => (n < 0 ? '-' : '') + 'Rp ' + Math.abs(Number(n || 0)).toLocaleString('id-ID');

// Terima "1.500.000", "1500000", atau "1,500,000".
const parseRupiah = (s) => Number(String(s).replace(/[^\d-]/g, ''));

function arusKas2026(data) {
  let masuk = 0;
  const src = (data.pemasukanKas && data.pemasukanKas.months) || {};
  MONTHS.forEach((mo) => {
    const e = src[mo];
    if (!e) return;
    let b = 0;
    Object.values(e.perBlock || {}).forEach((n) => { b += Number(n || 0); });
    b += Number(e.lainnyaTotal || 0);
    if (e.total != null && b === 0) b = Number(e.total || 0);
    masuk += b;
  });

  let keluar = 0;
  (data.pengeluaran || []).forEach((p) => { keluar += Number(p.amount || 0); });
  Object.values(data.blocks || {}).forEach((b) => {
    (b.setorHistory || []).forEach((s) => { keluar += Number(s.amount || 0); });
  });

  return { masuk, keluar, selisih: masuk - keluar };
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Pakai salah satu:');
  console.error('  node set-saldo-awal.cjs <nominal> ["catatan"]');
  console.error('  node set-saldo-awal.cjs --dari-fisik <uang_yang_dipegang_sekarang>');
  console.error('  node set-saldo-awal.cjs --belum-tahu');
  console.error('  node set-saldo-awal.cjs 0');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const kas = arusKas2026(data);
const mode = args[0];

if (mode === '--belum-tahu') {
  delete data.saldoAwal;
  delete data.saldoAwalCatatan;
  data.saldoAwalPending = true;
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
  console.log('Ditandai: sisa kas 2025 BELUM diketahui.');
  console.log('Website akan menampilkan catatan bahwa angka murni arus kas 2026.');
  console.log();
  console.log('Arus kas 2026 murni :', rp(kas.selisih));
  process.exit(0);
}

let nominal;
let catatan;

if (mode === '--dari-fisik') {
  const fisik = parseRupiah(args[1]);
  if (!Number.isFinite(fisik) || args[1] === undefined) {
    console.error('Sebutkan jumlah uang yang sekarang dipegang.');
    console.error('Contoh: node set-saldo-awal.cjs --dari-fisik 5000000');
    process.exit(1);
  }
  nominal = fisik - kas.selisih;
  catatan = 'Sisa kas 2025, dihitung dari uang yang dipegang sekarang';

  console.log('CARA HITUNG:');
  console.log('  Uang dipegang sekarang :', rp(fisik));
  console.log('  Arus kas 2026 murni    :', rp(kas.selisih), '(masuk ' + rp(kas.masuk) + ' - keluar ' + rp(kas.keluar) + ')');
  console.log('  ' + '-'.repeat(40));
  console.log('  Sisa dari 2025         :', rp(nominal));
  console.log();

  if (nominal < 0) {
    console.log('CATATAN: hasilnya minus. Artinya uang yang dipegang LEBIH SEDIKIT');
    console.log('daripada seharusnya menurut rekap 2026. Kemungkinan ada pengeluaran');
    console.log('yang belum tercatat, atau ada uang masuk yang kelebihan hitung.');
    console.log('Angka tetap disimpan supaya selisihnya kelihatan, tapi sebaiknya dicek.');
    console.log();
  }
} else {
  nominal = parseRupiah(mode);
  if (!Number.isFinite(nominal)) {
    console.error('Nominal tidak valid:', mode);
    process.exit(1);
  }
  catatan = args[1] || 'Sisa kas tahun 2025';
}

if (nominal === 0) {
  delete data.saldoAwal;
  delete data.saldoAwalCatatan;
  delete data.saldoAwalPending;
} else {
  data.saldoAwal = nominal;
  data.saldoAwalCatatan = catatan;
  delete data.saldoAwalPending;
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');

console.log('Saldo awal (sisa 2025) :', rp(nominal));
console.log('Uang masuk 2026        :', rp(kas.masuk));
console.log('Pengeluaran 2026       :', rp(kas.keluar));
console.log('-'.repeat(42));
console.log('KAS BERSIH             :', rp(nominal + kas.selisih));
