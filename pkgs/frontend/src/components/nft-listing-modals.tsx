'use client';

import { useTransactionToast } from '@/components/toast';
import { useNFTMarketplace } from '@/hooks/useNFTMarketplace';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import { useState } from 'react';

interface ListNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftId: string;
  nftName: string;
  nftImage?: string;
}

/**
 * NFT出品モーダルコンポーネント
 */
export function ListNFTModal({ 
  isOpen, 
  onClose, 
  nftId, 
  nftName,
  nftImage 
}: ListNFTModalProps) {
  const { user } = usePrivy();
  const { listNFT } = useNFTMarketplace();
  const { transactionPending, listingSuccess, transactionError } = useTransactionToast();
  const [price, setPrice] = useState('');
  const [isListing, setIsListing] = useState(false);

  if (!isOpen) return null;

  /**
   * NFT出品処理
   */
  const handleListNFT = async () => {
    if (!user?.wallet?.address) {
      transactionError('ウォレットに接続してください');
      return;
    }

    if (!price || Number(price) <= 0) {
      transactionError('有効な価格を入力してください');
      return;
    }

    setIsListing(true);
    
    try {
      // トランザクション開始の通知
      transactionPending();
      
      // 実際のスマートコントラクトとの連携
      const txHash = await listNFT(Number(nftId), Number(price));
      
      console.log('NFT出品完了:', {
        nftId,
        price,
        txHash,
      });
      
      // 成功時のトースト通知
      listingSuccess(nftName, price);
      onClose();
      setPrice('');
      
    } catch (error) {
      console.error('NFT出品エラー:', error);
      transactionError('NFTの出品に失敗しました', error as Error);
    } finally {
      setIsListing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">NFTを出品</h2>
          <p className="text-muted-foreground">
            マーケットプレイスでNFTを販売します
          </p>
        </div>

        {/* NFT情報 */}
        <div className="bg-muted/50 p-4 rounded-lg mb-6">
          <div className="flex items-center gap-3">
            {nftImage && (
              <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0 relative">
                <Image
                  src={nftImage}
                  alt={nftName}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <div className="font-semibold">{nftName}</div>
              <div className="text-sm text-muted-foreground">
                Token ID: {nftId}
              </div>
            </div>
          </div>
        </div>

        {/* 価格設定 */}
        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="listing-price" className="block text-sm font-medium mb-2">
              販売価格 (ETH) *
            </label>
            <input
              type="number"
              id="listing-price"
              step="0.001"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="例: 0.1"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              マーケットプレイス手数料（2.5%）が差し引かれます
            </p>
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-6">
          <p>• 出品後、購入者が現れるまで販売が継続されます</p>
          <p>• いつでも出品をキャンセルできます</p>
          <p>• トランザクション手数料（ガス代）が必要です</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isListing}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleListNFT}
            disabled={isListing || !price}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isListing ? '出品中...' : '出品する'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CancelListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftId: string;
  nftName: string;
  currentPrice: string;
}

/**
 * NFT出品キャンセルモーダルコンポーネント
 */
export function CancelListingModal({ 
  isOpen, 
  onClose, 
  nftId, 
  nftName,
  currentPrice 
}: CancelListingModalProps) {
  const { user } = usePrivy();
  const { cancelListing } = useNFTMarketplace();
  const { transactionPending, cancelSuccess, transactionError } = useTransactionToast();
  const [isCancelling, setIsCancelling] = useState(false);

  if (!isOpen) return null;

  /**
   * 出品キャンセル処理
   * 注意: 実際の実装では listingId が必要ですが、
   * 現在のモックデータには含まれていないため、nftIdを使用
   */
  const handleCancelListing = async () => {
    if (!user?.wallet?.address) {
      transactionError('ウォレットに接続してください');
      return;
    }

    setIsCancelling(true);
    
    try {
      // トランザクション開始の通知
      transactionPending();
      
      // 実際のスマートコントラクトとの連携
      // 注意: 実装時には適切なlistingIdを取得する必要があります
      const listingId = Number(nftId); // 暫定的にnftIdを使用
      const txHash = await cancelListing(listingId);
      
      console.log('出品キャンセル完了:', {
        nftId,
        listingId,
        txHash,
      });
      
      // 成功時のトースト通知
      cancelSuccess(nftName);
      onClose();
      
    } catch (error) {
      console.error('出品キャンセルエラー:', error);
      transactionError('出品のキャンセルに失敗しました', error as Error);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">出品をキャンセル</h2>
          <p className="text-muted-foreground">
            本当に出品をキャンセルしますか？
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg mb-6">
          <div className="font-semibold mb-2">{nftName}</div>
          <div className="text-lg font-bold text-primary">
            現在価格: {(Number(currentPrice) / 1e18).toFixed(4)} ETH
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-6">
          <p>• 出品をキャンセルすると、NFTは販売停止状態になります</p>
          <p>• 後でいつでも再出品できます</p>
          <p>• トランザクション手数料（ガス代）が必要です</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={handleCancelListing}
            disabled={isCancelling}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isCancelling ? 'キャンセル中...' : '出品をキャンセル'}
          </button>
        </div>
      </div>
    </div>
  );
}
