import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));

const outputPath = path.join(__dirname, 'iuran-report.pdf');
const doc = new PDFDocument({
  size: 'A4',
  layout: 'landscape',
  margin: 28,
  info: {
    Title: 'Laporan Iuran Blok D 2026',
    Author: 'BlokD App',
    Subject: 'Laporan iuran warga Blok D',
  },
});

const out = fs.createWriteStream(outputPath);
doc.pipe(out);

const months = [
  ['jan', 'Jan'],
  ['feb', 'Feb'],
  ['mar', 'Mar'],
  ['apr', 'Apr'],
  ['may', 'Mei'],
  ['jun', 'Jun'],
  ['jul', 'Jul'],
  ['aug', 'Agu'],
  ['sep', 'Sep'],
  ['oct', 'Okt'],
  ['nov', 'Nov'],
  ['dec', 'Des'],
];

const currentMonthIndex = Math.max(0, Math.min(11, new Date().getMonth()));
const currentDueMonths = months.slice(0, currentMonthIndex + 1).map(([key]) => key);

const colors = {
  ink: '#1F2937',
  muted: '#6B7280',
  line: '#D8E0EA',
  soft: '#EEF6FF',
  softAlt: '#F8FBFF',
  brand: '#1667B7',
  brandDark: '#0F4F93',
  paid: '#15803D',
  unpaid: '#B42318',
  warning: '#B45309',
  white: '#FFFFFF',
};

function rupiah(value) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function paidMonths(member) {
  return months.filter(([key]) => member.payments[key]).length;
}

function totalForMember(member) {
  return paidMonths(member) * member.amount;
}

function isPaidThroughCurrentMonth(member) {
  return currentDueMonths.every((key) => member.payments[key]);
}

const totalDana = data.members.reduce((sum, member) => sum + totalForMember(member), 0);
const setorHistory = data.setorHistory || [];
const setorKeKetua = setorHistory.reduce((sum, item) => sum + Number(item.amount || 0), 0);
const bendahara = totalDana - setorKeKetua;
const lunasSampaiBulanIni = data.members.filter(isPaidThroughCurrentMonth).length;
const belumSampaiBulanIni = data.members.length - lunasSampaiBulanIni;
const totalPeriodeBayar = data.members.reduce((sum, member) => sum + paidMonths(member), 0);
const belumAdaBayarCount = data.members.filter((member) => paidMonths(member) === 0).length;

const page = {
  width: doc.page.width,
  height: doc.page.height,
  margin: doc.page.margins.left,
};
const contentW = page.width - page.margin * 2;

const col = {
  rumah: { x: page.margin, w: 52, label: 'Nomor Rumah' },
  nama: { x: page.margin + 52, w: 130, label: 'Nama' },
  iuran: { x: page.margin + 182, w: 48, label: 'Iuran' },
};

let monthX = page.margin + 230;
for (const [, label] of months) {
  col[label.toLowerCase()] = { x: monthX, w: 36, label };
  monthX += 36;
}
col.periode = { x: monthX, w: 48, label: 'Bayar' };
col.total = { x: monthX + 48, w: 74, label: 'Total' };

const tableW = col.total.x + col.total.w - page.margin;
const rowH = 15;
const headerH = 17;
const footerTop = page.height - 52;
const rowLimitY = footerTop - 8;

function drawTopHeader() {
  doc.rect(page.margin, 24, contentW, 54).fill(colors.brand);
  doc.font('Helvetica-Bold').fontSize(20).fillColor(colors.white);
  doc.text('LAPORAN IURAN BLOK D', page.margin + 18, 34, { width: 360 });
  doc.font('Helvetica').fontSize(10).fillColor('#DDEEFF');
  doc.text('Tahun 2026 - data terbaru dari data.json', page.margin + 18, 59, { width: 360 });

  const printed = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());
  doc.font('Helvetica').fontSize(9).fillColor(colors.white);
  doc.text(`Dicetak: ${printed} WIB`, page.margin, 43, {
    width: contentW - 18,
    align: 'right',
  });
}

function drawSummaryCard(x, y, w, title, value, color = colors.ink, note = '') {
  doc.roundedRect(x, y, w, 48, 5).fill(colors.soft);
  doc.font('Helvetica').fontSize(8.5).fillColor(colors.muted);
  doc.text(title, x + 10, y + 8, { width: w - 20, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(13).fillColor(color);
  doc.text(value, x + 8, y + 23, { width: w - 16, align: 'center' });
  if (note) {
    doc.font('Helvetica').fontSize(7).fillColor(colors.muted);
    doc.text(note, x + 8, y + 38, { width: w - 16, align: 'center' });
  }
}

function drawSummary() {
  const y = 90;
  const gap = 9;
  const w = (contentW - gap * 4) / 5;
  drawSummaryCard(page.margin, y, w, 'Total Dana Terkumpul', rupiah(totalDana), colors.brand);
  drawSummaryCard(page.margin + (w + gap), y, w, 'Sudah Disetor ke Ketua', rupiah(setorKeKetua), colors.warning, `${setorHistory.length} kali setor`);
  drawSummaryCard(page.margin + (w + gap) * 2, y, w, 'Dipegang Bendahara', rupiah(bendahara), colors.ink);
  drawSummaryCard(page.margin + (w + gap) * 3, y, w, 'Lunas s/d Bulan Ini', `${lunasSampaiBulanIni} rumah`, colors.paid, `Belum: ${belumSampaiBulanIni}`);
  drawSummaryCard(page.margin + (w + gap) * 4, y, w, 'Belum Ada Bayar', `${belumAdaBayarCount} rumah`, colors.unpaid);
}

function drawTableHeader(y) {
  doc.rect(page.margin, y, tableW, headerH).fill(colors.brandDark);
  doc.font('Helvetica-Bold').fontSize(7.6).fillColor(colors.white);

  for (const key of ['rumah', 'nama', 'iuran']) {
    doc.text(col[key].label, col[key].x + 3, y + 5, { width: col[key].w - 6, align: key === 'nama' ? 'left' : 'center' });
  }

  for (const [, label] of months) {
    doc.text(label, col[label.toLowerCase()].x, y + 5, { width: 36, align: 'center' });
  }

  doc.text(col.periode.label, col.periode.x, y + 5, { width: col.periode.w, align: 'center' });
  doc.text(col.total.label, col.total.x, y + 5, { width: col.total.w - 4, align: 'right' });
}

function drawStatusCell(x, y, w, paid) {
  const cx = x + w / 2;
  const cy = y + rowH / 2;
  if (paid) {
    // Checkmark: two line segments forming a V shape
    doc.save();
    doc.lineWidth(1.8).strokeColor(colors.paid);
    doc.moveTo(cx - 3.5, cy + 0.5)
      .lineTo(cx - 1, cy + 3)
      .lineTo(cx + 4, cy - 2.5)
      .stroke();
    doc.restore();
  } else {
    // Cross: two diagonal lines forming an X
    doc.save();
    doc.lineWidth(1.5).strokeColor(colors.unpaid);
    doc.moveTo(cx - 3, cy - 3).lineTo(cx + 3, cy + 3).stroke();
    doc.moveTo(cx + 3, cy - 3).lineTo(cx - 3, cy + 3).stroke();
    doc.restore();
  }
}

function drawRow(member, index, y) {
  const bg = index % 2 === 0 ? colors.softAlt : colors.white;
  doc.rect(page.margin, y, tableW, rowH).fill(bg);
  doc.strokeColor(colors.line).lineWidth(0.3);
  doc.moveTo(page.margin, y + rowH).lineTo(page.margin + tableW, y + rowH).stroke();

  doc.font('Helvetica-Bold').fontSize(7.8).fillColor(colors.ink);
  doc.text(member.houseNumber, col.rumah.x + 2, y + 4.2, { width: col.rumah.w - 4, align: 'center' });
  doc.font('Helvetica').text(member.name || '-', col.nama.x + 4, y + 4.2, { width: col.nama.w - 8, ellipsis: true });
  doc.text(member.isException ? '40rb' : '50rb', col.iuran.x + 2, y + 4.2, { width: col.iuran.w - 4, align: 'center' });

  for (const [key, label] of months) {
    drawStatusCell(col[label.toLowerCase()].x, y, 36, Boolean(member.payments[key]));
  }

  const count = paidMonths(member);
  doc.fillColor(count >= currentDueMonths.length ? colors.paid : colors.unpaid);
  doc.text(`${count}/12`, col.periode.x, y + 4.2, { width: col.periode.w, align: 'center' });
  doc.fillColor(colors.ink);
  doc.text(rupiah(totalForMember(member)), col.total.x, y + 4.2, { width: col.total.w - 4, align: 'right' });
}

function drawLegendAndFooter(pageNo) {
  const y = footerTop;
  doc.font('Helvetica').fontSize(7.5).fillColor(colors.muted);
  // Legend checkmark
  doc.save();
  doc.lineWidth(1.5).strokeColor(colors.paid);
  const ly = y + 3;
  doc.moveTo(page.margin + 1, ly + 0.5).lineTo(page.margin + 3.5, ly + 3).lineTo(page.margin + 8, ly - 2).stroke();
  doc.restore();
  doc.font('Helvetica').fontSize(7.5).fillColor(colors.muted);
  doc.text('Sudah bayar', page.margin + 12, y, { width: 70, lineBreak: false });
  // Legend cross
  doc.save();
  doc.lineWidth(1.3).strokeColor(colors.unpaid);
  doc.moveTo(page.margin + 84, ly - 2.5).lineTo(page.margin + 90, ly + 3.5).stroke();
  doc.moveTo(page.margin + 90, ly - 2.5).lineTo(page.margin + 84, ly + 3.5).stroke();
  doc.restore();
  doc.font('Helvetica').fontSize(7.5).fillColor(colors.muted);
  doc.text('Belum bayar', page.margin + 94, y, { width: 80, lineBreak: false });
  doc.text(`Halaman ${pageNo}`, page.margin, y, { width: contentW, align: 'right', lineBreak: false });
}

function drawSetorHistory(y) {
  if (!setorHistory.length) return y;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.ink);
  doc.text('Riwayat Setor ke Ketua', page.margin, y, { width: 160 });
  y += 14;

  const itemW = 180;
  const itemH = 18;
  let x = page.margin;
  for (const item of setorHistory) {
    if (x + itemW > page.margin + contentW) {
      x = page.margin;
      y += itemH + 4;
    }
    const date = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(`${item.date}T00:00:00+07:00`));
    doc.roundedRect(x, y, itemW - 6, itemH, 4).fill(colors.soft);
    doc.font('Helvetica').fontSize(7.8).fillColor(colors.ink);
    doc.text(`${date} - ${rupiah(item.amount)}`, x + 7, y + 5, { width: itemW - 20 });
    x += itemW;
  }

  return y + itemH + 8;
}

drawTopHeader();
drawSummary();
let y = drawSetorHistory(152);
y += 4;
drawTableHeader(y);
y += headerH;

let pageNo = 1;
for (const [index, member] of data.members.entries()) {
  if (y + rowH > rowLimitY) {
    drawLegendAndFooter(pageNo);
    doc.addPage();
    pageNo += 1;
    y = 34;
    drawTableHeader(y);
    y += headerH;
  }

  drawRow(member, index, y);
  y += rowH;
}
drawLegendAndFooter(pageNo);

doc.end();

out.on('finish', () => {
  console.log(`PDF generated: ${outputPath}`);
  console.log(`Total members: ${data.members.length}`);
  console.log(`Total Dana: ${rupiah(totalDana)}`);
  console.log(`Disetor ke Ketua: ${rupiah(setorKeKetua)}`);
  console.log(`Bendahara: ${rupiah(bendahara)}`);
  console.log(`Lunas s/d bulan ini: ${lunasSampaiBulanIni}`);
});
