import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data.json');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { totalPeriods: 12, blocks: {} };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Nominal yang dipakai untuk satu bulan tertentu.
// Sebagian rumah nominalnya berubah di tengah tahun (mis. Blok E: 50rb lalu
// turun jadi 30rb), jadi `paidAmounts` per bulan menang atas `amount`.
function amountForMonth(member, month) {
  const override = member.paidAmounts && member.paidAmounts[month];
  if (typeof override === 'number' && override > 0) return override;
  return member.isException ? member.amount : (member.amount || 50000);
}

// Rumah yang tidak punya kewajiban iuran, karena dua alasan berbeda:
//   - `vacant`: belum ada penghuni.
//   - `exempt`: ada penghuni, tapi dibebaskan iuran (perwakilan blok).
// Keduanya dikeluarkan dari hitungan target/nunggak, tapi dibedakan di
// tampilan supaya perwakilan blok tidak salah disebut "rumah kosong".
function isNonBilled(member) {
  return Boolean(member.vacant || member.exempt);
}

function computeBlockStats(block, trackingStartIdx = 0) {
  const allMembers = block.members || [];
  // Rumah kosong & perwakilan blok tidak punya kewajiban iuran, jadi
  // dikeluarkan dari semua hitungan supaya angka "nunggak" tidak menyesatkan.
  const members = allMembers.filter(m => !isNonBilled(m));
  const vacantCount = allMembers.filter(m => m.vacant).length;
  const exemptCount = allMembers.filter(m => m.exempt && !m.vacant).length;
  let totalPaid = 0;

  // Bulan berjalan (0-11) -> daftar bulan yang seharusnya sudah dibayar s/d bulan ini.
  // Dibatasi mulai `trackingStartIdx`: pencatatan per rumah baru dimulai bulan
  // itu, jadi bulan sebelumnya tidak boleh dihitung sebagai tunggakan. Bulan
  // sebelum itu hanya ada angka total per bulan (lihat `pemasukanKas`).
  const currentIdx = Math.max(0, Math.min(11, new Date().getMonth()));
  const startIdx = Math.max(0, Math.min(currentIdx, trackingStartIdx));
  const dueMonths = MONTHS.slice(startIdx, currentIdx + 1);
  const thisMonth = MONTHS[currentIdx];

  let lunasSampaiBulanIni = 0;
  let terlambat = 0;
  let belumAdaBayar = 0;
  let bayarBulanIni = 0;
  const pemasukanPerBulan = MONTHS.map(() => 0);
  const lunasList = [];
  const telatList = [];
  const nunggakList = [];

  members.forEach(member => {
    let paidCount = 0;
    MONTHS.forEach((month, mi) => {
      if (member.payments && member.payments[month]) {
        const monthlyAmount = amountForMonth(member, month);
        totalPaid += monthlyAmount;
        pemasukanPerBulan[mi] += monthlyAmount;
        if (mi >= startIdx) paidCount += 1;
      }
    });
    const lunas = dueMonths.every(m => member.payments && member.payments[m]);
    if (lunas) lunasSampaiBulanIni += 1;
    // "Telat" = sudah pernah bayar di rentang yang dipantau, tapi belum lunas.
    // Sebelumnya ini dihitung dari `!payments[thisMonth]` sehingga rumah yang
    // belum bayar sama sekali ikut terhitung telat DAN nunggak (dobel), dan
    // angkanya tidak cocok dengan isi `telatList`.
    if (!lunas && paidCount > 0) terlambat += 1;
    if (paidCount === 0) belumAdaBayar += 1;
    if (member.payments && member.payments[thisMonth]) bayarBulanIni += 1;

    const entry = { houseNumber: member.houseNumber, name: member.name };
    if (lunas) {
      lunasList.push(entry);
    } else if (paidCount === 0) {
      nunggakList.push(entry);
    } else {
      const bulanTelat = dueMonths.filter(m => !(member.payments && member.payments[m])).length;
      telatList.push({ ...entry, bulanTelat });
    }
  });

  const pengeluaranHistory = block.setorHistory || [];
  let totalPengeluaran = 0;
  // Pagar warisan: entry bertanda type:'transfer' (setoran ke Ketua) tidak
  // dihitung. Sejak 2026-08-13 seluruh kas dipegang bendahara dan catatan
  // setoran ke Ketua sudah dihapus, jadi normalnya tidak ada lagi entry ini.
  pengeluaranHistory.forEach(item => {
    if (item.type !== 'transfer') totalPengeluaran += item.amount;
  });

  // Target tahunan dihitung dari tarif tiap rumah, bukan asumsi Rp 50.000 rata.
  // Sebagian rumah bertarif Rp 30.000/40.000 (lihat isException).
  let target = 0;
  members.forEach(m => {
    target += (m.isException ? m.amount : (m.amount || 50000)) * 12;
  });

  return {
    totalMembers: members.length,
    vacantCount,
    exemptCount,
    totalHouses: allMembers.length,
    totalPaid,
    target,
    trackingStartMonth: MONTHS[startIdx],
    bulanDipantau: dueMonths.length,
    totalPengeluaran,
    bendahara: totalPaid - totalPengeluaran,
    lunasSampaiBulanIni,
    terlambat,
    belumAdaBayar,
    bayarBulanIni,
    pengeluaranHistory,
    pemasukanPerBulan,
    lunasList,
    telatList,
    nunggakList,
  };
}

function formatCurrency(num) {
  return 'Rp ' + (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function buildActivityLog(data) {
  const logs = [];
  const blocks = data.blocks || {};
  const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  // Dari setorHistory (pengeluaran)
  Object.keys(blocks).forEach(key => {
    const bl = blocks[key].label || key;
    (blocks[key].setorHistory || []).forEach(item => {
      const d = new Date(item.date);
      logs.push({
        icon: '📤',
        text: `${bl}: ${item.keterangan || 'Pengeluaran'} - ${formatCurrency(item.amount)}`,
        date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        ts: d.getTime(),
      });
    });
  });

  // Pengeluaran tingkat kompleks
  (data.pengeluaran || []).forEach(item => {
    const d = new Date(item.date);
    logs.push({
      icon: '📤',
      text: `Kompleks: ${item.keterangan || 'Pengeluaran'} - ${formatCurrency(item.amount)}`,
      date: item.dateApprox
        ? d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      ts: d.getTime(),
    });
  });

  // Dari setoran perwakilan blok (setoranBlok)
  Object.keys(blocks).forEach(key => {
    const bl = blocks[key].label || key;
    (data.setoranBlok?.[key] || []).forEach(item => {
      const d = item.date ? new Date(item.date) : new Date();
      logs.push({
        icon: '💰',
        text: `${bl}: Setoran perwakilan ${formatCurrency(item.amount)}`,
        date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        ts: d.getTime(),
      });
    });
  });

  // Dari activityLog di root data.json
  (data.activityLog || []).forEach(item => {
    logs.push(item);
  });

  // Dari log pembayaran (jika ada di root data.json)
  (data.paymentLog || []).forEach(item => {
    logs.push(item);
  });

  // Urut descending by ts, ambil 10 teratas
  logs.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return logs.slice(0, 10);
}

// Uang masuk NYATA per bulan, dari top-level `pemasukanKas` di data.json.
//
// Kenapa tidak dari `payments`: `payments` cuma menandai bulan mana yang sudah
// lunas per rumah, bukan kapan uangnya diterima. Warga bisa bayar 3 bulan di
// muka atau menunggak dulu. Lebih parah, Blok B/F/G belum punya data per rumah
// sama sekali sehingga terbaca Rp 0 padahal uangnya sudah diterima. Kas bersih
// wajib dihitung dari angka ini, bukan dari `payments`.
// Uang masuk NYATA per bulan dari `pemasukanKas` di data.json.
// Sengaja TIDAK diturunkan dari `payments` per rumah: field itu cuma menandai
// bulan mana yang lunas, bukan kapan uangnya diterima, dan datanya belum
// lengkap untuk blok selain D.
//
// Dua bentuk entri bulan didukung:
//   { total: n }                  -> total sebulan, tanpa rincian blok
//   { perBlock: {...}, lainnyaTotal: n }  -> ada rincian per blok
function hitungPemasukanKas(data) {
  const src = data.pemasukanKas && data.pemasukanKas.months;
  if (!src) return null;

  const perBulan = MONTHS.map(() => 0);
  const perBlockTotal = {};
  let lainnyaTotal = 0;
  let total = 0;

  MONTHS.forEach((mo, mi) => {
    const entry = src[mo];
    if (!entry) return;
    let bulanTotal = 0;
    Object.entries(entry.perBlock || {}).forEach(([blok, nominal]) => {
      const n = Number(nominal || 0);
      bulanTotal += n;
      perBlockTotal[blok] = (perBlockTotal[blok] || 0) + n;
    });
    const lain = Number(entry.lainnyaTotal || 0);
    bulanTotal += lain;
    lainnyaTotal += lain;

    // Bentuk sederhana: hanya total sebulan, tidak ada rincian blok.
    if (entry.total != null && bulanTotal === 0) {
      bulanTotal = Number(entry.total || 0);
    }

    perBulan[mi] = bulanTotal;
    total += bulanTotal;
  });

  const rincian = MONTHS.map((mo, mi) => {
    const entry = src[mo];
    return {
      month: mo,
      total: perBulan[mi],
      perBlock: (entry && entry.perBlock) || {},
      lainnyaTotal: (entry && Number(entry.lainnyaTotal || 0)) || 0,
      lainnyaNote: (entry && entry.lainnyaNote) || null,
      catatan: (entry && entry.catatan) || null,
    };
  }).filter(r => r.total > 0);

  return { total, perBulan, perBlockTotal, lainnyaTotal, rincian };
}

// MODE PER RUMAH: uang masuk diturunkan langsung dari `payments`/`paidAmounts`
// tiap rumah, dikelompokkan per bulan bayar + per blok. Dipakai kalau
// `data.pemasukanMode === 'perRumah'`. Ini menggantikan rekap total manual
// (`pemasukanKas.months`) begitu semua setoran dicatat per rumah.
//
// Kas bersih tetap dijangkar ke `data.saldoAwal` (kas sebelum 2026), lalu:
//   Kas bersih = saldoAwal + total setor per rumah 2026 - pengeluaran 2026.
function hitungPemasukanPerRumah(data) {
  const blocks = data.blocks || {};
  const perBulan = MONTHS.map(() => 0);
  const perBlockTotal = {};
  const perBulanBlock = MONTHS.map(() => ({}));
  let total = 0;

  Object.keys(blocks).forEach(bk => {
    (blocks[bk].members || []).forEach(m => {
      if (m.vacant || m.exempt) return;
      const fb = m.isException ? m.amount : (m.amount || 50000);
      MONTHS.forEach((mo, mi) => {
        if (!(m.payments && m.payments[mo])) return;
        const ov = m.paidAmounts && m.paidAmounts[mo];
        const amt = (typeof ov === 'number' && ov > 0) ? ov : fb;
        perBulan[mi] += amt;
        total += amt;
        perBlockTotal[bk] = (perBlockTotal[bk] || 0) + amt;
        perBulanBlock[mi][bk] = (perBulanBlock[mi][bk] || 0) + amt;
      });
    });
  });

  const rincian = MONTHS.map((mo, mi) => ({
    month: mo,
    total: perBulan[mi],
    perBlock: perBulanBlock[mi],
    lainnyaTotal: 0,
    lainnyaNote: null,
    catatan: null,
  })).filter(r => r.total > 0);

  return { total, perBulan, perBlockTotal, lainnyaTotal: 0, rincian };
}

// JANGKAR KAS (`data.kasMulai`).
//
// Rekap Januari-Juli 2026 tidak bisa direkonsiliasi: ada uang iuran 2025 yang
// angkanya tidak diketahui, dan beberapa blok belum punya rincian per rumah.
// Menjumlah semuanya menyisakan Rp 276.000, padahal uang nyata yang diserahkan
// ke bendahara umum per Agustus jauh lebih besar.
//
// Jadi kas dijangkar ke uang FISIK per awal bulan tertentu. Bulan sebelum
// jangkar menjadi ARSIP: tetap ditampilkan, tapi tidak ikut menghitung saldo.
//
//   Kas bersih = kasMulai.total
//              + uang masuk bulan >= kasMulai.month
//              - pengeluaran bulan >= kasMulai.month
//
// Tanpa `kasMulai`, perilaku lama dipakai: saldoAwal + seluruh arus kas 2026.
function hitungKas(data, kas, pengeluaranSemua, grandPaidFallback) {
  const pemasukanSetahun = kas ? kas.total : grandPaidFallback;
  const keluarSetahun = pengeluaranSemua.reduce((s, p) => s + Number(p.amount || 0), 0);

  const anchor = data.kasMulai || null;
  if (!anchor) {
    const saldoAwal = Number(data.saldoAwal || 0);
    return {
      kasMulai: null,
      saldoAwal,
      pemasukanKasTotal: pemasukanSetahun,
      totalPengeluaran: keluarSetahun,
      pemasukanSejakJangkar: pemasukanSetahun,
      pengeluaranSejakJangkar: keluarSetahun,
      pemasukanArsip: 0,
      pengeluaranArsip: 0,
      bendahara: saldoAwal + pemasukanSetahun - keluarSetahun,
    };
  }

  const anchorIdx = Math.max(0, MONTHS.indexOf(anchor.month));

  let pemasukanArsip = 0;
  let pemasukanSejakJangkar = 0;
  (kas ? kas.perBulan : MONTHS.map(() => 0)).forEach((n, mi) => {
    if (mi < anchorIdx) pemasukanArsip += n;
    else pemasukanSejakJangkar += n;
  });

  let pengeluaranArsip = 0;
  let pengeluaranSejakJangkar = 0;
  pengeluaranSemua.forEach(p => {
    const mi = new Date(p.date).getMonth();
    const n = Number(p.amount || 0);
    if (mi < anchorIdx) pengeluaranArsip += n;
    else pengeluaranSejakJangkar += n;
  });

  const jangkar = Number(anchor.total || 0);
  return {
    kasMulai: {
      month: anchor.month,
      monthIdx: anchorIdx,
      date: anchor.date || null,
      total: jangkar,
      rincian: anchor.rincian || [],
      catatan: anchor.catatan || null,
    },
    saldoAwal: jangkar,
    // Angka setahun tetap dikirim supaya bagian arsip bisa ditampilkan.
    pemasukanKasTotal: pemasukanSetahun,
    totalPengeluaran: keluarSetahun,
    pemasukanSejakJangkar,
    pengeluaranSejakJangkar,
    pemasukanArsip,
    pengeluaranArsip,
    bendahara: jangkar + pemasukanSejakJangkar - pengeluaranSejakJangkar,
  };
}

// Pengeluaran tingkat kompleks (top-level `pengeluaran` di data.json).
// Terpisah dari `blocks.X.setorHistory` yang isinya catatan lama per blok.
function komplekPengeluaran(data) {
  return (data.pengeluaran || []).map(item => ({
    ...item,
    block: null,
    blockLabel: 'Kompleks',
  }));
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const data = loadData();
  const blocks = data.blocks || {};
  const { block } = req.query;

  if (block) {
    const b = blocks[block];
    if (!b) return res.status(404).json({ error: 'Block not found' });
    return res.status(200).json({ block, label: b.label || block, ...computeBlockStats(b) });
  }

  // Aggregate across all blocks
  // `trackingMulai` = bulan pertama pencatatan per rumah dianggap sah.
  // Sebelum bulan ini datanya cuma total per bulan, jadi status
  // Lunas/Telat/Nunggak per rumah tidak dihitung dari bulan-bulan itu.
  const trackingMulai = data.trackingMulai || MONTHS[0];
  const trackingStartIdx = Math.max(0, MONTHS.indexOf(trackingMulai));

  const perBlock = {};
  let grandPaid = 0;
  let grandTarget = 0;
  let grandPengeluaran = 0;
  let grandMembers = 0;
  let grandVacant = 0;
  let grandExempt = 0;
  let grandLunas = 0;
  let grandTerlambat = 0;
  let grandBelumAdaBayar = 0;
  const allPengeluaran = [];
  const grandPemasukanPerBulan = MONTHS.map(() => 0);
  const grandLunasList = [];
  const grandTelatList = [];
  const grandNunggakList = [];

  Object.keys(blocks).forEach(key => {
    const s = computeBlockStats(blocks[key], trackingStartIdx);
    perBlock[key] = { label: blocks[key].label || key, ...s };
    grandPaid += s.totalPaid;
    grandTarget += s.target || 0;
    grandPengeluaran += s.totalPengeluaran;
    grandMembers += s.totalMembers;
    grandVacant += s.vacantCount || 0;
    grandExempt += s.exemptCount || 0;
    grandLunas += s.lunasSampaiBulanIni;
    grandTerlambat += s.terlambat;
    grandBelumAdaBayar += s.belumAdaBayar;
    (s.pemasukanPerBulan || []).forEach((v, mi) => { grandPemasukanPerBulan[mi] += v; });
    const bl = blocks[key].label || key;
    (s.lunasList || []).forEach(e => grandLunasList.push({ ...e, block: key, blockLabel: bl }));
    (s.telatList || []).forEach(e => grandTelatList.push({ ...e, block: key, blockLabel: bl }));
    (s.nunggakList || []).forEach(e => grandNunggakList.push({ ...e, block: key, blockLabel: bl }));
    (s.pengeluaranHistory || []).forEach(item => {
      if (item.type === 'transfer') return; // transfer, bukan pengeluaran
      allPengeluaran.push({ ...item, block: key, blockLabel: bl });
    });
  });
  allPengeluaran.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Gabungkan pengeluaran tingkat kompleks.
  const komplek = komplekPengeluaran(data);
  komplek.forEach(item => { grandPengeluaran += Number(item.amount || 0); });
  const semuaPengeluaran = allPengeluaran.concat(komplek)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const activityLog = buildActivityLog(data);
  // Mode per rumah: uang masuk dari `payments` tiap rumah. Mode lama:
  // rekap total manual di `pemasukanKas.months`.
  const kas = data.pemasukanMode === 'perRumah'
    ? hitungPemasukanPerRumah(data)
    : hitungPemasukanKas(data);

  // Kas bersih dijangkar ke uang fisik per `data.kasMulai` kalau ada.
  // `grandPaid` (dari `payments`) hanya dipakai untuk statistik kepatuhan
  // bayar per rumah, bukan untuk saldo.
  const uang = hitungKas(data, kas, semuaPengeluaran, grandPaid);

  res.status(200).json({
    blocks: perBlock,
    pengeluaranHistory: semuaPengeluaran,
    pemasukanPerBulan: grandPemasukanPerBulan,
    pemasukanKas: kas,
    lunasList: grandLunasList,
    telatList: grandTelatList,
    nunggakList: grandNunggakList,
    setoranBlok: data.setoranBlok || {},
    activityLog,
    global: {
      totalMembers: grandMembers,
      vacantCount: grandVacant,
      exemptCount: grandExempt,
      totalPaid: grandPaid,
      target: grandTarget,
      totalPengeluaran: grandPengeluaran,
      // Uang masuk nyata (basis kas bersih) vs uang dari data per rumah.
      pemasukanKasTotal: uang.pemasukanKasTotal,
      totalPaidTercatat: grandPaid,
      // Jangkar kas: saldo dihitung dari uang fisik sejak bulan ini.
      kasMulai: uang.kasMulai,
      pemasukanSejakJangkar: uang.pemasukanSejakJangkar,
      pengeluaranSejakJangkar: uang.pengeluaranSejakJangkar,
      pemasukanArsip: uang.pemasukanArsip,
      pengeluaranArsip: uang.pengeluaranArsip,
      saldoAwal: uang.saldoAwal,
      saldoAwalCatatan: data.saldoAwalCatatan || null,
      saldoAwalPending: data.saldoAwalPending === true,
      trackingMulai,
      trackingMulaiIdx: trackingStartIdx,
      bendahara: uang.bendahara,
      lunasSampaiBulanIni: grandLunas,
      terlambat: grandTerlambat,
      belumAdaBayar: grandBelumAdaBayar,
    }
  });
}
