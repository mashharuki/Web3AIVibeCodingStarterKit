'use client';

import { MainLayout } from '@/components/main-layout';
import { FilterControls, SearchStats } from '@/components/search';
import { useNFTSearch } from '@/hooks/useNFTSearch';
import { useNFTs } from '@/hooks/useNFTs';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { formatEther } from 'viem';

/**
 * NFT一覧ページコンポーネント
 * マーケットプレイスのすべてのNFTを表示します。
 */
export default function NFTsPage(): ReactNode {
  const { data: nfts = [], isLoading, error } = useNFTs();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('search') || '';
  
  // 検索・フィルタリング機能
  const {
    filters,
    results,
    totalResults,
    hasFilters,
    updateQuery,
    updateStatus,
    updateSortBy,
    updatePriceRange,
    clearSearch,
  } = useNFTSearch(nfts);

  // URLからの検索クエリを初期化
  useEffect(() => {
    if (initialQuery && initialQuery !== filters.query) {
      updateQuery(initialQuery);
    }
  }, [initialQuery, filters.query, updateQuery]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">NFT マーケットプレイス</h1>
          <p className="text-muted-foreground">
            ブロックチェーン上で取引可能なNFTの一覧です。
          </p>
        </div>

        {/* フィルター・検索エリア */}
        <div className="mb-8 p-6 border rounded-lg bg-muted/50">
          <FilterControls
            filters={filters}
            onStatusChange={updateStatus}
            onSortChange={updateSortBy}
            onPriceRangeChange={updatePriceRange}
            onClearFilters={clearSearch}
          />
        </div>

        {/* 検索結果統計 */}
        <div className="mb-6">
          <SearchStats
            totalResults={totalResults}
            hasFilters={hasFilters}
            query={filters.query}
          />
        </div>

        {/* NFTグリッド */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">NFTを読み込み中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">NFTの読み込みに失敗しました</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              🔍
            </div>
            <h3 className="text-lg font-medium mb-2">
              {hasFilters ? '検索条件に一致するNFTが見つかりません' : 'NFTがありません'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {hasFilters ? '検索条件を変更してお試しください' : 'NFTが作成されるまでお待ちください'}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                フィルターをクリア
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-4 gap-6">
            {results.map((nft) => (
              <Link
                key={nft.tokenId}
                href={`/nfts/${nft.tokenId}`}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative">
                  {nft.metadata?.image ? (
                    <Image
                      src={nft.metadata.image}
                      alt={nft.metadata.name || 'NFT'}
                      fill
                      className="object-cover"
                      onError={() => {
                        // フォールバックアイコンを表示する処理
                      }}
                    />
                  ) : (
                    <span className="text-2xl">🎨</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold mb-2">{nft.metadata?.name || `NFT #${nft.tokenId}`}</h3>
                  <p className="text-sm text-muted-foreground mb-2 truncate">
                    {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
                  </p>
                  <div className="flex justify-between items-center">
                    {nft.isListed && nft.price ? (
                      <span className="font-bold text-lg">
                        {formatEther(BigInt(nft.price)).slice(0, 6)} ETH
                      </span>
                    ) : (
                      <span className="text-muted-foreground">未出品</span>
                    )}
                    <span 
                      className={`text-xs px-2 py-1 rounded ${
                        nft.isListed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {nft.isListed ? '販売中' : '未出品'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ページネーション */}
        <div className="mt-12 flex justify-center">
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 border rounded-md hover:bg-muted"
              disabled
            >
              前
            </button>
            <button
              type="button"
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md"
            >
              1
            </button>
            <button
              type="button"
              className="px-3 py-2 border rounded-md hover:bg-muted"
            >
              2
            </button>
            <button
              type="button"
              className="px-3 py-2 border rounded-md hover:bg-muted"
            >
              3
            </button>
            <button
              type="button"
              className="px-3 py-2 border rounded-md hover:bg-muted"
            >
              次
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
