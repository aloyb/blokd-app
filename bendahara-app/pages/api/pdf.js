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

  const blockKey = String(req.query.block || '').toUpperCase();
  const block = data.blocks?.[blockKey];
  if (!block) {
    res.status(404).json({ error: 'Block not found' });
    return;
  }
  // Rumah kosong & perwakilan blok belum wajib iuran -> jangan masuk laporan PDF.
  const members = (block.members || []).filter((m) => !m.vacant && !m.exempt);
  const setorHistory = block.setorHistory || [];
  const blockLabel = block.label || `Blok ${blockKey}`;

  const months = [
    ['jan', 'Jan'], ['feb', 'Feb'], ['mar', 'Mar'], ['apr', 'Apr'],
    ['may', 'Mei'], ['jun', 'Jun'], ['jul', 'Jul'], ['aug', 'Agu'],
    ['sep', 'Sep'], ['oct', 'Okt'], ['nov', 'Nov'], ['dec', 'Des'],
  ];

  const currentMonthIndex = Math.max(0, Math.min(11, new Date().getMonth()));
  const currentDueMonths = months.slice(0, currentMonthIndex + 1).map(([key]) => key);

  const colors = {
    ink: '#1F2937', muted: '#6B7280', line: '#D8E0EA', soft: '#EAF7F0',
    softAlt: '#F6FDF9', brand: '#128F55', brandDark: '#0B6B3F',
    paid: '#15803D', unpaid: '#B42318', warning: '#B45309', white: '#FFFFFF',
    // Warna centang sesuai nominal iuran: hijau 50rb, biru 40rb, kuning 30rb.
    paid30: '#D97706', paid40: '#2563EB', paid50: '#15803D',
  };

  function rupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
  }
  function paidMonths(member) {
    return months.filter(([key]) => member.payments[key]).length;
  }
  // Nominal yang benar-benar dibayar untuk 1 bulan: hormati `paidAmounts` (nominal
  // berubah di tengah tahun), kalau tidak pakai `amount` default member.
  function paidAmountOf(member, key) {
    if (!member.payments || !member.payments[key]) return 0;
    const ov = member.paidAmounts && member.paidAmounts[key];
    return (typeof ov === 'number' && ov > 0) ? ov : (Number(member.amount) || 50000);
  }
  function colorForAmount(amt) {
    if (amt && amt <= 30000) return colors.paid30;
    if (amt && amt <= 40000) return colors.paid40;
    return colors.paid50;
  }
  // Rangkum iuran terbayar per nominal -> "6x50rb" atau "1x50rb 9x30rb".
  function breakdownText(member) {
    const counts = {};
    for (const [key] of months) {
      const amt = paidAmountOf(member, key);
      if (amt > 0) counts[amt] = (counts[amt] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[0] - a[0])
      .map(([amt, n]) => `${n}x${Math.round(amt / 1000)}rb`)
      .join(' ');
  }
  function totalForMember(member) {
    // Sebagian rumah nominalnya berubah di tengah tahun -> hormati paidAmounts.
    return months.reduce((sum, [key]) => {
      if (!member.payments[key]) return sum;
      const override = member.paidAmounts && member.paidAmounts[key];
      return sum + (typeof override === 'number' && override > 0 ? override : member.amount);
    }, 0);
  }
  function isPaidThroughCurrentMonth(member) {
    return currentDueMonths.every((key) => member.payments[key]);
  }

  const totalDana = members.reduce((sum, m) => sum + totalForMember(m), 0);
  // Pengeluaran blok. Setoran ke Ketua sudah tidak dipakai lagi (seluruh kas
  // dipegang bendahara), jadi ini murni belanja blok.
  const totalPengeluaran = setorHistory.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const bendahara = totalDana - totalPengeluaran;
  const lunasSampaiBulanIni = members.filter(isPaidThroughCurrentMonth).length;
  const belumSampaiBulanIni = members.length - lunasSampaiBulanIni;
  const belumAdaBayarCount = members.filter((m) => paidMonths(m) === 0).length;

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28, autoFirstPage: false });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Laporan-Iuran-${blockKey}-2026.pdf"`);
  doc.pipe(res);

  const page = { width: 842, height: 595, margin: 28 };
  const contentW = page.width - page.margin * 2;

  const col = {
    rumah: { x: page.margin, w: 56, label: 'No Rumah' },
    nama: { x: page.margin + 56, w: 108, label: 'Nama' },
    iuran: { x: page.margin + 164, w: 48, label: 'Iuran' },
  };
  const MONTH_W = 33;
  let monthX = page.margin + 212;
  for (const [, label] of months) {
    col[label.toLowerCase()] = { x: monthX, w: MONTH_W, label };
    monthX += MONTH_W;
  }
  // Kolom 'Bayar' perlu lebih lebar: berisi rincian per nominal (mis. "1x50rb 9x30rb").
  col.periode = { x: monthX, w: 98, label: 'Bayar' };
  col.total = { x: monthX + 98, w: 74, label: 'Total' };

  const tableW = col.total.x + col.total.w - page.margin;
  const rowH = 15;
  const headerH = 17;
  const footerTop = page.height - 52;
  const rowLimitY = footerTop - 8;

  function drawTopHeader() {
    doc.rect(page.margin, 24, contentW, 54).fill(colors.brand);
    doc.font('Helvetica-Bold').fontSize(20).fillColor(colors.white);
    doc.text(`LAPORAN IURAN ${blockLabel.toUpperCase()}`, page.margin + 18, 34, { width: 420 });
    doc.font('Helvetica').fontSize(10).fillColor('#DDF3E6');
    doc.text('Perumahan IAMR - Tahun 2026', page.margin + 18, 59, { width: 360 });
    const printed = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta',
    }).format(new Date());
    doc.font('Helvetica').fontSize(9).fillColor(colors.white);
    doc.text(`Dicetak: ${printed} WIB`, page.margin, 43, { width: contentW - 18, align: 'right' });
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
    drawSummaryCard(page.margin + (w + gap), y, w, 'Pengeluaran Blok', rupiah(totalPengeluaran), colors.warning, `${setorHistory.length} kali`);
    drawSummaryCard(page.margin + (w + gap) * 2, y, w, 'Sisa di Blok', rupiah(bendahara), colors.ink);
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
      doc.text(label, col[label.toLowerCase()].x, y + 5, { width: MONTH_W, align: 'center' });
    }
    doc.text(col.periode.label, col.periode.x, y + 5, { width: col.periode.w, align: 'center' });
    doc.text(col.total.label, col.total.x, y + 5, { width: col.total.w - 4, align: 'right' });
  }

  function drawStatusCell(x, y, w, paid, color = colors.paid) {
    const cx = x + w / 2;
    const cy = y + rowH / 2;
    if (paid) {
      doc.save();
      doc.lineWidth(1.8).strokeColor(color);
      doc.moveTo(cx - 3.5, cy + 0.5).lineTo(cx - 1, cy + 3).lineTo(cx + 4, cy - 2.5).stroke();
      doc.restore();
    } else {
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
    doc.text(member.isException ? `${Math.round(member.amount / 1000)}rb` : '50rb', col.iuran.x + 2, y + 4.2, { width: col.iuran.w - 4, align: 'center' });

    for (const [key, label] of months) {
      const amt = paidAmountOf(member, key);
      drawStatusCell(col[label.toLowerCase()].x, y, MONTH_W, amt > 0, colorForAmount(amt));
    }

    const count = paidMonths(member);
    const breakdown = breakdownText(member);
    doc.fillColor(count >= currentDueMonths.length ? colors.paid : colors.unpaid);
    doc.text(breakdown || `${count}/12`, col.periode.x, y + 4.2, { width: col.periode.w, align: 'center' });
    doc.fillColor(colors.ink);
    doc.text(rupiah(totalForMember(member)), col.total.x, y + 4.2, { width: col.total.w - 4, align: 'right' });
  }

  function drawLegendAndFooter(pageNo) {
    const y = footerTop;
    const ly = y + 3;
    const drawCheck = (x, color) => {
      doc.save();
      doc.lineWidth(1.5).strokeColor(color);
      doc.moveTo(x, ly + 0.5).lineTo(x + 2.5, ly + 3).lineTo(x + 7, ly - 2).stroke();
      doc.restore();
    };
    let lx = page.margin;
    const legendItems = [
      { color: colors.paid30, label: 'iuran 30rb' },
      { color: colors.paid40, label: 'iuran 40rb' },
      { color: colors.paid50, label: 'iuran 50rb' },
    ];
    for (const it of legendItems) {
      drawCheck(lx, it.color);
      doc.font('Helvetica').fontSize(7.5).fillColor(colors.muted);
      doc.text(it.label, lx + 10, y, { width: 62, lineBreak: false });
      lx += 78;
    }
    // Belum bayar (silang merah)
    doc.save();
    doc.lineWidth(1.3).strokeColor(colors.unpaid);
    doc.moveTo(lx, ly - 2.5).lineTo(lx + 6, ly + 3.5).stroke();
    doc.moveTo(lx + 6, ly - 2.5).lineTo(lx, ly + 3.5).stroke();
    doc.restore();
    doc.font('Helvetica').fontSize(7.5).fillColor(colors.muted);
    doc.text('belum bayar', lx + 10, y, { width: 80, lineBreak: false });
    doc.text(`Halaman ${pageNo}`, page.margin, y, { width: contentW, align: 'right', lineBreak: false });
    doc.font('Helvetica').fontSize(7).fillColor(colors.muted);
    doc.text(
      "Catatan: warna centang = nominal iuran yang dibayar (kuning 30rb, biru 40rb, hijau 50rb). Kolom 'Bayar' = rincian jumlah bulan per nominal (mis. 1x50rb 9x30rb).",
      page.margin, y + 12, { width: contentW, lineBreak: false }
    );
  }

  function drawSetorHistory(y) {
    if (!setorHistory.length) return y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.ink);
    doc.text('Riwayat Pengeluaran', page.margin, y, { width: 160 });
    y += 14;
    const itemW = 200;
    const itemH = 18;
    let x = page.margin;
    for (const item of setorHistory) {
      if (x + itemW > page.margin + contentW) { x = page.margin; y += itemH + 4; }
      const date = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
      }).format(new Date(`${item.date}T00:00:00+07:00`));
      doc.roundedRect(x, y, itemW - 6, itemH, 4).fill(colors.soft);
      doc.font('Helvetica').fontSize(7.4).fillColor(colors.ink);
      doc.text(`${date} - ${rupiah(item.amount)}`, x + 7, y + 5, { width: itemW - 20, ellipsis: true });
      x += itemW;
    }
    return y + itemH + 8;
  }

  // Generate
  doc.addPage();
  drawTopHeader();
  drawSummary();
  let y = drawSetorHistory(152);
  y += 4;
  drawTableHeader(y);
  y += headerH;

  let pageNo = 1;
  for (const [index, member] of members.entries()) {
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
}
