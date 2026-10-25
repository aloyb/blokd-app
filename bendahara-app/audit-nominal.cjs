#!/usr/bin/env node
/*
 * audit-nominal.cjs — cek konsistensi nominal iuran di data.json.
 *
 * Latar belakang: laporan user yang menyebut nominal ("E16 1 30k", "40k") dulu
 * hanya jadi teks lonceng, TIDAK masuk paidAmounts -> kas kelebihan hitung.
 *
 * Script ini membandingkan 3 sumber:
 *   1. RINCIAN/LUNAS di script import asli tiap blok (rekap dari perwakilan blok)
 *   2. paidAmounts / amount per member
 *   3. teks activityLog ("bayar iuran <bulan> (Rp X)")
 *
 * Output: daftar selisih + ringkasan. Exit code 1 kalau ada selisih.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(DIR, 'data.json'), 'utf8'));
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const ML = {
  januari: 'jan', februari: 'feb', maret: 'mar', april: 'apr', mei: 'may', juni: 'jun',
  juli: 'jul', agustus: 'aug', september: 'sep', oktober: 'oct', november: 'nov', desember: 'dec',
};

const all = [];
for (const [blk, b] of Object.entries(data.blocks)) {
  for (const m of b.members) all.push(Object.assign({ blk }, m));
}
const byHouse = {};
for (const m of all) byHouse[m.houseNumber] = m;

const eff = (m, mo) => {
  const pa = m.paidAmounts || {};
  return pa[mo] != null ? pa[mo] : m.amount || 50000;
};

let problems = 0;
function report(title, rows) {
  console.log('\n### ' + title + ' — ' + rows.length + ' selisih');
  rows.forEach((r) => console.log('   ' + r));
  problems += rows.length;
}

// ---------------------------------------------------------------- 1. import scripts
function loadRincian(file) {
  const src = fs.readFileSync(path.join(DIR, file), 'utf8');
  const mm = src.match(/const (RINCIAN|LUNAS)\s*=\s*\{([\s\S]*?)\n\};/);
  if (!mm) return null;
  // eslint-disable-next-line no-new-func
  return new Function('return ({' + mm[2] + '})')();
}
function loadObject(file, name) {
  const src = fs.readFileSync(path.join(DIR, file), 'utf8');
  const mm = src.match(new RegExp('const ' + name + '\\s*=\\s*(\\{[^}]*\\})'));
  if (!mm) return {};
  // eslint-disable-next-line no-new-func
  return new Function('return (' + mm[1] + ')')();
}

const PLANS = [
  { blk: 'A', file: 'import-blok-a.cjs', mode: 'array', special: { A5: 30000, A30: 30000 } },
  { blk: 'B', file: 'import-blok-b.cjs', mode: 'array', special: { B7: 40000 } },
  { blk: 'C', file: 'import-blok-c.cjs', mode: 'count', specialName: 'NOMINAL_KHUSUS' },
  { blk: 'E', file: 'import-blok-e.cjs', mode: 'array', special: {} },
  { blk: 'G', file: 'import-blok-g.cjs', mode: 'array', special: {} },
];

for (const plan of PLANS) {
  const R = loadRincian(plan.file);
  if (!R) { console.log('\n### rekap ' + plan.file + ' — TIDAK BISA DIBACA'); continue; }
  const special = plan.specialName ? loadObject(plan.file, plan.specialName) : plan.special || {};
  const rows = [];
  for (const [house, val] of Object.entries(R)) {
    const m = byHouse[house];
    if (!m) continue; // perwakilan blok yang sudah dihapus / baris Total
    const base = special[house] || m.amount || 50000;
    const expected = plan.mode === 'count'
      ? MONTHS.slice(0, val).map((mo) => [mo, base])
      : val.map((n, i) => [MONTHS[i], Number(n || 0)]).filter(([, n]) => n > 0);
    for (const [mo, n] of expected) {
      if (!m.payments[mo]) { rows.push(house + ' ' + mo + ' rekap=' + n + ' tapi data BELUM lunas'); continue; }
      const cur = eff(m, mo);
      if (cur !== n) rows.push(house + ' ' + mo + ' rekap=' + n + ' data=' + cur);
    }
  }
  report('rekap ' + plan.blk + ' (' + plan.file + ')', rows);
}

// ---------------------------------------------------------------- 2. log lonceng vs data
const logRows = [];
for (const l of data.activityLog || []) {
  const t = l.text || '';
  const mm = t.match(/([A-G]\d{1,3})\]?\s+.*?iuran\s+(\w+)\s+(\d{4})\s+\(Rp\s*([\d.]+)\)/i);
  if (!mm) continue;
  const house = mm[1].toUpperCase();
  const mo = ML[mm[2].toLowerCase()];
  if (!mo) continue;
  const amt = parseInt(mm[4].replace(/\./g, ''), 10);
  const m = byHouse[house];
  if (!m || !m.payments[mo]) continue;
  const cur = eff(m, mo);
  if (cur !== amt) logRows.push(house + ' ' + mo + ' log=' + amt + ' data=' + cur + ' (' + l.date + ')');
}
report('teks lonceng vs data', logRows);

// ---------------------------------------------------------------- 3. paidAmounts tanpa payments
const orphan = [];
for (const m of all) {
  for (const mo of Object.keys(m.paidAmounts || {})) {
    if (!m.payments[mo]) orphan.push(m.houseNumber + ' ' + mo + ' paidAmounts=' + m.paidAmounts[mo] + ' tapi payments=false');
  }
}
report('paidAmounts tanpa payments', orphan);

// ---------------------------------------------------------------- ringkasan
console.log('\n=== RINGKASAN ===');
console.log('Rumah aktif           : ' + all.filter((m) => !m.vacant && !m.exempt).length);
console.log('Rumah tarif <50rb     : ' + all.filter((m) => m.amount < 50000).length);
console.log('Rumah pakai paidAmounts: ' + all.filter((m) => m.paidAmounts && Object.keys(m.paidAmounts).length).length);
console.log('Total selisih         : ' + problems);
process.exit(problems ? 1 : 0);
