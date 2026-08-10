import { useState, useEffect } from 'react';
import Head from 'next/head';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_NAMES = {
  jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
  may: 'Mei', jun: 'Jun', jul: 'Jul', aug: 'Agu',
  sep: 'Sep', oct: 'Okt', nov: 'Nov', dec: 'Des'
};

const NavIcon = ({ name }) => {
  const p = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'home') return (<svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>);
  if (name === 'doc') return (<svg {...p}><path d="M6 2.5h8l4 4V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" /><path d="M14 2.5V7h4" /><path d="M8.5 12h7M8.5 16h7" /></svg>);
  if (name === 'in') return (<svg {...p}><path d="M12 3v11" /><path d="m7 10 5 5 5-5" /><path d="M4 20h16" /></svg>);
  if (name === 'out') return (<svg {...p}><path d="M12 15V4" /><path d="m7 9 5-5 5 5" /><path d="M4 20h16" /></svg>);
  return null;
};

const NAV = [
  { key: 'beranda', label: 'Beranda', icon: 'home' },
  { key: 'iuran', label: 'Iuran', icon: 'doc' },
  { key: 'pemasukan', label: 'Pemasukan', icon: 'in' },
  { key: 'pengeluaran', label: 'Pengeluaran', icon: 'out' },
];

// Foto kegiatan komplek untuk slideshow di hero.
// Taruh file gambar di folder public/kegiatan/ lalu daftarkan path-nya di sini.
// Contoh: '/kegiatan/gotong-royong.jpg'. Kalau kosong, tampil placeholder.
const HERO_PHOTOS = [
  '/kegiatan/kegiatan-3.jpg',
  '/kegiatan/kegiatan-4.jpg',
  '/kegiatan/kegiatan-5.jpg',
  '/kegiatan/kegiatan-6.jpg',
  '/kegiatan/kegiatan-7.jpg',
];

function formatCurrency(num) {
  return `Rp ${(num || 0).toLocaleString('id-ID')}`;
}

// Target tahunan per rumah: Rp 50.000 x 12 bulan.
const IURAN_PER_BULAN = 50000;
function blockTarget(memberCount) {
  return (memberCount || 0) * IURAN_PER_BULAN * 12;
}
function pct(paid, target) {
  if (!target) return 0;
  return Math.min(100, Math.round(((paid || 0) / target) * 100));
}

export default function Home() {
  const [tab, setTab] = useState('beranda');
  const [blockList, setBlockList] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [greeting, setGreeting] = useState('Halo');
  const [heroSlide, setHeroSlide] = useState(0);
  const [showRingkasan, setShowRingkasan] = useState(false);
  const [pemasukanBlock, setPemasukanBlock] = useState(null);
  const [pengeluaranMonth, setPengeluaranMonth] = useState(null);
  const [statusOpen, setStatusOpen] = useState(null);
  const [showNotif, setShowNotif] = useState(false);
  const [notifList, setNotifList] = useState([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const itemsPerPage = 8;

  const slideCount = HERO_PHOTOS.length || 3;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) setGreeting('Selamat Pagi');
    else if (hour < 15) setGreeting('Selamat Siang');
    else if (hour < 19) setGreeting('Selamat Sore');
    else setGreeting('Selamat Malam');

    async function init() {
      try {
        const [blocksRes, statsRes] = await Promise.all([
          fetch('/api/members'),
          fetch('/api/stats'),
        ]);
        const statsJson = await statsRes.json();
        setBlockList((await blocksRes.json()).blocks || []);
        setGlobalStats(statsJson);
        setNotifList(statsJson.activityLog || []);
        setLoading(false);
      } catch (err) {
        setError('Gagal memuat data');
        setLoading(false);
      }
    }
    init();
    window.fetchNotif = async function() {
      try {
        const r = await fetch('/api/stats');
        const j = await r.json();
        setNotifList(j.activityLog || []);
      } catch(e){}
    };
  }, []);

  // Responsive: deteksi ukuran layar (PC >= 900px)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Auto-advance slideshow foto kegiatan
  useEffect(() => {
    const t = setInterval(() => {
      setHeroSlide(s => (s + 1) % slideCount);
    }, 4000);
    return () => clearInterval(t);
  }, [slideCount]);

  useEffect(() => {
    if (!selectedBlock) { setMembers([]); return; }
    setCurrentPage(1);
    setSearchQuery('');
    async function loadBlock() {
      try {
        const [mRes, sRes] = await Promise.all([
          fetch(`/api/members?block=${selectedBlock}`),
          fetch(`/api/stats?block=${selectedBlock}`),
        ]);
        setMembers((await mRes.json()).members || []);
      } catch (err) {
        setError('Gagal memuat data blok');
      }
    }
    loadBlock();
  }, [selectedBlock]);

  function goTab(key) {
    setTab(key);
    setSelectedBlock(null);
    setSearchQuery('');
    setCurrentPage(1);
  }

  const sortedMembers = [...members].sort((a, b) => {
    const aNum = parseInt((a.houseNumber || '0').replace(/\D/g, ''));
    const bNum = parseInt((b.houseNumber || '0').replace(/\D/g, ''));
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

  const g = globalStats?.global;

  return (
    <>
      <Head>
        <title>Laporan Kas IAMR</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <div style={isDesktop ? { ...styles.page, ...styles.pageDesktop } : styles.page}>
        
        {/* HEADER SECTION WITH DECORATION — hanya di HP (di PC brand sudah ada di sidebar) */}
        {!isDesktop && (
        <div style={styles.headerSection}>
          {/* Decorative House Illustration (Lukisan Rumah) */}
          <div style={styles.houseIllustration}>
            <svg viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width: '100%', height: 'auto', opacity: 0.15}}>
              <path d="M100 150L150 100L200 150V190H100V150Z" fill="#128F55" />
              <path d="M140 100L150 90L160 100H140Z" fill="#065F46" />
              <path d="M220 130L280 80L340 130V190H220V130Z" fill="#128F55" />
              <path d="M360 110L450 40L540 110V190H360V110Z" fill="#128F55" />
              <path d="M560 140L620 90L680 140V190H560V140Z" fill="#128F55" />
              <path d="M700 160L740 125L780 160V190H700V160Z" fill="#128F55" />
              <rect x="0" y="185" width="800" height="15" fill="#E5E7EB" />
            </svg>
          </div>

          <div style={styles.headerTop}>
            <div style={styles.headerLeft}>
              <img src="/logo.png" alt="Logo" style={styles.logo} />
              <div style={styles.headerText}>
                <div style={styles.usernameText}>LAPORAN KAS PERUMAHAN IAMR</div>
                <div style={styles.greetingText}>Tahun 2026</div>
              </div>
            </div>
            <div style={styles.headerRight}>
              <div style={styles.notifIcon} onClick={(e) => { e.stopPropagation(); setShowNotif(v => !v); window.fetchNotif(); }}>🔔</div>
            </div>
          </div>
        </div>
        )}

          {/* NOTIFIKASI LONCENG */}
          {showNotif && (
            <div style={styles.notifOverlay} onClick={() => setShowNotif(false)}>
              <div style={styles.notifPanel} onClick={(e) => e.stopPropagation()}>
                <div style={styles.notifHeader}>
                  <div style={styles.notifTitle}>🔔 Pemberitahuan</div>
                  <div style={styles.notifClose} onClick={() => setShowNotif(false)}>✕</div>
                </div>
                <div style={styles.notifBody}>
                  {notifList.length === 0 ? (
                    <div style={styles.notifEmpty}>Belum ada aktifitas.</div>
                  ) : notifList.map((item, i) => (
                    <div key={i} style={styles.notifItem}>
                      <div style={styles.notifIconItem}>{item.icon || '📌'}</div>
                      <div style={styles.notifContent}>
                        <div style={styles.notifText}>{item.text}</div>
                        <div style={styles.notifDate}>{item.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        <div style={styles.content}>
          {/* ===== BERANDA ===== */}
          {tab === 'beranda' && (
            <div>
              {/* HERO CARD: PERBENDAHARAAN KOMPLEK */}
              <div style={styles.heroCard}>
                <div style={styles.heroLeft}>
                  <div style={styles.heroTitle}>Perbendaharaan Komplek</div>
                  <div style={styles.heroTagline}>Transparan, Teratur, dan Bersama</div>
                  <div style={styles.heroBtn} onClick={() => setShowRingkasan(v => !v)}>
                    Lihat Ringkasan <span style={{ fontSize: '15px' }}>{showRingkasan ? '‹' : '›'}</span>
                  </div>
                </div>
                <div style={styles.heroSlideshow}>
                  {HERO_PHOTOS.length > 0 ? (
                    HERO_PHOTOS.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`Kegiatan komplek ${i + 1}`}
                        style={{ ...styles.heroSlideImg, opacity: i === heroSlide ? 1 : 0 }}
                      />
                    ))
                  ) : (
                    <div style={styles.heroSlidePlaceholder}>
                      <div style={{ fontSize: '30px' }}>{['📸', '🏘️', '🤝'][heroSlide % 3]}</div>
                      <div style={styles.heroSlideHint}>Foto kegiatan</div>
                    </div>
                  )}
                </div>
              </div>

              {/* RINGKASAN KAS (expand saat tombol ditekan) */}
              {showRingkasan && (
                <div style={styles.ringkasanCard}>
                  <div style={styles.ringkasanRow}>
                    <span style={styles.ringkasanLabel}>Total Kas Bersih</span>
                    <span style={styles.ringkasanValueBig}>{formatCurrency(g?.bendahara)}</span>
                  </div>
                  <div style={styles.ringkasanDivider} />
                  <div style={styles.ringkasanTop}>
                    <div style={styles.ringkasanMini}>
                      <div style={styles.ringkasanMiniLabel}>Total Rumah</div>
                      <div style={styles.ringkasanMiniValue}>{g?.totalMembers || 0}</div>
                    </div>
                    <div style={styles.ringkasanStatSep} />
                    <div style={styles.ringkasanMini}>
                      <div style={styles.ringkasanMiniLabel}>Pencapaian</div>
                      <div style={{ ...styles.ringkasanMiniValue, color: '#128F55' }}>
                        {pct(g?.totalPaid, blockTarget(g?.totalMembers))}%
                      </div>
                    </div>
                  </div>
                  <div style={styles.ringkasanDivider} />
                  <div style={styles.ringkasanStatsRow}>
                    <div style={styles.ringkasanStatRow}>
                      <span style={styles.ringkasanStatLabel}>Pemasukan</span>
                      <span style={{ ...styles.ringkasanStatValue, color: '#128F55' }}>{formatCurrency(g?.totalPaid)}</span>
                    </div>
                    <div style={styles.ringkasanStatRow}>
                      <span style={styles.ringkasanStatLabel}>Pengeluaran</span>
                      <span style={{ ...styles.ringkasanStatValue, color: '#EF4444' }}>{formatCurrency(g?.totalPengeluaran)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STATUS TILES */}
              <div style={styles.gridContainer}>
                <div style={styles.gridItem} onClick={() => setStatusOpen(statusOpen === 'lunas' ? null : 'lunas')}>
                  <div style={{...styles.gridIcon, background: '#ECFDF5', color: '#128F55'}}>✅</div>
                  <div style={styles.gridLabel}>Lunas</div>
                  <div style={{...styles.gridValue, color: '#128F55'}}>{g?.lunasSampaiBulanIni}</div>
                </div>
                <div style={styles.gridItem} onClick={() => setStatusOpen(statusOpen === 'telat' ? null : 'telat')}>
                  <div style={{...styles.gridIcon, background: '#FFF7ED', color: '#F59E0B'}}>⏳</div>
                  <div style={styles.gridLabel}>Telat</div>
                  <div style={{...styles.gridValue, color: '#F59E0B'}}>{g?.terlambat}</div>
                </div>
                <div style={styles.gridItem} onClick={() => setStatusOpen(statusOpen === 'nunggak' ? null : 'nunggak')}>
                  <div style={{...styles.gridIcon, background: '#FEF2F2', color: '#EF4444'}}>❌</div>
                  <div style={styles.gridLabel}>Nunggak</div>
                  <div style={{...styles.gridValue, color: '#EF4444'}}>{g?.belumAdaBayar}</div>
                </div>
              </div>

              {statusOpen && (() => {
                const cfg = {
                  lunas: { list: globalStats?.lunasList || [], color: '#128F55', title: 'Lunas' },
                  telat: { list: globalStats?.telatList || [], color: '#F59E0B', title: 'Telat' },
                  nunggak: { list: globalStats?.nunggakList || [], color: '#EF4444', title: 'Nunggak' },
                }[statusOpen];
                const ket = (e) => {
                  if (statusOpen === 'lunas') return 'pian dasar keren😎';
                  if (statusOpen === 'telat') return `Telat ${e.bulanTelat} bulan`;
                  return 'Gim kada suah bayar';
                };
                return (
                  <div style={styles.statusDrill}>
                    <div style={styles.statusDrillHead}>
                      <span style={{ ...styles.statusDrillTitle, color: cfg.color }}>{cfg.title}</span>
                      <span style={styles.statusDrillCount}>{cfg.list.length} rumah</span>
                    </div>
                    {cfg.list.length === 0 ? (
                      <div style={styles.drillEmpty}>Tidak ada data.</div>
                    ) : cfg.list.map((e, i) => (
                      <div key={i} style={styles.statusDrillItem}>
                        <div style={{ ...styles.statusDrillBadge, color: cfg.color, borderColor: cfg.color }}>{e.houseNumber}</div>
                        <div style={styles.statusDrillInfo}>
                          <div style={styles.statusDrillName}>{e.name && e.name !== '-' ? e.name : 'Belum ada nama'}</div>
                          <div style={styles.statusDrillSub}>{e.blockLabel}</div>
                        </div>
                        <div style={{ ...styles.statusDrillKet, color: cfg.color }}>{ket(e)}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* LIST: LAPORAN PER BLOK */}
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>Laporan Per Blok</div>
              </div>
              <div style={isDesktop ? styles.listContainerDesktop : styles.listContainer}>
                {blockList.map(b => {
                  const bs = globalStats?.blocks?.[b.block];
                  const totalRumah = bs?.totalMembers ?? b.memberCount;
                  const bayarBulanIni = Math.max(0, totalRumah - (bs?.terlambat ?? totalRumah));
                  const persen = pct(bayarBulanIni, totalRumah);
                  return (
                    <div key={b.block} style={styles.blockCard} onClick={() => { setSelectedBlock(b.block); setTab('iuran'); }}>
                      <div style={styles.blockCardTop}>
                        <div style={styles.listBadge}>{b.block}</div>
                        <div style={styles.listContent}>
                          <div style={styles.listTitle}>{b.label}</div>
                          <div style={styles.listSub}>{b.memberCount} Rumah</div>
                        </div>
                        <div style={styles.blockPct}>{persen}%</div>
                      </div>
                      <div style={styles.progressTrack}>
                        <div style={{ ...styles.progressFill, width: `${persen}%` }} />
                      </div>
                      <div style={styles.blockCardBottom}>
                        <span style={styles.blockPaid}>{formatCurrency(bs?.totalPaid)}</span>
                        <span style={styles.blockTarget}>{bayarBulanIni}/{totalRumah} bayar bulan ini</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== IURAN (Members) ===== */}
          {tab === 'iuran' && !selectedBlock && (
            <div>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>Pilih Blok</div>
              </div>
              <div style={isDesktop ? styles.listContainerDesktop : styles.listContainer}>
                {blockList.map(b => (
                  <div key={b.block} style={styles.listItem} onClick={() => setSelectedBlock(b.block)}>
                    <div style={styles.listBadge}>{b.block}</div>
                    <div style={styles.listContent}>
                      <div style={styles.listTitle}>{b.label}</div>
                      <div style={styles.listSub}>{b.memberCount} Rumah</div>
                    </div>
                    <div style={styles.listRight}>
                      <div style={styles.listArrow}>›</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'iuran' && selectedBlock && (
            <div>
              <div style={styles.backButton} onClick={() => setSelectedBlock(null)}>← Kembali</div>
              <div style={styles.blockInfoCard}>
                <div style={styles.blockInfoText}>
                  <div style={styles.blockInfoBadge}>{globalStats?.blocks?.[selectedBlock]?.label || `Blok ${selectedBlock}`}</div>
                  <div style={styles.blockInfoSub}>{members.length} Anggota</div>
                </div>
                <a href={`/api/pdf?block=${selectedBlock}`} style={styles.blockPdfBtn}>
                  ⬇️ Download PDF
                </a>
              </div>

              <div style={styles.searchBar}>
                <span style={styles.searchIcon}>🔍</span>
                <input
                  type="text"
                  placeholder="Cari no rumah atau nama..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value.toLowerCase()); setCurrentPage(1); }}
                  style={styles.searchInput}
                />
              </div>

              <div style={isDesktop ? styles.memberListDesktop : styles.memberList}>
                {pageMembers.map((m, i) => {
                  const paidMonths = MONTHS.filter(mo => m.payments[mo]).map(mo => MONTH_NAMES[mo]);
                  return (
                    <div key={i} style={styles.memberCard}>
                      <div style={styles.memberHeader}>
                        <div style={styles.memberHouse}>{m.houseNumber}</div>
                        <div style={styles.memberName}>{m.name || '-'}</div>
                        <div style={styles.memberCount}>{paidMonths.length}x</div>
                      </div>
                      {paidMonths.length > 0 ? (
                        <div style={styles.chipContainer}>
                          {paidMonths.map(mo => <span key={mo} style={styles.monthChip}>{mo}</span>)}
                        </div>
                      ) : (
                        <div style={styles.emptyStatus}>Nunggak</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div style={styles.pagination}>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={styles.pagBtn}>←</button>
                  <span style={styles.pagInfo}>{currentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={styles.pagBtn}>→</button>
                </div>
              )}
            </div>
          )}

          {/* ===== PENGELUARAN ===== */}
          {tab === 'pengeluaran' && (
            <div>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>Pengeluaran Per Bulan</div>
                <div style={styles.sectionAction}>{formatCurrency(g?.totalPengeluaran)}</div>
              </div>
              {(() => {
                const hist = globalStats?.pengeluaranHistory || [];
                const groups = MONTHS.map((mo, mi) => {
                  const items = hist.filter(it => new Date(it.date).getMonth() === mi);
                  const total = items.reduce((s, it) => s + Number(it.amount || 0), 0);
                  return { mo, mi, items, total };
                }).filter(gr => gr.items.length > 0);
                if (groups.length === 0) {
                  return <div style={styles.emptyBox}>Belum ada pengeluaran.</div>;
                }
                return (
                  <div style={isDesktop ? styles.listContainerDesktop : styles.listContainer}>
                    {groups.map(gr => {
                      const open = pengeluaranMonth === gr.mo;
                      return (
                        <div key={gr.mo}>
                          <div style={styles.listItem} onClick={() => setPengeluaranMonth(open ? null : gr.mo)}>
                            <div style={{...styles.listBadge, background: '#FEF2F2', color: '#EF4444', fontSize: '18px'}}>📤</div>
                            <div style={styles.listContent}>
                              <div style={styles.listTitle}>{MONTH_NAMES[gr.mo]} 2026</div>
                              <div style={styles.listSub}>{gr.items.length} transaksi • ketuk untuk detail</div>
                            </div>
                            <div style={{...styles.listAmount, color: '#EF4444'}}>-{formatCurrency(gr.total)}</div>
                          </div>
                          {open && (
                            <div style={styles.drillBox}>
                              {gr.items.slice().reverse().map((item, idx) => (
                                <div key={idx} style={styles.drillItem}>
                                  <div style={styles.drillContent}>
                                    <div style={styles.drillTitle}>{item.keterangan || '-'}</div>
                                    <div style={styles.drillSub}>{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {item.blockLabel}</div>
                                  </div>
                                  <div style={styles.drillAmount}>-{formatCurrency(item.amount)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ===== PEMASUKAN ===== */}
          {tab === 'pemasukan' && (
            <div>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>Pemasukan Per Blok</div>
                <div style={styles.sectionAction}>{formatCurrency(g?.totalPaid)}</div>
              </div>
              <div style={isDesktop ? styles.listContainerDesktop : styles.listContainer}>
                {blockList.map(b => {
                  const open = pemasukanBlock === b.block;
                  const perBulan = globalStats?.blocks?.[b.block]?.pemasukanPerBulan || [];
                  const rows = MONTHS.map((mo, mi) => ({ mo, mi, amount: perBulan[mi] || 0 }))
                    .filter(r => r.amount > 0);
                  return (
                    <div key={b.block}>
                      <div style={styles.listItem} onClick={() => setPemasukanBlock(open ? null : b.block)}>
                        <div style={styles.listBadge}>{b.block}</div>
                        <div style={styles.listContent}>
                          <div style={styles.listTitle}>{b.label}</div>
                          <div style={styles.listSub}>{b.memberCount} Rumah • ketuk untuk detail</div>
                        </div>
                        <div style={{...styles.listAmount, color: '#128F55'}}>{formatCurrency(globalStats?.blocks?.[b.block]?.totalPaid)}</div>
                      </div>
                      {open && (
                        <div style={styles.drillBox}>
                          {rows.length === 0 ? (
                            <div style={styles.drillEmpty}>Belum ada pemasukan.</div>
                          ) : rows.map(r => (
                            <div key={r.mo} style={styles.drillItem}>
                              <div style={styles.drillContent}>
                                <div style={styles.drillTitle}>{MONTH_NAMES[r.mo]} 2026</div>
                                <div style={styles.drillSub}>Iuran warga</div>
                              </div>
                              <div style={{...styles.drillAmount, color: '#128F55'}}>+{formatCurrency(r.amount)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* NAVIGATION: HP = bottom bar, PC = fixed sidebar kiri */}
        {isDesktop ? (
          <div style={styles.navSidebar}>
            <div style={styles.sidebarBrand}>
              <img src="/logo.png" alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>LAPORAN KAS IAMR</div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>Tahun 2026</div>
              </div>
            </div>
            {NAV.map(n => (
              <div key={n.key} style={tab === n.key ? styles.navSideActive : styles.navSideItem} onClick={() => goTab(n.key)}>
                <div style={styles.navIcon}><NavIcon name={n.icon} /></div>
                <div style={styles.navLabel}>{n.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.navBar}>
            {NAV.map(n => (
              <div key={n.key} style={tab === n.key ? styles.navActive : styles.navItem} onClick={() => goTab(n.key)}>
                <div style={styles.navIcon}><NavIcon name={n.icon} /></div>
                <div style={styles.navLabel}>{n.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  page: {
    maxWidth: '100%', margin: '0 auto', minHeight: '100vh',
    background: '#F8F9FB', fontFamily: 'Inter, -apple-system, sans-serif',
    color: '#111827', paddingBottom: '100px', position: 'relative', overflow: 'hidden',
  },
  pageDesktop: {
    paddingBottom: '40px', marginLeft: '250px',
  },
  headerSection: { position: 'relative', padding: '24px 20px 12px' },
  // ── Responsive helpers (legacy, tidak dipakai) ──
  register_column: {
    '@media (min-width: 900px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
  },
  register_row: {
    '@media (min-width: 900px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    },
  },
  houseIllustration: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0,
    pointerEvents: 'none',
  },
  headerTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    position: 'relative', zIndex: 1,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  logo: { width: '44px', height: '44px', borderRadius: '12px', objectFit: 'contain' },
  headerText: {},
  greetingText: { fontSize: '11px', color: '#6B7280', fontWeight: '500' },
  usernameText: { fontSize: '12px', fontWeight: '700', color: '#111827', letterSpacing: '0.2px' },
  headerRight: { 
    width: '40px', height: '40px', borderRadius: '12px', background: '#FFF',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', fontSize: '18px', cursor: 'pointer', position: 'relative',
  },

  content: { padding: '0 16px 140px', position: 'relative', zIndex: 1 },

  heroCard: {
    background: 'linear-gradient(135deg, #128F55 0%, #16A34A 100%)',
    borderRadius: '28px', padding: '22px', color: '#FFF',
    boxShadow: '0 12px 30px -10px rgba(18,143,85,0.4)',
    marginTop: '8px',
    display: 'flex', alignItems: 'stretch', gap: '14px',
    maxWidth: '920px',
  },
  heroLeft: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  heroTitle: { fontSize: '18px', fontWeight: '800', lineHeight: 1.2, letterSpacing: '-0.5px' },
  heroTagline: { fontSize: '12px', opacity: 0.85, marginTop: '6px', lineHeight: 1.4 },
  heroBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    marginTop: '18px', background: 'rgba(255,255,255,0.18)',
    padding: '10px 16px', borderRadius: '14px',
    fontSize: '13px', fontWeight: '700', cursor: 'pointer',
    backdropFilter: 'blur(4px)',
  },
  heroSlideshow: {
    position: 'relative', width: '190px', flexShrink: 0,
    alignSelf: 'stretch',
    margin: '-22px -22px -22px 0',
    borderRadius: '0 28px 28px 0', overflow: 'hidden',
    background: 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  heroSlideImg: {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', transition: 'opacity 0.6s ease',
    WebkitMaskImage: 'linear-gradient(to left, #000 55%, transparent 100%)',
    maskImage: 'linear-gradient(to left, #000 55%, transparent 100%)',
  },
  heroSlidePlaceholder: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
    color: 'rgba(255,255,255,0.9)',
  },
  heroSlideHint: { fontSize: '11px', opacity: 0.8, fontWeight: '600' },
  heroDots: {
    position: 'absolute', bottom: '8px', left: 0, right: 0,
    display: 'flex', justifyContent: 'center', gap: '5px', zIndex: 2,
  },
  heroDot: { width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)' },
  heroDotActive: { background: '#FFF', width: '14px', borderRadius: '3px' },

  ringkasanCard: {
    background: '#FFF', borderRadius: '22px', padding: '20px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.04)', marginTop: '14px',
  },
  ringkasanRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  ringkasanLabel: { fontSize: '13px', color: '#6B7280', fontWeight: '600' },
  ringkasanValueBig: { fontSize: '24px', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px' },
  ringkasanDivider: { height: '1px', background: '#F0F0F0', margin: '16px 0' },
  ringkasanStatsRow: {  },
  ringkasanStatRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' },
  ringkasanStatLabel: { fontSize: '13px', color: '#6B7280', fontWeight: '600' },
  ringkasanStatValue: { fontSize: '16px', fontWeight: '800' },
  ringkasanStatSep: { width: '1px', height: '28px', background: '#EEE' },

  gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '24px 0' },
  gridItem: {
    background: '#FFF', padding: '16px 8px', borderRadius: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)', textAlign: 'center', cursor: 'pointer',
  },
  gridIcon: { 
    width: '36px', height: '36px', borderRadius: '10px', margin: '0 auto 10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
  },
  gridLabel: { fontSize: '12px', color: '#6B7280', fontWeight: '500' },
  gridValue: { fontSize: '20px', fontWeight: '800', marginTop: '2px' },

  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '28px 0 16px' },
  sectionTitle: { fontSize: '17px', fontWeight: '700', color: '#111827' },
  sectionAction: { fontSize: '13px', color: '#128F55', fontWeight: '600' },

  listContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
  // 2-kolom di desktop (dipilih eksplisit via isDesktop)
  listContainerDesktop: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', alignItems: 'start' },
  listItem: {
    background: '#FFF', padding: '14px 16px', borderRadius: '22px',
    display: 'flex', alignItems: 'center', gap: '14px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)', cursor: 'pointer',
  },
  listBadge: {
    width: '44px', height: '44px', borderRadius: '14px', background: '#F0FDF4',
    color: '#128F55', fontSize: '19px', fontWeight: '800',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  listContent: { flex: 1 },
  listTitle: { fontSize: '15px', fontWeight: '700', color: '#111827' },
  listSub: { fontSize: '12px', color: '#9CA3AF', marginTop: '1px' },
  listRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  listAmount: { fontSize: '14px', fontWeight: '700', color: '#128F55' },
  listArrow: { fontSize: '20px', color: '#D1D5DB' },

  // Block card with progress bar
  blockCard: {
    background: '#FFF', padding: '16px', borderRadius: '22px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)', cursor: 'pointer',
  },
  blockCardTop: { display: 'flex', alignItems: 'center', gap: '14px' },
  blockPct: { fontSize: '15px', fontWeight: '800', color: '#128F55' },
  progressTrack: {
    height: '8px', borderRadius: '8px', background: '#F0F0F0',
    marginTop: '14px', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: '8px',
    background: 'linear-gradient(90deg, #16A34A, #128F55)',
    transition: 'width 0.6s ease',
  },
  blockCardBottom: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: '10px',
  },
  blockPaid: { fontSize: '14px', fontWeight: '700', color: '#128F55' },
  blockTarget: { fontSize: '12px', color: '#9CA3AF', fontWeight: '500' },
  monthGroup: { marginBottom: '18px' },
  monthGroupHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0 4px 8px',
  },
  monthGroupTitle: { fontSize: '14px', fontWeight: '800', color: '#111827' },
  monthGroupTotal: { fontSize: '14px', fontWeight: '800', color: '#EF4444' },
  emptyBox: {
    background: '#FFF', borderRadius: '16px', padding: '32px 20px',
    textAlign: 'center', color: '#9CA3AF', fontSize: '14px', fontWeight: '500',
  },
  drillBox: {
    background: '#F8FAFC', borderRadius: '14px', padding: '4px 14px',
    margin: '2px 0 10px', border: '1px solid #EEF2F6',
  },
  drillItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid #EEF2F6',
  },
  drillContent: { display: 'flex', flexDirection: 'column', gap: '2px' },
  drillTitle: { fontSize: '13px', fontWeight: '700', color: '#111827' },
  drillSub: { fontSize: '11px', color: '#9CA3AF', fontWeight: '500' },
  drillAmount: { fontSize: '13px', fontWeight: '700', color: '#EF4444' },
  drillEmpty: { padding: '14px 0', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' },
  statusDrill: {
    background: '#FFF', borderRadius: '16px', padding: '8px 14px',
    marginBottom: '16px', boxShadow: '0 2px 10px rgba(17,24,39,0.05)',
  },
  statusDrillHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 2px', borderBottom: '1px solid #F0F0F0',
  },
  statusDrillTitle: { fontSize: '14px', fontWeight: '800' },
  statusDrillCount: { fontSize: '12px', color: '#9CA3AF', fontWeight: '600' },
  statusDrillItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 0', borderBottom: '1px solid #F6F6F6',
  },
  statusDrillBadge: {
    minWidth: '38px', height: '30px', padding: '0 6px', borderRadius: '9px',
    border: '1.5px solid', display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0,
  },
  statusDrillInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' },
  statusDrillName: { fontSize: '13px', fontWeight: '700', color: '#111827' },
  statusDrillSub: { fontSize: '11px', color: '#9CA3AF', fontWeight: '500' },
  statusDrillKet: { fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' },
  blockPdfBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0,
    padding: '8px 12px', background: '#F0FDF4', color: '#128F55',
    borderRadius: '10px', fontSize: '12px', fontWeight: '700',
    textDecoration: 'none', border: '1px solid #D1FAE5', whiteSpace: 'nowrap',
  },

  ringkasanTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' },
  ringkasanMini: { flex: 1, textAlign: 'center' },
  ringkasanMiniLabel: { fontSize: '11px', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
  ringkasanMiniValue: { fontSize: '22px', fontWeight: '800', color: '#111827', marginTop: '3px' },

  // Iuran Detail
  backButton: { fontSize: '13px', fontWeight: '600', color: '#128F55', marginBottom: '16px', cursor: 'pointer' },
  blockInfoCard: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' },
  blockInfoBadge: {
    minWidth: '50px', height: '44px', borderRadius: '14px', background: '#128F55',
    color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', fontWeight: '800', padding: '0 16px',
  },
  blockInfoText: { display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' },
  blockInfoTitle: { fontSize: '20px', fontWeight: '800' },
  blockInfoSub: { fontSize: '14px', color: '#6B7280', fontWeight: '600' },

  searchBar: {
    background: '#FFF', borderRadius: '16px', padding: '0 16px',
    display: 'flex', alignItems: 'center', gap: '10px',
    border: '1px solid #E5E7EB', marginBottom: '16px',
  },
  searchIcon: { color: '#9CA3AF', fontSize: '16px' },
  searchInput: {
    border: 'none', background: 'transparent', outline: 'none',
    width: '100%', padding: '14px 0', fontSize: '14px', color: '#111827',
  },

  memberList: { display: 'grid', gridTemplateColumns: '1fr', gap: '10px' },
  // Multi-kolom di desktop (dipilih eksplisit via isDesktop)
  memberListDesktop: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' },
  memberCard: {
    background: '#FFF', padding: '18px', borderRadius: '22px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
  },
  memberHeader: { display: 'flex', alignItems: 'center', gap: '12px' },
  memberHouse: { fontSize: '16px', fontWeight: '800', color: '#128F55', minWidth: '40px' },
  memberName: { flex: 1, fontSize: '15px', fontWeight: '600' },
  memberCount: { 
    fontSize: '12px', fontWeight: '700', background: '#F0FDF4', color: '#128F55',
    padding: '4px 10px', borderRadius: '8px',
  },
  chipContainer: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' },
  monthChip: {
    fontSize: '10px', fontWeight: '700', color: '#128F55', background: '#F0FDF4',
    padding: '5px 10px', borderRadius: '7px', textTransform: 'uppercase',
  },
  emptyStatus: { fontSize: '13px', color: '#EF4444', fontWeight: '600', marginTop: '14px' },

  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '20px' },
  pagBtn: { 
    width: '44px', height: '44px', borderRadius: '14px', border: 'none',
    background: '#FFF', color: '#128F55', fontSize: '18px', fontWeight: '700',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer',
  },
  pagInfo: { fontSize: '14px', color: '#6B7280', fontWeight: '500' },

  // NAVIGASI MOBILE (bottom bar)
  navBar: {
    position: 'fixed', bottom: '20px', left: '20px', right: '20px',
    maxWidth: '420px', margin: '0 auto',
    background: 'rgba(190,226,205,0.96)', backdropFilter: 'blur(12px)',
    borderRadius: '20px', border: '1px solid #A6D4BC',
    display: 'flex', justifyContent: 'space-around', padding: '10px 6px',
    boxShadow: '0 6px 20px rgba(18,143,85,0.16)', zIndex: 100,
  },
  navItem: { flex: 1, textAlign: 'center', color: '#7BA890', cursor: 'pointer', transition: 'color 0.2s' },
  navActive: { flex: 1, textAlign: 'center', color: '#0B6B3F', cursor: 'pointer' },

  // NAVIGASI DESKTOP (fixed sidebar kiri)
  sidebarBrand: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '0 14px 18px', borderBottom: '1px solid #EEF2F6',
    marginBottom: '14px',
  },
  navSidebar: {
    position: 'fixed', top: 0, left: 0, bottom: 0, width: '250px',
    background: '#FFFFFF', borderRight: '1px solid #EEF2F6',
    display: 'flex', flexDirection: 'column',
    padding: '24px 14px', gap: '8px', zIndex: 100,
    boxShadow: '2px 0 20px rgba(0,0,0,0.04)',
  },
  navSideItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 14px', borderRadius: '14px',
    color: '#6B7280', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
  },
  navSideActive: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 14px', borderRadius: '14px',
    background: '#F0FDF4', color: '#128F55', cursor: 'pointer', fontWeight: '800', fontSize: '14px',
  },
  navIcon: { fontSize: '19px', marginBottom: '3px' },
  navLabel: { fontSize: '10px', fontWeight: '600' },

  // NOTIFIKASI
  notifOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    zIndex: 1000, display: 'flex', alignItems: 'flex-start',
    justifyContent: 'center', paddingTop: '80px',
  },
  notifPanel: {
    background: '#FFF', borderRadius: '24px', width: 'calc(100% - 40px)',
    maxWidth: '380px', maxHeight: '60vh', overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  notifHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 20px', borderBottom: '1px solid #F0F0F0',
  },
  notifTitle: { fontSize: '16px', fontWeight: '800', color: '#111827' },
  notifClose: { width: '30px', height: '30px', borderRadius: '8px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', cursor: 'pointer', color: '#6B7280' },
  notifBody: { overflow: 'auto', maxHeight: '50vh', padding: '8px 0' },
  notifEmpty: { padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', fontWeight: '600' },
  notifItem: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '14px 20px', borderBottom: '1px solid #F6F6F6',
  },
  notifIconItem: { fontSize: '18px', flexShrink: 0, marginTop: '2px' },
  notifContent: { flex: 1 },
  notifText: { fontSize: '13px', color: '#111827', fontWeight: '600', lineHeight: 1.4 },
  notifDate: { fontSize: '11px', color: '#9CA3AF', fontWeight: '500', marginTop: '4px' },
};
