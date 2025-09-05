"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import {
  calculateAPR,
  calculateExchangeRate,
  calculateLiquidityMinted,
  calculateOptimalLiquidityAmounts,
  calculateTokensFromLiquidity,
} from "@/lib/calculations";
import { AMM_ROUTER_ABI, ERC20_ABI, getRouterContract } from "@/lib/contracts";
import type { Token } from "@/lib/tokens";
import { ERROR_MESSAGES, UI_CONSTANTS } from "@/utils/constants";
import { parseTokenAmount } from "@/utils/formatters";
import {
  validateDeadline,
  validateSufficientBalance,
  validateTokenAmount,
} from "@/utils/validators";
import { usePairData } from "./usePairData";
import { useTokenBalance } from "./useTokenBalance";

/**
 * 流動性計算結果の型定義
 */
export interface LiquidityCalculation {
  /** トークンAの最適な量 */
  amountA: bigint;
  /** トークンBの最適な量 */
  amountB: bigint;
  /** 発行されるLPトークン量 */
  liquidityMinted: bigint;
  /** プール内でのシェア（パーセンテージ） */
  shareOfPool: number;
  /** 現在の交換レート */
  exchangeRate: number;
}

/**
 * LP ポジション情報の型定義
 */
export interface LPPosition {
  /** ペアアドレス */
  pairAddress: Address;
  /** トークンA */
  tokenA: Token;
  /** トークンB */
  tokenB: Token;
  /** 保有LPトークン量 */
  lpBalance: bigint;
  /** プール内でのシェア（パーセンテージ） */
  shareOfPool: number;
  /** 引き出し可能なトークンA量 */
  withdrawableAmountA: bigint;
  /** 引き出し可能なトークンB量 */
  withdrawableAmountB: bigint;
  /** 獲得した手数料（推定値） */
  earnedFees: {
    tokenA: bigint;
    tokenB: bigint;
  };
  /** APR（年間収益率） */
  apr: number;
}

/**
 * 流動性除去計算結果の型定義
 */
export interface RemoveLiquidityCalculation {
  /** 除去するLPトークン量 */
  liquidityToRemove: bigint;
  /** 受け取るトークンA量 */
  amountA: bigint;
  /** 受け取るトークンB量 */
  amountB: bigint;
  /** 除去する割合（パーセンテージ） */
  percentage: number;
}

/**
 * 流動性設定の型定義
 */
export interface LiquiditySettings {
  /** デッドライン（分） */
  deadline: number;
  /** スリッページ許容値（パーセンテージ） */
  slippageTolerance: number;
}

/**
 * 流動性追加パラメータの型定義
 */
export interface AddLiquidityParams {
  /** トークンA */
  tokenA: Token;
  /** トークンB */
  tokenB: Token;
  /** 希望するトークンA量（文字列） */
  amountADesired: string;
  /** 希望するトークンB量（文字列） */
  amountBDesired: string;
  /** 設定 */
  settings: LiquiditySettings;
}

/**
 * 流動性除去パラメータの型定義
 */
export interface RemoveLiquidityParams {
  /** トークンA */
  tokenA: Token;
  /** トークンB */
  tokenB: Token;
  /** 除去する割合（0-100） */
  percentage: number;
  /** 設定 */
  settings: LiquiditySettings;
}

/**
 * useLiquidity フックのオプション
 */
export interface UseLiquidityOptions {
  /** トークンA */
  tokenA?: Token;
  /** トークンB */
  tokenB?: Token;
  /** 初期デッドライン設定 */
  initialDeadline?: number;
  /** 初期スリッページ設定 */
  initialSlippage?: number;
  /** 自動更新を有効にするか */
  watch?: boolean;
}

/**
 * useLiquidity フックの戻り値
 */
export interface UseLiquidityReturn {
  // 流動性追加関連
  /** 流動性追加計算結果 */
  addLiquidityCalculation: LiquidityCalculation | null;
  /** 流動性追加計算中かどうか */
  isCalculatingAdd: boolean;
  /** 流動性追加計算エラー */
  addCalculationError: string | null;

  // 流動性除去関連
  /** 流動性除去計算結果 */
  removeLiquidityCalculation: RemoveLiquidityCalculation | null;
  /** 流動性除去計算中かどうか */
  isCalculatingRemove: boolean;
  /** 流動性除去計算エラー */
  removeCalculationError: string | null;

  // LPポジション情報
  /** ユーザーのLPポジション一覧 */
  lpPositions: LPPosition[];
  /** LPポジション取得中かどうか */
  isLoadingPositions: boolean;
  /** LPポジション取得エラー */
  positionsError: string | null;

  // 残高情報
  /** トークンAの残高 */
  tokenABalance: bigint;
  /** トークンBの残高 */
  tokenBBalance: bigint;
  /** LPトークンの残高 */
  lpTokenBalance: bigint;
  /** 残高取得中かどうか */
  isLoadingBalances: boolean;

  // 設定
  /** 現在の設定 */
  settings: LiquiditySettings;
  /** デッドラインを更新する関数 */
  updateDeadline: (deadline: number) => void;
  /** スリッページを更新する関数 */
  updateSlippage: (slippage: number) => void;

  // トランザクション実行
  /** 流動性を追加する関数 */
  addLiquidity: (params: AddLiquidityParams) => Promise<void>;
  /** 流動性を除去する関数 */
  removeLiquidity: (params: RemoveLiquidityParams) => Promise<void>;
  /** トランザクション実行中かどうか */
  isExecuting: boolean;
  /** トランザクションハッシュ */
  transactionHash: string | null;
  /** トランザクション確認中かどうか */
  isConfirming: boolean;
  /** 実行エラー */
  executionError: string | null;

  // ユーティリティ関数
  /** 流動性追加量を計算する関数 */
  calculateAddLiquidity: (
    amountADesired: string,
    amountBDesired: string,
    tokenA: Token,
    tokenB: Token
  ) => LiquidityCalculation | null;
  /** 流動性除去量を計算する関数 */
  calculateRemoveLiquidity: (
    percentage: number,
    tokenA: Token,
    tokenB: Token
  ) => RemoveLiquidityCalculation | null;
  /** トークンの承認が必要かチェックする関数 */
  needsApproval: (token: Token, amount: bigint) => Promise<boolean>;
  /** トークンを承認する関数 */
  approveToken: (token: Token, amount: bigint) => Promise<void>;
  /** 承認中かどうか */
  isApproving: boolean;

  // バリデーション
  /** 入力値の検証結果 */
  validation: {
    amountA: { isValid: boolean; error?: string; warning?: string };
    amountB: { isValid: boolean; error?: string; warning?: string };
    deadline: { isValid: boolean; error?: string; warning?: string };
    balanceA: { isValid: boolean; error?: string; warning?: string };
    balanceB: { isValid: boolean; error?: string; warning?: string };
    percentage: { isValid: boolean; error?: string; warning?: string };
  };
}

/**
 * 流動性管理機能を提供するカスタムフック
 *
 * @param options フックのオプション
 * @returns 流動性管理機能と状態
 */
export function useLiquidity(options: UseLiquidityOptions = {}): UseLiquidityReturn {
  const {
    tokenA,
    tokenB,
    initialDeadline = UI_CONSTANTS.DEFAULT_DEADLINE,
    initialSlippage = UI_CONSTANTS.DEFAULT_SLIPPAGE,
    watch = true,
  } = options;

  const { address: userAddress } = useAccount();
  const router = getRouterContract();

  // 内部状態
  const [settings, setSettings] = useState<LiquiditySettings>({
    deadline: initialDeadline,
    slippageTolerance: initialSlippage,
  });
  const [addCalculationError, setAddCalculationError] = useState<string | null>(null);
  const [removeCalculationError, setRemoveCalculationError] = useState<string | null>(null);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // ペアデータの取得
  const {
    pair,
    exists: pairExists,
    isLoading: isPairLoading,
    error: pairError,
  } = usePairData({
    tokenA: tokenA?.address as Address,
    tokenB: tokenB?.address as Address,
    enabled: Boolean(tokenA && tokenB),
    watch,
  });

  // トークン残高の取得
  const { balance: tokenABalanceData, isLoading: isLoadingTokenABalance } = useTokenBalance({
    token: tokenA,
    watch,
  });

  const { balance: tokenBBalanceData, isLoading: isLoadingTokenBBalance } = useTokenBalance({
    token: tokenB,
    watch,
  });

  // LPトークン残高の取得
  const { balance: lpTokenBalanceData, isLoading: isLoadingLPBalance } = useTokenBalance({
    token: pair
      ? {
          address: pair.address,
          symbol: "LP",
          name: "LP Token",
          decimals: 18,
        }
      : undefined,
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
  const tokenABalance = tokenABalanceData?.raw ?? BigInt(0);
  const tokenBBalance = tokenBBalanceData?.raw ?? BigInt(0);
  const lpTokenBalance = lpTokenBalanceData?.raw ?? BigInt(0);
  const isLoadingBalances = isLoadingTokenABalance || isLoadingTokenBBalance || isLoadingLPBalance;

  // 流動性追加計算関数
  const calculateAddLiquidity = useCallback(
    (
      amountADesired: string,
      amountBDesired: string,
      tokenAParam: Token,
      tokenBParam: Token
    ): LiquidityCalculation | null => {
      try {
        setAddCalculationError(null);

        // 入力値の検証
        if (
          !amountADesired ||
          !amountBDesired ||
          amountADesired.trim() === "" ||
          amountBDesired.trim() === "" ||
          Number(amountADesired) <= 0 ||
          Number(amountBDesired) <= 0
        ) {
          return null;
        }

        // ペアの存在確認
        if (!pair || !pairExists) {
          // 新しいプールの場合
          const amountA = parseTokenAmount(amountADesired, tokenAParam.decimals);
          const amountB = parseTokenAmount(amountBDesired, tokenBParam.decimals);
          const liquidityMinted = calculateLiquidityMinted(
            amountA,
            amountB,
            BigInt(0),
            BigInt(0),
            BigInt(0)
          );

          return {
            amountA,
            amountB,
            liquidityMinted,
            shareOfPool: 100, // 初回提供者は100%のシェア
            exchangeRate: Number(amountB) / Number(amountA),
          };
        }

        // 既存プールの場合
        const amountADesiredBigInt = parseTokenAmount(amountADesired, tokenAParam.decimals);
        const amountBDesiredBigInt = parseTokenAmount(amountBDesired, tokenBParam.decimals);

        // トークンの順序を確認
        const isToken0 = tokenAParam.address.toLowerCase() === pair.token0.toLowerCase();
        const reserveA = isToken0 ? pair.reserves.reserve0 : pair.reserves.reserve1;
        const reserveB = isToken0 ? pair.reserves.reserve1 : pair.reserves.reserve0;

        // 最適な流動性量を計算
        const { amountA, amountB } = calculateOptimalLiquidityAmounts(
          amountADesiredBigInt,
          amountBDesiredBigInt,
          reserveA,
          reserveB
        );

        // LPトークン発行量を計算
        const liquidityMinted = calculateLiquidityMinted(
          amountA,
          amountB,
          reserveA,
          reserveB,
          pair.totalSupply
        );

        // プール内でのシェアを計算
        const shareOfPool =
          pair.totalSupply > BigInt(0)
            ? (Number(liquidityMinted) / (Number(pair.totalSupply) + Number(liquidityMinted))) * 100
            : 100;

        // 交換レートを計算
        const exchangeRate = calculateExchangeRate(
          reserveA,
          reserveB,
          tokenAParam.decimals,
          tokenBParam.decimals
        );

        return {
          amountA,
          amountB,
          liquidityMinted,
          shareOfPool,
          exchangeRate,
        };
      } catch (error) {
        console.error("Add liquidity calculation error:", error);
        setAddCalculationError("流動性追加の計算中にエラーが発生しました");
        return null;
      }
    },
    [pair, pairExists]
  );

  // 流動性除去計算関数
  const calculateRemoveLiquidity = useCallback(
    (
      percentage: number,
      tokenAParam: Token,
      tokenBParam: Token
    ): RemoveLiquidityCalculation | null => {
      try {
        setRemoveCalculationError(null);

        // 入力値の検証
        if (percentage <= 0 || percentage > 100) {
          return null;
        }

        // ペアとLPトークン残高の確認
        if (!pair || !pairExists || lpTokenBalance <= BigInt(0)) {
          setRemoveCalculationError("流動性ポジションが見つかりません");
          return null;
        }

        // 除去するLPトークン量を計算
        const liquidityToRemove = (lpTokenBalance * BigInt(percentage)) / BigInt(100);

        // トークンの順序を確認
        const isToken0 = tokenAParam.address.toLowerCase() === pair.token0.toLowerCase();
        const reserveA = isToken0 ? pair.reserves.reserve0 : pair.reserves.reserve1;
        const reserveB = isToken0 ? pair.reserves.reserve1 : pair.reserves.reserve0;

        // 受け取るトークン量を計算
        const { amountA, amountB } = calculateTokensFromLiquidity(
          liquidityToRemove,
          pair.totalSupply,
          reserveA,
          reserveB
        );

        return {
          liquidityToRemove,
          amountA,
          amountB,
          percentage,
        };
      } catch (error) {
        console.error("Remove liquidity calculation error:", error);
        setRemoveCalculationError("流動性除去の計算中にエラーが発生しました");
        return null;
      }
    },
    [pair, pairExists, lpTokenBalance]
  );

  // 現在の計算結果（メモ化）
  const addLiquidityCalculation = useMemo(() => {
    if (!tokenA || !tokenB) return null;
    return calculateAddLiquidity("1", "1", tokenA, tokenB);
  }, [tokenA, tokenB, calculateAddLiquidity]);

  const removeLiquidityCalculation = useMemo(() => {
    if (!tokenA || !tokenB) return null;
    return calculateRemoveLiquidity(25, tokenA, tokenB); // デフォルト25%
  }, [tokenA, tokenB, calculateRemoveLiquidity]);

  // LPポジション情報の計算
  const lpPositions = useMemo((): LPPosition[] => {
    if (!tokenA || !tokenB || !pair || !pairExists || lpTokenBalance <= BigInt(0)) {
      return [];
    }

    try {
      // トークンの順序を確認
      const isToken0 = tokenA.address.toLowerCase() === pair.token0.toLowerCase();
      const reserveA = isToken0 ? pair.reserves.reserve0 : pair.reserves.reserve1;
      const reserveB = isToken0 ? pair.reserves.reserve1 : pair.reserves.reserve0;

      // プール内でのシェアを計算
      const shareOfPool = (Number(lpTokenBalance) / Number(pair.totalSupply)) * 100;

      // 引き出し可能な量を計算
      const { amountA: withdrawableAmountA, amountB: withdrawableAmountB } =
        calculateTokensFromLiquidity(lpTokenBalance, pair.totalSupply, reserveA, reserveB);

      // 手数料収益の推定（簡略化）
      // 実際の実装では、初回投資時の価格と現在の価格を比較して計算
      const earnedFees = {
        tokenA: BigInt(0), // 実装を簡略化
        tokenB: BigInt(0), // 実装を簡略化
      };

      // APRの計算（簡略化）
      // 実際の実装では、過去の取引量データを使用
      const apr = calculateAPR(0, Number(pair.totalSupply)); // 実装を簡略化

      return [
        {
          pairAddress: pair.address,
          tokenA,
          tokenB,
          lpBalance: lpTokenBalance,
          shareOfPool,
          withdrawableAmountA,
          withdrawableAmountB,
          earnedFees,
          apr,
        },
      ];
    } catch (error) {
      console.error("LP positions calculation error:", error);
      setPositionsError("LPポジション情報の計算中にエラーが発生しました");
      return [];
    }
  }, [tokenA, tokenB, pair, pairExists, lpTokenBalance]);

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

  // 流動性追加実行関数
  const addLiquidity = useCallback(
    async (params: AddLiquidityParams): Promise<void> => {
      const {
        tokenA: tokenAParam,
        tokenB: tokenBParam,
        amountADesired,
        amountBDesired,
        settings: liquiditySettings,
      } = params;

      if (!userAddress) {
        throw new Error("ウォレットが接続されていません");
      }

      try {
        setExecutionError(null);

        // 流動性計算
        const liquidityCalc = calculateAddLiquidity(
          amountADesired,
          amountBDesired,
          tokenAParam,
          tokenBParam
        );
        if (!liquidityCalc) {
          throw new Error("流動性計算に失敗しました");
        }

        // 承認チェック
        const needsTokenAApproval = await needsApproval(tokenAParam, liquidityCalc.amountA);
        if (needsTokenAApproval) {
          await approveToken(tokenAParam, liquidityCalc.amountA);
        }

        const needsTokenBApproval = await needsApproval(tokenBParam, liquidityCalc.amountB);
        if (needsTokenBApproval) {
          await approveToken(tokenBParam, liquidityCalc.amountB);
        }

        // デッドラインの計算
        const deadline = Math.floor(Date.now() / 1000) + liquiditySettings.deadline * 60;

        // 最小量の計算（スリッページ考慮）
        const slippageMultiplier = (100 - liquiditySettings.slippageTolerance) / 100;
        const amountAMin = BigInt(Math.floor(Number(liquidityCalc.amountA) * slippageMultiplier));
        const amountBMin = BigInt(Math.floor(Number(liquidityCalc.amountB) * slippageMultiplier));

        // 流動性追加実行
        await writeContract({
          address: router.address,
          abi: AMM_ROUTER_ABI,
          functionName: "addLiquidity",
          args: [
            tokenAParam.address as Address,
            tokenBParam.address as Address,
            liquidityCalc.amountA,
            liquidityCalc.amountB,
            amountAMin,
            amountBMin,
            userAddress,
            BigInt(deadline),
          ],
        });
      } catch (error) {
        console.error("Add liquidity execution error:", error);
        const errorMessage =
          error instanceof Error ? error.message : ERROR_MESSAGES.TRANSACTION_FAILED;
        setExecutionError(errorMessage);
        throw error;
      }
    },
    [userAddress, calculateAddLiquidity, needsApproval, approveToken, writeContract, router.address]
  );

  // 流動性除去実行関数
  const removeLiquidity = useCallback(
    async (params: RemoveLiquidityParams): Promise<void> => {
      const {
        tokenA: tokenAParam,
        tokenB: tokenBParam,
        percentage,
        settings: liquiditySettings,
      } = params;

      if (!userAddress) {
        throw new Error("ウォレットが接続されていません");
      }

      try {
        setExecutionError(null);

        // 流動性除去計算
        const removeCalc = calculateRemoveLiquidity(percentage, tokenAParam, tokenBParam);
        if (!removeCalc) {
          throw new Error("流動性除去計算に失敗しました");
        }

        // LPトークンの承認チェック
        const lpToken = {
          address: pair!.address,
          symbol: "LP",
          name: "LP Token",
          decimals: 18,
        };
        const needsLPApproval = await needsApproval(lpToken, removeCalc.liquidityToRemove);
        if (needsLPApproval) {
          await approveToken(lpToken, removeCalc.liquidityToRemove);
        }

        // デッドラインの計算
        const deadline = Math.floor(Date.now() / 1000) + liquiditySettings.deadline * 60;

        // 最小量の計算（スリッページ考慮）
        const slippageMultiplier = (100 - liquiditySettings.slippageTolerance) / 100;
        const amountAMin = BigInt(Math.floor(Number(removeCalc.amountA) * slippageMultiplier));
        const amountBMin = BigInt(Math.floor(Number(removeCalc.amountB) * slippageMultiplier));

        // 流動性除去実行
        await writeContract({
          address: router.address,
          abi: AMM_ROUTER_ABI,
          functionName: "removeLiquidity",
          args: [
            tokenAParam.address as Address,
            tokenBParam.address as Address,
            removeCalc.liquidityToRemove,
            amountAMin,
            amountBMin,
            userAddress,
            BigInt(deadline),
          ],
        });
      } catch (error) {
        console.error("Remove liquidity execution error:", error);
        const errorMessage =
          error instanceof Error ? error.message : ERROR_MESSAGES.TRANSACTION_FAILED;
        setExecutionError(errorMessage);
        throw error;
      }
    },
    [
      userAddress,
      calculateRemoveLiquidity,
      needsApproval,
      approveToken,
      writeContract,
      router.address,
      pair,
    ]
  );

  // 設定更新関数
  const updateDeadline = useCallback((deadline: number) => {
    setSettings((prev) => ({ ...prev, deadline }));
  }, []);

  const updateSlippage = useCallback((slippageTolerance: number) => {
    setSettings((prev) => ({ ...prev, slippageTolerance }));
  }, []);

  // バリデーション
  const validation = useMemo(() => {
    const amountAValidation = validateTokenAmount("1"); // デフォルト値での検証
    const amountBValidation = validateTokenAmount("1"); // デフォルト値での検証
    const deadlineValidation = validateDeadline(settings.deadline);

    const balanceAValidation = tokenA
      ? validateSufficientBalance("1", tokenABalance.toString(), tokenA.symbol)
      : { isValid: true };

    const balanceBValidation = tokenB
      ? validateSufficientBalance("1", tokenBBalance.toString(), tokenB.symbol)
      : { isValid: true };

    const percentageValidation = {
      isValid: true, // デフォルトで有効
      error: undefined,
      warning: undefined,
    };

    return {
      amountA: amountAValidation,
      amountB: amountBValidation,
      deadline: deadlineValidation,
      balanceA: balanceAValidation,
      balanceB: balanceBValidation,
      percentage: percentageValidation,
    };
  }, [settings.deadline, tokenA, tokenB, tokenABalance, tokenBBalance]);

  // エラー状態の統合
  useEffect(() => {
    if (writeError) {
      setExecutionError(writeError.message);
    }
    if (confirmError) {
      setExecutionError("トランザクションの確認に失敗しました");
    }
    if (pairError) {
      setAddCalculationError("ペア情報の取得に失敗しました");
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
    // 流動性追加関連
    addLiquidityCalculation,
    isCalculatingAdd: isPairLoading,
    addCalculationError,

    // 流動性除去関連
    removeLiquidityCalculation,
    isCalculatingRemove: isPairLoading,
    removeCalculationError,

    // LPポジション情報
    lpPositions,
    isLoadingPositions: isPairLoading,
    positionsError,

    // 残高情報
    tokenABalance,
    tokenBBalance,
    lpTokenBalance,
    isLoadingBalances,

    // 設定
    settings,
    updateDeadline,
    updateSlippage,

    // トランザクション実行
    addLiquidity,
    removeLiquidity,
    isExecuting: isWritePending,
    transactionHash: transactionHash || null,
    isConfirming,
    executionError,

    // ユーティリティ関数
    calculateAddLiquidity,
    calculateRemoveLiquidity,
    needsApproval,
    approveToken,
    isApproving,

    // バリデーション
    validation,
  };
}
