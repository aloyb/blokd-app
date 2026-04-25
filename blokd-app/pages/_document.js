import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="id">
      <Head>
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
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}