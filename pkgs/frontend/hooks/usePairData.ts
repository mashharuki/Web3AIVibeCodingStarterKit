"use client";

import { useCallback, useMemo } from "react";
import type { Address } from "viem";
import { useReadContract, useWatchContractEvent } from "wagmi";
import {
  AMM_FACTORY_ABI,
  AMM_PAIR_ABI,
  getFactoryContract,
  getPairContract,
} from "@/lib/contracts";
import { TIME_CONSTANTS } from "@/utils/constants";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export interface PairReserves {
  reserve0: bigint;
  reserve1: bigint;
  blockTimestampLast: number;
}

export interface PairData {
  address: Address;
  token0: Address;
  token1: Address;
  reserves: PairReserves;
  totalSupply: bigint;
}

export interface UsePairDataOptions {
  /**
   * ペアアドレス（既知の場合）。未指定なら tokenA/tokenB から解決。
   */
  pairAddress?: Address;
  /** トークンA アドレス（pairAddress が未指定の場合に使用） */
  tokenA?: Address;
  /** トークンB アドレス（pairAddress が未指定の場合に使用） */
  tokenB?: Address;
  /** フックの有効/無効 */
  enabled?: boolean;
  /** イベント監視およびポーリングの有効/無効 */
  watch?: boolean;
  /** リフレッシュ間隔（ミリ秒）。false でポーリング無効。 */
  refetchInterval?: number | false;
}

export interface UsePairDataReturn {
  pair: PairData | null;
  exists: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * AMM Pair の基礎データ（token0, token1, reserves, totalSupply）を取得し、
 * Sync/Mint/Burn/Swap イベントでリアルタイム更新するフック。
 */
export function usePairData(options: UsePairDataOptions): UsePairDataReturn {
  const {
    pairAddress,
    tokenA,
    tokenB,
    enabled = true,
    watch = true,
    refetchInterval = TIME_CONSTANTS.PRICE_UPDATE_INTERVAL,
  } = options;

  // 1) ペアアドレスの解決（未指定で tokenA/tokenB があれば Factory から取得）
  const factory = getFactoryContract();

  const {
    data: resolvedFromFactory,
    isLoading: isLoadingPairFromFactory,
    error: factoryError,
  } = useReadContract({
    address: factory.address,
    abi: AMM_FACTORY_ABI,
    functionName: "getPair",
    args: tokenA && tokenB ? [tokenA, tokenB] : undefined,
    query: {
      enabled: Boolean(enabled && !pairAddress && tokenA && tokenB),
      // factory のアドレスは静的なためポーリング不要
      refetchInterval: false,
    },
  });

  const resolvedPairAddress = useMemo(() => {
    const addr = (pairAddress || (resolvedFromFactory as Address | undefined)) as
      | Address
      | undefined;
    if (!addr) return undefined;
    return addr;
  }, [pairAddress, resolvedFromFactory]);

  const pairExists = useMemo(() => {
    if (!resolvedPairAddress) return false;
    return resolvedPairAddress.toLowerCase() !== ZERO_ADDRESS.toLowerCase();
  }, [resolvedPairAddress]);

  // 2) ペアの各種読み取り（token0, token1, reserves, totalSupply）
  const pairCfg = resolvedPairAddress ? getPairContract(resolvedPairAddress) : undefined;

  const {
    data: token0,
    isLoading: isLoadingToken0,
    refetch: refetchToken0,
  } = useReadContract({
    address: pairCfg?.address,
    abi: AMM_PAIR_ABI,
    functionName: "token0",
    query: {
      enabled: Boolean(enabled && pairExists && pairCfg?.address),
      refetchInterval: watch ? refetchInterval : false,
    },
  });

  const {
    data: token1,
    isLoading: isLoadingToken1,
    refetch: refetchToken1,
  } = useReadContract({
    address: pairCfg?.address,
    abi: AMM_PAIR_ABI,
    functionName: "token1",
    query: {
      enabled: Boolean(enabled && pairExists && pairCfg?.address),
      refetchInterval: watch ? refetchInterval : false,
    },
  });

  const {
    data: reservesRaw,
    isLoading: isLoadingReserves,
    refetch: refetchReserves,
  } = useReadContract({
    address: pairCfg?.address,
    abi: AMM_PAIR_ABI,
    functionName: "getReserves",
    query: {
      enabled: Boolean(enabled && pairExists && pairCfg?.address),
      refetchInterval: watch ? refetchInterval : false,
    },
  });

  const {
    data: totalSupply,
    isLoading: isLoadingTotalSupply,
    refetch: refetchTotalSupply,
  } = useReadContract({
    address: pairCfg?.address,
    abi: AMM_PAIR_ABI,
    functionName: "totalSupply",
    query: {
      enabled: Boolean(enabled && pairExists && pairCfg?.address),
      refetchInterval: watch ? refetchInterval : false,
    },
  });

  const refetchAll = useCallback(() => {
    if (!enabled) return;
    refetchToken0?.();
    refetchToken1?.();
    refetchReserves?.();
    refetchTotalSupply?.();
  }, [enabled, refetchToken0, refetchToken1, refetchReserves, refetchTotalSupply]);

  // 3) リアルタイム更新（Sync/Mint/Burn/Swap）
  useWatchContractEvent({
    address: pairCfg?.address,
    abi: AMM_PAIR_ABI,
    eventName: "Sync",
    onLogs: () => {
      if (watch) refetchAll();
    },
    enabled: Boolean(enabled && watch && pairExists && pairCfg?.address),
  });

  useWatchContractEvent({
    address: pairCfg?.address,
    abi: AMM_PAIR_ABI,
    eventName: "Mint",
    onLogs: () => {
      if (watch) refetchAll();
    },
    enabled: Boolean(enabled && watch && pairExists && pairCfg?.address),
  });

  useWatchContractEvent({
    address: pairCfg?.address,
    abi: AMM_PAIR_ABI,
    eventName: "Burn",
    onLogs: () => {
      if (watch) refetchAll();
    },
    enabled: Boolean(enabled && watch && pairExists && pairCfg?.address),
  });

  useWatchContractEvent({
    address: pairCfg?.address,
    abi: AMM_PAIR_ABI,
    eventName: "Swap",
    onLogs: () => {
      if (watch) refetchAll();
    },
    enabled: Boolean(enabled && watch && pairExists && pairCfg?.address),
  });

  const pair: PairData | null = useMemo(() => {
    if (!pairExists || !resolvedPairAddress) return null;

    const reservesTuple = reservesRaw as readonly [bigint, bigint, number] | undefined;

    return {
      address: resolvedPairAddress,
      token0: (token0 as Address | undefined) || ZERO_ADDRESS,
      token1: (token1 as Address | undefined) || ZERO_ADDRESS,
      reserves: {
        reserve0: reservesTuple?.[0] ?? (0n as bigint),
        reserve1: reservesTuple?.[1] ?? (0n as bigint),
        blockTimestampLast: reservesTuple?.[2] ?? 0,
      },
      totalSupply: (totalSupply as bigint | undefined) ?? (0n as bigint),
    };
  }, [pairExists, resolvedPairAddress, token0, token1, reservesRaw, totalSupply]);

  const isLoading = Boolean(
    (enabled && !pairAddress && tokenA && tokenB && isLoadingPairFromFactory) ||
      (enabled &&
        pairExists &&
        (isLoadingToken0 || isLoadingToken1 || isLoadingReserves || isLoadingTotalSupply))
  );

  return {
    pair,
    exists: pairExists,
    isLoading,
    error: ((factoryError as Error) || null) as Error | null,
    refetch: refetchAll,
  };
}
