'use client';

import { OfferModal, PurchaseModal } from '@/components/nft-transaction-modals';
import { useNFT } from '@/hooks/useNFTs';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useState } from 'react';

/**
 * NFT詳細ページコンポーネント
 */
export default function NFTDetailPage() {
  const params = useParams();
  const nftId = Array.isArray(params?.id) ? params.id[0] : params?.id || '';
  
  const { data: nft, isLoading, error } = useNFT(nftId);
  
  // モーダル状態管理
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error || !nft || !nft.metadata) {
    return (
      <div className="text-center py-12">
        <div className="text-lg text-red-600 mb-4">
          NFTが見つかりませんでした
        </div>
        <p className="text-muted-foreground">
          指定されたNFTは存在しないか、削除されている可能性があります。
        </p>
      </div>
    );
  }

  /**
   * 購入ボタンクリック処理
   */
  const handlePurchaseClick = (): void => {
    setIsPurchaseModalOpen(true);
  };

  /**
   * オファーボタンクリック処理
   */
  const handleOfferClick = (): void => {
    setIsOfferModalOpen(true);
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* NFT画像セクション */}
          <div className="space-y-4">
            <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
              <Image
                src={nft.metadata.image}
                alt={nft.metadata.name}
                fill
                className="object-cover"
                priority
              />
            </div>
            
            {/* 説明セクション */}
            <div className="bg-muted/50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">説明</h3>
              <p className="text-muted-foreground leading-relaxed">
                {nft.metadata.description}
              </p>
            </div>
          </div>

          {/* NFT詳細セクション */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{nft.metadata.name}</h1>
              <p className="text-muted-foreground">
                作成者: {nft.creator?.slice(0, 6)}...{nft.creator?.slice(-4)}
              </p>
            </div>

            {/* ステータスと価格 */}
            <div className="bg-muted/50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-medium">現在価格</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  nft.isListed 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {nft.isListed ? '販売中' : '販売終了'}
                </span>
              </div>
              {nft.price && (
                <div className="text-3xl font-bold text-primary mb-4">
                  {(Number(nft.price) / 1e18).toFixed(4)} ETH
                </div>
              )}
              
              {/* 取引ボタン */}
              <div className="space-y-3">
                {nft.isListed && nft.price && (
                  <button 
                    type="button"
                    onClick={handlePurchaseClick}
                    className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  >
                    今すぐ購入
                  </button>
                )}
                
                <button 
                  type="button"
                  onClick={handleOfferClick}
                  className="w-full border border-primary text-primary py-3 px-6 rounded-lg font-semibold hover:bg-primary/10 transition-colors"
                >
                  オファーを送信
                </button>
              </div>
            </div>

            {/* NFT属性セクション */}
            {nft.metadata.attributes && nft.metadata.attributes.length > 0 && (
              <div className="bg-muted/50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">属性</h3>
                <div className="grid grid-cols-2 gap-3">
                  {nft.metadata.attributes.map((attr, index) => (
                    <div 
                      key={`${attr.trait_type}-${attr.value}-${index}`} 
                      className="bg-background p-3 rounded-lg border"
                    >
                      <div className="text-sm text-muted-foreground mb-1">
                        {attr.trait_type}
                      </div>
                      <div className="font-medium">
                        {attr.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NFT詳細情報 */}
            <div className="bg-muted/50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">詳細情報</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">トークンID</span>
                  <span className="font-mono">{nft.tokenId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">所有者</span>
                  <span className="font-mono text-sm">
                    {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">作成者</span>
                  <span className="font-mono text-sm">
                    {nft.creator.slice(0, 6)}...{nft.creator.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ブロックチェーン</span>
                  <span>Ethereum</span>
                </div>
                {nft.listingId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">リスティングID</span>
                    <span className="font-mono">{nft.listingId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 購入モーダル */}
      {nft.price && (
        <PurchaseModal
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
          nftId={nftId}
          price={nft.price}
          nftName={nft.metadata.name}
        />
      )}

      {/* オファーモーダル */}
      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        nftId={nftId}
        nftName={nft.metadata.name}
        currentPrice={nft.price}
      />
    </>
  );
}
