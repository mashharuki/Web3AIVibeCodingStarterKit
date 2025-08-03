"use client";

import { NFTCard } from "@/components/nft-card-improved";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNFTs } from "@/hooks/useNFTs";
import { useWallet } from "@/hooks/useWallet";
import type { NFT } from "@/lib/constants";
import { useCallback, useEffect, useState } from "react";

export default function ProfilePage() {
  const { authenticated, address } = useWallet();
  const { nfts, loading, fetchUserNFTs, listNFT } = useNFTs();
  const [userNFTs, setUserNFTs] = useState<NFT[]>([]);
  const [listedNFTs, setListedNFTs] = useState<NFT[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [listPrice, setListPrice] = useState("");

  const loadUserNFTs = useCallback(async () => {
    if (!address) return;

    try {
      const ownedNFTs = await fetchUserNFTs(address);
      setUserNFTs(ownedNFTs);

      // 出品中のNFTをフィルタリング
      const listed = nfts.filter(
        (nft) => nft.owner.toLowerCase() === address.toLowerCase() && nft.isListed
      );
      setListedNFTs(listed);
    } catch (error) {
      console.error("ユーザーNFT取得エラー:", error);
    }
  }, [address, fetchUserNFTs, nfts]);

  useEffect(() => {
    if (authenticated && address) {
      loadUserNFTs();
    }
  }, [authenticated, address, loadUserNFTs]);

  const handleListNFT = async () => {
    if (!selectedNFT || !listPrice) return;

    const success = await listNFT(selectedNFT.tokenId, listPrice);
    if (success) {
      setShowListModal(false);
      setSelectedNFT(null);
      setListPrice("");
      loadUserNFTs(); // データを再読み込み
    }
  };

  const openListModal = (nft: NFT) => {
    setSelectedNFT(nft);
    setShowListModal(true);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>ウォレット接続が必要です</CardTitle>
            <CardDescription>マイページを表示するにはウォレットを接続してください</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* プロフィールヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-nft-primary to-nft-secondary rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {address?.slice(2, 4).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">マイプロフィール</h1>
              <p className="text-muted-foreground">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-nft-primary">{userNFTs.length}</div>
                <div className="text-sm text-muted-foreground">保有NFT</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-nft-secondary">{listedNFTs.length}</div>
                <div className="text-sm text-muted-foreground">出品中</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-nft-accent">0</div>
                <div className="text-sm text-muted-foreground">販売済み</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-nft-primary">0 ETH</div>
                <div className="text-sm text-muted-foreground">総売上</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* NFTタブ */}
        <Tabs defaultValue="owned" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="owned">保有NFT</TabsTrigger>
            <TabsTrigger value="listed">出品中</TabsTrigger>
            <TabsTrigger value="activity">アクティビティ</TabsTrigger>
          </TabsList>

          {/* 保有NFT */}
          <TabsContent value="owned" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nft-primary" />
              </div>
            ) : userNFTs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold mb-2">NFTがありません</h3>
                <p className="text-muted-foreground mb-4">
                  まだNFTを保有していません。NFTを作成または購入してみましょう。
                </p>
                <div className="flex gap-2 justify-center">
                  <Button asChild>
                    <a href="/create">NFTを作成</a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/nfts">NFTを探す</a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userNFTs.map((nft) => (
                  <div key={`${nft.contractAddress}-${nft.tokenId}`} className="relative group">
                    <NFTCard nft={nft} showBuyButton={false} />
                    {!nft.isListed && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          onClick={() => openListModal(nft)}
                          className="bg-white text-black hover:bg-gray-100"
                        >
                          出品する
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 出品中NFT */}
          <TabsContent value="listed" className="mt-6">
            {listedNFTs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏪</div>
                <h3 className="text-xl font-semibold mb-2">出品中のNFTがありません</h3>
                <p className="text-muted-foreground">保有NFTを出品してみましょう。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {listedNFTs.map((nft) => (
                  <NFTCard
                    key={`${nft.contractAddress}-${nft.tokenId}`}
                    nft={nft}
                    showBuyButton={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* アクティビティ */}
          <TabsContent value="activity" className="mt-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">アクティビティ</h3>
              <p className="text-muted-foreground">
                取引履歴やアクティビティがここに表示されます。
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* 出品モーダル */}
        {showListModal && selectedNFT && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>NFTを出品</CardTitle>
                <CardDescription>
                  {selectedNFT.metadata?.name || `NFT #${selectedNFT.tokenId}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="listPrice" className="block text-sm font-medium mb-2">
                    価格 (ETH)
                  </label>
                  <input
                    id="listPrice"
                    type="number"
                    step="0.001"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0.1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowListModal(false)}
                  >
                    キャンセル
                  </Button>
                  <Button className="flex-1" onClick={handleListNFT} disabled={!listPrice}>
                    出品する
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
