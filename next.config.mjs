/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Vercel mem-bundle tiap API route sebagai serverless function terpisah dan
  // hanya menyertakan file yang bisa dilacak secara statis. File yang dibaca
  // saat runtime lewat path.join(process.cwd(), ...) TIDAK terlacak otomatis,
  // jadi harus didaftarkan di sini. Tanpa ini API-nya balas HTTP 500 di
  // produksi (data.json tidak ditemukan) walaupun lokal jalan normal.
  //
  // CATATAN: /api/og sudah DIHAPUS. OG image sekarang = file statis
  // public/og-image.png (screenshot halaman depan via scripts/generate-og.mjs).
  outputFileTracingIncludes: {
    '/api/pdf': ['./data.json'],
    '/api/pdf-bulan': ['./data.json'],
    '/api/stats': ['./data.json'],
    '/api/members': ['./data.json'],
  },

  // Repo ini punya package-lock.json di root workspace DAN di folder app,
  // yang bikin Next salah menebak root. Pin ke folder ini.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
