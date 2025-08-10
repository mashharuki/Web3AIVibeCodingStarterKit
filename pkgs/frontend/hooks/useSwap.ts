"use client";

import { showTransactionToast } from "@/components/ui/TransactionNotifications";
import { getCurrentContracts } from "@/config/contracts";
import { useUIStore } from "@/stores/useStore";
import { ERC20_ABI, ROUTER_ABI } from "@/utils/abi";
import { useEffect } from "react";
import { parseEther } from "viem";
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

/**
 * トークン残高を取得するフック
 */
export function useTokenBalance(
  tokenAddress: `0x${string}`,
  userAddress?: `0x${string}`
) {
  return useReadContract({
    address: tokenAddress,
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
 * プールのリザーブ情報を取得するフック
 */
export function usePoolReserves(tokenA: `0x${string}`, tokenB: `0x${string}`) {
  const contracts = getCurrentContracts();

  return useReadContract({
    address: contracts.dex.DexRouter,
    abi: ROUTER_ABI,
    functionName: "getReserves",
    args: [tokenA, tokenB],
    query: {
      refetchInterval: 10000, // 10秒ごとに更新
    },
  });
}

/**
 * スワップの出力量を計算するフック
 */
export function useSwapAmountOut(
  amountIn: string,
  reserveIn?: bigint,
  reserveOut?: bigint
) {
  const contracts = getCurrentContracts();

  return useReadContract({
    address: contracts.dex.DexRouter,
    abi: ROUTER_ABI,
    functionName: "getAmountOut",
    args:
      amountIn && reserveIn && reserveOut
        ? [parseEther(amountIn), reserveIn, reserveOut]
        : undefined,
    query: {
      enabled: !!(amountIn && reserveIn && reserveOut && Number(amountIn) > 0),
    },
  });
}

/**
 * スワップ機能のフック
 */
export function useSwap() {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract({
    mutation: {
      onSuccess: (hash) => {
        console.log("Swap transaction hash:", hash);
      },
      onError: (error) => {
        console.error("Swap error:", error);
        showTransactionToast.error(error.message || "スワップに失敗しました");
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
  const { setTransactionStatus, setTransactionHash } = useUIStore();

  const swap = async (
    amountIn: string,
    amountOutMin: string,
    tokenInAddress: `0x${string}`,
    tokenOutAddress: `0x${string}`,
    userAddress: `0x${string}`
  ) => {
    const contracts = getCurrentContracts();
    const path = [tokenInAddress, tokenOutAddress];
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30分後

    setTransactionStatus("pending");
    showTransactionToast.loading("スワップを実行中...");

    writeContract({
      address: contracts.dex.DexRouter,
      abi: ROUTER_ABI,
      functionName: "swapExactTokensForTokens",
      args: [
        parseEther(amountIn),
        parseEther(amountOutMin),
        path,
        userAddress,
        deadline,
      ],
    });
  };

  // トランザクションの状態変化を監視
  useEffect(() => {
    if (hash && isSuccess) {
      setTransactionStatus("success");
      setTransactionHash(hash);
      showTransactionToast.success(hash, "スワップが完了しました！");
    } else if (isError || error) {
      setTransactionStatus("error");
      showTransactionToast.error("トランザクションが失敗しました");
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
    swap,
    isPending: isPending || isConfirming,
    hash,
    isSuccess,
  };
}

/**
 * トークンの承認機能のフック
 */
export function useTokenApproval() {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract({
    mutation: {
      onSuccess: (hash) => {
        console.log("Token approval transaction hash:", hash);
      },
      onError: (error) => {
        console.error("Token approval error:", error);
        showTransactionToast.error(error.message || "承認に失敗しました");
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

  const approve = async (
    tokenAddress: `0x${string}`,
    spenderAddress: `0x${string}`,
    amount: string
  ) => {
    showTransactionToast.loading("トークンの承認中...");

    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress, parseEther(amount)],
    });
  };

  // トークン承認の状態変化を監視
  useEffect(() => {
    if (hash && isSuccess) {
      showTransactionToast.success(hash, "トークンの承認が完了しました！");
    } else if (isError || error) {
      showTransactionToast.error("承認トランザクションが失敗しました");
    }
  }, [hash, isSuccess, isError, error]);

  return {
    approve,
    isPending: isPending || isConfirming,
    hash,
    isSuccess,
  };
}

/**
 * トークンの承認状況を確認するフック
 */
export function useTokenAllowance(
  tokenAddress: `0x${string}`,
  ownerAddress?: `0x${string}`,
  spenderAddress?: `0x${string}`
) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      ownerAddress && spenderAddress
        ? [ownerAddress, spenderAddress]
        : undefined,
    query: {
      enabled: !!(ownerAddress && spenderAddress),
      refetchInterval: 10000,
    },
  });
}
