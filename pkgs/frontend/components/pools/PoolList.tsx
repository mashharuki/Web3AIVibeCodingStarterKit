"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getFactoryContract } from "@/lib/contracts";
import { getTokenPairs } from "@/lib/tokens";
import { TIME_CONSTANTS } from "@/utils/constants";
import { useCallback, useMemo, useState } from "react";
import type { Address } from "viem";
import { useReadContract } from "wagmi";
import { PoolCard } from "./PoolCard";

export interface PoolListProps {
  /** 表示モード */
  displayMode?: "grid" | "list";
  /** カードサイズ */
  cardSize?: "sm" | "md" | "lg";
  /** 詳細表示 */
  showDetails?: boolean;
  /** プールクリック時のコールバック */
  onPoolClick?: (pairAddress: Address) => void;
  /** 最大表示数 */
  maxItems?: number;
  /** フィルタリング機能の有効化 */
  enableFiltering?: boolean;
  /** ソート機能の有効化 */
  enableSorting?: boolean;
}

type SortOption = "tvl" | "volume" | "apr" | "name";
type SortDirection = "asc" | "desc";

/**
 * プール一覧を表示するコンポーネント
 * 全ての利用可能なプールを表示し、TVL、取引量、APR でソート可能
 */
export function PoolList({
  displayMode = "grid",
  cardSize = "md",
  showDetails = true,
  onPoolClick,
  maxItems,
  enableFiltering = true,
  enableSorting = true,
}: PoolListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("tvl");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Factory コントラクトの設定
  const factory = getFactoryContract();

  // 全ペア数を取得
  const { data: allPairsLength, isLoading: isLoadingLength } = useReadContract({
    address: factory.address,
    abi: factory.abi,
    functionName: "allPairsLength",
    query: {
      refetchInterval: TIME_CONSTANTS.DATA_REFRESH_INTERVAL,
    },
  });

  // 全ペアアドレスを取得
  const pairCount = Number(allPairsLength || 0);
  const pairIndices = Array.from({ length: pairCount }, (_, i) => i);

  const { data: pairAddresses, isLoading: isLoadingPairs } = useReadContract({
    address: factory.address,
    abi: factory.abi,
    functionName: "allPairs",
    args: pairIndices.length > 0 ? [pairIndices] : undefined,
    query: {
      enabled: pairCount > 0,
      refetchInterval: TIME_CONSTANTS.DATA_REFRESH_INTERVAL,
    },
  });

  // 既知のトークンペアも含める（まだ作成されていない可能性があるペア）
  const knownTokenPairs = useMemo(() => {
    return getTokenPairs();
  }, []);

  // 全プールアドレスのリスト（実際のペア + 既知のトークンペア）
  const allPoolAddresses = useMemo(() => {
    const addresses: Address[] = [];

    // 実際に作成されたペアを追加
    if (pairAddresses && Array.isArray(pairAddresses)) {
      addresses.push(...(pairAddresses as Address[]));
    }

    return addresses;
  }, [pairAddresses]);

  // フィルタリングされたプール
  const filteredPools = useMemo(() => {
    if (!enableFiltering || !searchQuery.trim()) {
      return allPoolAddresses;
    }

    return allPoolAddresses.filter((address) => {
      // アドレスでの検索
      if (address.toLowerCase().includes(searchQuery.toLowerCase())) {
        return true;
      }

      // TODO: トークンシンボルでの検索（ペア情報が必要）
      return false;
    });
  }, [allPoolAddresses, searchQuery, enableFiltering]);

  // ソート機能（現在は簡易実装、実際のデータが必要）
  const sortedPools = useMemo(() => {
    if (!enableSorting) {
      return filteredPools;
    }

    // TODO: 実際のTVL、Volume、APRデータでソート
    // 現在は単純にアドレス順
    return [...filteredPools].sort((a, b) => {
      if (sortDirection === "asc") {
        return a.localeCompare(b);
      } else {
        return b.localeCompare(a);
      }
    });
  }, [filteredPools, sortBy, sortDirection, enableSorting]);

  // 表示するプール（最大数制限）
  const displayPools = useMemo(() => {
    if (maxItems && maxItems > 0) {
      return sortedPools.slice(0, maxItems);
    }
    return sortedPools;
  }, [sortedPools, maxItems]);

  // ソート変更ハンドラ
  const handleSortChange = useCallback(
    (newSortBy: SortOption) => {
      if (sortBy === newSortBy) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortBy(newSortBy);
        setSortDirection("desc");
      }
    },
    [sortBy, sortDirection]
  );

  // プールクリックハンドラ
  const handlePoolClick = useCallback(
    (pairAddress: Address) => {
      onPoolClick?.(pairAddress);
    },
    [onPoolClick]
  );

  // ローディング状態
  const isLoading = isLoadingLength || isLoadingPairs;

  // グリッドスタイル
  const gridClasses = {
    grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
    list: "space-y-4",
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">流動性プール</h2>
          <p className="text-muted-foreground">利用可能な全ての流動性プールを表示</p>
        </div>

        {/* 統計情報 */}
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-sm">
            {displayPools.length} プール
          </Badge>
          {/* TODO: 総TVLを表示 */}
          <Badge variant="outline" className="text-sm">
            総TVL: $0
          </Badge>
        </div>
      </div>

      {/* フィルタリングとソート */}
      {(enableFiltering || enableSorting) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* 検索フィルタ */}
              {enableFiltering && (
                <div className="flex-1">
                  <Input
                    placeholder="プール名またはアドレスで検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}

              {/* ソートオプション */}
              {enableSorting && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">並び替え:</span>
                  <div className="flex space-x-1">
                    <Button
                      variant={sortBy === "tvl" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSortChange("tvl")}
                    >
                      TVL
                      {sortBy === "tvl" && (
                        <span className="ml-1">{sortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </Button>
                    <Button
                      variant={sortBy === "volume" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSortChange("volume")}
                    >
                      Volume
                      {sortBy === "volume" && (
                        <span className="ml-1">{sortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </Button>
                    <Button
                      variant={sortBy === "apr" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSortChange("apr")}
                    >
                      APR
                      {sortBy === "apr" && (
                        <span className="ml-1">{sortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* プール一覧 */}
      {isLoading ? (
        <div className={gridClasses[displayMode]}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
                <div className="h-3 bg-gray-200 rounded w-14"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : displayPools.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="text-4xl">🏊‍♂️</div>
              <div>
                <h3 className="text-lg font-semibold">プールが見つかりません</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "検索条件に一致するプールがありません"
                    : "まだプールが作成されていません"}
                </p>
              </div>
              {!searchQuery && (
                <Button variant="outline" onClick={() => (window.location.href = "/liquidity")}>
                  最初のプールを作成
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={gridClasses[displayMode]}>
          {displayPools.map((pairAddress) => (
            <PoolCard
              key={pairAddress}
              pairAddress={pairAddress}
              volume24h={0} // TODO: 実際の24時間取引量を取得
              tokenAPrice={1} // TODO: 実際のトークン価格を取得
              tokenBPrice={1} // TODO: 実際のトークン価格を取得
              onClick={handlePoolClick}
              size={cardSize}
              showDetails={showDetails}
            />
          ))}
        </div>
      )}

      {/* さらに読み込みボタン（必要に応じて） */}
      {maxItems && displayPools.length >= maxItems && sortedPools.length > maxItems && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => {
              // TODO: さらに読み込み機能を実装
            }}
          >
            さらに読み込む ({sortedPools.length - maxItems} 個のプール)
          </Button>
        </div>
      )}
    </div>
  );
}
