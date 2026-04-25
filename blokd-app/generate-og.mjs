import sharp from 'sharp';

const width = 1200;
const height = 630;

const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#1a1a2e"/>
  
  <!-- Header -->
  <text x="600" y="75" font-size="72" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">BLOKD</text>
  <text x="600" y="120" font-size="28" fill="#888888" text-anchor="middle" font-family="Arial">Iuran Bulanan RT</text>
  <text x="600" y="155" font-size="20" fill="#666666" text-anchor="middle" font-family="Arial">Pantau Arus Uang Keluarga</text>
  
  <!-- Total Dana Box -->
  <rect x="80" y="190" width="1040" height="90" rx="12" fill="#16213e" stroke="#e94560" stroke-width="3"/>
  <text x="120" y="240" font-size="28" fill="#ffffff" font-family="Arial">💰 Total Dana</text>
  <text x="1000" y="240" font-size="28" fill="#e94560" font-weight="bold" text-anchor="end" font-family="Arial">Rp 6.660.000</text>
  
  <!-- Setor ke Ketua Box -->
  <rect x="80" y="300" width="1040" height="90" rx="12" fill="#16213e" stroke="#0f3460" stroke-width="3"/>
  <text x="120" y="350" font-size="28" fill="#ffffff" font-family="Arial">📤 Setor ke Ketua</text>
  <text x="1000" y="350" font-size="28" fill="#4ecca3" font-weight="bold" text-anchor="end" font-family="Arial">Rp 5.380.000</text>
  
  <!-- Hold Bendahara Box -->
  <rect x="80" y="410" width="1040" height="90" rx="12" fill="#16213e" stroke="#4ecca3" stroke-width="3"/>
  <text x="120" y="460" font-size="28" fill="#ffffff" font-family="Arial">👤 Hold Bendahara</text>
  <text x="1000" y="460" font-size="28" fill="#ffffff" font-weight="bold" text-anchor="end" font-family="Arial">Rp 1.280.000</text>
  
  <!-- Footer -->
  <text x="600" y="590" font-size="18" fill="#666666" text-anchor="middle" font-family="Arial">blokd-iamr.vercel.app</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile('./public/og-image.png')
  .then(() => console.log('Image created!'))
  .catch(e => console.error(e));