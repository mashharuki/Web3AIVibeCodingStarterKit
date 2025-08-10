'use client';

import { MainLayout } from '@/components/main-layout';
import { useUserNFTs } from '@/hooks/useNFTs';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';

/**
 * プロフィールページコンポーネント
 * ユーザーのNFTコレクションと取引履歴を表示します。
 */
export default function ProfilePage() {
  const { user } = usePrivy();
  const { 
    data: userNFTs = []
  } = useUserNFTs();

  const ownedNFTs = userNFTs;
  const createdNFTs = userNFTs.filter(nft => nft.creator === user?.wallet?.address);
  const listedNFTs = userNFTs.filter(nft => nft.isListed);

  if (!user?.wallet?.address) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">ウォレットに接続してください</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* プロフィールヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">あなたのプロフィール</h1>
              <p className="text-white/80 mb-2">
                ウォレットアドレス: {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
              </p>
              <div className="flex gap-4 text-sm">
                <span>作成済み: {createdNFTs.length} NFT</span>
                <span>所有中: {ownedNFTs.length} NFT</span>
                <span>販売中: {listedNFTs.length} NFT</span>
              </div>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b mb-8">
          <nav className="flex space-x-8">
            <button
              type="button"
              className="py-2 px-1 border-b-2 border-primary font-medium text-primary"
            >
              所有中のNFT
            </button>
            <button
              type="button"
              className="py-2 px-1 border-b-2 border-transparent font-medium text-muted-foreground hover:text-foreground"
            >
              作成したNFT
            </button>
            <button
              type="button"
              className="py-2 px-1 border-b-2 border-transparent font-medium text-muted-foreground hover:text-foreground"
            >
              お気に入り
            </button>
          </nav>
        </div>

        {/* NFTグリッド */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">所有中のNFT ({ownedNFTs.length}個)</h2>
            <div className="flex gap-2">
              <select className="px-3 py-2 border rounded-md text-sm">
                <option>すべて</option>
                <option>販売中</option>
                <option>未出品</option>
              </select>
              <select className="px-3 py-2 border rounded-md text-sm">
                <option>最新順</option>
                <option>価格: 高い順</option>
                <option>価格: 安い順</option>
                <option>名前順</option>
              </select>
            </div>
          </div>

          {ownedNFTs.length > 0 ? (
            <div className="grid md:grid-cols-4 gap-6">
              {ownedNFTs.map((nft) => (
                <Link key={nft.tokenId} href={`/nfts/${nft.tokenId}`}>
                  <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative">
                      <span className="text-2xl">🎨</span>
                      {nft.isListed && (
                        <span className="absolute top-2 right-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          販売中
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2 truncate">
                        {nft.metadata?.name || `NFT #${nft.tokenId}`}
                      </h3>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {nft.isListed && nft.price 
                            ? `${(Number(nft.price) / 1e18).toFixed(3)} ETH`
                            : '未出品'
                          }
                        </span>
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            // ここで編集/出品モーダルを開く
                          }}
                        >
                          {nft.isListed ? '編集' : '出品'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">まだNFTを所有していません</p>
              <Link 
                href="/create"
                className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                最初のNFTを作成
              </Link>
            </div>
          )}
        </div>

        {/* 統計情報 */}
        <div className="mt-12 grid md:grid-cols-4 gap-6">
          <div className="bg-muted/50 p-6 rounded-lg text-center">
            <div className="text-2xl font-bold mb-2">
              {ownedNFTs.length > 0 ? (
                ownedNFTs
                  .filter((nft) => nft.isListed && nft.price)
                  .reduce((total, nft) => total + Number(nft.price) / 1e18, 0)
                  .toFixed(2)
              ) : '0.00'} ETH
            </div>
            <div className="text-sm text-muted-foreground">総出品価値</div>
          </div>
          <div className="bg-muted/50 p-6 rounded-lg text-center">
            <div className="text-2xl font-bold mb-2">
              {listedNFTs.length > 0 ? (
                (listedNFTs
                  .reduce((total, nft) => total + (Number(nft.price) || 0) / 1e18, 0) / listedNFTs.length)
                  .toFixed(3)
              ) : '0.000'} ETH
            </div>
            <div className="text-sm text-muted-foreground">平均出品価格</div>
          </div>
          <div className="bg-muted/50 p-6 rounded-lg text-center">
            <div className="text-2xl font-bold mb-2">{createdNFTs.length}</div>
            <div className="text-sm text-muted-foreground">作成したNFT</div>
          </div>
          <div className="bg-muted/50 p-6 rounded-lg text-center">
            <div className="text-2xl font-bold mb-2">{listedNFTs.length}</div>
            <div className="text-sm text-muted-foreground">販売中のNFT</div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
