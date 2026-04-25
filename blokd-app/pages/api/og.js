import { ImageResponse } from 'next/og';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let data = null;
    try {
      const res = await fetch('https://blokd-iamr.vercel.app/api/stats');
      data = await res.json();
    } catch (e) {
      console.log('fetch error', e);
    }

    const totalDana = data ? `Rp ${Number(data.totalExpected / 100).toLocaleString('id-ID')}` : 'Rp 270.000';
    const setorKetua = data ? `Rp ${Number(data.setorKeKetua / 100).toLocaleString('id-ID')}` : 'Rp 53.800';
    const bendahara = data ? `Rp ${Number(data.bendahara / 100).toLocaleString('id-ID')}` : 'Rp 12.300';
    const collectedPct = data?.collectedPercent || '24.5';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a2e',
            padding: '40px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '64px', fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>BLOKD</div>
            <div style={{ fontSize: '28px', color: '#8b8b8b' }}>Iuran Bulanan RT</div>
            <div style={{ fontSize: '22px', color: '#666', marginTop: '10px' }}>Collected: {collectedPct}%</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '0 40px', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#16213e', padding: '24px 32px', borderRadius: '16px', border: '2px solid #e94560' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '36px' }}>💰</span>
                <span style={{ fontSize: '28px', color: '#fff' }}>Total Dana</span>
              </div>
              <span style={{ fontSize: '36px', color: '#e94560', fontWeight: 'bold' }}>{totalDana}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#16213e', padding: '24px 32px', borderRadius: '16px', border: '2px solid #0f3460' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '36px' }}>📤</span>
                <span style={{ fontSize: '28px', color: '#fff' }}>Setor ke Ketua</span>
              </div>
              <span style={{ fontSize: '36px', color: '#4ecca3', fontWeight: 'bold' }}>{setorKetua}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#16213e', padding: '24px 32px', borderRadius: '16px', border: '2px solid #4ecca3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '36px' }}>👤</span>
                <span style={{ fontSize: '28px', color: '#fff' }}>Hold Bendahara</span>
              </div>
              <span style={{ fontSize: '36px', color: '#fff', fontWeight: 'bold' }}>{bendahara}</span>
            </div>
          </div>

          <div style={{ marginTop: '40px', fontSize: '20px', color: '#666' }}>blokd-iamr.vercel.app</div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.log('ImageResponse error', e);
    return new Response('error generating image', { status: 500 });
  }
}