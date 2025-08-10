"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * ヘッダーコンポーネント
 * ナビゲーションリンクとウォレット接続ボタンを含む
 */
export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "スワップ" },
    { href: "/liquidity", label: "流動性" },
    { href: "/positions", label: "ポジション" },
    { href: "/faucet", label: "Faucet" },
  ];

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* ロゴ */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              🌊 DEX Starter Kit
            </Link>
          </div>

          {/* ナビゲーション */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  pathname === item.href
                    ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                    : "text-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* ウォレット接続ボタン */}
          <div className="flex items-center">
            <ConnectButton />
          </div>
        </div>

        {/* モバイル ナビゲーション */}
        <nav className="md:hidden pb-4">
          <div className="flex space-x-4 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap text-sm font-medium transition-colors hover:text-blue-600 ${
                  pathname === item.href
                    ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                    : "text-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
