import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default function handler(req, res) {
  const dataPath = path.join(process.cwd(), 'data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const monthKey = String(req.query.month || '').toLowerCase();
  const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
                     jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const monthNum = monthMap[monthKey];
  if (monthNum === undefined) { res.status(400).json({ error: 'Invalid month' }); return; }

  const bulanNama = ['Januari','Februari','Maret','April','Mei','Juni',
                     'Juli','Agustus','September','Oktober','November','Desember'][monthNum];
  const bulanStr = (monthNum+1).toString().padStart(2,'0');

  const pemasukanData = data.pemasukanKas?.months?.[monthKey];
  if (!pemasukanData) { res.status(404).json({ error: 'Pemasukan data not found' }); return; }

  const pengeluaranBulan = (data.pengeluaran || []).filter(item =>
    item.date && item.date.startsWith(`2026-${bulanStr}-`)
  );
  const totalPemasukan = Number(pemasukanData.total || 0);
  const catatanPemasukan = pemasukanData.catatan || '';
  const totalPengeluaran = pengeluaranBulan.reduce((s,i) => s + (Number(i.amount)||0), 0);
  const kasBersih = totalPemasukan - totalPengeluaran;

  // Page geometry
  const PAGE_W = 595.28;
  const M = 45;               // margin
  const RIGHT = PAGE_W - M;   // 550.28 (right content edge)
  const CONTENT_W = RIGHT - M;

  const doc = new PDFDocument({ size: 'A4', margin: M });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Laporan-Kas-${bulanNama}-2026.pdf"`);
  doc.pipe(res);

  // Colors
  const ink = '#0f172a', muted = '#64748b', border = '#cbd5e1', accent = '#0f766e';
  const green = '#16a34a', red = '#dc2626';

  function rupiah(v) { return `Rp ${Number(v||0).toLocaleString('id-ID')}`; }
  // Right-aligned text bounded to content width so it never overflows.
  function textRight(str, y, color, font, size) {
    doc.font(font).fontSize(size).fillColor(color);
    doc.text(str, M, y, { width: CONTENT_W, align: 'right' });
  }
  function line(y) {
    doc.strokeColor(border).lineWidth(0.6).moveTo(M, y).lineTo(RIGHT, y).stroke();
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
  doc.font('Helvetica').fontSize(11).fillColor(ink);
  doc.text('Total Pemasukan', M, y);
  textRight(rupiah(totalPemasukan), y, green, 'Helvetica-Bold', 11);
  y += 18;
  // Note (per-blok, bukan per-rumah)
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(muted);
  const catatanText = catatanPemasukan || 'Sumber: Rekap bendahara \u2014 gabungan seluruh blok (A\u2013G).';
  doc.text(catatanText, M, y, { width: CONTENT_W, lineBreak: true });
  y = doc.y + 20;

  // ---- PENGELUARAN ----
  doc.font('Helvetica-Bold').fontSize(13).fillColor(ink);
  doc.text('PENGELUARAN', M, y);
  y += 18;
  line(y);
  y += 9;

  // Column layout
  const colTgl = M;              // date
  const colKet = M + 95;         // description
  const amountBoxX = M + 340;    // right-aligned amount block start
  const amountBoxW = RIGHT - amountBoxX;
  const ketW = amountBoxX - colKet - 12;

  // Header row
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(muted);
  doc.text('TANGGAL', colTgl, y);
  doc.text('KETERANGAN', colKet, y);
  doc.text('JUMLAH', amountBoxX, y, { width: amountBoxW, align: 'right' });
  y += 15;
  line(y);
  y += 8;

  // Data rows
  for (const item of pengeluaranBulan) {
    const tgl = new Date(item.date).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
    doc.font('Helvetica').fontSize(10).fillColor(ink);
    doc.text(tgl, colTgl, y, { width: 90 });
    doc.text(item.keterangan || '-', colKet, y, { width: ketW });
    doc.font('Helvetica').fontSize(10).fillColor(ink);
    doc.text(rupiah(item.amount), amountBoxX, y, { width: amountBoxW, align: 'right' });
    y += 16;
    doc.strokeColor(border).lineWidth(0.3).moveTo(M, y - 2).lineTo(RIGHT, y - 2).stroke();
    y += 4;
  }

  if (pengeluaranBulan.length > 0) {
    y += 4;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(ink);
    doc.text('Total Pengeluaran', M, y);
    textRight(rupiah(totalPengeluaran), y, red, 'Helvetica-Bold', 11);
    y += 20;
  } else {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(muted);
    doc.text('Tidak ada pengeluaran tercatat bulan ini.', M, y);
    y += 20;
  }

  // ---- KAS BERSIH (highlight card) ----
  y += 8;
  const cardH = 46;
  doc.rect(M, y, CONTENT_W, cardH).fill(accent);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff');
  doc.text('KAS BERSIH', M + 16, y + 10);
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#ffffff');
  doc.text(rupiah(kasBersih), M, y + 9, { width: CONTENT_W - 16, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#d1fae5');
  doc.text(kasBersih >= 0 ? 'Surplus kas bulan ini' : 'Defisit kas bulan ini', M + 16, y + 28);
  y += cardH + 20;

  // Footer
  doc.font('Helvetica').fontSize(8).fillColor(muted);
  doc.text('Laporan Kas IHM Rukun Manggallo', M, 792);
  doc.text(`Dicetak ${new Date().toLocaleDateString('id-ID')}`, M, 792, { width: CONTENT_W, align: 'right' });

  doc.end();
}
