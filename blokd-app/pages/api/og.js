export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await fetch('https://blokd-iamr.vercel.app/api/stats').then(r => r.json()).catch(() => null);

  const totalDana = data ? `Rp ${Number(data.totalExpected / 100).toLocaleString('id-ID')}` : 'Rp 270.000';
  const setorKetua = data ? `Rp ${Number(data.setorKeKetua / 100).toLocaleString('id-ID')}` : 'Rp 53.800';
  const bendahara = data ? `Rp ${Number(data.bendahara / 100).toLocaleString('id-ID')}` : 'Rp 12.300';
  const collectedPct = data?.collectedPercent || '24.5';

  const svg = `
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#1a1a2e"/>
    
    <!-- Header -->
    <text x="600" y="80" font-size="64" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">BLOKD</text>
    <text x="600" y="130" font-size="28" fill="#8b8b8b" text-anchor="middle" font-family="Arial">Iuran Bulanan RT</text>
    <text x="600" y="170" font-size="22" fill="#666" text-anchor="middle" font-family="Arial">Collected: ${collectedPct}%</text>
    
    <!-- Total Dana Box -->
    <rect x="60" y="210" width="1080" height="100" rx="16" fill="#16213e" stroke="#e94560" stroke-width="4"/>
    <text x="100" y="270" font-size="36" fill="#fff" font-family="Arial">💰 Total Dana</text>
    <text x="1000" y="270" font-size="36" fill="#e94560" font-weight="bold" text-anchor="end" font-family="Arial">${totalDana}</text>
    
    <!-- Setor Ketua Box -->
    <rect x="60" y="330" width="1080" height="100" rx="16" fill="#16213e" stroke="#0f3460" stroke-width="4"/>
    <text x="100" y="390" font-size="36" fill="#fff" font-family="Arial">📤 Setor ke Ketua</text>
    <text x="1000" y="390" font-size="36" fill="#4ecca3" font-weight="bold" text-anchor="end" font-family="Arial">${setorKetua}</text>
    
    <!-- Bendahara Box -->
    <rect x="60" y="450" width="1080" height="100" rx="16" fill="#16213e" stroke="#4ecca3" stroke-width="4"/>
    <text x="100" y="510" font-size="36" fill="#fff" font-family="Arial">👤 Hold Bendahara</text>
    <text x="1000" y="510" font-size="36" fill="white" font-weight="bold" text-anchor="end" font-family="Arial">${bendahara}</text>
    
    <!-- Footer -->
    <text x="600" y="590" font-size="20" fill="#666" text-anchor="middle" font-family="Arial">blokd-iamr.vercel.app</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}