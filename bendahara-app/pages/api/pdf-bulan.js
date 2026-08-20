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

  const doc = new PDFDocument({ size: 'A4', margin: 45 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Laporan-Kas-${bulanNama}-2026.pdf"`);
  doc.pipe(res);

  // Colors
  const ink = '#0f172a', muted = '#64748b', border = '#cbd5e1', accent = '#0f766e';
  const green = '#16a34a', red = '#dc2626';

  function rupiah(v) { return `Rp ${Number(v||0).toLocaleString('id-ID')}`; }

  let y = 45; // start y position

  // Title
  doc.font('Helvetica-Bold').fontSize(22).fillColor(ink);
  doc.text('LAPORAN KAS BULANAN', 45, y, { align: 'center' });
  y += 28;
  doc.font('Helvetica-Bold').fontSize(16).fillColor(accent);
  doc.text(bulanNama.toUpperCase() + ' 2026', 45, y, { align: 'center' });
  y += 30;

  // ---- PEMASUKAN ----
  doc.font('Helvetica-Bold').fontSize(14).fillColor(ink);
  doc.text('PEMASUKAN', 45, y);
  y += 3;
  doc.strokeColor(border).lineWidth(0.6).moveTo(45, y).lineTo(555, y).stroke();
  y += 10;
  doc.font('Helvetica').fontSize(11).fillColor(ink);
  doc.text('Total Pemasukan', 45, y);
  doc.fillColor(green).text(rupiah(totalPemasukan), 555, y, { align: 'right' });
  y += 17;
  // Note
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(muted);
  const catatanText = catatanPemasukan || 'Sumber: Rekap bendahara — gabungan seluruh blok (A–G).';
  doc.text(catatanText, 45, y, { width: 510, lineBreak: true });
  y += 30;

  // ---- PENGELUARAN ----
  doc.font('Helvetica-Bold').fontSize(14).fillColor(ink);
  doc.text('PENGELUARAN', 45, y);
  y += 3;
  doc.strokeColor(border).lineWidth(0.6).moveTo(45, y).lineTo(555, y).stroke();
  y += 10;

  // Column headers
  doc.font('Helvetica-Bold').fontSize(10).fillColor(muted);
  doc.text('Tanggal', 45, y);
  doc.text('Keterangan', 165, y);
  doc.text('Jumlah', 480, y, { align: 'right' });
  y += 3;
  doc.strokeColor(border).lineWidth(0.6).moveTo(45, y).lineTo(555, y).stroke();
  y += 8;

  // Rows
  doc.font('Helvetica').fontSize(10).fillColor(ink);
  for (const item of pengeluaranBulan) {
    const tgl = new Date(item.date).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
    doc.text(tgl, 45, y);
    doc.text(item.keterangan || '-', 165, y, { width: 310 });
    doc.text(rupiah(item.amount), 480, y, { align: 'right' });
    y += 3;
    doc.strokeColor(border).lineWidth(0.3).moveTo(45, y).lineTo(555, y).stroke();
    y += 14;
  }

  if (pengeluaranBulan.length > 0) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor(red);
    doc.text('Total Pengeluaran', 45, y);
    doc.text(rupiah(totalPengeluaran), 555, y, { align: 'right' });
    y += 20;
  } else {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(muted);
    doc.text('Tidak ada pengeluaran tercatat bulan ini.', 45, y);
    y += 20;
  }

  // ---- KAS BERSIH (highlight card) ----
  y += 5;
  doc.rect(45, y, 510, 40).fill(accent);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('white');
  doc.text('KAS BERSIH', 60, y + 12);
  doc.text(rupiah(kasBersih), 545, y + 12, { align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('white');
  doc.text(kasBersih >= 0 ? 'Surplus kas bulan ini' : 'Defisit kas bulan ini', 60, y + 26);
  y += 55;

  // Footer
  doc.fontSize(8).fillColor(muted);
  doc.text('Laporan Kas IHM Rukun Manggallo', 45, 780);
  doc.text(`Dicetak ${new Date().toLocaleDateString('id-ID')}`, 45, 790);
  doc.text('Halaman 1', 555, 790, { align: 'right' });

  doc.end();
}
