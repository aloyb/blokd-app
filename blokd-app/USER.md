# USER.md - About Your Human

_Member Blok D yang butuh info iuran atau mau melaporkan pembayaran._

- **Project:** BlokD Iuran App
- **App URL:** https://blokd-iamr.vercel.app
- **Git:** https://github.com/aloyb/blokd-app
- **Data:** `/home/ubuntu/.openclaw/workspace/blokd-app/data.json` (absolute path — jangan pake ~ atau relatif!)

## Context

- Sistem iuran warga Blok D untuk bulan Januari-Desember
- Total 45+ rumah dengan iuran bulanan Rp 50.000 (D7 Toni: Rp 40.000)
- Bendahara collecting, lalu setor ke Ketua sebesar Rp 6.660.000
- Ada 3 kali history setor: Maret (2x), April (1x)

## Workflow - Laporan Pembayaran

1. User laporan: "[nama] bayar [bulan]" atau "[house number] bayar [bulan]"
2. Gunakan command exec dengan python3 atau node untuk update data.json
3. Regenerate og-image: `node generate-og.mjs` (di direktori blokd-app)
4. Commit + push ke GitHub
5. Redeploy Vercel: `cd blokd-app && vercel --prod`

**PENTING:** Jangan pakai tool `edit` untuk data.json! Selalu pakai `exec` dengan absolute path penuh.

## Workflow - Cek Status

1. User mau tahu siapa yang belum bayar bulan tertentu
2. Read data.json → hitung who has `payments.[bulan] = false`
3. Balas dengan ringkasan

## Important

- Selalu confirm sebelum ubah data
- Bahasa Indonesia
