"use client";

import { NFTCard } from "@/components/nft-card-improved";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNFTs } from "@/hooks/useNFTs";
import { useWallet } from "@/hooks/useWallet";
import type { NFT } from "@/lib/constants";
import { useEffect, useState } from "react";

const categories = [
  { id: "all", label: "すべて" },
  { id: "art", label: "アート" },
  { id: "music", label: "ミュージック" },
  { id: "photography", label: "写真" },
  { id: "gaming", label: "ゲーム" },
  { id: "sport", label: "スポーツ" },
  { id: "utility", label: "ユーティリティ" },
];

const sortOptions = [
  { id: "newest", label: "新着順" },
  { id: "oldest", label: "古い順" },
  { id: "priceHigh", label: "価格: 高い順" },
  { id: "priceLow", label: "価格: 安い順" },
  { id: "name", label: "名前順" },
];

export default function NFTsPage() {
  const { nfts, loading, fetchListedNFTs } = useNFTs();
  const { authenticated } = useWallet();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchListedNFTs();
  }, [fetchListedNFTs]);

  const filteredAndSortedNFTs = () => {
    const filtered = nfts.filter((nft: NFT) => {
      const matchesSearch =
        !searchTerm ||
        nft.metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nft.metadata?.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" ||
        nft.metadata?.attributes?.some(
          (attr) =>
            attr.trait_type === "category" && String(attr.value).toLowerCase() === selectedCategory
        );

      const matchesPriceRange =
        (!priceRange.min || Number(nft.price) >= Number(priceRange.min)) &&
        (!priceRange.max || Number(nft.price) <= Number(priceRange.max));

      return matchesSearch && matchesCategory && matchesPriceRange;
    });

    return filtered.sort((a: NFT, b: NFT) => {
      switch (sortBy) {
        case "newest":
          return Number(b.tokenId) - Number(a.tokenId);
        case "oldest":
          return Number(a.tokenId) - Number(b.tokenId);
        case "priceHigh":
          return Number(b.price) - Number(a.price);
        case "priceLow":
          return Number(a.price) - Number(b.price);
        case "name":
          return (a.metadata?.name || "").localeCompare(b.metadata?.name || "");
        default:
          return 0;
      }
    });
  };

  const finalNFTs = filteredAndSortedNFTs();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-nft-primary to-nft-secondary bg-clip-text text-transparent">
            NFTマーケットプレイス
          </h1>
          <p className="text-muted-foreground">
            コミュニティが作成したユニークなNFTを発見し、購入しましょう
          </p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="NFTを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                🔍
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="whitespace-nowrap"
            >
              フィルター {showFilters ? "▲" : "▼"}
            </Button>
          </div>

          {showFilters && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h3 className="font-medium mb-2">カテゴリ</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        {category.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">価格範囲 (ETH)</h3>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="最小"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange((prev) => ({ ...prev, min: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-muted-foreground">〜</span>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="最大"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange((prev) => ({ ...prev, max: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">並び順</h3>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nft-primary" />
          </div>
        ) : finalNFTs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold mb-2">NFTが見つかりませんでした</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedCategory !== "all" || priceRange.min || priceRange.max
                ? "検索条件を変更してみてください。"
                : "まだNFTが出品されていません。"}
            </p>
            {authenticated && (
              <Button asChild>
                <a href="/create">最初のNFTを作成</a>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 flex justify-between items-center">
              <p className="text-muted-foreground">{finalNFTs.length} 個のNFTが見つかりました</p>
              <div className="text-sm text-muted-foreground">
                総価値:{" "}
                {finalNFTs.reduce((sum: number, nft: NFT) => sum + Number(nft.price), 0).toFixed(3)}{" "}
                ETH
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {finalNFTs.map((nft: NFT) => (
                <NFTCard
                  key={`${nft.contractAddress}-${nft.tokenId}`}
                  nft={nft}
                  showBuyButton={true}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
