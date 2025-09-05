"use client";

import { useCallback } from "react";
import type { Address } from "viem";
import { useReadContract, useWatchContractEvent } from "wagmi";

export interface EventWatcherOption {
  eventName: string;
  args?: Record<string, unknown>;
}

export interface UseContractReadOptions<
  TResult = unknown,
  TArgs extends readonly unknown[] = readonly unknown[],
> {
  address?: Address;
  abi: readonly any[];
  functionName: string;
  args?: TArgs;
  enabled?: boolean;
  /**
   * Transform result before returning (TanStack Query select)
   */
  select?: (data: unknown) => TResult;
  /**
   * Enable periodic refetching and event-driven updates
   */
  watch?: boolean;
  /**
   * Polling interval in ms. Use false to disable polling.
   */
  refetchInterval?: number | false;
  /**
   * Optional list of events to watch on the same contract for real-time updates
   */
  eventWatchers?: EventWatcherOption[];
}

export interface UseContractReadReturn<TResult = unknown> {
  data: TResult | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Generic contract read hook with optional polling and event-driven refetching.
 * Wraps wagmi's useReadContract and useWatchContractEvent.
 */
export function useContractRead<
  TResult = unknown,
  TArgs extends readonly unknown[] = readonly unknown[],
>(options: UseContractReadOptions<TResult, TArgs>): UseContractReadReturn<TResult> {
  const {
    address,
    abi,
    functionName,
    args,
    enabled = true,
    select,
    watch = true,
    refetchInterval = false,
    eventWatchers = [],
  } = options;

  const { data, isLoading, error, refetch } = useReadContract({
    address,
    abi,
    // wagmi expects the concrete function name; cast to satisfy generic typing
    functionName: functionName as any,
    args: (args as any) || undefined,
    query: {
      enabled: Boolean(enabled && address),
      refetchInterval: watch ? refetchInterval : false,
      select: select as any,
    },
  });

  const safeRefetch = useCallback(() => {
    // Only call when hook is enabled
    if (enabled) refetch?.();
  }, [enabled, refetch]);

  // Up to 4 event watchers (common for Pair: Sync, Mint, Burn, Swap)
  const w0 = eventWatchers[0];
  const w1 = eventWatchers[1];
  const w2 = eventWatchers[2];
  const w3 = eventWatchers[3];

  useWatchContractEvent({
    address,
    abi,
    eventName: (w0?.eventName as any) || undefined,
    args: (w0?.args as any) || undefined,
    onLogs: () => {
      if (watch) safeRefetch();
    },
    enabled: Boolean(enabled && watch && address && w0?.eventName),
  });

  useWatchContractEvent({
    address,
    abi,
    eventName: (w1?.eventName as any) || undefined,
    args: (w1?.args as any) || undefined,
    onLogs: () => {
      if (watch) safeRefetch();
    },
    enabled: Boolean(enabled && watch && address && w1?.eventName),
  });

  useWatchContractEvent({
    address,
    abi,
    eventName: (w2?.eventName as any) || undefined,
    args: (w2?.args as any) || undefined,
    onLogs: () => {
      if (watch) safeRefetch();
    },
    enabled: Boolean(enabled && watch && address && w2?.eventName),
  });

  useWatchContractEvent({
    address,
    abi,
    eventName: (w3?.eventName as any) || undefined,
    args: (w3?.args as any) || undefined,
    onLogs: () => {
      if (watch) safeRefetch();
    },
    enabled: Boolean(enabled && watch && address && w3?.eventName),
  });

  return {
    data: data as TResult | undefined,
    isLoading: Boolean(enabled && isLoading),
    error: (error as Error) || null,
    refetch: safeRefetch,
  };
}
