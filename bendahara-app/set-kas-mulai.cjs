/**
 * set-kas-mulai.cjs
 *
 * Menyetel TITIK JANGKAR KAS: jumlah uang nyata yang dipegang bendahara
 * umum pada awal bulan tertentu. Sejak titik ini, kas bersih dihitung dari
 * uang fisik yang benar-benar ada, BUKAN dari akumulasi rekap bulan-bulan
 * sebelumnya.
 *
 * KENAPA PERLU:
 * Rekap Januari-Juli 2026 tidak bisa direkonsiliasi (ada uang iuran 2025
 * yang angkanya tidak diketahui, dan beberapa blok belum punya rincian).
 * Arus kas 2026 murni hanya menunjukkan sisa Rp 276.000, sementara uang
 * yang benar-benar diserahkan ke bendahara umum jauh lebih besar. Daripada
 * memaksa angka lama cocok, kas dijangkar ke uang nyata per Agustus dan
 * bulan-bulan sebelumnya diperlakukan sebagai ARSIP (tetap bisa dilihat,
 * tapi tidak ikut menghitung saldo).
 *
 * RUMUS SETELAH ADA JANGKAR:
 *   Kas bersih = kasMulai.total
 *              + uang masuk bulan >= kasMulai.month
 *              - pengeluaran bulan >= kasMulai.month
 *
 * CARA PAKAI:
 *
 *   Lihat kondisi sekarang:
 *     node set-kas-mulai.cjs
 *
 *   Setel jangkar dengan rincian (bisa beberapa "label=nominal"):
 *     node set-kas-mulai.cjs aug \
 *       "Setoran perwakilan blok=29886000" \
 *       "Sisa kas bulan lalu=2671000"
 *
 *   Setel jangkar total saja:
 *     node set-kas-mulai.cjs aug 32557000
 *
 *   Hapus jangkar (kembali hitung penuh dari Januari):
 *     node set-kas-mulai.cjs --hapus
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data.json');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_FULL = {
  jan: 'Januari', feb: 'Februari', mar: 'Maret', apr: 'April',
  may: 'Mei', jun: 'Juni', jul: 'Juli', aug: 'Agustus',
  sep: 'September', oct: 'Oktober', nov: 'November', dec: 'Desember',
};
const rp = (n) => (n < 0 ? '-' : '') + 'Rp ' + Math.abs(Number(n || 0)).toLocaleString('id-ID');
const parseRupiah = (s) => Number(String(s).replace(/[^\d-]/g, ''));

function ringkas(data) {
  const src = (data.pemasukanKas && data.pemasukanKas.months) || {};
  const anchor = data.kasMulai || null;
  const anchorIdx = anchor ? Math.max(0, MONTHS.indexOf(anchor.month)) : 0;

  let masukArsip = 0;
  let masukAktif = 0;
  MONTHS.forEach((mo, mi) => {
    const e = src[mo];
    if (!e) return;
    let b = 0;
    Object.values(e.perBlock || {}).forEach((n) => { b += Number(n || 0); });
    b += Number(e.lainnyaTotal || 0);
    if (e.total != null && b === 0) b = Number(e.total || 0);
    if (anchor && mi < anchorIdx) masukArsip += b; else masukAktif += b;
  });

  let keluarArsip = 0;
  let keluarAktif = 0;
  const catat = (item) => {
    const mi = new Date(item.date).getMonth();
    const n = Number(item.amount || 0);
    if (anchor && mi < anchorIdx) keluarArsip += n; else keluarAktif += n;
  };
  (data.pengeluaran || []).forEach(catat);
  Object.values(data.blocks || {}).forEach((b) => {
    (b.setorHistory || []).forEach((s) => { if (s.type !== 'transfer') catat(s); });
  });

  const jangkar = anchor ? Number(anchor.total || 0) : Number(data.saldoAwal || 0);
  return {
    anchor, anchorIdx, jangkar,
    masukArsip, masukAktif, keluarArsip, keluarAktif,
    kasBersih: jangkar + masukAktif - keluarAktif,
  };
}

function cetak(data) {
  const r = ringkas(data);
  if (r.anchor) {
    const nama = MONTH_FULL[r.anchor.month] || r.anchor.month;
    console.log('JANGKAR KAS :', nama, '2026 —', rp(r.jangkar));
    (r.anchor.rincian || []).forEach((x) => {
      console.log('   •', x.label, '=', rp(x.amount));
    });
    console.log();
    console.log('ARSIP (sebelum ' + nama + ', tidak dihitung ke saldo)');
    console.log('   masuk   :', rp(r.masukArsip));
    console.log('   keluar  :', rp(r.keluarArsip));
    console.log();
    console.log('AKTIF (sejak ' + nama + ')');
    console.log('   masuk   :', rp(r.masukAktif));
    console.log('   keluar  :', rp(r.keluarAktif));
    console.log('-'.repeat(46));
    console.log('KAS BERSIH  :', rp(r.kasBersih));
  } else {
    console.log('Belum ada jangkar kas. Saldo dihitung penuh dari Januari.');
    console.log('   masuk   :', rp(r.masukAktif));
    console.log('   keluar  :', rp(r.keluarAktif));
    console.log('   saldoAwal:', rp(Number(data.saldoAwal || 0)));
    console.log('-'.repeat(46));
    console.log('KAS BERSIH  :', rp(r.kasBersih));
  }
}

const args = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

if (args.length === 0) {
  cetak(data);
  process.exit(0);
}

if (args[0] === '--hapus') {
  delete data.kasMulai;
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
  console.log('Jangkar kas dihapus.\n');
  cetak(data);
  process.exit(0);
}

const month = String(args[0]).toLowerCase();
if (!MONTHS.includes(month)) {
  console.error('Bulan tidak dikenal:', args[0]);
  console.error('Pakai salah satu:', MONTHS.join(', '));
  process.exit(1);
}

const rest = args.slice(1);
if (rest.length === 0) {
  console.error('Sebutkan nominalnya. Contoh:');
  console.error('  node set-kas-mulai.cjs aug 32557000');
  console.error('  node set-kas-mulai.cjs aug "Setoran perwakilan blok=29886000" "Sisa kas bulan lalu=2671000"');
  process.exit(1);
}

const rincian = [];
let total = 0;
rest.forEach((raw) => {
  const eq = raw.lastIndexOf('=');
  if (eq > 0) {
    const label = raw.slice(0, eq).trim();
    const amount = parseRupiah(raw.slice(eq + 1));
    if (!Number.isFinite(amount)) {
      console.error('Nominal tidak valid untuk:', label);
      process.exit(1);
    }
    rincian.push({ label, amount });
    total += amount;
  } else {
    const amount = parseRupiah(raw);
    if (!Number.isFinite(amount)) {
      console.error('Nominal tidak valid:', raw);
      process.exit(1);
    }
    total += amount;
  }
});

const monthIdx = MONTHS.indexOf(month);
const tanggal = '2026-' + String(monthIdx + 1).padStart(2, '0') + '-01';

data.kasMulai = {
  month,
  date: tanggal,
  total,
  rincian,
  catatan:
    'Uang nyata yang dipegang bendahara umum per awal ' + MONTH_FULL[month] +
    ' 2026. Bulan sebelumnya hanya arsip dan tidak ikut menghitung saldo.',
};

// Jangkar kas menggantikan tebak-tebakan sisa 2025: angkanya sudah termasuk
// di uang fisik yang diserahkan, jadi penanda "belum tahu" tidak relevan lagi.
delete data.saldoAwal;
delete data.saldoAwalCatatan;
delete data.saldoAwalPending;

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
console.log('Jangkar kas disimpan.\n');
cetak(data);
