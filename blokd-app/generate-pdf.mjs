import fs from 'fs';
import PDFDocument from 'pdfkit';

const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Create PDF portrait A4 with centered content
const doc = new PDFDocument({ margin: 5, size: 'A4', layout: 'portrait' });
const out = fs.createWriteStream('iuran-report.pdf');
doc.pipe(out);

// Centering calculations
const pageWidth = doc.page.width;
const contentWidth = 535; // width of the original layout
const startX = (pageWidth - contentWidth) / 2;

// Colors from the reference image
const HEADER_BG = '#1976D2';    // Dark blue header banner
const WHITE = '#FFFFFF';
const TABLE_HEADER_BG = '#1976D2';
const ZEBRA_LIGHT = '#E3F2FD';  // Light blue zebra
const ZEBRA_WHITE = '#FFFFFF';
const GREEN_TEXT = '#2E7D32';    // bayar
const RED_TEXT = '#D32F2F';      // belum
const BLUE_TEXT = '#1565C0';    // Total Dana
const ORANGE_TEXT = '#E65100';  // Dana Disetor
const BLACK_TEXT = '#333333';   // Dipegang Bendahara
const GRAY_TEXT = '#666666';
const LIGHT_BLUE_BOX = '#E3F2FD';

const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

// === Calculate Summary ===
let totalPaid = 0;
for (const member of data.members) {
  const paidCount = Object.values(member.payments).filter(Boolean).length;
  totalPaid += paidCount * member.amount;
}
const bendahara = data.bendahara || 0;
const setorKeKetua = data.setorKeKetua || 0;
const totalDana = totalPaid;

// === HEADER BANNER ===
const bannerH = 40;
doc.rect(startX, 30, contentWidth, bannerH).fill(HEADER_BG);

// BLOK D - big white bold text
doc.font('Helvetica-Bold').fontSize(28).fillColor(WHITE);
doc.text('BLOK D', startX, 35, { width: contentWidth, align: 'center' });

// Laporan Iuran Bulanan Tahun 2026
doc.font('Helvetica').fontSize(16).fillColor(WHITE);
doc.text('Laporan Iuran Bulanan Tahun 2026', startX, 56, { width: contentWidth, align: 'center' });

doc.y = 30 + bannerH + 10; // after banner

// === 3 SUMMARY BOXES ===
const boxY = doc.y;
const boxW = 175;
const boxH = 50;
const boxGap = 10;
const totalBoxWidth = (boxW * 3) + (boxGap * 2);
const boxStartX = startX + (contentWidth - totalBoxWidth) / 2;

const boxes = [
  { label: 'Total Dana Terkumpul', value: totalDana, valueColor: BLUE_TEXT },
  { label: 'Dana Sudah Disetor ke Ketua', value: setorKeKetua, valueColor: ORANGE_TEXT },
  { label: 'Dipegang Bendahara', value: bendahara, valueColor: BLACK_TEXT }
];

boxes.forEach((box, i) => {
  const x = boxStartX + (i * (boxW + boxGap));
  
  // Light blue background
  doc.rect(x, boxY, boxW, boxH).fill(LIGHT_BLUE_BOX);
  
  // Label (top, dark gray)
  doc.fontSize(12).fillColor(GRAY_TEXT).text(box.label, x + 5, boxY + 6, { width: boxW - 10, align: 'center' });
  
  // Value (bottom, colored)
  doc.font('Helvetica-Bold').fontSize(13).fillColor(box.valueColor).text(`Rp ${box.value.toLocaleString('id')}`, x + 5, boxY + 24, { width: boxW - 10, align: 'center' });
});

doc.font('Helvetica'); // reset font
doc.y = boxY + boxH + 12;

// === TABLE ===
const tableTop = doc.y;
const colX = {
  rumah: 30,
  nama: 62,
  iuran: 145,
  jan: 172, feb: 202, mar: 232, apr: 262, may: 292,
  jun: 322, jul: 352, aug: 382, sep: 412, oct: 442, nov: 472, dec: 502
};
const colW = 28;
const rowH = 20;

// Table header row background
doc.rect(startX, tableTop, contentWidth, rowH).fill(TABLE_HEADER_BG);

// Header text (white)
doc.font('Helvetica-Bold').fontSize(10).fillColor(WHITE);
doc.text('Rumah', startX + (colX.rumah - 30) + 2, tableTop + 4, { width: 30 });
doc.text('Nama', startX + (colX.nama - 30) + 2, tableTop + 4, { width: 80 });
doc.text('Iuran', startX + (colX.iuran - 30) + 2, tableTop + 4, { width: 25 });
for (const m of months) {
  doc.text(m.toUpperCase(), startX + (colX[m] - 30), tableTop + 4, { width: colW, align: 'center' });
}

doc.y = tableTop + rowH;

let y = doc.y;
let pageNum = 1;

function drawRow(member, y, bgColor) {
  // Row background (zebra)
  doc.rect(startX, y, contentWidth, rowH).fill(bgColor);
  
  const name = member.name || '';
  const amount = member.isException ? '40rb' : '50rb';
  
  doc.fontSize(10).font('Helvetica').fillColor('#333');
  doc.text(member.houseNumber, startX + (colX.rumah - 30) + 2, y + 4, { width: 30 });
  doc.text(name, startX + (colX.nama - 30) + 2, y + 4, { width: 80 });
  doc.text(amount, startX + (colX.iuran - 30) + 2, y + 4, { width: 25 });
  
  for (const m of months) {
    const paid = member.payments[m];
    doc.fillColor(paid ? GREEN_TEXT : RED_TEXT);
    doc.text(paid ? 'bayar' : 'belum', startX + (colX[m] - 30), y + 4, { width: colW, align: 'center' });
  }
}

let isEven = false;
for (const member of data.members) {
  // Check if need new page
  if (y > 530) {
    doc.addPage();
    pageNum++;
    y = 30;
    
    // Mini header on new page
    doc.rect(startX, y, contentWidth, rowH).fill(TABLE_HEADER_BG);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(WHITE);
    doc.text('Rumah', startX + (colX.rumah - 30) + 2, y + 4, { width: 30 });
    doc.text('Nama', startX + (colX.nama - 30) + 2, y + 4, { width: 80 });
    doc.text('Iuran', startX + (colX.iuran - 30) + 2, y + 4, { width: 25 });
    for (const m of months) {
      doc.text(m.toUpperCase(), colX[m], y + 4, { width: colW, align: 'center' });
    }
    y += rowH;
    isEven = false;
  }
  
  const bgColor = isEven ? ZEBRA_WHITE : ZEBRA_LIGHT;
  drawRow(member, y, bgColor);
  y += rowH;
  isEven = !isEven;
}

// === FOOTER ===
const footerY = y + 8;
doc.fontSize(7).fillColor(GRAY_TEXT);
const now = new Date();
const dateStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}, ${now.toTimeString().slice(0,8)}`;
doc.text(`Dicetak: ${dateStr}`, 30, footerY);
doc.text('BlokD - Laporan Iuran Bulanan', 565 - 150, footerY, { width: 150, align: 'right' });

doc.end();

console.log('PDF generated: iuran-report.pdf');
console.log(`Total members: ${data.members.length}`);
console.log(`Total Dana: Rp ${totalDana.toLocaleString('id')}`);
console.log(`Disetor ke Ketua: Rp ${setorKeKetua.toLocaleString('id')}`);
console.log(`Bendahara: Rp ${bendahara.toLocaleString('id')}`);