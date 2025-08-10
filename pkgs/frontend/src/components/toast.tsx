'use client';

import type { Toast } from '@/hooks/useToast';
import { useToast } from '@/hooks/useToast';

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

/**
 * 個別のトーストアイテムコンポーネント
 */
function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  const getBackgroundColor = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div
      className={`
        max-w-sm w-full ${getBackgroundColor(toast.type)} ${getTextColor(toast.type)}
        border rounded-lg shadow-lg p-4 mb-3
        transform transition-all duration-300 ease-in-out
        animate-in slide-in-from-right-full
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 text-lg mr-3">
          {getIcon(toast.type)}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">
            {toast.title}
          </div>
          {toast.description && (
            <div className="text-xs mt-1 opacity-90">
              {toast.description}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/**
 * トースト通知コンテナコンポーネント
 * アプリケーションのルートレベルで使用
 */
export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismiss}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * トースト通知プロバイダー
 * useToastフックを任意のコンポーネントで使用できるようにする
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}

/**
 * トランザクション用の事前定義トースト関数を提供するフック
 */
export const useTransactionToast = () => {
  const { success, error, info } = useToast();

  return {
    transactionPending: (txHash?: string) => {
      info(
        'トランザクション送信中',
        txHash 
          ? `Transaction: ${txHash.slice(0, 10)}...` 
          : 'ブロックチェーンで処理中です'
      );
    },
    
    transactionSuccess: (message: string, txHash?: string) => {
      success(
        'トランザクション成功',
        txHash 
          ? `${message}\nTransaction: ${txHash.slice(0, 10)}...`
          : message
      );
    },
    
    transactionError: (message: string, errorDetail?: Error) => {
      error(
        'トランザクション失敗',
        errorDetail 
          ? `${message}: ${errorDetail.message}`
          : message
      );
    },
    
    listingSuccess: (nftName: string, price: string) => {
      success(
        'NFT出品完了',
        `${nftName} を ${price} ETH で出品しました`
      );
    },
    
    cancelSuccess: (nftName: string) => {
      success(
        '出品キャンセル完了',
        `${nftName} の出品をキャンセルしました`
      );
    },
    
    purchaseSuccess: (nftName: string) => {
      success(
        'NFT購入完了',
        `${nftName} を購入しました`
      );
    },
  };
};
