import { Navigation } from "@/components/navigation";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { ToasterProvider } from "@/components/feedback/Toaster";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AMM DEX",
  description: "Uniswap-like AMM DEX for learning purposes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {/* Skip to content */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          コンテンツへスキップ
        </a>
        <Web3Provider>
          <ThemeProvider>
            <ToasterProvider>
              <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 dark:to-muted/20">
                <Navigation />
                <main id="main-content" className="pb-8 relative">
                  {children}
                </main>
              </div>
            </ToasterProvider>
          </ThemeProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
