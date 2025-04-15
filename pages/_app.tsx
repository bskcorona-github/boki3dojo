import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="簿記3級の仕訳問題に特化した学習アプリ"
        />
        <title>簿記3級道場</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
