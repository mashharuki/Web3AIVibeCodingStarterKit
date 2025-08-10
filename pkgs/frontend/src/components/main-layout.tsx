import type { ReactNode } from 'react';
import { Footer } from './footer';
import { Header } from './header';

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * ページ全体のメインレイアウトコンポーネント
 * ヘッダー、フッター、メインコンテンツエリアを含みます。
 */
export function MainLayout({ children }: MainLayoutProps): ReactNode {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
