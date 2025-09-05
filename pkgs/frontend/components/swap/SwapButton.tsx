"use client";

import { ArrowUpDown, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
import type { Token } from "@/lib/tokens";
import type { SwapCalculation, SwapSettings } from "@/hooks/useSwap";
import { formatTokenAmount, formatPercentage } from "@/utils/formatters";
import { ERROR_MESSAGES, WARNING_MESSAGES } from "@/utils/constants";

/**
 * スワップボタンの状態
 */
export type SwapButtonState =
  | "connect-wallet" // ウォレット接続が必要
  | "select-tokens" // トークン選択が必要
  | "enter-amount" // 金額入力が必要
  | "insufficient-balance" // 残高不足
  | "insufficient-liquidity" // 流動性不足
  | "high-slippage" // 高いスリッページ
  | "high-price-impact" // 高い価格インパクト
  | "need-approval" // 承認が必要
  | "approving" // 承認中
  | "ready" // スワップ実行可能
  | "swapping" // スワップ実行中
  | "confirming" // トランザクション確認中
  | "error"; // エラー状態

/**
 * スワップボタンコンポーネントのプロパティ
 */
export interface SwapButtonProps {
  /** 入力トークン */
  tokenIn?: Token;
  /** 出力トークン */
  tokenOut?: Token;
  /** 入力金額（文字列） */
  amountIn: string;
  /** 入力トークンの残高 */
  tokenInBalance: bigint;
  /** スワップ計算結果 */
  calculation: SwapCalculation | null;
  /** スワップ設定 */
  settings: SwapSettings;
  /** スワップ実行中かどうか */
  isExecuting: boolean;
  /** トランザクション確認中かどうか */
  isConfirming: boolean;
  /** 承認中かどうか */
  isApproving: boolean;
  /** 承認が必要かどうか */
  needsApproval: boolean;
  /** 実行エラー */
  executionError: string | null;
  /** 計算エラー */
  calculationError: string | null;
  /** スワップ実行コールバック */
  onSwap: () => void;
  /** 承認実行コールバック */
  onApprove: () => void;
  /** ウォレット接続コールバック */
  onConnectWallet: () => void;
  /** 無効状態かどうか */
  disabled?: boolean;
}

/**
 * スワップボタンの状態を判定する関数
 */
function getSwapButtonState({
  isConnected,
  tokenIn,
  tokenOut,
  amountIn,
  tokenInBalance,
  calculation,
  settings,
  isExecuting,
  isConfirming,
  isApproving,
  needsApproval,
  executionError,
  calculationError,
}: {
  isConnected: boolean;
  tokenIn?: Token;
  tokenOut?: Token;
  amountIn: string;
  tokenInBalance: bigint;
  calculation: SwapCalculation | null;
  settings: SwapSettings;
  isExecuting: boolean;
  isConfirming: boolean;
  isApproving: boolean;
  needsApproval: boolean;
  executionError: string | null;
  calculationError: string | null;
}): SwapButtonState {
  // エラー状態
  if (executionError || calculationError) {
    return "error";
  }

  // ウォレット接続チェック
  if (!isConnected) {
    return "connect-wallet";
  }

  // トークン選択チェック
  if (!tokenIn || !tokenOut) {
    return "select-tokens";
  }

  // 金額入力チェック
  if (!amountIn || amountIn.trim() === "" || Number(amountIn) <= 0) {
    return "enter-amount";
  }

  // 計算結果チェック
  if (!calculation) {
    return "insufficient-liquidity";
  }

  // 残高チェック
  if (calculation.amountIn > tokenInBalance) {
    return "insufficient-balance";
  }

  // トランザクション状態チェック
  if (isConfirming) {
    return "confirming";
  }

  if (isExecuting) {
    return "swapping";
  }

  if (isApproving) {
    return "approving";
  }

  // 承認チェック
  if (needsApproval) {
    return "need-approval";
  }

  // 価格インパクトチェック
  if (calculation.priceImpact > 15) {
    return "high-price-impact";
  }

  // スリッページチェック
  if (settings.slippageTolerance > 10) {
    return "high-slippage";
  }

  return "ready";
}

/**
 * 状態に応じたボタンテキストとスタイルを取得する関数
 */
function getButtonConfig(state: SwapButtonState, calculation: SwapCalculation | null) {
  switch (state) {
    case "connect-wallet":
      return {
        text: "ウォレットを接続",
        variant: "default" as const,
        disabled: false,
        loading: false,
      };

    case "select-tokens":
      return {
        text: "トークンを選択してください",
        variant: "secondary" as const,
        disabled: true,
        loading: false,
      };

    case "enter-amount":
      return {
        text: "金額を入力してください",
        variant: "secondary" as const,
        disabled: true,
        loading: false,
      };

    case "insufficient-balance":
      return {
        text: "残高が不足しています",
        variant: "destructive" as const,
        disabled: true,
        loading: false,
      };

    case "insufficient-liquidity":
      return {
        text: "流動性が不足しています",
        variant: "destructive" as const,
        disabled: true,
        loading: false,
      };

    case "high-slippage":
      return {
        text: "スリッページが高すぎます",
        variant: "destructive" as const,
        disabled: false,
        loading: false,
      };

    case "high-price-impact":
      return {
        text: `価格インパクト ${formatPercentage(calculation?.priceImpact || 0)} でスワップ`,
        variant: "destructive" as const,
        disabled: false,
        loading: false,
      };

    case "need-approval":
      return {
        text: "トークンを承認",
        variant: "default" as const,
        disabled: false,
        loading: false,
      };

    case "approving":
      return {
        text: "承認中...",
        variant: "default" as const,
        disabled: true,
        loading: true,
      };

    case "ready":
      return {
        text: "スワップ",
        variant: "default" as const,
        disabled: false,
        loading: false,
      };

    case "swapping":
      return {
        text: "スワップ中...",
        variant: "default" as const,
        disabled: true,
        loading: true,
      };

    case "confirming":
      return {
        text: "確認中...",
        variant: "default" as const,
        disabled: true,
        loading: true,
      };

    case "error":
      return {
        text: "エラーが発生しました",
        variant: "destructive" as const,
        disabled: true,
        loading: false,
      };

    default:
      return {
        text: "スワップ",
        variant: "default" as const,
        disabled: false,
        loading: false,
      };
  }
}

/**
 * スワップボタンコンポーネント
 *
 * スワップの実行、承認、ウォレット接続などの状態に応じて
 * 適切なボタンテキストとアクションを提供します。
 */
export function SwapButton({
  tokenIn,
  tokenOut,
  amountIn,
  tokenInBalance,
  calculation,
  settings,
  isExecuting,
  isConfirming,
  isApproving,
  needsApproval,
  executionError,
  calculationError,
  onSwap,
  onApprove,
  onConnectWallet,
  disabled = false,
}: SwapButtonProps) {
  const { isConnected } = useAccount();

  // ボタンの状態を判定
  const buttonState = useMemo(() => {
    return getSwapButtonState({
      isConnected,
      tokenIn,
      tokenOut,
      amountIn,
      tokenInBalance,
      calculation,
      settings,
      isExecuting,
      isConfirming,
      isApproving,
      needsApproval,
      executionError,
      calculationError,
    });
  }, [
    isConnected,
    tokenIn,
    tokenOut,
    amountIn,
    tokenInBalance,
    calculation,
    settings,
    isExecuting,
    isConfirming,
    isApproving,
    needsApproval,
    executionError,
    calculationError,
  ]);

  // ボタンの設定を取得
  const buttonConfig = getButtonConfig(buttonState, calculation);

  // クリックハンドラー
  const handleClick = () => {
    if (disabled || buttonConfig.disabled) {
      return;
    }

    switch (buttonState) {
      case "connect-wallet":
        onConnectWallet();
        break;

      case "need-approval":
        onApprove();
        break;

      case "ready":
      case "high-slippage":
      case "high-price-impact":
        onSwap();
        break;

      default:
        // その他の状態では何もしない
        break;
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={buttonConfig.variant}
        size="lg"
        onClick={handleClick}
        disabled={disabled || buttonConfig.disabled}
        className="w-full h-12 text-base font-medium"
      >
        {buttonConfig.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {buttonConfig.text}
      </Button>

      {/* 詳細情報の表示 */}
      {calculation && buttonState === "ready" && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>最小受取量:</span>
            <span>
              {formatTokenAmount(calculation.minimumAmountOut, tokenOut?.decimals || 18, {
                maximumFractionDigits: 6,
                showSymbol: true,
                symbol: tokenOut?.symbol,
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>価格インパクト:</span>
            <span className={calculation.priceImpact > 5 ? "text-yellow-600" : ""}>
              {formatPercentage(calculation.priceImpact)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>手数料:</span>
            <span>
              {formatTokenAmount(calculation.fee, tokenIn?.decimals || 18, {
                maximumFractionDigits: 6,
                showSymbol: true,
                symbol: tokenIn?.symbol,
              })}
            </span>
          </div>
        </div>
      )}

      {/* エラーメッセージの表示 */}
      {(executionError || calculationError) && (
        <div className="text-sm text-destructive">{executionError || calculationError}</div>
      )}

      {/* 警告メッセージの表示 */}
      {buttonState === "high-slippage" && (
        <div className="text-sm text-yellow-600">{WARNING_MESSAGES.HIGH_SLIPPAGE}</div>
      )}

      {buttonState === "high-price-impact" && (
        <div className="text-sm text-yellow-600">{WARNING_MESSAGES.HIGH_PRICE_IMPACT}</div>
      )}
    </div>
  );
}
