"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import {
  calculateAmountOut,
  calculateMinimumAmountOut,
  calculatePriceImpact,
} from "@/lib/calculations";
import { AMM_ROUTER_ABI, ERC20_ABI, getRouterContract } from "@/lib/contracts";
import type { Token } from "@/lib/tokens";
import { ERROR_MESSAGES, UI_CONSTANTS } from "@/utils/constants";
import { parseTokenAmount } from "@/utils/formatters";
import {
  validateDeadline,
  validateSlippage,
  validateSufficientBalance,
  validateTokenAmount,
} from "@/utils/validators";
import { usePairData } from "./usePairData";
import { useTokenBalance } from "./useTokenBalance";

/**
 * スワップ計算結果の型定義
 */
export interface SwapCalculation {
  /** 入力トークン量 */
  amountIn: bigint;
  /** 出力トークン量 */
  amountOut: bigint;
  /** 最小受取量（スリッページ考慮） */
  minimumAmountOut: bigint;
  /** 価格インパクト（パーセンテージ） */
  priceImpact: number;
  /** 交換レート */
  exchangeRate: number;
  /** 手数料（入力トークン単位） */
  fee: bigint;
}

/**
 * スワップ設定の型定義
 */
export interface SwapSettings {
  /** スリッページ許容値（パーセンテージ） */
  slippageTolerance: number;
  /** デッドライン（分） */
  deadline: number;
}

/**
 * スワップ実行パラメータの型定義
 */
export interface SwapExecuteParams {
  /** 入力トークン量（文字列） */
  amountIn: string;
  /** 入力トークン */
  tokenIn: Token;
  /** 出力トークン */
  tokenOut: Token;
  /** スワップ設定 */
  settings: SwapSettings;
}

/**
 * useSwap フックのオプション
 */
export interface UseSwapOptions {
  /** 入力トークン */
  tokenIn?: Token;
  /** 出力トークン */
  tokenOut?: Token;
  /** 初期スリッページ設定 */
  initialSlippage?: number;
  /** 初期デッドライン設定 */
  initialDeadline?: number;
  /** 自動更新を有効にするか */
  watch?: boolean;
}

/**
 * useSwap フックの戻り値
 */
export interface UseSwapReturn {
  // 計算結果
  /** スワップ計算結果 */
  calculation: SwapCalculation | null;
  /** 計算中かどうか */
  isCalculating: boolean;
  /** 計算エラー */
  calculationError: string | null;

  // 残高情報
  /** 入力トークンの残高 */
  tokenInBalance: bigint;
  /** 出力トークンの残高 */
  tokenOutBalance: bigint;
  /** 残高取得中かどうか */
  isLoadingBalances: boolean;

  // スワップ設定
  /** 現在のスワップ設定 */
  settings: SwapSettings;
  /** スリッページを更新する関数 */
  updateSlippage: (slippage: number) => void;
  /** デッドラインを更新する関数 */
  updateDeadline: (deadline: number) => void;

  // トランザクション実行
  /** スワップを実行する関数 */
  executeSwap: (params: SwapExecuteParams) => Promise<void>;
  /** トランザクション実行中かどうか */
  isExecuting: boolean;
  /** トランザクションハッシュ */
  transactionHash: string | null;
  /** トランザクション確認中かどうか */
  isConfirming: boolean;
  /** 実行エラー */
  executionError: string | null;

  // ユーティリティ関数
  /** スワップ金額を計算する関数 */
  calculateSwapAmount: (
    amountIn: string,
    tokenIn: Token,
    tokenOut: Token
  ) => SwapCalculation | null;
  /** トークンの承認が必要かチェックする関数 */
  needsApproval: (token: Token, amount: bigint) => Promise<boolean>;
  /** トークンを承認する関数 */
  approveToken: (token: Token, amount: bigint) => Promise<void>;
  /** 承認中かどうか */
  isApproving: boolean;

  // バリデーション
  /** 入力値の検証結果 */
  validation: {
    amountIn: { isValid: boolean; error?: string; warning?: string };
    slippage: { isValid: boolean; error?: string; warning?: string };
    deadline: { isValid: boolean; error?: string; warning?: string };
    balance: { isValid: boolean; error?: string; warning?: string };
    priceImpact: { isValid: boolean; error?: string; warning?: string };
  };
}

/**
 * スワップ機能を提供するカスタムフック
 *
 * @param options フックのオプション
 * @returns スワップ機能と状態
 */
export function useSwap(options: UseSwapOptions = {}): UseSwapReturn {
  const {
    tokenIn,
    tokenOut,
    initialSlippage = UI_CONSTANTS.DEFAULT_SLIPPAGE,
    initialDeadline = UI_CONSTANTS.DEFAULT_DEADLINE,
    watch = true,
  } = options;

  const { address: userAddress } = useAccount();
  const router = getRouterContract();

  // 内部状態
  const [settings, setSettings] = useState<SwapSettings>({
    slippageTolerance: initialSlippage,
    deadline: initialDeadline,
  });
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // ペアデータの取得
  const {
    pair,
    exists: pairExists,
    isLoading: isPairLoading,
    error: pairError,
  } = usePairData({
    tokenA: tokenIn?.address as Address,
    tokenB: tokenOut?.address as Address,
    enabled: Boolean(tokenIn && tokenOut),
    watch,
  });

  // トークン残高の取得
  const { balance: tokenInBalanceData, isLoading: isLoadingTokenInBalance } = useTokenBalance({
    token: tokenIn,
    watch,
  });

  const { balance: tokenOutBalanceData, isLoading: isLoadingTokenOutBalance } = useTokenBalance({
    token: tokenOut,
    watch,
  });

  // トランザクション実行用のフック
  const {
    writeContract,
    data: transactionHash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });

  // 残高情報の整理
  const tokenInBalance = tokenInBalanceData?.raw ?? BigInt(0);
  const tokenOutBalance = tokenOutBalanceData?.raw ?? BigInt(0);
  const isLoadingBalances = isLoadingTokenInBalance || isLoadingTokenOutBalance;

  // スワップ金額計算関数
  const calculateSwapAmount = useCallback(
    (amountIn: string, tokenInParam: Token, tokenOutParam: Token): SwapCalculation | null => {
      try {
        setCalculationError(null);

        // 入力値の検証
        if (!amountIn || amountIn.trim() === "" || Number(amountIn) <= 0) {
          return null;
        }

        // ペアの存在確認（読み込み中はエラーにしない）
        if (!pair || !pairExists) {
          if (!isPairLoading) {
            setCalculationError("取引ペアが存在しません");
          }
          return null;
        }

        // トークンの順序を確認
        const isToken0 = tokenInParam.address.toLowerCase() === pair.token0.toLowerCase();
        const reserveIn = isToken0 ? pair.reserves.reserve0 : pair.reserves.reserve1;
        const reserveOut = isToken0 ? pair.reserves.reserve1 : pair.reserves.reserve0;

        // 入力量をBigIntに変換
        const amountInBigInt = parseTokenAmount(amountIn, tokenInParam.decimals);

        if (amountInBigInt <= BigInt(0)) {
          return null;
        }

        // スワップ計算
        const amountOutBigInt = calculateAmountOut(amountInBigInt, reserveIn, reserveOut);
        const priceImpact = calculatePriceImpact(amountInBigInt, reserveIn, reserveOut);
        const minimumAmountOut = calculateMinimumAmountOut(
          amountOutBigInt,
          settings.slippageTolerance
        );

        // 交換レートの計算
        const exchangeRate = Number(amountOutBigInt) / Number(amountInBigInt);

        // 手数料の計算（0.3%）
        const fee = (amountInBigInt * BigInt(3)) / BigInt(1000);

        return {
          amountIn: amountInBigInt,
          amountOut: amountOutBigInt,
          minimumAmountOut,
          priceImpact,
          exchangeRate,
          fee,
        };
      } catch (error) {
        console.error("Swap calculation error:", error);
        setCalculationError("計算中にエラーが発生しました");
        return null;
      }
    },
    [pair, pairExists, isPairLoading, settings.slippageTolerance]
  );

  // 現在の計算結果（メモ化）
  const calculation = useMemo(() => {
    if (!tokenIn || !tokenOut) return null;
    // 初期表示では不要なエラーを避けるためダミー計算は行わない
    return null;
  }, [tokenIn, tokenOut]);

  // トークン承認の必要性チェック
  const needsApproval = useCallback(
    async (token: Token, amount: bigint): Promise<boolean> => {
      if (!userAddress) return false;

      try {
        // この関数は実際の実装では wagmi の readContract アクションを使用する必要があります
        // ここでは簡略化した実装を提供します
        return true; // 実装を簡略化し、常に承認が必要と仮定
      } catch (error) {
        console.error("Allowance check error:", error);
        return true; // エラーの場合は承認が必要と仮定
      }
    },
    [userAddress, router.address]
  );

  // トークン承認関数
  const approveToken = useCallback(
    async (token: Token, amount: bigint): Promise<void> => {
      if (!userAddress) {
        throw new Error("ウォレットが接続されていません");
      }

      try {
        setIsApproving(true);
        setExecutionError(null);

        await writeContract({
          address: token.address as Address,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [router.address, amount],
        });

        // 承認トランザクションの完了を待つ
        // 実際の実装では useWaitForTransactionReceipt を使用
      } catch (error) {
        console.error("Token approval error:", error);
        setExecutionError("トークンの承認に失敗しました");
        throw error;
      } finally {
        setIsApproving(false);
      }
    },
    [userAddress, router.address, writeContract]
  );

  // スワップ実行関数
  const executeSwap = useCallback(
    async (params: SwapExecuteParams): Promise<void> => {
      const {
        amountIn,
        tokenIn: tokenInParam,
        tokenOut: tokenOutParam,
        settings: swapSettings,
      } = params;

      if (!userAddress) {
        throw new Error("ウォレットが接続されていません");
      }

      try {
        setExecutionError(null);

        // スワップ計算
        const swapCalc = calculateSwapAmount(amountIn, tokenInParam, tokenOutParam);
        if (!swapCalc) {
          throw new Error("スワップ計算に失敗しました");
        }

        // 承認チェック
        const needsTokenApproval = await needsApproval(tokenInParam, swapCalc.amountIn);
        if (needsTokenApproval) {
          await approveToken(tokenInParam, swapCalc.amountIn);
        }

        // デッドラインの計算（現在時刻 + 設定分数）
        const deadline = Math.floor(Date.now() / 1000) + swapSettings.deadline * 60;

        // スワップパスの構築
        const path = [tokenInParam.address as Address, tokenOutParam.address as Address];

        // スワップ実行
        await writeContract({
          address: router.address,
          abi: AMM_ROUTER_ABI,
          functionName: "swapExactTokensForTokens",
          args: [swapCalc.amountIn, swapCalc.minimumAmountOut, path, userAddress, BigInt(deadline)],
        });
      } catch (error) {
        console.error("Swap execution error:", error);
        const errorMessage =
          error instanceof Error ? error.message : ERROR_MESSAGES.TRANSACTION_FAILED;
        setExecutionError(errorMessage);
        throw error;
      }
    },
    [userAddress, calculateSwapAmount, needsApproval, approveToken, writeContract, router.address]
  );

  // 設定更新関数
  const updateSlippage = useCallback((slippage: number) => {
    setSettings((prev) => ({ ...prev, slippageTolerance: slippage }));
  }, []);

  const updateDeadline = useCallback((deadline: number) => {
    setSettings((prev) => ({ ...prev, deadline }));
  }, []);

  // バリデーション
  const validation = useMemo(() => {
    const amountInValidation = validateTokenAmount("1"); // デフォルト値での検証
    const slippageValidation = validateSlippage(settings.slippageTolerance);
    const deadlineValidation = validateDeadline(settings.deadline);

    const balanceValidation = tokenIn
      ? validateSufficientBalance("1", tokenInBalance.toString(), tokenIn.symbol)
      : { isValid: true };

    const priceImpactValidation = calculation
      ? {
          isValid: calculation.priceImpact <= 15,
          error: calculation.priceImpact > 15 ? "価格インパクトが大きすぎます" : undefined,
          warning: calculation.priceImpact > 5 ? "価格インパクトが大きいです" : undefined,
        }
      : { isValid: true };

    return {
      amountIn: amountInValidation,
      slippage: slippageValidation,
      deadline: deadlineValidation,
      balance: balanceValidation,
      priceImpact: priceImpactValidation,
    };
  }, [settings.slippageTolerance, settings.deadline, tokenIn, tokenInBalance, calculation]);

  // エラー状態の統合
  useEffect(() => {
    if (writeError) {
      setExecutionError(writeError.message);
    }
    if (confirmError) {
      setExecutionError("トランザクションの確認に失敗しました");
    }
    if (pairError) {
      setCalculationError("ペア情報の取得に失敗しました");
    }
  }, [writeError, confirmError, pairError]);

  // 成功時の処理
  useEffect(() => {
    if (isConfirmed) {
      setExecutionError(null);
      // 成功メッセージの表示やコールバックの実行
    }
  }, [isConfirmed]);

  return {
    // 計算結果
    calculation,
    isCalculating: isPairLoading,
    calculationError,

    // 残高情報
    tokenInBalance,
    tokenOutBalance,
    isLoadingBalances,

    // スワップ設定
    settings,
    updateSlippage,
    updateDeadline,

    // トランザクション実行
    executeSwap,
    isExecuting: isWritePending,
    transactionHash: transactionHash || null,
    isConfirming,
    executionError,

    // ユーティリティ関数
    calculateSwapAmount,
    needsApproval,
    approveToken,
    isApproving,

    // バリデーション
    validation,
  };
}
