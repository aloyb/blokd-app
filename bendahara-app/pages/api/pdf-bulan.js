import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export const config = {
  api: {
    responseLimit: false,
  },
};

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const MONTH_LABELS = ['Januari','Februari','Maret','April','Mei','Juni',
                      'Juli','Agustus','September','Oktober','November','Desember'];

// Total pengeluaran untuk 1 bulan (index 0-11)
function pengeluaranBulanTotal(data, monthIdx) {
  const mm = (monthIdx + 1).toString().padStart(2, '0');
  return (data.pengeluaran || [])
    .filter(i => i.date && i.date.startsWith(`2026-${mm}-`))
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);
}

// Total pemasukan untuk 1 bulan (index 0-11): rekap manual kalau ada, kalau tidak dari member.
function pemasukanBulanTotal(data, monthIdx) {
  const monthKey = MONTHS[monthIdx];
  const manual = Number(data.pemasukanKas?.months?.[monthKey]?.total);
  if (manual > 0) return manual;
  return pemasukanFromMember(data, monthKey);
}

// Pemasukan riil untuk 1 bulan.
// Prioritas: rekap manual `pemasukanKas.months[bulan]` kalau ada (Jan-Ags pakai rekap resmi bendahara).
// Kalau belum ada entri (mis. September dst), AUTO hitung dari pembayaran per rumah (sum amount tiap member
// yang `payments[monthKey]` true) — jadi tiap deploy/update data, PDF otomatis ikut berubah.
function pemasukanFromMember(data, monthKey) {
  let total = 0;
  for (const bk of Object.keys(data.blocks || {})) {
    const blk = data.blocks[bk];
    for (const m of blk.members || []) {
      if (m.payments && m.payments[monthKey]) {
        total += Number(m.amount) || Number(blk.iuranDefault) || 50000;
      }
    }
  }
  return total;
}

// Pemasukan per-blok utk bulan ini: rekap manual kalau ada, kalau tidak hitung dari member.
function pemasukanPerBlokBulan(data, monthKey) {
  const manualBlock = data.pemasukanKas?.months?.[monthKey]?.perBlock;
  if (manualBlock && Object.keys(manualBlock).length > 0) {
    return Object.entries(manualBlock)
      .filter(([, amt]) => Number(amt) > 0)
      .map(([key, amt]) => ({ label: data.blocks?.[key]?.label || `Blok ${key}`, amount: Number(amt) }));
  }
  const totals = {};
  for (const bk of Object.keys(data.blocks || {})) {
    const blk = data.blocks[bk];
    let sum = 0;
    for (const m of blk.members || []) {
      if (m.payments && m.payments[monthKey]) {
        sum += Number(m.amount) || Number(blk.iuranDefault) || 50000;
      }
    }
    if (sum > 0) totals[bk] = sum;
  }
  return Object.entries(totals).map(([key, amt]) => ({ label: data.blocks?.[key]?.label || `Blok ${key}`, amount: amt }));
}

export default function handler(req, res) {
  const dataPath = path.join(process.cwd(), 'data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const monthKey = String(req.query.month || '').toLowerCase();
  const monthNum = MONTHS.indexOf(monthKey);
  if (monthNum === -1) { res.status(400).json({ error: 'Invalid month' }); return; }

  const bulanNama = MONTH_LABELS[monthNum];
  const bulanStr = (monthNum + 1).toString().padStart(2, '0');

  // Bulan tanpa entri pemasukan tetap valid (mis. cuma ada pengeluaran) -> total 0.
  const pemasukanData = data.pemasukanKas?.months?.[monthKey] || { total: 0, catatan: '' };

  const pengeluaranBulan = (data.pengeluaran || []).filter(item =>
    item.date && item.date.startsWith(`2026-${bulanStr}-`)
  );
  const totalPemasukan = pemasukanData && Number(pemasukanData.total) > 0
    ? Number(pemasukanData.total)
    : pemasukanFromMember(data, monthKey);
  const totalPengeluaran = pengeluaranBulan.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const kasBersihBulan = totalPemasukan - totalPengeluaran;

  // ---- Pemasukan per-blok ----
  // Pakai perBlock dari rekap manual kalau ada; kalau tidak, hitung dari data pembayaran per rumah
  // (auto ikut deploy/update).
  const pemasukanPerBlok = pemasukanPerBlokBulan(data, monthKey);

  // ---- Total Saldo (uang riil yang dipegang bendahara) di akhir bulan ini ----
  // Jangkar (kasMulai) = saldo fisik per awal bulan tertentu.
  const anchor = data.kasMulai || null;
  const anchorIdx = anchor ? MONTHS.indexOf(anchor.month) : -1;
  const anchorTotal = anchor ? Number(anchor.total || 0) : Number(data.saldoAwal || 0);

  let totalSaldo = null; // saldo akhir bulan ini
  if (anchorIdx !== -1 && monthNum >= anchorIdx) {
    // saldo = jangkar + arus kas dari bulan jangkar s/d bulan ini
    let saldo = anchorTotal;
    for (let i = anchorIdx; i <= monthNum; i++) {
      saldo += pemasukanBulanTotal(data, MONTHS[i]);
      saldo -= pengeluaranBulanTotal(data, i);
    }
    totalSaldo = saldo;
  }

  // Page geometry
  const PAGE_W = 595.28;
  const M = 45;
  const RIGHT = PAGE_W - M;
  const CONTENT_W = RIGHT - M;

  const doc = new PDFDocument({ size: 'A4', margin: M });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Laporan-Kas-${bulanNama}-2026.pdf"`);
  doc.pipe(res);

  // Colors
  const ink = '#0f172a', muted = '#64748b', border = '#cbd5e1', accent = '#0f766e';
  const green = '#16a34a', red = '#dc2626';

  function rupiah(v) { return `Rp ${Number(v || 0).toLocaleString('id-ID')}`; }
  function textRight(str, yy, color, font, size) {
    doc.font(font).fontSize(size).fillColor(color);
    doc.text(str, M, yy, { width: CONTENT_W, align: 'right' });
  }
  function line(yy) {
    doc.strokeColor(border).lineWidth(0.6).moveTo(M, yy).lineTo(RIGHT, yy).stroke();
  }

  let y = M;

  // Title
  doc.font('Helvetica-Bold').fontSize(18).fillColor(ink);
  doc.text('LAPORAN KAS BULANAN', M, y, { width: CONTENT_W, align: 'center' });
  y += 22;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(accent);
  doc.text(bulanNama.toUpperCase() + ' 2026', M, y, { width: CONTENT_W, align: 'center' });
  y += 24;

  // ---- PEMASUKAN ----
  doc.font('Helvetica-Bold').fontSize(12).fillColor(ink);
  doc.text('PEMASUKAN', M, y);
  y += 15;
  line(y);
  y += 7;

  if (pemasukanPerBlok.length > 0) {
    for (const b of pemasukanPerBlok) {
      doc.font('Helvetica').fontSize(10.5).fillColor(ink);
      doc.text(`Pemasukan ${b.label}`, M, y);
      textRight(rupiah(b.amount), y, green, 'Helvetica', 10.5);
      y += 15;
    }
  } else if (totalPemasukan > 0) {
    doc.font('Helvetica').fontSize(10.5).fillColor(ink);
    doc.text('Pemasukan (gabungan seluruh blok)', M, y);
    textRight(rupiah(totalPemasukan), y, green, 'Helvetica', 10.5);
    y += 15;
  } else {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(muted);
    doc.text('Belum ada pemasukan bulan ini.', M, y);
    y += 15;
  }

  // Total Pemasukan
  y += 2;
  line(y);
  y += 7;
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(ink);
  doc.text('Total Pemasukan', M, y);
  textRight(rupiah(totalPemasukan), y, green, 'Helvetica-Bold', 11.5);
  y += 20;

  // ---- PENGELUARAN ----
  doc.font('Helvetica-Bold').fontSize(12).fillColor(ink);
  doc.text('PENGELUARAN', M, y);
  y += 15;
  line(y);
  y += 7;

  const colTgl = M;
  const colKet = M + 95;
  const amountBoxX = M + 340;
  const amountBoxW = RIGHT - amountBoxX;
  const ketW = amountBoxX - colKet - 12;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(muted);
  doc.text('TANGGAL', colTgl, y);
  doc.text('KETERANGAN', colKet, y);
  doc.text('JUMLAH', amountBoxX, y, { width: amountBoxW, align: 'right' });
  y += 13;
  line(y);
  y += 6;

  for (const item of pengeluaranBulan) {
    const tgl = new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    doc.font('Helvetica').fontSize(10).fillColor(ink);
    doc.text(tgl, colTgl, y, { width: 90 });
    doc.text(item.keterangan || '-', colKet, y, { width: ketW });
    doc.font('Helvetica').fontSize(10).fillColor(ink);
    doc.text(rupiah(item.amount), amountBoxX, y, { width: amountBoxW, align: 'right' });
    const rowH = Math.max(14, doc.heightOfString(item.keterangan || '-', { width: ketW }) + 3);
    y += rowH;
    doc.strokeColor(border).lineWidth(0.3).moveTo(M, y - 2).lineTo(RIGHT, y - 2).stroke();
    y += 3;
  }

  if (pengeluaranBulan.length > 0) {
    y += 3;
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(ink);
    doc.text('Total Pengeluaran', M, y);
    textRight(rupiah(totalPengeluaran), y, red, 'Helvetica-Bold', 11.5);
    y += 20;
  } else {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(muted);
    doc.text('Tidak ada pengeluaran tercatat bulan ini.', M, y);
    y += 20;
  }

  // ---- KAS BERSIH BULAN INI (net arus kas) ----
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(ink);
  doc.text('Kas Bersih Bulan Ini (masuk - keluar)', M, y);
  textRight(rupiah(kasBersihBulan), y, kasBersihBulan >= 0 ? green : red, 'Helvetica-Bold', 10.5);
  y += 18;

  // ---- TOTAL SALDO (uang riil yang dipegang) ----
  if (totalSaldo !== null) {
    const cardH = 46;
    doc.rect(M, y, CONTENT_W, cardH).fill(accent);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff');
    doc.text('TOTAL SALDO', M + 16, y + 9);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff');
    doc.text(rupiah(totalSaldo), M, y + 8, { width: CONTENT_W - 16, align: 'right' });
    doc.font('Helvetica').fontSize(8.5).fillColor('#d1fae5');
    doc.text(`Saldo yang dipegang bendahara per akhir ${bulanNama} 2026`, M + 16, y + 28);
    y += cardH + 12;
  }

  // Footer — JANGAN pakai y di dekat batas bawah (<=796.89) tanpa lineBreak:false,
  // kalau tidak pdfkit otomatis menambah halaman kosong.
  doc.font('Helvetica').fontSize(8).fillColor(muted);
  const footerY = y < 770 ? 782 : y + 6;
  doc.text('Laporan Kas Perumahan IAMR', M, footerY, { lineBreak: false });
  doc.text(`Dicetak ${new Date().toLocaleDateString('id-ID')}`, M, footerY, { width: CONTENT_W, align: 'right', lineBreak: false });

  doc.end();
}
