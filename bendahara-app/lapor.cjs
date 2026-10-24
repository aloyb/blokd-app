#!/usr/bin/env node
/*
 * lapor.cjs — SATU PERINTAH untuk memproses laporan iuran & pengeluaran IAMR.
 *
 * Tujuan: model AI terlemah pun cukup menjalankan SATU perintah ini.
 * Script ini yang mengerjakan SEMUA langkah (parse -> update data.json ->
 * log lonceng -> git commit+push -> vercel deploy -> verifikasi live),
 * lalu mencetak SATU blok hasil yang tidak bisa disalahartikan.
 *
 * PEMAKAIAN:
 *   node lapor.cjs "pemasukan D45 1 pengeluaran perbaikan kipas pos 40k"
 *   node lapor.cjs "D45 1 D46 2"
 *   node lapor.cjs "pengeluaran wakar 3.600.000 sampah 1.300.000"
 *   node lapor.cjs --dry "D45 1"        <-- cuma tes parsing, TIDAK menulis/deploy
 *
 * ATURAN: JANGAN bilang "beres/deployed" kecuali output diakhiri baris
 *   "STATUS: SUKSES". Kalau tidak ada baris itu -> BELUM selesai.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_PATH = process.env.LAPOR_DATA || path.resolve(__dirname, 'data.json');
const REPO_ROOT = process.env.LAPOR_REPO || path.resolve(__dirname, '..'); // /home/ubuntu/.openclaw/workspace
const APP_DIR = process.env.LAPOR_APP || __dirname;                       // .../bendahara-app
const LIVE_URL = process.env.LAPOR_URL || 'https://iamr-app.vercel.app';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_LABEL = {
  jan: 'Januari', feb: 'Februari', mar: 'Maret', apr: 'April', may: 'Mei', jun: 'Juni',
  jul: 'Juli', aug: 'Agustus', sep: 'September', oct: 'Oktober', nov: 'November', dec: 'Desember',
};
const MONTH_ALIAS = {
  januari: 'jan', jan: 'jan', februari: 'feb', feb: 'feb', maret: 'mar', mar: 'mar',
  april: 'apr', apr: 'apr', mei: 'may', may: 'may', juni: 'jun', jun: 'jun',
  juli: 'jul', jul: 'jul', agustus: 'aug', agu: 'aug', ags: 'aug', aug: 'aug',
  september: 'sep', sep: 'sep', oktober: 'oct', okt: 'oct', oct: 'oct',
  november: 'nov', nov: 'nov', desember: 'dec', des: 'dec', dec: 'dec',
};

const args = process.argv.slice(2);
const DRY = args.includes('--dry') || args.includes('--test');
const NO_DEPLOY = args.includes('--no-deploy') || process.env.LAPOR_NO_DEPLOY === '1';
const FORCE = args.includes('--force') || process.env.LAPOR_FORCE === '1';
const rawInput = args.filter((a) => !a.startsWith('--')).join(' ').trim();

const LOCK_PATH = process.env.LAPOR_LOCK || path.join(__dirname, '.lapor.lock');
const GUARD_PATH = process.env.LAPOR_GUARD || path.join(__dirname, '.lapor-recent.json');
const LOCK_MAX_AGE_MS = 10 * 60 * 1000;   // lock lebih tua dari 10 menit dianggap basi
const FP_WINDOW_MS = 24 * 60 * 60 * 1000; // tolak isi laporan identik dalam 24 jam

let lockHeld = false;
function acquireLock(p) {
  try {
    const st = fs.statSync(p);
    if (Date.now() - st.mtimeMs > LOCK_MAX_AGE_MS) fs.unlinkSync(p); // basi -> buang
  } catch (e) { /* tidak ada lock */ }
  try {
    fs.writeFileSync(p, JSON.stringify({ pid: process.pid, at: Date.now(), input: rawInput }), { flag: 'wx' });
    lockHeld = true;
  } catch (e) {
    let info = '';
    try { info = fs.readFileSync(p, 'utf8'); } catch (e2) { /* noop */ }
    fail('SEDANG DIPROSES: ada proses lapor.cjs lain yang masih jalan (lock: ' + p + '). Isi: ' + info + '\nTunggu sampai selesai, lalu ulangi.');
  }
}
function releaseLock() {
  if (!lockHeld) return;
  try { fs.unlinkSync(LOCK_PATH); } catch (e) { /* noop */ }
  lockHeld = false;
}
process.on('exit', releaseLock);

function fail(msg) {
  releaseLock();
  console.log('\n===LAPOR-RESULT===');
  console.log('STATUS: GAGAL');
  console.log('ALASAN: ' + msg);
  console.log('===END===');
  process.exit(1);
}

// ---- parsing helpers -------------------------------------------------------

// "30k" -> 30000, "40rb" -> 40000, "3.600.000" -> 3600000, "40000" -> 40000
function parseAmount(tok) {
  if (tok == null) return null;
  let t = String(tok).toLowerCase().replace(/rp\.?/g, '').trim();
  const m = t.match(/^([\d.,]+)\s*(k|rb|ribu|jt|juta)?$/);
  if (!m) return null;
  let numStr = m[1].replace(/\./g, '').replace(/,/g, '.');
  if (/^\d{1,3}(\.\d{3})+$/.test(m[1])) numStr = m[1].replace(/\./g, ''); // 3.600.000 style
  let num = parseFloat(numStr);
  if (isNaN(num)) return null;
  const unit = m[2];
  if (unit === 'k' || unit === 'rb' || unit === 'ribu') num *= 1000;
  if (unit === 'jt' || unit === 'juta') num *= 1000000;
  return Math.round(num);
}

function isAmountTok(tok) {
  if (tok == null) return false;
  const t = String(tok).toLowerCase();
  // harus MULAI dengan digit (nomor rumah selalu mulai dengan huruf A-G)
  return /^\d/.test(t) && parseAmount(tok) != null;
}

function pad(n) { return String(n).padStart(2, '0'); }

function parsePemasukan(str) {
  if (!str) return [];
  const tokens = str
    .replace(/,/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !['pemasukan', 'bayar', 'iuran', 'bulan', 'bln', 'masuk'].includes(t.toLowerCase()));
  const out = [];
  let cur = null; // pending house awaiting months/nominal
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const low = t.toLowerCase();
    // nomor rumah: huruf A-G + angka
    if (/^[a-g]\d{1,3}$/i.test(t)) {
      if (cur) out.push(cur);
      cur = { house: t.toUpperCase(), months: 1, month: null, nominal: null };
      continue;
    }
    // nama bulan: "juni"
    if (MONTH_ALIAS[low] && cur && cur.month == null && cur.months === 1) {
      cur.month = MONTH_ALIAS[low];
      continue;
    }
    // angka murni = jumlah bulan (hanya kalau angka kecil 1-24, bukan nominal besar)
    if (/^\d{1,2}$/.test(t) && cur && cur.months === 1 && cur.month == null) {
      cur.months = parseInt(t, 10);
      continue;
    }
    // token nominal (30k / 40000)
    if (isAmountTok(t) && cur && cur.nominal == null) {
      cur.nominal = parseAmount(t);
      continue;
    }
    // token lain diabaikan (nama rumah, dsb)
  }
  if (cur) out.push(cur);
  return out;
}

function parsePengeluaran(str) {
  if (!str) return [];
  const tokens = str.replace(/,/g, '').split(/\s+/).filter(Boolean);
  const out = [];
  let words = [];
  let date = null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const low = t.toLowerCase();
    if (low === 'tanggal' || low === 'tgl') {
      // bentuk: tanggal 20 juni 2026 / 20-06-2026 / 2026-06-20
      const nxt = tokens[i + 1];
      if (/^\d{4}-\d{2}-\d{2}$/.test(nxt)) { date = nxt; i += 1; }
      continue;
    }
    if (isAmountTok(t)) {
      const amt = parseAmount(t);
      const label = words.join(' ').trim();
      if (label) out.push({ keterangan: label, amount: amt, date });
      words = [];
      continue;
    }
    if (['pengeluaran', 'keluar'].includes(low)) continue;
    words.push(t);
  }
  // sisa kata tanpa nominal -> abaikan (bukan pengeluaran valid)
  return out;
}

function splitSections(text) {
  // pisahkan berdasarkan kata kunci "pengeluaran"
  const m = text.match(/\bpengeluaran\b/i);
  if (!m) return { pemasukanStr: text, pengeluaranStr: '' };
  const idx = m.index;
  return {
    pemasukanStr: text.slice(0, idx).replace(/\bpemasukan\b/i, ''),
    pengeluaranStr: text.slice(idx + m[0].length),
  };
}

// ---- data ops --------------------------------------------------------------

function findMember(data, house) {
  const letter = house[0].toUpperCase();
  const block = data.blocks[letter];
  if (!block) return null;
  return block.members.find((mm) => String(mm.houseNumber).toUpperCase() === house.toUpperCase()) || null;
}

function monthsToMark(member, spec) {
  // spec: {months, month} -> daftar key bulan yang akan ditandai
  if (spec.month) return [spec.month];
  const lastIdx = MONTHS.reduce((acc, k, i) => (member.payments[k] ? i : acc), -1);
  const out = [];
  let i;
  if (lastIdx === -1) {
    // belum pernah bayar -> mulai dari bulan berjalan
    i = new Date().getMonth();
  } else {
    i = lastIdx + 1;
  }
  while (out.length < spec.months && i < 12) {
    if (!member.payments[MONTHS[i]]) out.push(MONTHS[i]);
    i++;
  }
  return out;
}

function amountFor(member) {
  if (member.isException && member.amount) return member.amount;
  return member.amount || 50000;
}

// ---- main ------------------------------------------------------------------

function main() {
  if (!rawInput) fail('Tidak ada teks laporan. Contoh: node lapor.cjs "pemasukan D45 1"');

  acquireLock(LOCK_PATH);

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const { pemasukanStr, pengeluaranStr } = splitSections(rawInput);
  const pemasukan = parsePemasukan(pemasukanStr);
  const pengeluaran = parsePengeluaran(pengeluaranStr);

  if (pemasukan.length === 0 && pengeluaran.length === 0) {
    fail('Tidak bisa membaca laporan dari teks: "' + rawInput + '"');
  }

  const today = new Date();
  const tglISO = today.toISOString().slice(0, 10);
  const tglShort = pad(today.getDate()) + '/' + pad(today.getMonth() + 1);
  const ts = Date.now();

  const plan = { payments: [], expenses: [] };

  // --- pemasukan ---
  for (const p of pemasukan) {
    const member = findMember(data, p.house);
    if (!member) fail('Rumah ' + p.house + ' tidak ditemukan di data.json');
    const months = monthsToMark(member, p);
    const nominal = p.nominal || amountFor(member);
    if (months.length === 0) {
      fail('Rumah ' + p.house + ' (' + member.name + ') sudah lunas s.d. akhir tahun / tidak ada bulan tersisa untuk ditandai.');
    }
    plan.payments.push({ house: p.house, name: member.name, months, nominal, member });
  }

  // --- pengeluaran ---
  for (const e of pengeluaran) {
    plan.expenses.push({ keterangan: e.keterangan, amount: e.amount, date: e.date || tglISO });
  }

  // --- GUARD 1: idempotensi per bulan (pakai data FRESH dari disk) ---
  // Kalau bulan yang mau ditandai SUDAH true -> berarti sudah pernah dicatat. Buang, jangan dobel.
  const fresh = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const skipped = [];
  for (const p of plan.payments) {
    const fm = findMember(fresh, p.house);
    const kept = [];
    for (const mk of p.months) {
      if (fm && fm.payments[mk]) skipped.push(p.house + ' ' + MONTH_LABEL[mk]);
      else kept.push(mk);
    }
    p.months = kept;
  }
  plan.payments = plan.payments.filter((p) => p.months.length > 0);
  if (skipped.length) {
    console.log('Dilewati (SUDAH tercatat sebelumnya, tidak dicatat ulang): ' + skipped.join(', '));
  }
  if (plan.payments.length === 0 && plan.expenses.length === 0) {
    fail('TIDAK ADA PERUBAHAN: semua bulan yang diminta sudah tercatat/dicentang di data.json -> ' + skipped.join(', ') + '. Kalau memang mau paksa, pakai --force.');
  }

  // --- GUARD 2: tolak isi laporan identik dalam 24 jam (bukan cuma teks) ---
  const fpKey = fingerprint(plan);
  const normKey = 'teks:' + rawInput.toLowerCase().replace(/\s+/g, ' ').trim();
  let recent = {};
  try { recent = JSON.parse(fs.readFileSync(GUARD_PATH, 'utf8')); } catch (e) { recent = {}; }
  const nowMs = Date.now();
  Object.keys(recent).forEach((k) => { if (nowMs - recent[k] > FP_WINDOW_MS) delete recent[k]; });
  if (!FORCE) {
    if (recent[fpKey]) {
      fail('DUPLIKAT: isi laporan ini IDENTIK dengan yang sudah dicatat ' + Math.round((nowMs - recent[fpKey]) / 60000) + ' menit lalu (' + fpKey + '). Tidak diproses ulang. Pakai --force kalau benar-benar mau ulang.');
    }
    if (recent[normKey]) {
      fail('DUPLIKAT: teks laporan ini sudah diproses ' + Math.round((nowMs - recent[normKey]) / 60000) + ' menit lalu. Tidak diproses ulang. Pakai --force kalau benar-benar mau ulang.');
    }
    // GUARD 3: input sekarang MENGANDUNG laporan lama yang sudah diproses.
    // Ini pola bug "riwayat chat ikut diproses ulang" (mis. D33 lalu D19).
    const normNow = rawInput.toLowerCase().replace(/\s+/g, ' ').trim();
    for (const k of Object.keys(recent)) {
      if (!k.startsWith('teks:')) continue;
      const oldText = k.slice(5);
      if (oldText.length < 4 || !/[a-g]\d/i.test(oldText) || oldText === normNow) continue;
      if (normNow.includes(oldText)) {
        fail('BEKAS RIWAYAT: teks laporan sekarang MENGANDUNG laporan lama yang sudah diproses (' + Math.round((nowMs - recent[k]) / 60000) + ' menit lalu): "' + oldText + '".\nKemungkinan riwayat chat ikut terbaca. Kirim HANYA laporan baru saja. Kalau memang sengaja, pakai --force.');
      }
    }
  }
  recent[fpKey] = nowMs;
  recent[normKey] = nowMs;

  // ---- apply ----
  for (const p of plan.payments) {
    const target = findMember(data, p.house) || p.member;
    for (const mk of p.months) {
      target.payments[mk] = true;
      data.activityLog.unshift({
        icon: '💰',
        text: 'Blok ' + p.house[0] + ' ' + p.house + ' ' + p.name + ' bayar iuran ' + MONTH_LABEL[mk] + ' 2026 (Rp ' + p.nominal.toLocaleString('id-ID') + ')',
        date: tglISO,
        ts: ts,
      });
    }
  }
  for (const e of plan.expenses) {
    data.pengeluaran.push({ date: e.date, amount: e.amount, keterangan: e.keterangan });
  }

  // ---- ringkasan (dicetak sebelum tulis) ----
  const lines = [];
  lines.push('LAPORAN DIPROSES:');
  for (const p of plan.payments) {
    lines.push('  + Blok ' + p.house[0] + ' ' + p.house + ' ' + p.name + ': ' + p.months.map((m) => MONTH_LABEL[m]).join(', ') + ' (Rp ' + p.nominal.toLocaleString('id-ID') + '/bln)');
  }
  for (const e of plan.expenses) {
    lines.push('  - Pengeluaran: ' + e.keterangan + ' Rp ' + e.amount.toLocaleString('id-ID') + ' (' + e.date + ')');
  }

  if (DRY) {
    console.log('[DRY-RUN] Tidak menulis/men-deploy.');
    lines.forEach((l) => console.log(l));
    console.log('\n===LAPOR-RESULT===');
    console.log('STATUS: DRY-OK (parsing benar, belum dieksekusi)');
    console.log('===END===');
    return;
  }

  // --- GUARD 4 (peringatan, tidak memblokir): rumah yang baru dilaporkan < 60 menit ---
  const warn = [];
  for (const p of plan.payments) {
    for (const k of Object.keys(recent)) {
      if (!k.startsWith('isi:') || k === fpKey) continue;
      if (k.includes(p.house + ':') && nowMs - recent[k] < 60 * 60 * 1000) {
        warn.push(p.house + ' sudah dilaporkan ' + Math.round((nowMs - recent[k]) / 60000) + ' menit lalu');
      }
    }
  }
  if (warn.length) {
    console.log('PERINGATAN (cek dulu, jangan-jangan laporan dobel): ' + [...new Set(warn)].join('; '));
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  try { fs.writeFileSync(GUARD_PATH, JSON.stringify(recent, null, 1)); } catch (e) { /* noop */ }

  const commitMsg = buildCommitMsg(plan, tglShort);
  let deployLog = '';
  // path relatif terhadap repo root (biar aman & fleksibel)
  const relData = path.relative(REPO_ROOT, DATA_PATH) || 'data.json';
  const addTargets = [relData];
  const relDataSafe = relData.startsWith('..') ? null : relData;
  if (!relDataSafe) addTargets.length = 0;
  [path.join(__dirname, 'lapor.cjs'), path.join(__dirname, '.gitignore')].forEach((f) => {
    const rel = path.relative(REPO_ROOT, f);
    if (rel && !rel.startsWith('..')) addTargets.push(rel);
  });
  try {
    if (process.env.LAPOR_NO_GIT === '1') {
      console.log('(--no-git: git dilewati)');
    } else {
    execSync('git add ' + addTargets.map(shellQuote).join(' ') + ' && git commit -m ' + shellQuote(commitMsg) + " && git push origin master", { cwd: REPO_ROOT, stdio: 'pipe' });
    }
  } catch (err) {
    fail('GIT gagal: ' + String(err.stderr || err.message).slice(0, 400) + '\nCATATAN: data.json SUDAH berubah di disk. Selesaikan manual: git add/commit/push + vercel --prod, JANGAN jalankan ulang laporan tanpa --force.');
  }
  if (!NO_DEPLOY) {
    try {
      deployLog = execSync('vercel --prod --yes 2>&1 | tail -5', { cwd: APP_DIR, stdio: 'pipe', timeout: 280000 }).toString();
    } catch (err) {
      fail('VERCEL gagal: ' + String(err.stdout || err.stderr || err.message).slice(0, 500) + '\nCATATAN: data.json SUDAH berubah & ter-commit/push. Tinggal deploy: cd bendahara-app && vercel --prod --yes. JANGAN jalankan ulang laporan tanpa --force.');
    }
    if (!/Aliased:|Production:/i.test(deployLog)) {
      fail('VERCEL tidak melaporkan sukses. Log:\n' + deployLog);
    }
  } else {
    deployLog = '(--no-deploy: deploy dilewati)';
  }

  // verifikasi live
  let liveNote = '';
  if (!NO_DEPLOY) {
    try {
      const cb = Date.now();
      const stats = execSync('curl -s "' + LIVE_URL + '/api/stats?cb=' + cb + '"', { stdio: 'pipe', timeout: 30000 }).toString();
      const j = JSON.parse(stats);
      const g = j.global || {};
      liveNote = 'LIVE bendahara=Rp ' + (g.bendahara != null ? Number(g.bendahara).toLocaleString('id-ID') : '?') + ', pemasukan=Rp ' + (g.pemasukanSejakJangkar != null ? Number(g.pemasukanSejakJangkar).toLocaleString('id-ID') : '?') + ', pengeluaran=Rp ' + (g.pengeluaranSejakJangkar != null ? Number(g.pengeluaranSejakJangkar).toLocaleString('id-ID') : '?');
    } catch (err) {
      liveNote = '(verifikasi live gagal dibaca: ' + String(err.message).slice(0, 120) + ')';
    }
  } else {
    liveNote = '(deploy dilewati, verifikasi live tidak dilakukan)';
  }

  console.log(lines.join('\n'));
  console.log('Git: committed & pushed.');
  console.log('Deploy: ' + deployLog.trim().split('\n').filter(Boolean).slice(-1)[0]);
  console.log('Verifikasi: ' + liveNote);
  console.log('\n===LAPOR-RESULT===');
  console.log('STATUS: SUKSES');
  console.log('URL: ' + LIVE_URL);
  console.log('===END===');
}

// sidik jari ISI perubahan: rumah+bulan yang ditandai & pengeluaran (urut, stabil)
function fingerprint(plan) {
  const pay = [];
  plan.payments.forEach((p) => p.months.forEach((mk) => pay.push(p.house + ':' + mk)));
  const exp = plan.expenses.map((e) => (e.keterangan || '').toLowerCase() + ':' + e.amount).sort();
  return 'isi:' + pay.sort().join(',') + '|' + exp.join(',');
}

function buildCommitMsg(plan, tglShort) {
  const parts = [];
  if (plan.payments.length) parts.push(plan.payments.map((p) => p.house + ' ' + p.months.map((m) => MONTH_LABEL[m]).join('/')).join(', ') + ' bayar');
  if (plan.expenses.length) parts.push('pengeluaran ' + plan.expenses.map((e) => e.keterangan + ' ' + e.amount).join(', '));
  return ('Lapor ' + tglShort + ': ' + parts.join(' + ')).slice(0, 100);
}

function shellQuote(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }

main();
