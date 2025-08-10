import { APP_NAME } from '@/lib/constants';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * アプリケーションのフッターコンポーネント
 * サイトマップ、リンク、コピーライト情報を含みます。
 */
export function Footer(): ReactNode {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container px-4 py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* ブランド情報 */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-6 w-6 rounded bg-primary" />
              <span className="font-bold">{APP_NAME}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Web3技術を活用したNFTマーケットプレイス。
              <br />
              NFTの作成、売買、取引ができるプラットフォームです。
            </p>
          </div>

          {/* ナビゲーションリンク */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">プラットフォーム</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground">
                  ホーム
                </Link>
              </li>
              <li>
                <Link href="/create" className="text-muted-foreground hover:text-foreground">
                  NFT作成
                </Link>
              </li>
              <li>
                <Link href="/my-page" className="text-muted-foreground hover:text-foreground">
                  マイページ
                </Link>
              </li>
            </ul>
          </div>

          {/* サポートリンク */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">サポート</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                  ヘルプセンター
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                  プライバシーポリシー
                </Link>
              </li>
            </ul>
          </div>

          {/* ソーシャルリンク */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">コミュニティ</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                  Twitter
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                  Discord
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                  GitHub
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* コピーライト */}
        <div className="mt-8 border-t pt-8">
          <p className="text-center text-sm text-muted-foreground">
            © {currentYear} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
