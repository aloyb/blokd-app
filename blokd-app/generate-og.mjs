import sharp from 'sharp';
import fs from 'fs';

const width = 1200;
const height = 630;
const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));

const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
let totalPaidCalc = 0;
data.members.forEach(m => {
  const amount = m.isException ? 40000 : (m.amount || 50000);
  months.forEach(month => { if (m.payments[month]) totalPaidCalc += amount; });
});
const setorTotal = (data.setorKeKetua || 0);
const pengeluaranTotal = setorTotal.toLocaleString('id-ID');
const bendaharaCalc = totalPaidCalc - setorTotal;
const totalPaid = totalPaidCalc.toLocaleString('id-ID');
const bendahara = bendaharaCalc.toLocaleString('id-ID');

// Load logo as base64
const logoPath = './public/logo.png';
const logoBuffer = fs.readFileSync(logoPath);
const logoBase64 = 'data:image/png;base64,' + logoBuffer.toString('base64');

// Load house illustration reference
const housePath = './public/reference.jpg';
const houseBuffer = fs.readFileSync(housePath);
const houseBase64 = 'data:image/jpeg;base64,' + houseBuffer.toString('base64');

const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="houseClip">
      <ellipse cx="900" cy="310" rx="250" ry="180"/>
    </clipPath>
  </defs>
  
  <rect width="${width}" height="${height}" fill="#E8F4FD"/>
  
  <!-- Background decorative house image -->
  <image href="${houseBase64}" x="670" y="140" width="460" height="221" opacity="0.25" clip-path="url(#houseClip)"/>
  
  <!-- Header -->
  <rect x="0" y="0" width="1200" height="100" fill="rgba(255,255,255,0.9)"/>
  <image href="${logoBase64}" x="20" y="10" width="80" height="80"/>
  <text x="600" y="45" font-size="26" font-weight="bold" fill="#333" text-anchor="middle" font-family="Arial">Laporan Iuran Bulanan BLOK D</text>
  <text x="600" y="75" font-size="18" fill="#666" text-anchor="middle" font-family="Arial">Tahun 2026</text>
  
  <!-- Stats Column -->
  <rect x="20" y="115" width="560" height="380" rx="12" fill="rgba(77,124,229,0.1)" stroke="rgba(77,124,229,0.3)" stroke-width="1"/>
  
  <!-- Card 1: Total Dana -->
  <text x="40" y="165" font-size="16" fill="#333" font-family="Arial">Total Dana Terkumpul</text>
  <text x="540" y="195" font-size="24" font-weight="bold" fill="#4D7CE5" text-anchor="end" font-family="Arial">Rp ${totalPaid}</text>
  <line x1="40" y1="210" x2="540" y2="210" stroke="rgba(77,124,229,0.3)" stroke-width="1"/>
  
  <!-- Card 2: Total Pengeluaran -->
  <text x="40" y="265" font-size="16" fill="#333" font-family="Arial">Total Pengeluaran</text>
  <text x="540" y="295" font-size="24" font-weight="bold" fill="#ff9f43" text-anchor="end" font-family="Arial">Rp ${pengeluaranTotal}</text>
  <line x1="40" y1="310" x2="540" y2="310" stroke="rgba(77,124,229,0.3)" stroke-width="1"/>
  
  <!-- Card 3: Bendahara -->
  <text x="40" y="365" font-size="16" fill="#333" font-family="Arial">Dana Yang dipegang bendahara saat ini</text>
  <text x="540" y="395" font-size="24" font-weight="bold" fill="#333" text-anchor="end" font-family="Arial">Rp ${bendahara}</text>
  
  <!-- Member count -->
  <line x1="40" y1="420" x2="540" y2="420" stroke="rgba(77,124,229,0.3)" stroke-width="1"/>
  <text x="40" y="460" font-size="16" fill="#333" font-family="Arial">Total Anggota</text>
  <text x="540" y="460" font-size="24" font-weight="bold" fill="#4D7CE5" text-anchor="end" font-family="Arial">${data.members.length} Rumah</text>
  
  <!-- Right side: House illustration area -->
  <image href="${houseBase64}" x="620" y="135" width="550" height="360" opacity="0.95"/>
  
  <!-- Right side decorative border frame -->
  <rect x="615" y="130" width="560" height="370" rx="12" fill="none" stroke="rgba(77,124,229,0.3)" stroke-width="2"/>
  
  <!-- Footer -->
  <text x="600" y="610" font-size="18" fill="#888" text-anchor="middle" font-family="Arial">blokd-iamr.vercel.app</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile('./public/og-image.png')
  .then(() => console.log('OG image created!'))
  .catch(e => console.error(e));
