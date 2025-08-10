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
    { href: "/", label: "スワップ", icon: "🔄" },
    { href: "/liquidity", label: "流動性", icon: "💧" },
    { href: "/positions", label: "ポジション", icon: "📊" },
    { href: "/faucet", label: "Faucet", icon: "🚰" },
  ];

  return (
    <header className="backdrop-blur-md bg-white/5 border-b border-white/10 shadow-2xl relative z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* ロゴ */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                <span className="text-xl">🌊</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Vibe DEX</h1>
                <p className="text-xs text-gray-400">分散型取引所</p>
              </div>
            </Link>
          </div>

          {/* ナビゲーション */}
          <nav className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  pathname === item.href
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* ウォレット接続ボタン */}
          <div className="flex items-center">
            <div className="[&>div]:rounded-xl [&>button]:!bg-gradient-to-r [&>button]:!from-emerald-500 [&>button]:!to-blue-500 [&>button]:!border-0 [&>button]:!shadow-lg [&>button]:hover:!shadow-xl [&>button]:!transition-all [&>button]:!duration-200 [&>button]:hover:!scale-105">
              <ConnectButton />
            </div>
          </div>
        </div>

        {/* モバイル ナビゲーション */}
        <nav className="md:hidden pb-4">
          <div className="flex space-x-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  pathname === item.href
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
