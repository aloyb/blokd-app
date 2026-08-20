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
  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const monthNum = monthMap[monthKey];
  if (monthNum === undefined) {
    res.status(400).json({ error: 'Invalid month' });
    return;
  }

  const bulanNama = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'][monthNum];
  const bulanStr = (monthNum+1).toString().padStart(2,'0');

  const pemasukanData = data.pemasukanKas?.months?.[monthKey];
  if (!pemasukanData) {
    res.status(404).json({ error: 'Pemasukan data not found for month' });
    return;
  }

  // Filter pengeluaran for this month (date starts with 2026-MM-)
  const pengeluaranBulan = (data.pengeluaran || []).filter(item =>
    item.date && item.date.startsWith(`2026-${bulanStr}-`)
  );

  const totalPemasukan = pemasukanData.total || 0;
  const catatanPemasukan = pemasukanData.catatan || '';
  const totalPengeluaran = pengeluaranBulan.reduce((sum, item) => sum + (item.amount || 0), 0);
  const kasBersih = totalPemasukan - totalPengeluaran;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Laporan-Kas-${bulanNama}-2026.pdf"`);
  doc.pipe(res);

  const { ink, muted, line, soft, brand, paid, unpaid, white } = {
    ink: '#1F2937', muted: '#6B7280', line: '#D8E0EA', soft: '#EAF7F0',
    brand: '#128F55', paid: '#15803D', unpaid: '#B42318', white: '#FFFFFF',
  };

  function rupiah(v) { return `Rp ${Number(v||0).toLocaleString('id-ID')}`; }

  // Header
  doc.fontSize(20).fillColor(ink).text(`Laporan Kas Bulan ${bulanNama} 2026`, { align: 'center' });
  doc.moveDown(0.5);

  // Summary table
  const tableTop = doc.y + 20;
  doc.fontSize(12).fillColor(ink).text('Keterangan', 50, tableTop);
  doc.fontSize(12).fillColor(ink).text('Jumlah', 400, tableTop, { align: 'right' });
  doc.moveDown(0.3);
  doc.strokeColor(line).lineWidth(0.5).moveTo(50, doc.y+2).lineTo(550, doc.y+2).stroke();
  doc.moveDown(0.2);

  const row = (label, value, color) => {
    doc.fontSize(11).fillColor(ink).text(label, 50, doc.y);
    doc.fontSize(11).fillColor(color).text(value, 400, doc.y, { align: 'right' });
    doc.moveDown(0.4);
  };

  row('Total Pemasukan', rupiah(totalPemasukan), brand);
  if (catatanPemasukan) {
    doc.fontSize(10).fillColor(muted).text(`Catatan: ${catatanPemasukan}`, 50, doc.y);
    doc.moveDown(0.3);
  }
  row('Total Pengeluaran', rupiah(totalPengeluaran), unpaid);
  row('Kas Bersih', rupiah(kasBersih), kasBersih >= 0 ? paid : unpaid);
  doc.moveDown(0.5);

  // Pengeluaran detail
  if (pengeluaranBulan.length > 0) {
    doc.fontSize(14).fillColor(ink).text('Rincian Pengeluaran');
    doc.moveDown(0.2);
    doc.strokeColor(line).lineWidth(0.5).moveTo(50, doc.y+2).lineTo(550, doc.y+2).stroke();
    doc.moveDown(0.2);

    // Table header
    doc.fontSize(11).fillColor(ink).text('Tanggal', 50, doc.y);
    doc.fontSize(11).fillColor(ink).text('Keterangan', 150, doc.y);
    doc.fontSize(11).fillColor(ink).text('Jumlah', 450, doc.y, { align: 'right' });
    doc.moveDown(0.3);
    doc.strokeColor(line).lineWidth(0.5).moveTo(50, doc.y+2).lineTo(550, doc.y+2).stroke();
    doc.moveDown(0.2);

    for (const item of pengeluaranBulan) {
      const tgl = new Date(item.date).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
      doc.fontSize(10).fillColor(ink).text(tgl, 50, doc.y);
      doc.fontSize(10).fillColor(ink).text((item.keterangan||'-').slice(0,40), 150, doc.y, { width: 250 });
      doc.fontSize(10).fillColor(unpaid).text(rupiah(item.amount), 450, doc.y, { align: 'right' });
      doc.moveDown(0.3);
    }
    doc.moveDown(0.5);
  }

  // Footer
  doc.fontSize(9).fillColor(muted).text(`Dicetak tanggal ${new Date().toLocaleDateString('id-ID')}`, 50, doc.y, { align: 'left' });
  doc.fontSize(9).fillColor(muted).text('Halaman 1', 500, doc.y, { align: 'right' });

  doc.end();
}