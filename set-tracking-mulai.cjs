/**
 * set-tracking-mulai.cjs
 *
 * Menentukan dari bulan mana pencatatan iuran PER RUMAH mulai dihitung.
 *
 * Latar belakang: untuk Januari-Juli 2026 yang ada hanya angka TOTAL uang
 * masuk per bulan (lihat `pemasukanKas`), bukan catatan siapa yang bayar.
 * Blok B, F, G tidak punya data per rumah sama sekali sehingga terbaca
 * "nunggak 12 bulan" padahal sebenarnya "belum diinput".
 *
 * Dengan `trackingMulai`, status Lunas/Telat/Nunggak hanya dihitung dari
 * bulan itu ke depan. Data lama TIDAK dihapus, hanya tidak dipakai untuk
 * menghitung status. Jadi kalau nanti mau dikembalikan, cukup ganti bulannya.
 *
 * Uang masuk 2026 (Januari-Juli) tetap utuh dan tidak terpengaruh.
 *
 * Cara pakai:
 *   node set-tracking-mulai.cjs aug     -> mulai Agustus
 *   node set-tracking-mulai.cjs jan     -> kembali ke Januari (hitung penuh)
 *   node set-tracking-mulai.cjs         -> lihat status sekarang
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

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const arg = (process.argv[2] || '').toLowerCase();

if (!arg) {
  console.log('trackingMulai sekarang :', data.trackingMulai || 'jan (default, hitung penuh)');
  console.log('Pakai: node set-tracking-mulai.cjs <' + MONTHS.join('|') + '>');
  process.exit(0);
}

if (!MONTHS.includes(arg)) {
  console.error('Bulan tidak dikenal:', arg);
  console.error('Pilihan:', MONTHS.join(', '));
  process.exit(1);
}

const startIdx = MONTHS.indexOf(arg);

if (arg === 'jan') {
  delete data.trackingMulai;
} else {
  data.trackingMulai = arg;
}
fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');

// Tampilkan dampaknya supaya langsung kelihatan, tanpa perlu buka website.
const currentIdx = Math.max(0, Math.min(11, new Date().getMonth()));
const dueMonths = MONTHS.slice(Math.min(startIdx, currentIdx), currentIdx + 1);

console.log('Pencatatan per rumah mulai :', NAMA[arg]);
console.log('Bulan yang dinilai         :', dueMonths.map(m => NAMA[m]).join(', '));
console.log();
console.log('Dampak ke status per blok:');
console.log('BLOK  rumah  lunas  telat  nunggak');

let tLunas = 0, tTelat = 0, tNunggak = 0, tRumah = 0;
Object.entries(data.blocks || {}).forEach(([key, block]) => {
  const members = (block.members || []).filter(m => !m.vacant);
  let lunas = 0, telat = 0, nunggak = 0;
  const thisMonth = MONTHS[currentIdx];
  members.forEach(m => {
    const p = m.payments || {};
    const sudahSemua = dueMonths.every(mo => p[mo]);
    const adaBayar = dueMonths.some(mo => p[mo]);
    if (sudahSemua) lunas += 1;
    else if (!adaBayar) nunggak += 1;
    else telat += 1;
    void thisMonth;
  });
  tLunas += lunas; tTelat += telat; tNunggak += nunggak; tRumah += members.length;
  console.log(
    key.padEnd(5),
    String(members.length).padStart(5),
    String(lunas).padStart(6),
    String(telat).padStart(6),
    String(nunggak).padStart(8)
  );
});
console.log('-'.repeat(38));
console.log('TOTAL', String(tRumah).padStart(5), String(tLunas).padStart(6), String(tTelat).padStart(6), String(tNunggak).padStart(8));
console.log();
console.log('Catatan: data pembayaran bulan sebelumnya tidak dihapus, hanya');
console.log('tidak dipakai untuk menghitung status. Uang masuk 2026 tetap utuh.');
