import { useState, useEffect } from 'react';
import Head from 'next/head';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_NAMES = {
  jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
  may: 'Mei', jun: 'Jun', jul: 'Jul', aug: 'Agu',
  sep: 'Sep', oct: 'Okt', nov: 'Nov', dec: 'Des'
};

export default function Home() {
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    let retries = 3;
    while (retries > 0) {
      try {
        setError(null);
        const [membersRes, statsRes] = await Promise.all([
          fetch('/api/members'),
          fetch('/api/stats')
        ]);
        const membersData = await membersRes.json();
        const statsData = await statsRes.json();
        setMembers(membersData.members || []);
        setStats(statsData);
        setLoading(false);
        return;
      } catch (err) {
        retries--;
        if (retries === 0) {
          setError('Gagal memuat data');
          setLoading(false);
        } else {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }

  function formatCurrency(num) {
    return `Rp ${(num || 0).toLocaleString('id-ID')}`;
  }

  const sortedMembers = [...members].sort((a, b) => {
    const aNum = parseInt((a.houseNumber || 'D0').replace(/\D/g, ''));
    const bNum = parseInt((b.houseNumber || 'D0').replace(/\D/g, ''));
    return aNum - bNum;
  });

  const filtered = searchQuery
    ? sortedMembers.filter(m => {
        const house = (m.houseNumber || '').toLowerCase();
        const name = (m.name || '').toLowerCase();
        return house.includes(searchQuery) || name.includes(searchQuery);
      })
    : sortedMembers;

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const pageMembers = filtered.slice(start, start + itemsPerPage);

  if (loading) return <div style={styles.container}><div style={styles.loading}>Memuat data...</div></div>;
  if (error) return <div style={styles.container}><div style={styles.error}>{error}</div></div>;

  return (
    <>
      <Head>
        <title>BlokD - Iuran RT</title>
        <meta name="description" content="Data iuran bulanan BLOK D tahun 2026. Pantau pembayaran anggota dan total dana." />
        <meta property="og:title" content="BLOK D - Iuran 2026" />
        <meta property="og:description" content="Data iuran bulanan BLOK D tahun 2026. Pantau pembayaran anggota dan total dana." />
        <meta property="og:image" content="https://blokd-iamr.vercel.app/og-image.png" />
        <meta property="og:url" content="https://blokd-iamr.vercel.app" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BLOK D - Iuran 2026" />
        <meta name="twitter:description" content="Data iuran bulanan BLOK D tahun 2026. Pantau pembayaran anggota dan total dana." />
        <meta name="twitter:image" content="https://blokd-iamr.vercel.app/og-image.png" />
      </Head>
      <div style={styles.container}>
        {/* Header - logo dan judul */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', textAlign: 'left', paddingLeft: '0' }}>
        <img src="/logo.png" alt="Logo" style={{height:'45px', verticalAlign: 'middle'}} />
        <div style={{ textAlign: 'left', paddingLeft: '0' }}>
          <h1 style={{...styles.h1, textAlign: 'left', paddingLeft: '0'}}>Laporan Iuran Bulanan BLOK D</h1>
          <div style={{...styles.subtitle, textAlign: 'left'}}>Tahun 2026</div>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Dana Terkumpul</div>
          <div style={styles.statValue}>{formatCurrency(stats?.totalPaid)}</div>
        </div>
        <div style={{...styles.statCard, ...styles.statCardWarning}}>
          <div style={styles.statLabel}>Dana Yang Dikeluarkan</div>
          <div style={styles.statValueWarning}>{formatCurrency(stats?.totalPengeluaran)}</div>
        </div>
        <div style={styles.lastStatCard}>
          <div style={styles.statLabel}>Dana Yang dipegang bendahara saat ini</div>
          <div style={styles.statValue}>{formatCurrency(stats?.bendahara)}</div>
        </div>
      </div>

      {/* Riwayat Pengeluaran */}
      {stats?.pengeluaranHistory && stats.pengeluaranHistory.length > 0 && (
        <div style={styles.historySection}>
          <div style={styles.sectionTitle}>📤 Riwayat Pengeluaran</div>
          <div style={styles.historyHeader}>
            <span style={styles.historyHeaderLabel}>Tanggal</span>
            <span style={styles.historyHeaderLabel}>Keterangan</span>
            <span style={styles.historyHeaderLabel}>Nominal</span>
          </div>
            {stats.pengeluaranHistory.slice().reverse().slice(0, showAllHistory ? undefined : 2).map((item, idx) => (
              <div key={idx} style={styles.historyItem}>
                <span style={styles.historyDate}>
                  {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span style={styles.historyKeterangan}>{item.keterangan || '-'}</span>
                <span style={styles.historyAmount}>{formatCurrency(item.amount)}</span>
              </div>
            ))}
          {stats.pengeluaranHistory.length > 2 && (
            <div style={styles.showMoreBtn} onClick={() => setShowAllHistory(!showAllHistory)}>
              {showAllHistory ? '▲ Sembunyikan' : '▼ Lihat lainnya'}
            </div>
          )}
        </div>
      )}

      <div style={styles.membersSection}>
        <div style={{...styles.sectionTitle, justifyContent: 'flex-start', gap: '10px'}}>
          <span>👥 Anggota</span>
          <a href="/api/pdf" download style={{...styles.downloadBtn}}>📄 Download PDF</a>
        </div>
        <div style={styles.searchBox}>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Tulis nama atau nomor rumah.."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value.toLowerCase()); setCurrentPage(1); }}
              style={styles.searchInput}
            />
          </div>
        </div>

        <div style={styles.membersGrid}>
          {pageMembers.map((member, idx) => {
            const amountDisplay = member.isException ? 40000 : (member.amount || 50000);
            const paidMonthsList = MONTHS.filter(m => member.payments[m]).map(m => MONTH_NAMES[m]);
            const monthsPaid = paidMonthsList.length;

            return (
              <div key={idx} style={styles.memberCard}>
                <div style={styles.memberHouse}>{member.houseNumber || '-'}</div>
                <div style={styles.memberName}>{member.name || '-'}</div>
                {paidMonthsList.length > 0 ? (
                  <div style={styles.monthsGrid}>
                    {paidMonthsList.map(m => (
                      <div key={m} style={styles.monthItem}><div style={styles.monthName}>{m}</div></div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.memberStatusNegative}>Belum Ada Bayar</div>
                )}
                <div style={styles.memberPaid}>{monthsPaid}x • {formatCurrency(amountDisplay)}</div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={styles.paginationButton}>← Sebelumnya</button>
            <span style={styles.pageInfo}>Halaman {currentPage} dari {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={styles.paginationButton}>Selanjutnya →</button>
          </div>
        )}
      </div>

      <div style={styles.footer}>Blok D Iuran 2026 • Updated otomatis</div>
    </div>
    </>
  );
}

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '20px', paddingTop: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', background: 'transparent', minHeight: '100vh', color: '#333', position: 'relative' },
  header: { display: 'flex', alignItems: 'center', padding: '20px 40px', gap: '15px' },
  h1: { fontSize: '16px', color: '#000', fontWeight: 'bold', lineHeight: '1.2', margin: '0' },
  subtitle: { color: '#888', fontSize: '12px', lineHeight: '1.2', margin: '2px 0 0 0' },
  loading: { textAlign: 'center', padding: '40px', color: '#888' },
  error: { textAlign: 'center', padding: '40px', color: '#ff4757' },
  statsGrid: { display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '25px', marginBottom: '15px', background: 'rgba(77,124,229,0.1)', borderRadius: '12px', padding: '5px', border: '1px solid rgba(77,124,229,0.3)' },
  statCard: { background: 'transparent', border: 'none', borderBottom: '1px solid rgba(77,124,229,0.3)', padding: '12px 10px', textAlign: 'center' },
  statCardWarning: { background: 'transparent', border: 'none', borderBottom: '1px solid rgba(77,124,229,0.3)' },
  lastStatCard: { background: 'transparent', border: 'none', padding: '12px 10px', textAlign: 'center' },
  statValue: { fontSize: '24px', fontWeight: 'bold', color: '#4D7CE5', marginBottom: '5px' },
  statValueWarning: { fontSize: '24px', fontWeight: 'bold', color: '#ff9f43', marginBottom: '5px' },
  statLabel: { fontSize: '16px', color: '#000', fontWeight: '500' },
  membersSection: { marginTop: '40px', marginBottom: '20px', paddingBottom: '60px' },
  sectionTitle: { fontSize: '18px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' },
  searchBox: { marginBottom: '20px' },
  searchWrapper: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(128,128,128,0.15)', border: '1px solid rgba(128,128,128,0.25)', borderRadius: '10px', padding: '0 12px' },
  searchIcon: { fontSize: '16px', color: '#888' },
  searchInput: { width: '100%', padding: '12px 0', background: 'transparent', border: 'none', color: '#333', fontSize: '14px', outline: 'none' },
  membersGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  memberCard: { background: 'rgba(128,128,128,0.15)', borderRadius: '12px', padding: '16px', minHeight: '100px', border: '1px solid rgba(128,128,128,0.3)' },
  memberHouse: { fontSize: '18px', fontWeight: 'bold', color: '#000', marginBottom: '4px' },
  memberName: { fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#000' },
  memberStatusNegative: { background: 'rgba(255,71,87,0.2)', border: '1px solid #ff4757', borderRadius: '6px', padding: '6px 4px', textAlign: 'center', color: '#ff4757', fontWeight: 'bold', fontSize: '13px' },
  memberPaid: { fontSize: '11px', color: '#666', marginTop: '8px' },
  monthsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' },
  monthItem: { background: 'rgba(77,124,229,0.2)', border: '1px solid #4D7CE5', borderRadius: '6px', padding: '6px 4px', textAlign: 'center' },
  monthName: { fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4D7CE5' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', padding: '16px 0' },
  paginationButton: { background: 'rgba(128,128,128,0.25)', border: '1px solid rgba(128,128,128,0.3)', color: '#333', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  pageInfo: { color: '#888', fontSize: '14px', textAlign: 'center', minWidth: '80px' },
  historySection: { marginTop: '20px', padding: '0', background: 'rgba(128,128,128,0.15)', borderRadius: '12px', border: '1px solid rgba(128,128,128,0.3)', overflow: 'hidden' },
  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(77,124,229,0.1)', borderBottom: '1px solid rgba(77,124,229,0.2)' },
  historyHeaderLabel: { color: '#4D7CE5', fontSize: '12px', fontWeight: '600', textAlign: 'center', flex: 1, textTransform: 'uppercase', letterSpacing: '0.5px' },
  historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(128,128,128,0.15)' },
  historyDate: { color: '#555', fontSize: '13px', textAlign: 'center', flex: 1 },
  historyKeterangan: { color: '#333', fontSize: '13px', textAlign: 'center', flex: 1 },
  historyAmount: { color: '#e67e22', fontWeight: '600', fontSize: '14px', textAlign: 'center', flex: 1 },
  showMoreBtn: { textAlign: 'center', padding: '12px', color: '#4D7CE5', cursor: 'pointer', fontWeight: '500', fontSize: '14px' },
  footer: { textAlign: 'center', padding: '30px', color: '#555', fontSize: '12px' },
  downloadBtn: { background: '#4D7CE5', color: '#fff', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap' },
};
