"use client";

import { useEffect, useRef } from "react";
import { SUCCESS_MESSAGES, TRANSACTION_TYPES } from "@/utils/constants";
import { useToastHelpers } from "@/components/feedback/Toaster";

type TxType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

interface UseTxToastsParams {
  type: TxType;
  label?: string; // e.g., "スワップ", "流動性追加"
  isExecuting: boolean;
  isConfirming: boolean;
  transactionHash: string | null;
  error: string | null;
}

/**
 * wagmi等のトランザクション状態をトースト通知にマッピングするユーティリティ。
 * 成功・失敗・進行中の明確なフィードバックを提供する。
 */
export function useTxToasts({
  type,
  label,
  isExecuting,
  isConfirming,
  transactionHash,
  error,
}: UseTxToastsParams) {
  const { showLoading, update, showSuccess, showError } = useToastHelpers();
  const toastIdRef = useRef<string | null>(null);
  const prev = useRef({
    isExecuting: false,
    isConfirming: false,
    transactionHash: null as string | null,
    error: null as string | null,
  });

  useEffect(() => {
    const actionLabel = label ?? labelFromType(type);

    // 新規送信開始
    if (isExecuting && !prev.current.isExecuting) {
      toastIdRef.current = showLoading(`${actionLabel}を送信中...`);
    }

    // 送信完了（ハッシュ取得）
    if (transactionHash && transactionHash !== prev.current.transactionHash && toastIdRef.current) {
      update(toastIdRef.current, {
        type: "loading",
        title: `${actionLabel}を送信しました。確認待ち...`,
        txHash: transactionHash,
        duration: 0,
      });
    }

    // ブロック確認中
    if (isConfirming && !prev.current.isConfirming && toastIdRef.current) {
      update(toastIdRef.current, {
        type: "loading",
        title: `${actionLabel}をブロックで確認中...`,
        duration: 0,
      });
    }

    // エラー
    if (error && error !== prev.current.error) {
      const friendly = normalizeError(error);
      if (toastIdRef.current) {
        update(toastIdRef.current, { type: "error", title: friendly });
        toastIdRef.current = null;
      } else {
        showError(friendly);
      }
    }

    // 成功（簡易判定: 実行・確認が終了し、ハッシュがあり、エラーがない）
    if (!isExecuting && prev.current.isExecuting && !isConfirming && !error && transactionHash) {
      const successMsg = successMessageFromType(type);
      if (toastIdRef.current) {
        update(toastIdRef.current, {
          type: "success",
          title: successMsg,
          txHash: transactionHash,
        });
        toastIdRef.current = null;
      } else {
        showSuccess(successMsg, undefined, transactionHash);
      }
    }

    prev.current = { isExecuting, isConfirming, transactionHash, error };
  }, [
    type,
    label,
    isExecuting,
    isConfirming,
    transactionHash,
    error,
    showLoading,
    update,
    showSuccess,
    showError,
  ]);
}

function labelFromType(type: TxType): string {
  switch (type) {
    case TRANSACTION_TYPES.SWAP:
      return "スワップ";
    case TRANSACTION_TYPES.ADD_LIQUIDITY:
      return "流動性追加";
    case TRANSACTION_TYPES.REMOVE_LIQUIDITY:
      return "流動性除去";
    case TRANSACTION_TYPES.APPROVAL:
      return "承認";
    case TRANSACTION_TYPES.CREATE_PAIR:
      return "ペア作成";
    default:
      return "トランザクション";
  }
}

function successMessageFromType(type: TxType): string {
  switch (type) {
    case TRANSACTION_TYPES.SWAP:
      return SUCCESS_MESSAGES.SWAP_SUCCESS;
    case TRANSACTION_TYPES.ADD_LIQUIDITY:
      return SUCCESS_MESSAGES.ADD_LIQUIDITY_SUCCESS;
    case TRANSACTION_TYPES.REMOVE_LIQUIDITY:
      return SUCCESS_MESSAGES.REMOVE_LIQUIDITY_SUCCESS;
    case TRANSACTION_TYPES.APPROVAL:
      return SUCCESS_MESSAGES.APPROVAL_SUCCESS;
    default:
      return "トランザクションが完了しました";
  }
}

function normalizeError(message: string): string {
  // よくあるエラー文言をユーザーフレンドリーに変換
  if (/User rejected|User denied|rejected/i.test(message))
    return "ユーザーによりトランザクションがキャンセルされました";
  if (/InsufficientOutputAmount|SLIPPAGE/i.test(message)) return "スリッページが許容値を超えました";
  if (/insufficient funds/i.test(message)) return "ガス代が不足しています (ETH 残高不足)";
  if (/execution reverted: InsufficientLiquidity/i.test(message)) return "流動性が不足しています";
  return message || "エラーが発生しました";
}
