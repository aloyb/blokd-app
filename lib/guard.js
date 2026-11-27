// Penjaga untuk endpoint yang MENGUBAH data.
//
// Web ini publik dan read-only: pencatatan iuran/setoran dilakukan lewat
// asisten (edit data.json langsung + redeploy), bukan lewat form di web.
// Tanpa penjaga ini, siapa pun yang tahu URL-nya bisa POST dan memanipulasi data.
//
// Cara pakai (opsional, kalau suatu saat butuh akses tulis):
//   1. Set env var ADMIN_TOKEN di Vercel dengan nilai acak yang panjang.
//   2. Kirim request dengan header: x-admin-token: <nilai ADMIN_TOKEN>
// Kalau ADMIN_TOKEN tidak di-set, semua akses tulis ditolak (aman secara default).

// Perbandingan waktu-konstan sederhana supaya token tidak bisa ditebak
// lewat pengukuran waktu respons.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Menolak request kalau tidak berwenang.
 * @returns {boolean} true = sudah dibalas (ditolak), pemanggil harus berhenti.
 */
export function rejectUnauthorized(req, res) {
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    res.status(403).json({
      error: 'Akses tulis dinonaktifkan. Web ini read-only untuk umum.',
    });
    return true;
  }

  const provided = req.headers['x-admin-token'];
  if (!safeEqual(String(provided || ''), expected)) {
    res.status(401).json({ error: 'Token tidak valid' });
    return true;
  }

  return false;
}
