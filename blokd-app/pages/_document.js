import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="id">
      <Head>
        <meta property="og:title" content="BlokD - Iuran RT" />
        <meta property="og:description" content="BlokD Iuran RT. Pantau 3 arus uang: Total Dana, Setor ke Ketua, Hold Bendahara." />
        <meta property="og:image" content="https://blokd-iamr.vercel.app/api/og" />
        <meta property="og:url" content="https://blokd-iamr.vercel.app" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://blokd-iamr.vercel.app/api/og" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
