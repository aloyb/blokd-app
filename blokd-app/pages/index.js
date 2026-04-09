import { useState, useEffect } from 'react';

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
    <div style={styles.container}>
      <header style={styles.header}>
        <img src="/logo.png" alt="Logo" style={{height:'60px', marginBottom:'10px'}} />
        <h1 style={styles.h1}>BLOK D</h1>
        <div style={styles.subtitle}>Iuran Bulanan Tahun 2026</div>
      </header>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{formatCurrency(stats?.totalPaid)}</div>
          <div style={styles.statLabel}>Total Dana Terkumpul</div>
        </div>
        <div style={{...styles.statCard, ...styles.statCardWarning}}>
          <div style={styles.statValueWarning}>{formatCurrency(stats?.setorKeKetua)}</div>
          <div style={styles.statLabel}>Dana Yang Sudah disetor ke ketua</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{formatCurrency(stats?.bendahara)}</div>
          <div style={styles.statLabel}>Dana Yang dipegang bendahara saat ini</div>
        </div>
      </div>

      <div style={styles.membersSection}>
        <div style={styles.sectionTitle}>👥 Anggota</div>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Cari nama atau nomor rumah..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value.toLowerCase()); setCurrentPage(1); }}
            style={styles.searchInput}
          />
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
  );
}

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', background: 'linear-gradient(135deg, #E8F4FD 0%, #FFFFFF 100%)', minHeight: '100vh', color: '#333' },
  header: { textAlign: 'center', padding: '40px 0' },
  h1: { fontSize: '32px', color: '#000', marginBottom: '5px' },
  subtitle: { color: '#888', fontSize: '14px' },
  loading: { textAlign: 'center', padding: '40px', color: '#888' },
  error: { textAlign: 'center', padding: '40px', color: '#ff4757' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '30px' },
  statCard: { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(128,128,128,0.3)', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 2px 10px rgba(77,124,229,0.1)' },
  statCardWarning: { borderColor: 'rgba(255,159,67,0.5)' },
  statValue: { fontSize: '32px', fontWeight: 'bold', color: '#4D7CE5', marginBottom: '5px' },
  statValueWarning: { fontSize: '32px', fontWeight: 'bold', color: '#ff9f43', marginBottom: '5px' },
  statLabel: { fontSize: '12px', color: '#888', textTransform: 'uppercase' },
  membersSection: { background: 'rgba(77,124,229,0.05)', borderRadius: '20px', padding: '30px', marginBottom: '20px' },
  sectionTitle: { fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
  searchBox: { marginBottom: '20px' },
  searchInput: { width: '100%', padding: '12px 16px', background: 'rgba(128,128,128,0.15)', border: '1px solid rgba(128,128,128,0.25)', borderRadius: '10px', color: '#333', fontSize: '14px', outline: 'none' },
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
  footer: { textAlign: 'center', padding: '30px', color: '#555', fontSize: '12px' },
};
