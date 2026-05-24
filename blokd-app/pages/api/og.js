import { ImageResponse } from '@vercel/og';
import fs from 'fs';
import path from 'path';

export const config = {
  runtime: 'edge',
};

const DATA_FILE = path.join(process.cwd(), 'data.json');

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
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

  const totalPaid = formatRupiah(stats.totalPaid);
  const setorKeKetua = formatRupiah(stats.setorKeKetua);
  const bendahara = formatRupiah(stats.bendahara);

  // Count paid members this month
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const now = new Date();
  const currentMonth = months[now.getMonth()];
  const paidThisMonth = data.members.filter(m => m.payments[currentMonth]).length;
  const totalMembers = data.members.length;

  return new ImageResponse(
    (
      <div style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#E8F4FD',
        fontFamily: 'Arial',
      }}>
        {/* Header */}
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

        {/* Stats */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '30px 40px',
          flexGrow: 1,
        }}>
          {/* Total Dana */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(77,124,229,0.1)',
            borderRadius: '12px',
            padding: '20px 30px',
            border: '1px solid rgba(77,124,229,0.3)',
          }}>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              💰 Total Dana Terkumpul
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4D7CE5' }}>
              {totalPaid}
            </div>
          </div>

          {/* Dana Disetor */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(255,159,67,0.1)',
            borderRadius: '12px',
            padding: '20px 30px',
            border: '1px solid rgba(255,159,67,0.3)',
          }}>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              📤 Dana Disetor ke Ketua
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff9f43' }}>
              {setorKeKetua}
            </div>
          </div>

          {/* Bendahara */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(51,51,51,0.1)',
            borderRadius: '12px',
            padding: '20px 30px',
            border: '1px solid rgba(51,51,51,0.3)',
          }}>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              🏦 Dana di Bendahara
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>
              {bendahara}
            </div>
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
