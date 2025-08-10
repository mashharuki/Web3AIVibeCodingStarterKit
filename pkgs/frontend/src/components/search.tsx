'use client';

import type { SearchFilters } from '@/hooks/useNFTSearch';
import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  value?: string;
}

/**
 * 検索バーコンポーネント
 */
export function SearchBar({ onSearch, placeholder = 'NFTを検索...', value = '' }: SearchBarProps) {
  const [query, setQuery] = useState(value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          🔍
        </div>
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
    </form>
  );
}

interface FilterControlsProps {
  filters: SearchFilters;
  onStatusChange: (status: SearchFilters['status']) => void;
  onSortChange: (sortBy: SearchFilters['sortBy']) => void;
  onPriceRangeChange: (min?: number, max?: number) => void;
  onClearFilters: () => void;
}

/**
 * フィルター制御コンポーネント
 */
export function FilterControls({
  filters,
  onStatusChange,
  onSortChange,
  onPriceRangeChange,
  onClearFilters,
}: FilterControlsProps) {
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');

  const handlePriceSubmit = () => {
    const min = priceMin ? Number(priceMin) : undefined;
    const max = priceMax ? Number(priceMax) : undefined;
    onPriceRangeChange(min, max);
    setShowPriceFilter(false);
  };

  const handlePriceClear = () => {
    setPriceMin('');
    setPriceMax('');
    onPriceRangeChange(undefined, undefined);
    setShowPriceFilter(false);
  };

  return (
    <div className="space-y-4">
      {/* ステータス・ソートフィルター */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* ステータスフィルター */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">状態:</span>
          <select
            value={filters.status}
            onChange={(e) => onStatusChange(e.target.value as SearchFilters['status'])}
            className="px-3 py-1 border rounded-md text-sm"
            aria-label="ステータスフィルター"
          >
            <option value="all">すべて</option>
            <option value="listed">販売中</option>
            <option value="unlisted">未出品</option>
          </select>
        </div>

        {/* ソートフィルター */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">並び順:</span>
          <select
            value={filters.sortBy}
            onChange={(e) => onSortChange(e.target.value as SearchFilters['sortBy'])}
            className="px-3 py-1 border rounded-md text-sm"
            aria-label="ソート順"
          >
            <option value="newest">最新順</option>
            <option value="oldest">古い順</option>
            <option value="price_high">価格: 高い順</option>
            <option value="price_low">価格: 安い順</option>
            <option value="name">名前順</option>
          </select>
        </div>

        {/* 価格フィルタートグル */}
        <button
          type="button"
          onClick={() => setShowPriceFilter(!showPriceFilter)}
          className={`px-3 py-1 text-sm rounded-md border transition-colors ${
            showPriceFilter || filters.priceMin !== undefined || filters.priceMax !== undefined
              ? 'bg-primary text-primary-foreground'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          💰 価格フィルター
        </button>

        {/* フィルタークリア */}
        <button
          type="button"
          onClick={onClearFilters}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          フィルタークリア
        </button>
      </div>

      {/* 価格フィルター詳細 */}
      {showPriceFilter && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">最低価格:</span>
              <input
                type="number"
                step="0.001"
                min="0"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="0.001"
                className="w-24 px-2 py-1 border rounded text-sm"
                aria-label="最低価格"
              />
              <span className="text-sm text-gray-500">ETH</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">最高価格:</span>
              <input
                type="number"
                step="0.001"
                min="0"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="100"
                className="w-24 px-2 py-1 border rounded text-sm"
                aria-label="最高価格"
              />
              <span className="text-sm text-gray-500">ETH</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePriceSubmit}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
            >
              適用
            </button>
            <button
              type="button"
              onClick={handlePriceClear}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              クリア
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchStatsProps {
  totalResults: number;
  hasFilters: boolean;
  query?: string;
}

/**
 * 検索結果統計表示コンポーネント
 */
export function SearchStats({ totalResults, hasFilters, query }: SearchStatsProps) {
  return (
    <div className="text-sm text-gray-600">
      {query && (
        <p>
          「<span className="font-medium">{query}</span>」の検索結果: {totalResults}件
        </p>
      )}
      {!query && hasFilters && (
        <p>フィルター適用結果: {totalResults}件</p>
      )}
      {!query && !hasFilters && (
        <p>全{totalResults}件</p>
      )}
    </div>
  );
}
