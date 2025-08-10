'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftId: string;
  price: string;
  nftName: string;
}

/**
 * NFT購入モーダルコンポーネント
 */
export function PurchaseModal({ 
  isOpen, 
  onClose, 
  nftId, 
  price, 
  nftName 
}: PurchaseModalProps) {
  const { user } = usePrivy();
  const [isPurchasing, setIsPurchasing] = useState(false);

  if (!isOpen) return null;

  /**
   * NFT購入処理
   */
  const handlePurchase = async () => {
    if (!user?.wallet?.address) {
      alert('ウォレットに接続してください');
      return;
    }

    setIsPurchasing(true);
    
    try {
      // TODO: 実際のNFT購入処理を実装
      // 1. buyNFT関数をコントラクトで呼び出し
      // 2. トランザクションの送信
      // 3. 成功時の処理
      
      console.log('NFT購入処理:', {
        nftId,
        price,
        buyer: user.wallet.address,
      });
      
      // 暫定的な成功メッセージ
      alert(`${nftName} を購入しました！（現在はモック実装）`);
      onClose();
      
    } catch (error) {
      console.error('NFT購入エラー:', error);
      alert('NFTの購入に失敗しました');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">NFTを購入</h2>
          <p className="text-muted-foreground">
            以下のNFTを購入しますか？
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg mb-6">
          <div className="font-semibold mb-2">{nftName}</div>
          <div className="text-2xl font-bold text-primary">
            {(Number(price) / 1e18).toFixed(4)} ETH
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-6">
          <p>• 購入後、NFTの所有権があなたに移転されます</p>
          <p>• トランザクション手数料（ガス代）が別途必要です</p>
          <p>• この操作は取り消すことができません</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPurchasing}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handlePurchase}
            disabled={isPurchasing}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isPurchasing ? '購入中...' : '購入する'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftId: string;
  nftName: string;
  currentPrice?: string;
}

/**
 * NFTオファーモーダルコンポーネント
 */
export function OfferModal({ 
  isOpen, 
  onClose, 
  nftId, 
  nftName,
  currentPrice 
}: OfferModalProps) {
  const { user } = usePrivy();
  const [offerAmount, setOfferAmount] = useState('');
  const [expirationDays, setExpirationDays] = useState('7');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  /**
   * オファー送信処理
   */
  const handleSubmitOffer = async () => {
    if (!user?.wallet?.address) {
      alert('ウォレットに接続してください');
      return;
    }

    if (!offerAmount || Number(offerAmount) <= 0) {
      alert('有効なオファー金額を入力してください');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: 実際のオファー送信処理を実装
      // 1. makeOffer関数をコントラクトで呼び出し
      // 2. トランザクションの送信
      // 3. 成功時の処理
      
      console.log('オファー送信処理:', {
        nftId,
        offerAmount: (Number(offerAmount) * 1e18).toString(),
        expiration: expirationDays,
        offerer: user.wallet.address,
      });
      
      // 暫定的な成功メッセージ
      alert(`${nftName} に ${offerAmount} ETH のオファーを送信しました！（現在はモック実装）`);
      onClose();
      setOfferAmount('');
      
    } catch (error) {
      console.error('オファー送信エラー:', error);
      alert('オファーの送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">オファーを送信</h2>
          <p className="text-muted-foreground">
            {nftName} にオファーを送信します
          </p>
        </div>

        {currentPrice && (
          <div className="bg-muted/50 p-3 rounded-lg mb-4">
            <div className="text-sm text-muted-foreground">現在価格</div>
            <div className="font-semibold">
              {(Number(currentPrice) / 1e18).toFixed(4)} ETH
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="offer-amount" className="block text-sm font-medium mb-2">
              オファー金額 (ETH) *
            </label>
            <input
              type="number"
              id="offer-amount"
              step="0.001"
              min="0"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="例: 0.1"
              required
            />
          </div>

          <div>
            <label htmlFor="expiration" className="block text-sm font-medium mb-2">
              オファー有効期限
            </label>
            <select
              id="expiration"
              value={expirationDays}
              onChange={(e) => setExpirationDays(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="1">1日</option>
              <option value="3">3日</option>
              <option value="7">7日</option>
              <option value="14">14日</option>
              <option value="30">30日</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-6">
          <p>• オファーが承諾された場合、自動的に購入が完了します</p>
          <p>• オファー金額は事前にデポジットされます</p>
          <p>• 期限切れまたはキャンセル時に返金されます</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmitOffer}
            disabled={isSubmitting || !offerAmount}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? '送信中...' : 'オファー送信'}
          </button>
        </div>
      </div>
    </div>
  );
}
