import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const width = 1200;
const height = 630;
const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));

const totalPaid = (data.totalPaid || 0).toLocaleString('id-ID');
const setorKeKetua = (data.setorKeKetua || 0).toLocaleString('id-ID');
const bendahara = (data.bendahara || 0).toLocaleString('id-ID');

const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#E8F4FD"/>
  
  <rect x="0" y="0" width="1200" height="120" fill="white" fill-opacity="0.8"/>
  
  <text x="40" y="75" font-size="36" font-weight="bold" fill="#333" font-family="Arial">🏠 BLOK D</text>
  <text x="600" y="60" font-size="32" font-weight="bold" fill="#333" text-anchor="middle" font-family="Arial">Laporan Iuran Bulanan</text>
  <text x="600" y="95" font-size="20" fill="#666" text-anchor="middle" font-family="Arial">Tahun 2026</text>
  
  <rect x="40" y="140" width="1120" height="440" rx="16" fill="rgba(77,124,229,0.1)" stroke="rgba(77,124,229,0.3)" stroke-width="2"/>
  
  <rect x="60" y="160" width="1080" height="80" rx="10" fill="rgba(77,124,229,0.1)" stroke="rgba(77,124,229,0.4)" stroke-width="1"/>
  <text x="90" y="210" font-size="22" fill="#333" font-family="Arial">Total Dana Terkumpul</text>
  <text x="1110" y="210" font-size="26" fill="#4D7CE5" font-weight="bold" text-anchor="end" font-family="Arial">Rp ${totalPaid}</text>
  
  <rect x="60" y="250" width="1080" height="80" rx="10" fill="rgba(77,124,229,0.1)" stroke="rgba(77,124,229,0.4)" stroke-width="1"/>
  <text x="90" y="300" font-size="22" fill="#333" font-family="Arial">Dana Yang Sudah disetor ke ketua</text>
  <text x="1110" y="300" font-size="26" fill="#ff9f43" font-weight="bold" text-anchor="end" font-family="Arial">Rp ${setorKeKetua}</text>
  
  <rect x="60" y="340" width="1080" height="80" rx="10" fill="rgba(77,124,229,0.1)" stroke="rgba(77,124,229,0.4)" stroke-width="1"/>
  <text x="90" y="390" font-size="22" fill="#333" font-family="Arial">Dana Yang dipegang bendahara saat ini</text>
  <text x="1110" y="390" font-size="26" fill="#333" font-weight="bold" text-anchor="end" font-family="Arial">Rp ${bendahara}</text>
  
  <text x="600" y="610" font-size="18" fill="#888" text-anchor="middle" font-family="Arial">blokd-iamr.vercel.app</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile('./public/og-image.png')
  .then(() => console.log('OG image created!'))
  .catch(e => console.error(e));
