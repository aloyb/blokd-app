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
  const ink='#0f172a', muted='#64748b', border='#cbd5e1', accent='#0f766e', green='#16a34a', red='#dc2626', gold='#b45309';
  function rupiah(v) { return `Rp ${Number(v||0).toLocaleString('id-ID')}`; }
  function subH1(y, label) { doc.font('Helvetica-Bold').fontSize(14).fillColor(ink); doc.text(label.toUpperCase(), 45, y, { lineBreak: false }); }
  function hr(y) { doc.strokeColor(border).lineWidth(0.6).moveTo(45, y).lineTo(555, y).stroke(); }
  function rowY(y, left, right, color=ink, bold=false) { doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(11).fillColor(color); doc.text(left, 45, y); doc.text(right, 555, y, { align: 'right' }); return y + 17; }
  function note(text) { doc.font('Helvetica-Oblique').fontSize(9).fillColor(muted); doc.text(text, 45, doc.y, { lineBreak: true, width: 510 }); }
  function footer() { const y = 780; doc.fontSize(8).fillColor(muted).text('Laporan Kas IHM Rukun Manggallo', 45, y); doc.text(`Dicetak ${new Date().toLocaleDateString('id-ID')}`, 45, y+10); doc.text('Halaman 1', 555, y+10, { align: 'right' }); }

  // Title
  doc.font('Helvetica-Bold').fontSize(22).fillColor(ink).text('LAPORAN KAS BULANAN', { align: 'center' });
  doc.font('Helvetica-Bold').fontSize(16).fillColor(accent).text(bulanNama.toUpperCase() + ' 2026', { align: 'center' });
  doc.moveDown(0.5);

  // ---- PEMASUKAN ----
  subH1(doc.y, 'Pemasukan');
  hr(doc.y + 3);
  let y = doc.y + 10;
  y = rowY(y, 'Total Pemasukan', rupiah(totalPemasukan), green, true);
  if (catatanPemasukan) note(catatanPemasukan);
  else note('Sumber: Rekap bendahara — gabungan seluruh blok (A–G).');

  // ---- PENGELUARAN ----
  subH1(y + 6, 'Pengeluaran');
  hr(y + 9);
  y = y + 14;
  const colTgl = 45, colKet = 165, colJmlh = 480;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(muted);
  doc.text('Tanggal', colTgl, y); doc.text('Keterangan', colKet, y); doc.text('Jumlah', colJmlh, y, { align: 'right' });
  hr(y + 3);
  y += 8;
  for (const item of pengeluaranBulan) {
    const tgl = new Date(item.date).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
    doc.font('Helvetica').fontSize(10).fillColor(ink);
    doc.text(tgl, colTgl, y); doc.text(item.keterangan || '-', colKet, y); doc.text(rupiah(item.amount), colJmlh, y, { align: 'right' });
    hr(y + 16);
    y += 17;
  }
  if (pengeluaranBulan.length > 0) {
    y = rowY(y, 'Total Pengeluaran', rupiah(totalPengeluaran), red, true);
  } else {
    note('Tidak ada pengeluaran tercatat bulan ini.');
  }

  // ---- KAS BERSIH (big card)
  const cardY = y + 10;
  doc.roundRect(45, cardY, 510, 42, 6).fill(accent);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('white');
  doc.text('KAS BERSIH', 60, cardY + 8);
  doc.text(rupiah(kasBersih), 545, cardY + 8, { align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('white');
  doc.text(kasBersih >= 0 ? 'Surplus kas bulan ini' : 'Defisit kas bulan ini', 60, cardY + 26);
  const endY = cardY + 54;

  // Footer
  footer();
  doc.end();
}