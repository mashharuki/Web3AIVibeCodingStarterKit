"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PoolList } from "@/components/pools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, DollarSign, Plus, TrendingUp } from "lucide-react";
import type { Address } from "viem";

/**
 * プール一覧ページ
 *
 * 全ての利用可能なプールを表示し、統計情報を提供
 */
export default function PoolsPage() {
  const router = useRouter();
  const [displayMode, setDisplayMode] = useState<"grid" | "list">("grid");

  // プールクリック時のハンドラ
  const handlePoolClick = (pairAddress: Address) => {
    // プール詳細ページまたは管理ページに遷移
    router.push(`/liquidity/manage?pair=${pairAddress}`);
  };

  // 新しいプール作成ハンドラ
  const handleCreatePool = () => {
    router.push("/liquidity");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* ページヘッダー */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">流動性プール</h1>
            <p className="text-muted-foreground">
              全ての利用可能な流動性プールを表示・管理できます
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setDisplayMode(displayMode === "grid" ? "list" : "grid")}
            >
              {displayMode === "grid" ? "リスト表示" : "グリッド表示"}
            </Button>
            <Button onClick={handleCreatePool} className="gap-2">
              <Plus className="h-4 w-4" />
              新しいプール
            </Button>
          </div>
        </div>
      </div>

      {/* 統計情報カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総TVL</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">全プールの総価値</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h取引量</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">過去24時間の取引量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブプール</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">流動性があるプール数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均APR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">全プールの平均年利</p>
          </CardContent>
        </Card>
      </div>

      {/* 人気のプール */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">人気のプール</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">USDC/JPYC</div>
                <div className="text-sm text-muted-foreground">ステーブルコインペア</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600">12.5% APR</div>
                <div className="text-sm text-muted-foreground">TVL: $0</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">USDC/PYUSD</div>
                <div className="text-sm text-muted-foreground">USD安定ペア</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600">8.3% APR</div>
                <div className="text-sm text-muted-foreground">TVL: $0</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">JPYC/PYUSD</div>
                <div className="text-sm text-muted-foreground">クロス通貨ペア</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600">15.7% APR</div>
                <div className="text-sm text-muted-foreground">TVL: $0</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* プール一覧 */}
      <PoolList
        displayMode={displayMode}
        showDetails={true}
        onPoolClick={handlePoolClick}
        enableFiltering={true}
        enableSorting={true}
      />

      {/* フッター情報 */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">流動性提供について</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• 流動性を提供することで取引手数料を獲得できます</p>
                <p>• 各取引から0.3%の手数料が流動性提供者に分配されます</p>
                <p>• インパーマネントロスのリスクがあることをご理解ください</p>
                <p>• いつでも流動性を除去することができます</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">リスクについて</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• 価格変動によりインパーマネントロスが発生する可能性があります</p>
                <p>• スマートコントラクトのリスクが存在します</p>
                <p>• 流動性が少ないプールでは大きなスリッページが発生する可能性があります</p>
                <p>• 投資は自己責任で行ってください</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
