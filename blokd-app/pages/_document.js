import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="id">
      <Head>
        <meta property="og:title" content="BlokD - Iuran RT" />
        <meta property="og:description" content="Web iuran bulanan Blok D" />
        <meta property="og:url" content="https://blokd-iamr.vercel.app" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
