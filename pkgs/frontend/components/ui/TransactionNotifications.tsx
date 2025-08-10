"use client";

import { useUIStore } from "@/stores/useStore";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * トランザクション状態を監視して通知を表示するコンポーネント
 */
export function TransactionNotifications() {
  const {
    transactionStatus,
    transactionHash,
    transactionError,
    resetTransaction,
  } = useUIStore();

  useEffect(() => {
    if (transactionStatus === "pending") {
      toast.loading("トランザクションを送信中...", {
        id: "transaction",
        duration: Number.POSITIVE_INFINITY,
      });
    } else if (transactionStatus === "success" && transactionHash) {
      toast.success(
        <div>
          <p>トランザクションが完了しました！</p>
          <a
            href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            Etherscanで確認
          </a>
        </div>,
        {
          id: "transaction",
          duration: 5000,
        }
      );
      resetTransaction();
    } else if (transactionStatus === "error" && transactionError) {
      toast.error(`エラー: ${transactionError}`, {
        id: "transaction",
        duration: 5000,
      });
      resetTransaction();
    }
  }, [transactionStatus, transactionHash, transactionError, resetTransaction]);

  return null;
}

/**
 * 汎用的なトランザクション通知ヘルパー
 */
export const showTransactionToast = {
  loading: (message = "トランザクションを送信中...") => {
    toast.loading(message, {
      id: "transaction",
      duration: Number.POSITIVE_INFINITY,
    });
  },
  success: (hash: string, message = "トランザクションが完了しました！") => {
    toast.success(
      <div>
        <p>{message}</p>
        <a
          href={`https://sepolia.etherscan.io/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm"
        >
          Etherscanで確認
        </a>
      </div>,
      {
        id: "transaction",
        duration: 5000,
      }
    );
  },
  error: (message: string) => {
    toast.error(`エラー: ${message}`, {
      id: "transaction",
      duration: 5000,
    });
  },
};
