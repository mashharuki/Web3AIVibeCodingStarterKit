import { useCallback, useState } from 'react';
import type { NFTData } from './useNFTs';

export interface SearchFilters {
  query: string;
  priceMin?: number;
  priceMax?: number;
  status: 'all' | 'listed' | 'unlisted';
  sortBy: 'newest' | 'oldest' | 'price_high' | 'price_low' | 'name';
}

export interface SearchState {
  filters: SearchFilters;
  isSearching: boolean;
  results: NFTData[];
}

/**
 * NFT検索・フィルタリング機能を提供するカスタムフック
 * フェーズ3.3: 検索・フィルタリング機能の実装
 */
export const useNFTSearch = (nfts: NFTData[]) => {
  const [searchState, setSearchState] = useState<SearchState>({
    filters: {
      query: '',
      status: 'all',
      sortBy: 'newest',
    },
    isSearching: false,
    results: nfts,
  });

  /**
   * フィルタリング処理
   */
  const filterNFTs = useCallback((nfts: NFTData[], filters: SearchFilters): NFTData[] => {
    let filtered = [...nfts];

    // テキスト検索
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(nft => 
        nft.metadata?.name?.toLowerCase().includes(query) ||
        nft.metadata?.description?.toLowerCase().includes(query) ||
        nft.creator?.toLowerCase().includes(query) ||
        nft.tokenId.includes(query)
      );
    }

    // ステータスフィルター
    if (filters.status !== 'all') {
      filtered = filtered.filter(nft => {
        if (filters.status === 'listed') return nft.isListed;
        if (filters.status === 'unlisted') return !nft.isListed;
        return true;
      });
    }

    // 価格フィルター
    if (filters.priceMin !== undefined) {
      filtered = filtered.filter(nft => {
        if (!nft.price || !nft.isListed) return false;
        const priceInEth = Number(nft.price) / 1e18;
        return priceInEth >= (filters.priceMin ?? 0);
      });
    }

    if (filters.priceMax !== undefined) {
      filtered = filtered.filter(nft => {
        if (!nft.price || !nft.isListed) return false;
        const priceInEth = Number(nft.price) / 1e18;
        return priceInEth <= (filters.priceMax ?? Number.MAX_VALUE);
      });
    }

    // ソート処理
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return Number(b.tokenId) - Number(a.tokenId);
        case 'oldest':
          return Number(a.tokenId) - Number(b.tokenId);
        case 'price_high':
          if (!a.price && !b.price) return 0;
          if (!a.price) return 1;
          if (!b.price) return -1;
          return Number(b.price) - Number(a.price);
        case 'price_low':
          if (!a.price && !b.price) return 0;
          if (!a.price) return 1;
          if (!b.price) return -1;
          return Number(a.price) - Number(b.price);
        case 'name': {
          const nameA = a.metadata?.name || `NFT #${a.tokenId}`;
          const nameB = b.metadata?.name || `NFT #${b.tokenId}`;
          return nameA.localeCompare(nameB);
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, []);

  /**
   * 検索実行
   */
  const search = useCallback((newFilters: Partial<SearchFilters>) => {
    setSearchState(prev => {
      const updatedFilters = { ...prev.filters, ...newFilters };
      const results = filterNFTs(nfts, updatedFilters);
      
      return {
        ...prev,
        filters: updatedFilters,
        results,
        isSearching: false,
      };
    });
  }, [nfts, filterNFTs]);

  /**
   * 検索クリア
   */
  const clearSearch = useCallback(() => {
    setSearchState({
      filters: {
        query: '',
        status: 'all',
        sortBy: 'newest',
      },
      isSearching: false,
      results: nfts,
    });
  }, [nfts]);

  /**
   * 検索文字列の更新
   */
  const updateQuery = useCallback((query: string) => {
    search({ query });
  }, [search]);

  /**
   * ステータスフィルターの更新
   */
  const updateStatus = useCallback((status: SearchFilters['status']) => {
    search({ status });
  }, [search]);

  /**
   * ソート順の更新
   */
  const updateSortBy = useCallback((sortBy: SearchFilters['sortBy']) => {
    search({ sortBy });
  }, [search]);

  /**
   * 価格範囲の更新
   */
  const updatePriceRange = useCallback((priceMin?: number, priceMax?: number) => {
    search({ priceMin, priceMax });
  }, [search]);

  return {
    // 状態
    filters: searchState.filters,
    results: searchState.results,
    isSearching: searchState.isSearching,
    
    // アクション
    search,
    clearSearch,
    updateQuery,
    updateStatus,
    updateSortBy,
    updatePriceRange,
    
    // 統計
    totalResults: searchState.results.length,
    hasFilters: Boolean(
      searchState.filters.query ||
      searchState.filters.status !== 'all' ||
      searchState.filters.priceMin !== undefined ||
      searchState.filters.priceMax !== undefined
    ),
  };
};
