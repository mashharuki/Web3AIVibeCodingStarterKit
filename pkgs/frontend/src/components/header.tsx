'use client';

import { SearchBar } from '@/components/search';
import { APP_NAME } from '@/lib/constants';
import { useLogin, useLogout, usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * アプリケーションのヘッダーコンポーネント
 * ナビゲーション、ロゴ、認証ボタンを含みます。
 */
export function Header(): ReactNode {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();
  const router = useRouter();

  /**
   * 検索処理
   */
  const handleSearch = (query: string) => {
    if (query.trim()) {
      // NFT一覧ページに検索クエリを渡して遷移
      router.push(`/nfts?search=${encodeURIComponent(query)}`);
    } else {
      router.push('/nfts');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* ロゴとサイト名 */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary" />
          <span className="hidden font-bold sm:inline-block">{APP_NAME}</span>
        </Link>

        {/* 検索バー */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <SearchBar 
            onSearch={handleSearch}
            placeholder="NFTを検索..."
          />
        </div>

        {/* ナビゲーションメニュー */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link
            href="/"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            ホーム
          </Link>
          <Link
            href="/nfts"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            NFT一覧
          </Link>
          <Link
            href="/create"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            NFT作成
          </Link>
          {authenticated && (
            <Link
              href="/my-page"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              マイページ
            </Link>
          )}
        </nav>

        {/* 認証ボタン */}
        <div className="flex items-center space-x-2">
          {ready && !authenticated && (
            <button
              type="button"
              onClick={login}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              ログイン
            </button>
          )}

          {ready && authenticated && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {user?.email?.address || `${user?.wallet?.address?.slice(0, 6)}...`}
              </span>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
