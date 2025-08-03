"use client";

import Link from "next/link";
import { WalletButton } from "./wallet-button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* ロゴ */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-nft-primary to-nft-secondary" />
          <span className="text-xl font-bold">NFT Marketplace</span>
        </Link>

        {/* ナビゲーション */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/nfts" className="text-sm font-medium transition-colors hover:text-primary">
            マーケット
          </Link>
          <Link href="/create" className="text-sm font-medium transition-colors hover:text-primary">
            NFT作成
          </Link>
          <Link
            href="/profile"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            マイページ
          </Link>
        </nav>

        {/* ウォレット接続ボタン */}
        <WalletButton />
      </div>
    </header>
  );
}
