/**
 * Laporan iuran Blok C bulan September 2026 (format ringkas user, 2026-09-25):
 *   "C3 2 C4 3 ..." = nomor rumah + jumlah bulan dibayar
 *   angka terakhir = nominal per bulan (kalau kosong = default 50rb).
 *
 * Karena semua rumah C masih terlanjur lunas s.d. Juli, N yang dilaporkan
 * artinya: N bulan TERBUNTING s.d. September (sep, jul+n-2, ...).
 * Dilihat dari bulan yang TIDAK dibayar:
 *   C3:2  -> aug, sep   |  C4:3 -> jul, aug, sep
 *   C8:1  -> sep        |  C10:1, C16:1, C18:1, C20:1, C27:1, C30:1
 *   C12:2 -> aug, sep   |  C13:2 (30rb) -> aug, sep
 *   C17:2 -> aug, sep   |  C21:2 -> aug, sep
 *   C22:1 (30rb) -> sep  |  C25:2 -> aug, sep
 *   C28:3 -> jul, aug, sep | C34:2 -> aug, sep
 *   C35:1, C36:1, C38:1, C39:1, C43:1, C44:1, C47:1, C48:1
 *   C49:2 -> aug, sep   |  C53:1, C54:1
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// rumah -> { months: [...], per: nominal per bulan }
const L = {
  C3: { months: ['aug', 'sep'], per: 50000 },
  C4: { months: ['jul', 'aug', 'sep'], per: 50000 },
  C8: { months: ['sep'], per: 50000 },
  C10: { months: ['sep'], per: 50000 },
  C12: { months: ['aug', 'sep'], per: 50000 },
  C13: { months: ['aug', 'sep'], per: 30000 },
  C16: { months: ['sep'], per: 50000 },
  C17: { months: ['aug', 'sep'], per: 50000 },
  C18: { months: ['sep'], per: 50000 },
  C20: { months: ['sep'], per: 50000 },
  C21: { months: ['aug', 'sep'], per: 50000 },
  C22: { months: ['sep'], per: 30000 },
  C25: { months: ['aug', 'sep'], per: 50000 },
  C27: { months: ['sep'], per: 50000 },
  C28: { months: ['jul', 'aug', 'sep'], per: 50000 },
  C30: { months: ['sep'], per: 50000 },
  C34: { months: ['aug', 'sep'], per: 50000 },
  C35: { months: ['sep'], per: 50000 },
  C36: { months: ['sep'], per: 50000 },
  C38: { months: ['sep'], per: 50000 },
  C39: { months: ['sep'], per: 50000 },
  C43: { months: ['sep'], per: 50000 },
  C44: { months: ['sep'], per: 50000 },
  C47: { months: ['sep'], per: 50000 },
  C48: { months: ['sep'], per: 50000 },
  C49: { months: ['aug', 'sep'], per: 50000 },
  C53: { months: ['sep'], per: 50000 },
  C54: { months: ['sep'], per: 50000 },
};

const MONTH_NAMES = { jan: 'Januari', feb: 'Februari', mar: 'Maret', apr: 'April', may: 'Mei', jun: 'Juni', jul: 'Juli', aug: 'Agustus', sep: 'September', oct: 'Oktober', nov: 'November', dec: 'Desember' };

const members = Object.fromEntries(data.blocks.C.members.map(m => [m.houseNumber, m]));
let total = 0;

for (const [hn, spec] of Object.entries(L)) {
  const m = members[hn];
  if (!m) throw new Error(`${hn} tidak ketemu di Blok C`);
  const label = m.name ? `${hn} ${m.name}` : hn;
  for (const mo of spec.months) {
    m.payments[mo] = true;
    if (spec.per !== 50000) m.paidAmounts = m.paidAmounts || { [mo]: spec.per };
    total += spec.per;
    data.activityLog.unshift({
      icon: '💰',
      text: `Blok C ${label} bayar iuran ${MONTH_NAMES[mo]} 2026 (Rp ${spec.per.toLocaleString('id-ID')})`,
      date: '2026-09-25',
      ts: Date.now(),
    });
  }
}

// --- setoranBlok.C: total uang masuk dari Blok C Sep + Aug (bayar 2 bulan) ---
const perMonth = { jul: 0, aug: 0, sep: 0 };
for (const [hn, spec] of Object.entries(L)) {
  for (const mo of spec.months) perMonth[mo] += spec.per;
}
const totalC = perMonth.jul + perMonth.aug + perMonth.sep;
console.log('Per bulan masuk ->', JSON.stringify(perMonth), '| TOTAL:', totalC);

const sb = (data.setoranBlok = data.setoranBlok || {});
const prevC = (sb.C = sb.C || []).find(s => s.month === 'sep');
const entry = { month: 'sep', amount: totalC, date: '2026-09-25', keterangan: 'Setoran Blok C (iuran Sep 2026 + pelunasan tunggakan Jul-Agu)' };
if (prevC) Object.assign(prevC, entry);
else sb.C.push(entry);

data.activityLog.unshift({
  icon: '💰',
  text: `Blok C: Setoran perwakilan Rp ${totalC.toLocaleString('id-ID')} (iuran Sep 2026 + pelunasan tunggakan Jul-Agu)`,
  date: '2026-09-25',
  ts: Date.now() + 1,
});

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log('OK —', Object.keys(L).length, 'rumah, total Rp', total.toLocaleString('id-ID'));
