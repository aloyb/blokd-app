import PDFDocument from 'pdfkit';
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./blokd-app/data.json', 'utf8'));

// Calculate stats
const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const monthLabels = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
let totalPaid = 0;
data.members.forEach(member => {
  const amt = member.isException ? 40000 : member.amount;
  months.forEach(m => { if(member.payments[m]) totalPaid += amt; });
});

let setorKeKetua = 0;
if (data.setorHistory) data.setorHistory.forEach(s => setorKeKetua += s.amount);
const bendahara = totalPaid - setorKeKetua;
const totalMembers = data.members.length;

// Create PDF Landscape A4
const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
const stream = fs.createWriteStream('./laporan-iuran-blokd.pdf');
doc.pipe(stream);

// Colors
const BLUE = '#4D7CE5';
const LIGHT_BLUE = '#E8F4FD';
const GREEN = '#22C55E';
const RED = '#EF4444';
const GRAY = '#888888';
const DARK = '#333333';
const WHITE = '#FFFFFF';

// Header
doc.rect(0, 0, 842, 60).fill(BLUE);
doc.fillColor(WHITE);
doc.fontSize(20).font('Helvetica-Bold').text('BLOK D', 30, 15);
doc.fontSize(12).font('Helvetica').text('Laporan Iuran Bulanan Tahun 2026', 30, 38);

// Summary Cards
const cardY = 75;
const cardH = 50;
const cardW = 260;

// Card 1 - Total Dana
doc.rect(30, cardY, cardW, cardH).fill(LIGHT_BLUE);
doc.fillColor(DARK).fontSize(8).font('Helvetica').text('Total Dana Terkumpul', 40, cardY + 8);
doc.fontSize(12).font('Helvetica-Bold').fillColor(BLUE);
doc.text(`Rp ${totalPaid.toLocaleString('id-ID')}`, 40, cardY + 22);

// Card 2 - Dana Disetor
doc.rect(30 + cardW + 10, cardY, cardW, cardH).fill(LIGHT_BLUE);
doc.fillColor(DARK).fontSize(8).font('Helvetica').text('Dana Sudah Disetor ke Ketua', 30 + cardW + 20, cardY + 8);
doc.fontSize(12).font('Helvetica-Bold').fillColor('#FF9F43');
doc.text(`Rp ${setorKeKetua.toLocaleString('id-ID')}`, 30 + cardW + 20, cardY + 22);

// Card 3 - Bendahara
doc.rect(30 + (cardW + 10) * 2, cardY, cardW, cardH).fill(LIGHT_BLUE);
doc.fillColor(DARK).fontSize(8).font('Helvetica').text('Dipegang Bendahara', 30 + (cardW + 10) * 2 + 10, cardY + 8);
doc.fontSize(12).font('Helvetica-Bold').fillColor(DARK);
doc.text(`Rp ${bendahara.toLocaleString('id-ID')}`, 30 + (cardW + 10) * 2 + 10, cardY + 22);

// Table Header
let y = 145;
const colRumah = 35;
const colNama = 70;
const colIuran = 40;
const colWidth = 53; // Width for 12 months

doc.rect(30, y - 5, 782, 20).fill(BLUE);
doc.fillColor(WHITE).fontSize(9).font('Helvetica-Bold');
doc.text('Rumah', colRumah, y, { width: 35 });
doc.text('Nama', colNama, y, { width: 70 });
doc.text('Iuran', colNama + 70, y, { width: colIuran, align: 'center' });

// Month headers
monthLabels.forEach((m, i) => {
  const x = colNama + 70 + colIuran + 2 + i * colWidth;
  doc.text(m, x, y, { width: colWidth, align: 'center' });
});

y += 20;
doc.fontSize(8).font('Helvetica');

// Member rows
data.members.forEach((member, i) => {
  if (y > 550) {
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
    y = 50;
    
    // Header on new page
    doc.rect(0, 0, 842, 40).fill(BLUE);
    doc.fillColor(WHITE).fontSize(16).font('Helvetica-Bold');
    doc.text('BLOK D - Laporan Iuran (Lanjutan)', 30, 12);
    
    y = 55;
    doc.rect(30, y - 5, 782, 20).fill(BLUE);
    doc.fillColor(WHITE).fontSize(9).font('Helvetica-Bold');
    doc.text('Rumah', colRumah, y, { width: 35 });
    doc.text('Nama', colNama, y, { width: 70 });
    doc.text('Iuran', colNama + 70, y, { width: colIuran, align: 'center' });
    monthLabels.forEach((m, idx) => {
      const x = colNama + 70 + colIuran + 2 + idx * colWidth;
      doc.text(m, x, y, { width: colWidth, align: 'center' });
    });
    y += 20;
    doc.fontSize(8).font('Helvetica');
  }
  
  const rowH = 22;
  
  // Alternating background
  if (i % 2 === 0) {
    doc.rect(30, y - 3, 782, rowH).fill('#F8F9FA');
  }
  
  doc.fillColor(DARK);
  doc.fontSize(8).text(member.houseNumber, colRumah, y, { width: 35 });
  doc.text(member.name, colNama, y, { width: 70 });
  doc.fillColor(GRAY).text(`${(member.isException ? 40 : member.amount/1000).toFixed(0)}rb`, colNama + 70, y, { width: colIuran, align: 'center' });
  
  months.forEach((m, idx) => {
    const x = colNama + 70 + colIuran + 2 + idx * colWidth;
    if (member.payments[m]) {
      doc.fillColor(GREEN).text('bayar', x, y, { width: colWidth, align: 'center' });
    } else {
      doc.fillColor(RED).text('belum', x, y, { width: colWidth, align: 'center' });
    }
  });
  
  y += rowH;
});

// Footer
doc.moveTo(30, y + 5).lineTo(812, y + 5).stroke(GRAY);
doc.fillColor(GRAY).fontSize(7);
doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 30, y + 10);
doc.text('BlokD - Laporan Iuran Bulanan', 750, y + 10);

doc.end();
stream.on('finish', () => console.log('PDF created: laporan-iuran-blokd.pdf'));