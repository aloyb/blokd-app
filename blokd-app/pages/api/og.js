import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(Request) {
  const data = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/stats`).then(r => r.json()).catch(() => null);

  const totalDana = data ? `Rp ${Number(data.totalExpected / 100).toLocaleString('id-ID')}` : 'Rp 0';
  const setorKetua = data ? `Rp ${Number(data.setorKeKetua / 100).toLocaleString('id-ID')}` : 'Rp 0';
  const bendahara = data ? `Rp ${Number(data.bendahara / 100).toLocaleString('id-ID')}` : 'Rp 0';
  const collectedPct = data?.collectedPercent || '0';

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
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div style={{ fontSize: '64px', fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>
            BLOKD
          </div>
          <div style={{ fontSize: '28px', color: '#8b8b8b' }}>
            Iuran Bulanan RT
          </div>
          <div style={{ fontSize: '22px', color: '#666', marginTop: '10px' }}>
            Collected: {collectedPct}%
          </div>
        </div>

        {/* 3 Arus */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            padding: '0 40px',
            gap: '20px',
          }}
        >
          {/* Total Dana */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#16213e',
              padding: '24px 32px',
              borderRadius: '16px',
              border: '2px solid #e94560',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '36px' }}>💰</div>
              <div style={{ fontSize: '28px', color: '#fff' }}>Total Dana</div>
            </div>
            <div style={{ fontSize: '36px', color: '#e94560', fontWeight: 'bold' }}>
              {totalDana}
            </div>
          </div>

          {/* Setor Ketua */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#16213e',
              padding: '24px 32px',
              borderRadius: '16px',
              border: '2px solid #0f3460',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '36px' }}>📤</div>
              <div style={{ fontSize: '28px', color: '#fff' }}>Setor ke Ketua</div>
            </div>
            <div style={{ fontSize: '36px', color: '#4ecca3', fontWeight: 'bold' }}>
              {setorKetua}
            </div>
          </div>

          {/* Bendahara */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#16213e',
              padding: '24px 32px',
              borderRadius: '16px',
              border: '2px solid #4ecca3',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '36px' }}>👤</div>
              <div style={{ fontSize: '28px', color: '#fff' }}>Hold Bendahara</div>
            </div>
            <div style={{ fontSize: '36px', color: '#fff', fontWeight: 'bold' }}>
              {bendahara}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '40px',
            fontSize: '20px',
            color: '#666',
          }}
        >
          blokd-iamr.vercel.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}