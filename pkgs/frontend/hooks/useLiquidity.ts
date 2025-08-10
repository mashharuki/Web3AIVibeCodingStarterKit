"use client";

import { showTransactionToast } from "@/components/ui/TransactionNotifications";
import { getCurrentContracts } from "@/config/contracts";
import { useUIStore } from "@/stores/useStore";
import { ERC20_ABI, PAIR_ABI, ROUTER_ABI } from "@/utils/abi";
import { useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

/**
 * 流動性管理の状態タイプ
 */
type LiquidityStep =
  | "idle"
  | "approving-a"
  | "approving-b"
  | "approving-lp"
  | "executing"
  | "success"
  | "error";

/**
 * プールの最適流動性量を計算するフック
 */
export function useOptimalLiquidityAmount(
  pairAddress: `0x${string}` | undefined,
  amountA: string,
  amountB: string,
  baseToken: "A" | "B" = "A"
) {
  // プールのリザーブを取得
  const { 
    data: reserves, 
    isLoading: isLoadingReserves,
    error: reservesError 
  } = useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: "getReserves",
    query: {
      enabled: !!pairAddress && pairAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  // トークンの順序を取得
  const { 
    data: token0, 
    isLoading: isLoadingToken0,
    error: token0Error 
  } = useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: "token0",
    query: {
      enabled: !!pairAddress && pairAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  // 全体のローディング状態
  const isCalculating = isLoadingReserves || isLoadingToken0;
  const hasError = reservesError || token0Error;

  const calculateOptimalAmounts = useCallback(() => {
    if (isCalculating) {
      return { 
        optimalAmountA: "0", 
        optimalAmountB: "0", 
        needsCalculation: false,
        isCalculating: true,
        hasError: false,
        error: null
      };
    }

    if (hasError || !reserves || !token0) {
      return { 
        optimalAmountA: "0", 
        optimalAmountB: "0", 
        needsCalculation: false,
        isCalculating: false,
        hasError: !!hasError,
        error: reservesError || token0Error
      };
    }

    // 基準となる値が入力されていない場合
    const baseAmount = baseToken === "A" ? amountA : amountB;
    if (!baseAmount || baseAmount === "0" || Number.isNaN(Number(baseAmount))) {
      return { 
        optimalAmountA: amountA || "0", 
        optimalAmountB: amountB || "0", 
        needsCalculation: false,
        isCalculating: false,
        hasError: false,
        error: null
      };
    }

    const contracts = getCurrentContracts();
    const tokenAAddress = contracts.tokens.TokenA.toLowerCase();
    const isToken0A = token0.toLowerCase() === tokenAAddress;
    
    const [reserve0, reserve1] = reserves as readonly [bigint, bigint, number];
    const reserveA = isToken0A ? reserve0 : reserve1;
    const reserveB = isToken0A ? reserve1 : reserve0;

    // リザーブが0の場合（初回流動性追加）
    if (reserveA === BigInt(0) || reserveB === BigInt(0)) {
      return { 
        optimalAmountA: amountA || "0", 
        optimalAmountB: amountB || "0", 
        needsCalculation: false,
        isCalculating: false,
        hasError: false,
        error: null
      };
    }

    let optimalAmountA: string;
    let optimalAmountB: string;

    if (baseToken === "A") {
      // TokenAを基準にTokenBの最適量を計算
      optimalAmountA = amountA || "0";
      const amountAWei = parseEther(amountA || "0");
      const optimalBWei = (amountAWei * reserveB) / reserveA;
      optimalAmountB = (Number(optimalBWei) / 1e18).toString();
    } else {
      // TokenBを基準にTokenAの最適量を計算
      optimalAmountB = amountB || "0";
      const amountBWei = parseEther(amountB || "0");
      const optimalAWei = (amountBWei * reserveA) / reserveB;
      optimalAmountA = (Number(optimalAWei) / 1e18).toString();
    }

    return { 
      optimalAmountA, 
      optimalAmountB, 
      needsCalculation: true,
      reserveA: Number(reserveA) / 1e18,
      reserveB: Number(reserveB) / 1e18,
      ratio: Number(reserveA) / Number(reserveB),
      isCalculating: false,
      hasError: false,
      error: null
    };
  }, [reserves, token0, amountA, amountB, baseToken, isCalculating, hasError, reservesError, token0Error]);

  return calculateOptimalAmounts();
}

/**
 * 流動性追加のフック
 */
export function useAddLiquidity() {
  const [currentStep, setCurrentStep] = useState<LiquidityStep>("idle");
  const { setTransactionStatus, setTransactionHash } = useUIStore();

  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract({
    mutation: {
      onSuccess: (hash) => {
        console.log("Add liquidity transaction hash:", hash);
      },
      onError: (error) => {
        console.error("Add liquidity error:", error);
        setCurrentStep("error");
        showTransactionToast.error(error.message || "流動性追加に失敗しました");
      },
    },
  });
  const {
    isLoading: isConfirming,
    isSuccess,
    isError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const addLiquidity = useCallback(
    async (
      tokenA: `0x${string}`,
      tokenB: `0x${string}`,
      amountADesired: string,
      amountBDesired: string,
      amountAMin: string,
      amountBMin: string,
      to: `0x${string}`
    ) => {
      try {
        const contracts = getCurrentContracts();
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30分後

        setCurrentStep("executing");
        setTransactionStatus("pending");
        showTransactionToast.loading("流動性を追加中...");

        console.log("Adding liquidity with params:", {
          tokenA,
          tokenB,
          amountADesired: `${amountADesired} (${parseEther(amountADesired).toString()})`,
          amountBDesired: `${amountBDesired} (${parseEther(amountBDesired).toString()})`,
          amountAMin: `${amountAMin} (${parseEther(amountAMin).toString()})`,
          amountBMin: `${amountBMin} (${parseEther(amountBMin).toString()})`,
          to,
          deadline: deadline.toString(),
        });

        writeContract({
          address: contracts.dex.DexRouter,
          abi: ROUTER_ABI,
          functionName: "addLiquidity",
          args: [
            tokenA,
            tokenB,
            parseEther(amountADesired),
            parseEther(amountBDesired),
            parseEther(amountAMin),
            parseEther(amountBMin),
            to,
            deadline,
          ],
        });
      } catch (error) {
        console.error("流動性追加でエラーが発生:", error);
        setCurrentStep("error");
        showTransactionToast.error("流動性追加の準備に失敗しました");
      }
    },
    [writeContract, setTransactionStatus]
  );

  // トランザクションの状態変化を監視
  useEffect(() => {
    if (hash && isSuccess) {
      setCurrentStep("success");
      setTransactionStatus("success");
      setTransactionHash(hash);
      showTransactionToast.success(hash, "流動性の追加が完了しました！");
    } else if (isError || error) {
      setCurrentStep("error");
      setTransactionStatus("error");
      showTransactionToast.error("流動性追加のトランザクションが失敗しました");
    }
  }, [
    hash,
    isSuccess,
    isError,
    error,
    setTransactionStatus,
    setTransactionHash,
  ]);

  return {
    addLiquidity,
    isPending: isPending || isConfirming,
    currentStep,
    setCurrentStep,
    hash,
    isSuccess,
  };
}

/**
 * 流動性削除のフック
 */
export function useRemoveLiquidity() {
  const [currentStep, setCurrentStep] = useState<LiquidityStep>("idle");
  const { setTransactionStatus, setTransactionHash } = useUIStore();

  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract({
    mutation: {
      onSuccess: (hash) => {
        console.log("Remove liquidity transaction hash:", hash);
      },
      onError: (error) => {
        console.error("Remove liquidity error:", error);
        setCurrentStep("error");
        showTransactionToast.error(error.message || "流動性削除に失敗しました");
      },
    },
  });
  const {
    isLoading: isConfirming,
    isSuccess,
    isError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const removeLiquidity = useCallback(
    (
      tokenA: `0x${string}`,
      tokenB: `0x${string}`,
      liquidity: string,
      amountAMin: string,
      amountBMin: string,
      to: `0x${string}`
    ) => {
      const contracts = getCurrentContracts();
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30分後

      setCurrentStep("executing");
      setTransactionStatus("pending");
      showTransactionToast.loading("流動性を削除中...");

      writeContract({
        address: contracts.dex.DexRouter,
        abi: ROUTER_ABI,
        functionName: "removeLiquidity",
        args: [
          tokenA,
          tokenB,
          parseEther(liquidity),
          parseEther(amountAMin),
          parseEther(amountBMin),
          to,
          deadline,
        ],
      });
    },
    [writeContract, setTransactionStatus]
  );

  // トランザクションの状態変化を監視
  useEffect(() => {
    if (hash && isSuccess) {
      setCurrentStep("success");
      setTransactionStatus("success");
      setTransactionHash(hash);
      showTransactionToast.success(hash, "流動性の削除が完了しました！");
    } else if (isError || error) {
      setCurrentStep("error");
      setTransactionStatus("error");
      showTransactionToast.error("流動性削除のトランザクションが失敗しました");
    }
  }, [
    hash,
    isSuccess,
    isError,
    error,
    setTransactionStatus,
    setTransactionHash,
  ]);

  return {
    removeLiquidity,
    isPending: isPending || isConfirming,
    currentStep,
    setCurrentStep,
    hash,
    isSuccess,
  };
}

/**
 * LPトークン残高を取得するフック
 */
export function useLPTokenBalance(
  pairAddress: `0x${string}`,
  userAddress?: `0x${string}`
) {
  return useReadContract({
    address: pairAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: 10000, // 10秒ごとに更新
    },
  });
}

/**
 * ペアの総供給量を取得するフック
 */
export function usePairTotalSupply(pairAddress: `0x${string}`) {
  return useReadContract({
    address: pairAddress,
    abi: ERC20_ABI,
    functionName: "totalSupply",
    query: {
      refetchInterval: 10000, // 10秒ごとに更新
    },
  });
}

/**
 * ペアの詳細情報を取得するフック
 */
export function usePairInfo(pairAddress: `0x${string}`) {
  const token0 = useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: "token0",
  });

  const token1 = useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: "token1",
  });

  const reserves = useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: "getReserves",
    query: {
      refetchInterval: 10000, // 10秒ごとに更新
    },
  });

  return {
    token0: token0.data,
    token1: token1.data,
    reserves: reserves.data,
    isLoading: token0.isLoading || token1.isLoading || reserves.isLoading,
    error: token0.error || token1.error || reserves.error,
  };
}
