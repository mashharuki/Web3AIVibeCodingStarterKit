import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import Head from "next/head";

const inter = Inter({ subsets: ["latin"] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>AMM DEX - Decentralized Exchange</title>
        <meta name="description" content="UniswapライクなAMM DEX" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#667eea" />
      </Head>
      <div className={inter.className}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
