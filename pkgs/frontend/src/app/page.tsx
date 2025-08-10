import { MainLayout } from '@/components/main-layout';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * ホームページコンポーネント
 * NFTマーケットプレイスのメインページを表示します。
 */
export default function HomePage(): ReactNode {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* ヒーローセクション */}
        <section className="text-center py-20">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Web3 NFT
            <span className="text-primary"> Marketplace</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            ブロックチェーン技術を活用したNFTマーケットプレイス。
            <br />
            あなただけのデジタルアセットを作成・売買・取引できます。
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/nfts"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
            >
              NFTを探す
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8"
            >
              NFTを作成
            </Link>
          </div>
        </section>

        {/* 特徴セクション */}
        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-12">プラットフォームの特徴</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-primary rounded" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ガスレス取引</h3>
              <p className="text-muted-foreground">
                Biconomyのアカウント抽象化技術により、ガス代を気にせずNFT取引が可能です。
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-primary rounded" />
              </div>
              <h3 className="text-xl font-semibold mb-2">簡単ログイン</h3>
              <p className="text-muted-foreground">
                Privyによる社会的ログインで、MetaMaskなしでも簡単にWeb3体験を開始できます。
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-primary rounded" />
              </div>
              <h3 className="text-xl font-semibold mb-2">分散化ストレージ</h3>
              <p className="text-muted-foreground">
                IPFSを活用し、NFTのメタデータと画像を安全に分散保存します。
              </p>
            </div>
          </div>
        </section>

        {/* NFT一覧セクション (仮) */}
        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-12">注目のNFT</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {/* プレースホルダー */}
            {Array.from({ length: 4 }, (_, i) => `placeholder-${i + 1}`).map((id, i) => (
              <div key={id} className="border rounded-lg p-4">
                <div className="aspect-square bg-muted rounded-lg mb-4" />
                <h3 className="font-semibold mb-1">NFT #{i + 1}</h3>
                <p className="text-sm text-muted-foreground mb-2">Creator</p>
                <p className="font-semibold">0.1 ETH</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
