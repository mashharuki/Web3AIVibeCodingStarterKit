'use client';

import { CancelListingModal, ListNFTModal } from '@/components/nft-listing-modals';
import { type NFTData, useUserNFTs } from '@/hooks/useNFTs';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

type TabType = 'owned' | 'created' | 'listed' | 'offers' | 'favorites';

/**
 * マイページコンポーネント
 * ユーザーのNFTコレクション、取引履歴、プロフィール管理
 */
export default function MyPage() {
  const { user } = usePrivy();
  const { data: userNFTs = [] } = useUserNFTs();
  const [activeTab, setActiveTab] = useState<TabType>('owned');
  
  // モーダル状態管理
  const [listModalOpen, setListModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFTData | null>(null);

  // NFTを分類
  const ownedNFTs = userNFTs;
  const createdNFTs = userNFTs.filter(nft => nft.creator === user?.wallet?.address);
  const listedNFTs = userNFTs.filter(nft => nft.isListed);
  
  // モックデータ（今後実装予定）
  const receivedOffers: NFTData[] = []; // 受け取ったオファー
  const favoriteNFTs: NFTData[] = []; // お気に入りNFT

  if (!user?.wallet?.address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              🔒
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">ウォレットに接続してください</h2>
          <p className="text-muted-foreground mb-6">
            マイページを表示するには、ウォレットに接続する必要があります。
          </p>
        </div>
      </div>
    );
  }

  /**
   * タブの定義
   */
  const tabs = [
    { 
      id: 'owned' as TabType, 
      label: '所有NFT', 
      count: ownedNFTs.length,
      icon: '🖼️'
    },
    { 
      id: 'created' as TabType, 
      label: '作成NFT', 
      count: createdNFTs.length,
      icon: '🎨'
    },
    { 
      id: 'listed' as TabType, 
      label: '出品中', 
      count: listedNFTs.length,
      icon: '🏷️'
    },
    { 
      id: 'offers' as TabType, 
      label: '受信オファー', 
      count: receivedOffers.length,
      icon: '💌'
    },
    { 
      id: 'favorites' as TabType, 
      label: 'お気に入り', 
      count: favoriteNFTs.length,
      icon: '❤️'
    },
  ];

  /**
   * アクティブなタブのNFTデータを取得
   */
  const getActiveTabData = () => {
    switch (activeTab) {
      case 'owned':
        return ownedNFTs;
      case 'created':
        return createdNFTs;
      case 'listed':
        return listedNFTs;
      case 'offers':
        return receivedOffers;
      case 'favorites':
        return favoriteNFTs;
      default:
        return [];
    }
  };

  const activeTabData = getActiveTabData();

  /**
   * 出品モーダルを開く
   */
  const openListModal = (nft: NFTData) => {
    setSelectedNFT(nft);
    setListModalOpen(true);
  };

  /**
   * 出品キャンセルモーダルを開く
   */
  const openCancelModal = (nft: NFTData) => {
    setSelectedNFT(nft);
    setCancelModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* プロフィールヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-3xl flex-shrink-0">
            👤
          </div>
          <div className="flex-grow">
            <h1 className="text-3xl font-bold mb-2">マイページ</h1>
            <p className="text-white/80 mb-2">
              ウォレットアドレス: {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>作成済み: {createdNFTs.length} NFT</span>
              <span>所有中: {ownedNFTs.length} NFT</span>
              <span>販売中: {listedNFTs.length} NFT</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/create"
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              新しいNFTを作成
            </Link>
            <button
              type="button"
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              プロフィール編集
            </button>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b mb-8">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div>
        {/* タブヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {tabs.find(tab => tab.id === activeTab)?.label} ({activeTabData.length}個)
          </h2>
          
          {/* ソート・フィルター */}
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

        {/* NFTグリッド */}
        {activeTabData.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              {tabs.find(tab => tab.id === activeTab)?.icon}
            </div>
            <h3 className="text-lg font-medium mb-2">
              {activeTab === 'owned' && 'まだNFTを所有していません'}
              {activeTab === 'created' && 'まだNFTを作成していません'}
              {activeTab === 'listed' && 'まだNFTを出品していません'}
              {activeTab === 'offers' && 'まだオファーを受信していません'}
              {activeTab === 'favorites' && 'まだお気に入りがありません'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {activeTab === 'owned' && 'マーケットプレイスでNFTを購入してみましょう'}
              {activeTab === 'created' && '新しいNFTを作成してみましょう'}
              {activeTab === 'listed' && '所有しているNFTを出品してみましょう'}
              {activeTab === 'offers' && 'NFTが出品されるとオファーが届きます'}
              {activeTab === 'favorites' && '気に入ったNFTをお気に入りに追加しましょう'}
            </p>
            {activeTab === 'created' && (
              <Link
                href="/create"
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                新しいNFTを作成
              </Link>
            )}
            {activeTab === 'owned' && (
              <Link
                href="/nfts"
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                NFTマーケットプレイスを見る
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeTabData.map((nft) => (
              <div
                key={nft.tokenId}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <Link href={`/nfts/${nft.tokenId}`}>
                  <div className="aspect-square relative bg-muted">
                    {nft.metadata?.image ? (
                      <Image
                        src={nft.metadata.image}
                        alt={nft.metadata.name || 'NFT'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🎨
                      </div>
                    )}
                  </div>
                </Link>
                
                <div className="p-4">
                  <h3 className="font-semibold mb-2 truncate">
                    {nft.metadata?.name || `NFT #${nft.tokenId}`}
                  </h3>
                  
                  <div className="flex justify-between items-center mb-3">
                    {nft.isListed && nft.price ? (
                      <span className="font-bold text-lg">
                        {(Number(nft.price) / 1e18).toFixed(4)} ETH
                      </span>
                    ) : (
                      <span className="text-muted-foreground">未出品</span>
                    )}
                    <span 
                      className={`text-xs px-2 py-1 rounded ${
                        nft.isListed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {nft.isListed ? '販売中' : '未出品'}
                    </span>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex gap-2">
                    {activeTab === 'owned' && !nft.isListed && (
                      <button
                        type="button"
                        onClick={() => openListModal(nft)}
                        className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
                      >
                        出品する
                      </button>
                    )}
                    {activeTab === 'listed' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openListModal(nft)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
                        >
                          価格変更
                        </button>
                        <button
                          type="button"
                          onClick={() => openCancelModal(nft)}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                        >
                          出品停止
                        </button>
                      </>
                    )}
                    <Link
                      href={`/nfts/${nft.tokenId}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-center hover:bg-gray-50 transition-colors"
                    >
                      詳細を見る
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* モーダル */}
      {selectedNFT && (
        <>
          <ListNFTModal
            isOpen={listModalOpen}
            onClose={() => {
              setListModalOpen(false);
              setSelectedNFT(null);
            }}
            nftId={selectedNFT.tokenId}
            nftName={selectedNFT.metadata?.name || `NFT #${selectedNFT.tokenId}`}
            nftImage={selectedNFT.metadata?.image}
          />

          <CancelListingModal
            isOpen={cancelModalOpen}
            onClose={() => {
              setCancelModalOpen(false);
              setSelectedNFT(null);
            }}
            nftId={selectedNFT.tokenId}
            nftName={selectedNFT.metadata?.name || `NFT #${selectedNFT.tokenId}`}
            currentPrice={selectedNFT.price || '0'}
          />
        </>
      )}
    </div>
  );
}
