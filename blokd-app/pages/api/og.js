import { ImageResponse } from '@vercel/og';
import fs from 'fs';
import path from 'path';

export const config = {
  runtime: 'edge',
};

const DATA_FILE = path.join(process.cwd(), 'data.json');
const HOUSE_IMAGE = path.join(process.cwd(), 'public', 'reference.jpg');

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function loadHouseImage() {
  try {
    const buf = fs.readFileSync(HOUSE_IMAGE);
    const b64 = buf.toString('base64');
    return 'data:image/jpeg;base64,' + b64;
  } catch (e) {
    return null;
  }
}

function formatRupiah(num) {
  return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function calculateStats(data) {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  let totalPaid = 0;
  data.members.forEach(member => {
    const monthlyAmount = member.isException ? 40000 : member.amount;
    months.forEach(month => {
      if (member.payments[month]) {
        totalPaid += monthlyAmount;
      }
    });
  });

  let setorKeKetua = 0;
  if (data.setorHistory) {
    data.setorHistory.forEach(item => {
      setorKeKetua += item.amount;
    });
  }

  return {
    totalPaid,
    setorKeKetua,
    bendahara: totalPaid - setorKeKetua
  };
}

export default function handler(req) {
  const data = loadData();
  const stats = calculateStats(data);
  const houseImage = loadHouseImage();

  const totalPaid = formatRupiah(stats.totalPaid);
  const setorKeKetua = formatRupiah(stats.setorKeKetua);
  const bendahara = formatRupiah(stats.bendahara);

  return new ImageResponse(
    (
      <div style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#E8F4FD',
        fontFamily: 'Arial',
        position: 'relative',
      }}>
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '20px 40px',
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderBottom: '1px solid rgba(77,124,229,0.2)',
        }}>
          <div style={{
            display: 'flex',
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#333',
            flexGrow: 1,
            textAlign: 'center',
          }}>
            🏠 Laporan Iuran Bulanan BLOK D
          </div>
          <div style={{
            fontSize: '18px',
            color: '#666',
          }}>
            Tahun 2026
          </div>
        </div>

        {/* Main content: two columns */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          padding: '20px 30px',
          flexGrow: 1,
          gap: '20px',
          alignItems: 'stretch',
        }}>
          {/* Left column: Stats */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '500px',
            gap: '12px',
            justifyContent: 'center',
          }}>
            {/* Total Dana */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(77,124,229,0.1)',
              borderRadius: '12px',
              padding: '16px 24px',
              border: '1px solid rgba(77,124,229,0.3)',
            }}>
              <div style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                💰 Total Dana Terkumpul
              </div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#4D7CE5' }}>
                {totalPaid}
              </div>
            </div>

            {/* Dana Disetor */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(255,159,67,0.1)',
              borderRadius: '12px',
              padding: '16px 24px',
              border: '1px solid rgba(255,159,67,0.3)',
            }}>
              <div style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                📤 Dana Disetor ke Ketua
              </div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#ff9f43' }}>
                {setorKeKetua}
              </div>
            </div>

            {/* Bendahara */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(51,51,51,0.1)',
              borderRadius: '12px',
              padding: '16px 24px',
              border: '1px solid rgba(51,51,51,0.3)',
            }}>
              <div style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                🏦 Dana di Bendahara
              </div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#333' }}>
                {bendahara}
              </div>
            </div>

            {/* Total Anggota */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(0,204,106,0.1)',
              borderRadius: '12px',
              padding: '16px 24px',
              border: '1px solid rgba(0,204,106,0.3)',
            }}>
              <div style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                👥 Total Anggota
              </div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#00cc6a' }}>
                {data.members.length} Rumah
              </div>
            </div>
          </div>

          {/* Right column: House illustration */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '16px',
            border: '1px solid rgba(77,124,229,0.3)',
            overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.5)',
            padding: '10px',
          }}>
            {houseImage ? (
              <img 
                src={houseImage}
                style={{ width: '100%', height: 'auto', objectFit: 'contain', borderRadius: '8px' }}
                alt="Blok D"
              />
            ) : (
              <div style={{
                fontSize: '60px',
                color: '#4D7CE5',
                textAlign: 'center',
              }}>
                🏠
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '15px',
          color: '#888',
          fontSize: '16px',
        }}>
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
