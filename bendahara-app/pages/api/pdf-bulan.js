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

// Pemasukan riil untuk 1 bulan
function pemasukanBulanTotal(data, monthKey) {
  return Number(data.pemasukanKas?.months?.[monthKey]?.total || 0);
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
  const totalPemasukan = Number(pemasukanData.total || 0);
  const catatanPemasukan = pemasukanData.catatan || '';
  const totalPengeluaran = pengeluaranBulan.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const kasBersihBulan = totalPemasukan - totalPengeluaran;

  // ---- Pemasukan per-blok (parse dari catatan) ----
  // Contoh catatan: "D42 (Wahidi) bayar iuran 1 bulan" -> Blok D, jumlah = amount member * bulan
  const blockTotals = {};
  const re = /([A-G])(\d+)\s*\(([^)]+)\)\s*bayar\s*iuran\s*(\d+)\s*bulan/gi;
  let m;
  while ((m = re.exec(catatanPemasukan)) !== null) {
    const blockKey = m[1].toUpperCase();
    const houseNum = m[1].toUpperCase() + m[2];
    const bulan = Number(m[4]) || 1;
    const block = data.blocks?.[blockKey];
    const member = block?.members?.find(x => x.houseNumber === houseNum);
    const amount = (member ? Number(member.amount) || 0 : 0) * bulan;
    blockTotals[blockKey] = (blockTotals[blockKey] || 0) + amount;
  }
  const pemasukanPerBlok = Object.entries(blockTotals)
    .filter(([, amt]) => amt > 0)
    .map(([key, amt]) => ({ label: data.blocks?.[key]?.label || `Blok ${key}`, amount: amt }));

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
  doc.font('Helvetica-Bold').fontSize(22).fillColor(ink);
  doc.text('LAPORAN KAS BULANAN', M, y, { width: CONTENT_W, align: 'center' });
  y += 28;
  doc.font('Helvetica-Bold').fontSize(15).fillColor(accent);
  doc.text(bulanNama.toUpperCase() + ' 2026', M, y, { width: CONTENT_W, align: 'center' });
  y += 34;

  // ---- PEMASUKAN ----
  doc.font('Helvetica-Bold').fontSize(13).fillColor(ink);
  doc.text('PEMASUKAN', M, y);
  y += 18;
  line(y);
  y += 9;

  if (pemasukanPerBlok.length > 0) {
    for (const b of pemasukanPerBlok) {
      doc.font('Helvetica').fontSize(11).fillColor(ink);
      doc.text(`Pemasukan ${b.label}`, M, y);
      textRight(rupiah(b.amount), y, green, 'Helvetica', 11);
      y += 17;
    }
  } else if (totalPemasukan > 0) {
    doc.font('Helvetica').fontSize(11).fillColor(ink);
    doc.text('Pemasukan (gabungan seluruh blok)', M, y);
    textRight(rupiah(totalPemasukan), y, green, 'Helvetica', 11);
    y += 17;
  } else {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(muted);
    doc.text('Belum ada pemasukan bulan ini.', M, y);
    y += 17;
  }

  // Total Pemasukan
  y += 3;
  line(y);
  y += 8;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(ink);
  doc.text('Total Pemasukan', M, y);
  textRight(rupiah(totalPemasukan), y, green, 'Helvetica-Bold', 12);
  y += 26;

  // ---- PENGELUARAN ----
  doc.font('Helvetica-Bold').fontSize(13).fillColor(ink);
  doc.text('PENGELUARAN', M, y);
  y += 18;
  line(y);
  y += 9;

  const colTgl = M;
  const colKet = M + 95;
  const amountBoxX = M + 340;
  const amountBoxW = RIGHT - amountBoxX;
  const ketW = amountBoxX - colKet - 12;

  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(muted);
  doc.text('TANGGAL', colTgl, y);
  doc.text('KETERANGAN', colKet, y);
  doc.text('JUMLAH', amountBoxX, y, { width: amountBoxW, align: 'right' });
  y += 15;
  line(y);
  y += 8;

  for (const item of pengeluaranBulan) {
    const tgl = new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    doc.font('Helvetica').fontSize(10).fillColor(ink);
    doc.text(tgl, colTgl, y, { width: 90 });
    doc.text(item.keterangan || '-', colKet, y, { width: ketW });
    doc.font('Helvetica').fontSize(10).fillColor(ink);
    doc.text(rupiah(item.amount), amountBoxX, y, { width: amountBoxW, align: 'right' });
    const rowH = Math.max(16, doc.heightOfString(item.keterangan || '-', { width: ketW }) + 4);
    y += rowH;
    doc.strokeColor(border).lineWidth(0.3).moveTo(M, y - 2).lineTo(RIGHT, y - 2).stroke();
    y += 4;
  }

  if (pengeluaranBulan.length > 0) {
    y += 4;
    doc.font('Helvetica-Bold').fontSize(12).fillColor(ink);
    doc.text('Total Pengeluaran', M, y);
    textRight(rupiah(totalPengeluaran), y, red, 'Helvetica-Bold', 12);
    y += 24;
  } else {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(muted);
    doc.text('Tidak ada pengeluaran tercatat bulan ini.', M, y);
    y += 24;
  }

  // ---- KAS BERSIH BULAN INI (net arus kas) ----
  doc.font('Helvetica-Bold').fontSize(11).fillColor(ink);
  doc.text('Kas Bersih Bulan Ini (masuk - keluar)', M, y);
  textRight(rupiah(kasBersihBulan), y, kasBersihBulan >= 0 ? green : red, 'Helvetica-Bold', 11);
  y += 22;

  // ---- TOTAL SALDO (uang riil yang dipegang) ----
  if (totalSaldo !== null) {
    const cardH = 52;
    doc.rect(M, y, CONTENT_W, cardH).fill(accent);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff');
    doc.text('TOTAL SALDO', M + 16, y + 11);
    doc.font('Helvetica-Bold').fontSize(17).fillColor('#ffffff');
    doc.text(rupiah(totalSaldo), M, y + 10, { width: CONTENT_W - 16, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor('#d1fae5');
    doc.text(`Saldo yang dipegang bendahara per akhir ${bulanNama} 2026`, M + 16, y + 32);
    y += cardH + 20;
  }

  // Footer
  doc.font('Helvetica').fontSize(8).fillColor(muted);
  doc.text('Laporan Kas IHM Rukun Manggallo', M, 792);
  doc.text(`Dicetak ${new Date().toLocaleDateString('id-ID')}`, M, 792, { width: CONTENT_W, align: 'right' });

  doc.end();
}
