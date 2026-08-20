/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Vercel mem-bundle tiap API route sebagai serverless function terpisah dan
  // hanya menyertakan file yang bisa dilacak secara statis. File yang dibaca
  // saat runtime lewat path.join(process.cwd(), ...) TIDAK terlacak otomatis,
  // jadi harus didaftarkan di sini. Tanpa ini /api/og balas HTTP 500 di
  // produksi (font tidak ditemukan) walaupun lokal jalan normal.
  outputFileTracingIncludes: {
    // next/og memuat binary WASM-nya secara dinamis saat runtime, jadi jejaknya
    // tidak terdeteksi otomatis dan harus ikut dibundel manual.
    '/api/og': [
      './public/fonts/**',
      './data.json',
      './node_modules/next/dist/compiled/@vercel/og/**',
    ],
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
