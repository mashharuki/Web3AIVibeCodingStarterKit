import { Header } from "@/components/layout/Header";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { TransactionNotifications } from "@/components/ui/TransactionNotifications";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Web3 DEX",
  description: "分散型取引所（DEX）のスターターキット",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900`}
      >
        <Web3Provider>
          <div className="min-h-screen flex flex-col relative">
            {/* 背景エフェクト */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />

            <Header />
            <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
              {children}
            </main>
          </div>
          <TransactionNotifications />
          <Toaster />
        </Web3Provider>
      </body>
    </html>
  );
}
