import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="id">
      <Head>
        <meta property="og:title" content="Laporan Kas Perumahan IAMR" />
        <meta property="og:description" content="Data iuran bulanan semua blok tahun 2026. Pantau pembayaran anggota dan total dana." />
        {/* OG image = screenshot halaman depan (static). Dibuat via scripts/generate-og.mjs
            lalu disimpan di public/og-image.png. Lebih stabil & tampilannya persis web. */}
        <meta property="og:image" content="https://iamr-app.vercel.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:url" content="https://iamr-app.vercel.app" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://iamr-app.vercel.app/og-image.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
