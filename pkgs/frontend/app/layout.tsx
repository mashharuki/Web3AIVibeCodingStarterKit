import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "NFT Marketplace - Web3 NFT取引プラットフォーム",
  description:
    "モダンで安全なNFTマーケットプレイス。Privyによる認証とBiconomyによるアカウント抽象化で快適な取引体験を提供します。",
  keywords: ["NFT", "マーケットプレイス", "Web3", "ブロックチェーン", "Ethereum"],
  authors: [{ name: "NFT Marketplace Team" }],
  openGraph: {
    title: "NFT Marketplace",
    description: "モダンで安全なNFTマーケットプレイス",
    type: "website",
    locale: "ja_JP",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8B5CF6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Header />
          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
