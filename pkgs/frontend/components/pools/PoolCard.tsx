"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePairData } from "@/hooks/usePairData";
import { calculateAPR, calculateTVL } from "@/lib/calculations";
import { getTokenByAddress } from "@/lib/tokens";
import { formatCompactNumber, formatPercentage, formatTokenAmount } from "@/utils/formatters";
import { useMemo } from "react";
import type { Address } from "viem";

export interface PoolCardProps {
  /** ペアアドレス */
  pairAddress: Address;
  /** 24時間取引量（USD） */
  volume24h?: number;
  /** トークンA の価格（USD） */
  tokenAPrice?: number;
  /** トークンB の価格（USD） */
  tokenBPrice?: number;
  /** クリック時のコールバック */
  onClick?: (pairAddress: Address) => void;
  /** カードのサイズ */
  size?: "sm" | "md" | "lg";
  /** 詳細表示モード */
  showDetails?: boolean;
}

/**
 * 個別プール情報を表示するカードコンポーネント
 * TVL、取引量、APR などの主要指標を表示
 */
export function PoolCard({
  pairAddress,
  volume24h = 0,
  tokenAPrice = 1,
  tokenBPrice = 1,
  onClick,
  size = "md",
  showDetails = true,
}: PoolCardProps) {
  // ペアデータを取得
  const { pair, exists, isLoading } = usePairData({
    pairAddress,
    enabled: true,
    watch: true,
  });

  // トークン情報を取得
  const tokenA = useMemo(() => {
    if (!pair?.token0) return null;
    return getTokenByAddress(pair.token0);
  }, [pair?.token0]);

  const tokenB = useMemo(() => {
    if (!pair?.token1) return null;
    return getTokenByAddress(pair.token1);
  }, [pair?.token1]);

  // TVL を計算
  const tvl = useMemo(() => {
    if (!pair || !tokenA || !tokenB) return 0;

    return calculateTVL(
      pair.reserves.reserve0,
      pair.reserves.reserve1,
      tokenAPrice,
      tokenBPrice,
      tokenA.decimals,
      tokenB.decimals
    );
  }, [pair, tokenA, tokenB, tokenAPrice, tokenBPrice]);

  // APR を計算
  const apr = useMemo(() => {
    if (tvl <= 0 || volume24h <= 0) return 0;
    return calculateAPR(volume24h, tvl);
  }, [tvl, volume24h]);

  // ペアシンボルを生成
  const pairSymbol = useMemo(() => {
    if (!tokenA || !tokenB) return "Unknown Pair";
    return `${tokenA.symbol}/${tokenB.symbol}`;
  }, [tokenA, tokenB]);

  // カードサイズに応じたスタイル
  const cardSizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const titleSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  // ローディング状態
  if (isLoading) {
    return (
      <Card className={`cursor-pointer hover:shadow-md transition-shadow ${cardSizeClasses[size]}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
          <div className="h-3 bg-gray-200 rounded animate-pulse w-12"></div>
          <div className="h-3 bg-gray-200 rounded animate-pulse w-14"></div>
        </CardContent>
      </Card>
    );
  }

  // ペアが存在しない場合
  if (!exists || !pair || !tokenA || !tokenB) {
    return (
      <Card className={`opacity-50 ${cardSizeClasses[size]}`}>
        <CardHeader className="pb-2">
          <CardTitle className={titleSizeClasses[size]}>Unknown Pair</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">ペアが見つかりません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${cardSizeClasses[size]}`}
      onClick={() => onClick?.(pairAddress)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={`font-semibold ${titleSizeClasses[size]}`}>{pairSymbol}</CardTitle>
          {apr > 0 && (
            <Badge variant={apr > 10 ? "default" : "secondary"} className="text-xs">
              {formatPercentage(apr)} APR
            </Badge>
          )}
        </div>
        {showDetails && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              {tokenA.logoURI && (
                <img src={tokenA.logoURI} alt={tokenA.symbol} className="w-4 h-4 rounded-full" />
              )}
              <span>{tokenA.symbol}</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1">
              {tokenB.logoURI && (
                <img src={tokenB.logoURI} alt={tokenB.symbol} className="w-4 h-4 rounded-full" />
              )}
              <span>{tokenB.symbol}</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {/* TVL */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">TVL</span>
          <span className="text-sm font-medium">
            {formatCompactNumber(tvl, { showSymbol: true, symbol: "$" })}
          </span>
        </div>

        {/* 24時間取引量 */}
        {showDetails && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">24h Volume</span>
            <span className="text-sm font-medium">
              {formatCompactNumber(volume24h, { showSymbol: true, symbol: "$" })}
            </span>
          </div>
        )}

        {/* 流動性情報 */}
        {showDetails && (
          <div className="pt-2 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">{tokenA.symbol}</div>
                <div className="font-medium">
                  {formatTokenAmount(pair.reserves.reserve0, tokenA.decimals, {
                    decimals: 2,
                    useGrouping: true,
                  })}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">{tokenB.symbol}</div>
                <div className="font-medium">
                  {formatTokenAmount(pair.reserves.reserve1, tokenB.decimals, {
                    decimals: 2,
                    useGrouping: true,
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 流動性が少ない場合の警告 */}
        {tvl < 1000 && tvl > 0 && (
          <div className="flex items-center space-x-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
            <span>⚠️</span>
            <span>低流動性</span>
          </div>
        )}

        {/* 新しいプールの場合のバッジ */}
        {tvl === 0 && (
          <div className="flex items-center space-x-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            <span>🆕</span>
            <span>新規プール</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
