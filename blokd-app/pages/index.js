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
    try {
      const [membersRes, statsRes] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/stats')
      ]);
      const membersData = await membersRes.json();
      const statsData = await statsRes.json();
      setMembers(membersData.members || []);
      setStats(statsData);
      setLoading(false);
    } catch (err) {
      setError('Gagal memuat data');
      setLoading(false);
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
          <div style={styles.statLabel}>Dana Yang Sudah disetor ke ketua</div>
          <div style={styles.statValueWarning}>{formatCurrency(stats?.setorKeKetua)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Dana Yang dipegang bendahara saat ini</div>
          <div style={styles.statValue}>{formatCurrency(stats?.bendahara)}</div>
        </div>
      </div>

      {/* Setor History */}
      {stats?.setorHistory && stats.setorHistory.length > 0 && (
        <div style={styles.historySection}>
          <div style={styles.sectionTitle}>📤 Riwayat Setoran ke Ketua</div>
          {stats.setorHistory.slice().reverse().slice(0, showAllHistory ? undefined : 2).map((item, idx) => (
            <div key={idx} style={styles.historyItem}>
              <span style={styles.historyDate}>
                {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span style={styles.historyAmount}>{formatCurrency(item.amount)}</span>
            </div>
          ))}
          {stats.setorHistory.length > 2 && (
            <div style={styles.showMoreBtn} onClick={() => setShowAllHistory(!showAllHistory)}>
              {showAllHistory ? '▲ Sembunyikan' : '▼ Lihat lainnya'}
            </div>
          )}
        </div>
      )}

      <div style={styles.membersSection}>
        <div style={{...styles.sectionTitle, justifyContent: 'flex-start'}}>👥 Anggota</div>
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
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '15px' },
  statCard: { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(128,128,128,0.3)', borderRadius: '12px', padding: '10px', textAlign: 'center', boxShadow: '0 2px 10px rgba(77,124,229,0.08)' },
  statCardWarning: { borderColor: 'rgba(255,159,67,0.5)' },
  statValue: { fontSize: '24px', fontWeight: 'bold', color: '#4D7CE5', marginBottom: '5px' },
  statValueWarning: { fontSize: '24px', fontWeight: 'bold', color: '#ff9f43', marginBottom: '5px' },
  statLabel: { fontSize: '16px', color: '#000', fontWeight: '500' },
  membersSection: { marginBottom: '20px', paddingBottom: '60px' },
  sectionTitle: { fontSize: '18px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' },
  searchBox: { marginBottom: '20px', maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto' },
  searchWrapper: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(128,128,128,0.15)', border: '1px solid rgba(128,128,128,0.25)', borderRadius: '10px', padding: '0 12px' },
  searchIcon: { fontSize: '16px', color: '#888' },
  searchInput: { width: '100%', padding: '12px 0', background: 'transparent', border: 'none', color: '#333', fontSize: '14px', outline: 'none' },
  membersGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  memberCard: { background: 'rgba(128,128,128,0.15)', borderRadius: '12px', padding: '16px', minHeight: '100px' },
  memberHouse: { fontSize: '18px', fontWeight: 'bold', color: '#000', marginBottom: '4px' },
  memberName: { fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#000' },
  memberStatusNegative: { background: 'rgba(255,71,87,0.2)', border: '1px solid #ff4757', borderRadius: '6px', padding: '6px 4px', textAlign: 'center', color: '#ff4757', fontWeight: 'bold', fontSize: '13px' },
  memberPaid: { fontSize: '11px', color: '#666', marginTop: '8px' },
  monthsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' },
  monthItem: { background: 'rgba(77,124,229,0.2)', border: '1px solid #4D7CE5', borderRadius: '6px', padding: '6px 4px', textAlign: 'center' },
  monthName: { fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4D7CE5' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', padding: '16px 0' },
  paginationButton: { background: 'rgba(128,128,128,0.25)', border: '1px solid rgba(128,128,128,0.3)', color: '#333', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  pageInfo: { color: '#888', fontSize: '14px' },
  historySection: { marginTop: '20px', padding: '10px 0' },
  historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee', textAlign: 'center' },
  historyDate: { color: '#333', fontSize: '14px', textAlign: 'center', flex: 1 },
  historyAmount: { color: '#0f3460', fontWeight: 'bold', fontSize: '16px', textAlign: 'center', flex: 1 },
  showMoreBtn: { textAlign: 'center', padding: '12px', color: '#4D7CE5', cursor: 'pointer', fontWeight: '500', fontSize: '14px' },
  footer: { textAlign: 'center', padding: '30px', color: '#555', fontSize: '12px' },
};

