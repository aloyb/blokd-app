# MEMORI

## Alur Laporan

Ada **2 jenis laporan** dari user:

### 1️⃣ Laporan Bayar Iuran
Contoh: *"D17 bayar 2 bulan"* atau *"Sain bayar Juni"*
- Langsung update `data.json`: tandai bulan-bulan yang belum dibayar jadi `true`
- Tidak perlu tanya rincian lagi — asumsikan bayar untuk bulan berikutnya yang belum terbayar
- Tetap konfirmasi jika ada ambiguitas

### 2️⃣ Laporan Pengeluaran
Contoh: *"Pengeluaran 100.000 tanggal 20 Juni untuk konsumsi gotong royong"*
atau *"Setor 1.400.000 ke ketua 12 Mei"*
- Tambah entry baru ke `setorHistory` di `data.json`:
  ```json
  { "date": "2026-06-20", "amount": 100000, "keterangan": "Konsumsi gotong royong" }
  ```
- `setorHistory` adalah satu-satunya tempat untuk **semua pengeluaran** (setor ke ketua, konsumsi, dll)

### Flow setelah update data.json (kedua jenis laporan):
1. ✅ Update `data.json`
2. ✅ Regenerate OG image: `node generate-og.mjs` (di direktori blokd-app)
3. ✅ Git commit + push ke `master`
4. ✅ Redeploy Vercel: `vercel --prod` (di direktori blokd-app)

### Catatan
- `setorHistory` di data.json sudah menyatu — semua jenis pengeluaran masuk sini
- Website menampilkan "Riwayat Pengeluaran" yang isinya dari `setorHistory`
- Statistik: Dana Yang Dikeluarkan = total seluruh `setorHistory`
- Hanya update data dengan `exec` command, jangan pakai tool `edit` untuk data.json
