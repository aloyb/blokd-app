import fetch from 'node-fetch';
import sharp from 'sharp';
import fs from 'fs';

export default async function handler(req, res) {
  try {
    const data = await fetch('https://blokd-iamr.vercel.app/api/stats')
      .then(r => r.json())
      .catch(() => null);

    const totalPaid = data ? Number(data.totalPaid / 100).toLocaleString('id-ID') : '0';
    const setorKeKetua = data ? Number(data.setorKeKetua / 100).toLocaleString('id-ID') : '0';
    const bendahara = data ? Number(data.bendahara / 100).toLocaleString('id-ID') : '0';

    // Load logo
    const logoBuffer = fs.readFileSync('./public/logo.png');
    const logoBase64 = 'data:image/png;base64,' + logoBuffer.toString('base64');

    const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#E8F4FD"/>
  
  <!-- Header -->
  <rect x="0" y="0" width="1200" height="100" fill="rgba(255,255,255,0.9)"/>
  <image href="${logoBase64}" x="20" y="10" width="80" height="80"/>
  <text x="600" y="45" font-size="26" font-weight="bold" fill="#333" text-anchor="middle" font-family="Arial">Laporan Iuran Bulanan BLOK D</text>
  <text x="600" y="75" font-size="18" fill="#666" text-anchor="middle" font-family="Arial">Tahun 2026</text>
  
  <!-- Stats Column -->
  <rect x="20" y="115" width="1160" height="320" rx="12" fill="rgba(77,124,229,0.1)" stroke="rgba(77,124,229,0.3)" stroke-width="1"/>
  
  <!-- Card 1: Total Dana -->
  <text x="40" y="165" font-size="16" fill="#333" font-family="Arial">Total Dana Terkumpul</text>
  <text x="1160" y="195" font-size="24" font-weight="bold" fill="#4D7CE5" text-anchor="end" font-family="Arial">Rp ${totalPaid}</text>
  <line x1="40" y1="210" x2="1160" y2="210" stroke="rgba(77,124,229,0.3)" stroke-width="1"/>
  
  <!-- Card 2: Dana Disetor -->
  <text x="40" y="265" font-size="16" fill="#333" font-family="Arial">Dana Yang Sudah disetor ke ketua</text>
  <text x="1160" y="295" font-size="24" font-weight="bold" fill="#ff9f43" text-anchor="end" font-family="Arial">Rp ${setorKeKetua}</text>
  <line x1="40" y1="310" x2="1160" y2="310" stroke="rgba(77,124,229,0.3)" stroke-width="1"/>
  
  <!-- Card 3: Bendahara -->
  <text x="40" y="365" font-size="16" fill="#333" font-family="Arial">Dana Yang dipegang bendahara saat ini</text>
  <text x="1160" y="395" font-size="24" font-weight="bold" fill="#333" text-anchor="end" font-family="Arial">Rp ${bendahara}</text>
  
  <!-- Footer -->
  <text x="600" y="610" font-size="18" fill="#888" text-anchor="middle" font-family="Arial">blokd-iamr.vercel.app</text>
</svg>`;

    const imageBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    res.status(200).send(imageBuffer);
  } catch (e) {
    console.error(e);
    res.status(500).send('error');
  }
}
