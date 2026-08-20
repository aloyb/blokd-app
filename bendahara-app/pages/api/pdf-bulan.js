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
                     jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, nov: 11, dec: 11 };
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

  // Hitung pemasukan per-blok dari catatan
  const blockTotals = {};
  const catatanRegex = /([A-G])(\d+)\s*\(([^)]+)\)\s*bayar\s*iuran\s+(\d+)\s+bulan/g;
  let match;
  while ((match = catatanRegex.exec(catatanPemasukan)) !== null) {
    const blockKey = match[1].toLowerCase();
    const house = match[3];
    const amount = Number(match[4]);
    // Cari member yang cocok di block
    const block = data.blocks?.[blockKey.toUpperCase()];
    let memberAmount = 0;
    if (block) {
      const member = block.members?.find(m => m.houseNumber === match[3] && m.name === match[3]);
      if (member) memberAmount = member.amount || 0;
    }
    blockTotals[blockKey] = (blockTotals[blockKey] || 0) + amount;
  }

  // Tampilkan per-blok
  const pemasukanPerBlok = [];
  for (const [key, amount] of Object.entries(blockTotals)) {
    const block = data.blocks?.[blockKey.toUpperCase()];
    const label = block?.label || blockKey.toUpperCase();
    if (amount > 0) {
      pemasukanPerBlok.push({ label, amount });
      totalPemasukan = Math.max(totalPemasukan, amount); // Update total
    }
  }

  // Jika tidak ada data per-blok, gunakan total pemasukan langsung
  if (pemasukanPerBlok.length === 0 && totalPemasukan > 0) {
    pemasukanPerBlok.push({ label: 'Semua Blok', amount: totalPemasukan });
  }

  // ---- PEMASUKAN ----
  doc.font('Helvetica-Bold').fontSize(13).fillColor(ink);
  doc.text('PEMASUKAN', M, y);
  y += 18;
  line(y);
  y += 9;

  // Tampilkan per-blok
  for (const block of pemasukanPerBlok) {
    doc.font('Helvetica').fontSize(11).fillColor(ink);
    doc.text(`Pemasukan ${block.label}`, M, y);
    textRight(rupiah(block.amount), y, green, 'Helvetica', 11);
    y += 17;
  }

  // Total Pemasukan
  y += 2;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(ink);
  doc.text('Total Pemasukan', M, y);
  textRight(rupiah(totalPemasukan), y, green, 'Helvetica-Bold', 12);
  y += 20;

  // Note
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(muted);
  const catatanText = catatanPemasukan || 'Sumber: Rekap bendahara — gabungan seluruh blok (A–G).';
  doc.text(catatanText, M, y, { width: CONTENT_W, lineBreak: true });
  y = doc.y + 20;

  // ---- PENGELUARAN ----
  doc.font('Helvetica-Bold').fontSize(13).fillColor(ink);
  doc.text('PENGELUARAN', M, y);
  y += 18;
  line(y);
  y += 9;

  // Column layout
  const colTgl = M;
  const colKet = M + 95;
  const amountBoxX = M + 340;
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

  // ---- KAS BERSIH ----
  y += 8;
  const cardH = 46;
  doc.rect(M, y, CONTENT_W, cardH).fill(accent);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff');
  doc.text('KAS BERSIH', M + 16, y + 10);
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#ffffff');
  doc.text(rupiah(kasBersih), M, y + 9, { width: CONTENT_W - 16, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#d1fae5');
  doc.text(kasBersih >= 0 ? 'Surplus kas bulan ini' : 'Defisit kas bulan ini', M + 16, y + 26);
  y += cardH + 20;

  // Footer
  doc.font('Helvetica').fontSize(8).fillColor(muted);
  doc.text('Laporan Kas IHM Rukun Manggallo', M, 792);
  doc.text(`Dicetak ${new Date().toLocaleDateString('id-ID')}`, M, 792, { width: CONTENT_W, align: 'right' });

  doc.end();
}