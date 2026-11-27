// generate-og.mjs — bikin OG image dari SCREENSHOT halaman depan.
//
// Ganti pendekatan lama (satori/ImageResponse di pages/api/og.js) dengan
// screenshot langsung, supaya preview link (WhatsApp/Telegram) = tampilan web.
//
// Cara pakai:
//   1. Jalankan server produksi lokal di port 4310:
//        cd bendahara-app && npm run build && npx next start -p 4310
//   2. node scripts/generate-og.mjs            (default http://localhost:4310)
//      OG_URL=https://iamr-app.vercel.app node scripts/generate-og.mjs   (opsional)
//   3. Hasil: public/og-image.png  ->  commit + deploy.
//
// Kenapa tidak generate di server Vercel? Serverless Vercel tidak punya
// Chromium, jadi screenshot harus dilakukan di luar (build/CI/lokal).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'og-image.png');

const URL_TO_SHOOT = process.env.OG_URL || 'http://localhost:4310';
const CHROME_CANDIDATES = [
  process.env.OG_CHROME,
  path.join(process.env.HOME || '', '.cache', 'ms-playwright', 'chromium-1234', 'chrome-linux64', 'chrome'),
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean);

const PLAYWRIGHT_CANDIDATES = [
  '/home/ubuntu/.npm-global/lib/node_modules/openclaw/node_modules/playwright-core',
  'playwright-core',
  'playwright',
];

function loadPlaywright() {
  for (const mod of PLAYWRIGHT_CANDIDATES) {
    try {
      const m = require(mod);
      if (m && m.chromium) return m.chromium;
    } catch (_) { /* coba kandidat berikutnya */ }
  }
  throw new Error('playwright-core tidak ditemukan. Install: npm i -D playwright-core');
}

function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    try { if (fs.existsSync(p)) return p; } catch (_) {}
  }
  return undefined; // biarkan playwright cari sendiri
}

async function main() {
  const chromium = loadPlaywright();
  const executablePath = findChrome();

  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    });
    await page.goto(URL_TO_SHOOT, { waitUntil: 'networkidle', timeout: 60000 });
    // beri waktu font/gambar & fetch klien selesai
    await page.waitForTimeout(2000);
    await page.screenshot({ path: OUT });
    const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
    console.log(`OK  og-image.png dibuat dari ${URL_TO_SHOOT}  (${kb} KB)  ->  ${OUT}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('GAGAL membuat OG image:', err.message);
  process.exit(1);
});
