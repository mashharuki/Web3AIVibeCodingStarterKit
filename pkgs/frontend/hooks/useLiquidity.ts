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
    (
      tokenA: `0x${string}`,
      tokenB: `0x${string}`,
      amountADesired: string,
      amountBDesired: string,
      amountAMin: string,
      amountBMin: string,
      to: `0x${string}`
    ) => {
      const contracts = getCurrentContracts();
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30分後

      setCurrentStep("executing");
      setTransactionStatus("pending");
      showTransactionToast.loading("流動性を追加中...");

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
