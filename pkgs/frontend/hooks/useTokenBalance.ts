"use client";

import { ERC20_ABI } from "@/lib/contracts";
import type { Token } from "@/lib/tokens";
import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { useAccount, useReadContract, useWatchContractEvent } from "wagmi";

/**
 * トークン残高情報の型定義
 */
export interface TokenBalance {
  /** 生の残高（wei単位） */
  raw: bigint;
  /** フォーマット済み残高（人間が読める形式） */
  formatted: string;
  /** 小数点以下の桁数 */
  decimals: number;
  /** 残高の数値（number型） */
  value: number;
}

/**
 * useTokenBalance フックのオプション
 */
export interface UseTokenBalanceOptions {
  /** 残高を監視するトークン */
  token?: Token;
  /** 残高を取得するアドレス（指定しない場合は接続中のウォレット） */
  account?: Address;
  /** 自動更新を有効にするか */
  watch?: boolean;
  /** 更新間隔（ミリ秒） */
  refetchInterval?: number;
}

/**
 * useTokenBalance フックの戻り値
 */
export interface UseTokenBalanceReturn {
  /** トークン残高情報 */
  balance: TokenBalance | null;
  /** データ取得中かどうか */
  isLoading: boolean;
  /** エラー情報 */
  error: Error | null;
  /** 手動でデータを再取得する関数 */
  refetch: () => void;
}

/**
 * トークン残高を取得・監視するカスタムフック
 *
 * @param options - フックのオプション
 * @returns トークン残高情報と関連する状態
 */
export function useTokenBalance(options: UseTokenBalanceOptions = {}): UseTokenBalanceReturn {
  const { token, account, watch = true, refetchInterval = 10000 } = options;
  const { address: connectedAddress } = useAccount();

  // 使用するアドレスを決定（指定されたアドレス or 接続中のウォレット）
  const targetAddress = account || connectedAddress;

  // 内部状態
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // コントラクト読み取り設定
  const contractConfig =
    token && targetAddress
      ? {
          address: token.address as Address,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [targetAddress],
        }
      : undefined;

  // 残高データの読み取り
  const {
    data: rawBalance,
    isLoading: isContractLoading,
    error: contractError,
    refetch: contractRefetch,
  } = useReadContract({
    ...contractConfig,
    query: {
      enabled: Boolean(token && targetAddress),
      refetchInterval: watch ? refetchInterval : false,
    },
  });

  // 残高データの処理
  const processBalance = useCallback((rawValue: bigint, tokenDecimals: number): TokenBalance => {
    const formatted = formatUnits(rawValue, tokenDecimals);
    const value = parseFloat(formatted);

    return {
      raw: rawValue,
      formatted,
      decimals: tokenDecimals,
      value,
    };
  }, []);

  // 残高データが更新された時の処理
  useEffect(() => {
    if (
      rawBalance !== undefined &&
      rawBalance !== null &&
      token &&
      typeof rawBalance === "bigint"
    ) {
      try {
        const processedBalance = processBalance(rawBalance, token.decimals);
        setBalance(processedBalance);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("残高の処理中にエラーが発生しました"));
        setBalance(null);
      }
    } else {
      setBalance(null);
    }
  }, [rawBalance, token, processBalance]);

  // エラー状態の更新
  useEffect(() => {
    if (contractError) {
      setError(
        contractError instanceof Error
          ? contractError
          : new Error("コントラクトエラーが発生しました")
      );
    }
  }, [contractError]);

  // Transfer イベントの監視（リアルタイム更新）
  useWatchContractEvent({
    address: token?.address as Address,
    abi: ERC20_ABI,
    eventName: "Transfer",
    args: {
      from: targetAddress,
    },
    onLogs: () => {
      // 送信者として関与するTransferイベントが発生した場合、残高を再取得
      if (watch && contractRefetch) {
        contractRefetch();
      }
    },
    enabled: Boolean(token && targetAddress && watch),
  });

  // 受取側としての Transfer イベントも監視（入金時に即時更新）
  useWatchContractEvent({
    address: token?.address as Address,
    abi: ERC20_ABI,
    eventName: "Transfer",
    args: {
      to: targetAddress,
    },
    onLogs: () => {
      if (watch && contractRefetch) {
        contractRefetch();
      }
    },
    enabled: Boolean(token && targetAddress && watch),
  });

  // 手動リフェッチ関数
  const manualRefetch = useCallback(() => {
    if (contractRefetch) {
      contractRefetch();
    }
  }, [contractRefetch]);

  // ローディング状態
  const isLoading = Boolean(token && targetAddress) ? Boolean(isContractLoading) : false;

  return {
    balance,
    isLoading,
    error,
    refetch: manualRefetch,
  };
}
