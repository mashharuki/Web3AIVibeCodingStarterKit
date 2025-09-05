"use client";

import { useState } from "react";

import { LiquidityPosition, LiquidityProvider, PoolManager } from "@/components/liquidity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Token } from "@/lib/tokens";
import { SEPOLIA_TOKENS } from "@/lib/tokens";

/**
 * 流動性管理ページ
 *
 * 流動性の追加、除去、ポジション管理を行うメインページ
 */
export default function LiquidityPage() {
  const [activeTab, setActiveTab] = useState<"add" | "positions" | "manage">("add");
  const [selectedTokenA, setSelectedTokenA] = useState<Token>(SEPOLIA_TOKENS.USDC);
  const [selectedTokenB, setSelectedTokenB] = useState<Token>(SEPOLIA_TOKENS.JPYC);

  // 流動性追加ハンドラー
  const handleAddLiquidity = (tokenA: Token, tokenB: Token) => {
    setSelectedTokenA(tokenA);
    setSelectedTokenB(tokenB);
    setActiveTab("add");
  };

  // プール管理ハンドラー
  const handleManagePool = (tokenA: Token, tokenB: Token) => {
    setSelectedTokenA(tokenA);
    setSelectedTokenB(tokenB);
    setActiveTab("manage");
  };

  // 新しいポジション作成ハンドラー
  const handleCreatePosition = () => {
    setActiveTab("add");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* ページヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">流動性管理</h1>
        <p className="text-muted-foreground">
          トークンペアに流動性を提供して取引手数料を獲得しましょう
        </p>
      </div>

      {/* タブナビゲーション */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            <Button
              variant={activeTab === "add" ? "default" : "ghost"}
              onClick={() => setActiveTab("add")}
              className="flex-1"
            >
              流動性を追加
            </Button>
            <Button
              variant={activeTab === "positions" ? "default" : "ghost"}
              onClick={() => setActiveTab("positions")}
              className="flex-1"
            >
              ポジション一覧
            </Button>
            <Button
              variant={activeTab === "manage" ? "default" : "ghost"}
              onClick={() => setActiveTab("manage")}
              className="flex-1"
            >
              プール管理
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* コンテンツエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2">
          {activeTab === "add" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>流動性を追加</CardTitle>
                </CardHeader>
                <CardContent>
                  <LiquidityProvider />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "positions" && (
            <div className="space-y-6">
              <LiquidityPosition
                onManage={handleManagePool}
                onAddLiquidity={handleAddLiquidity}
                onCreatePosition={handleCreatePosition}
              />
            </div>
          )}

          {activeTab === "manage" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    プール管理: {selectedTokenA.symbol}/{selectedTokenB.symbol}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PoolManager
                    tokenA={selectedTokenA}
                    tokenB={selectedTokenB}
                    initialMode="remove"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 流動性提供のメリット */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">流動性提供のメリット</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">取引手数料を獲得</h4>
                  <p className="text-sm text-muted-foreground">
                    全ての取引から0.3%の手数料を獲得できます
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">複利効果</h4>
                  <p className="text-sm text-muted-foreground">
                    獲得した手数料は自動的に再投資されます
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">いつでも引き出し可能</h4>
                  <p className="text-sm text-muted-foreground">流動性はいつでも除去できます</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* リスクについて */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">注意事項</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">インパーマネントロス</h4>
                  <p className="text-sm text-muted-foreground">
                    トークン価格の変動により損失が発生する可能性があります
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">スマートコントラクトリスク</h4>
                  <p className="text-sm text-muted-foreground">
                    コントラクトの脆弱性により資金を失う可能性があります
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 人気のペア */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">人気のペア</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => handleAddLiquidity(SEPOLIA_TOKENS.USDC, SEPOLIA_TOKENS.JPYC)}
              >
                <span>USDC/JPYC</span>
                <span className="text-green-600">12.5% APR</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => handleAddLiquidity(SEPOLIA_TOKENS.USDC, SEPOLIA_TOKENS.PYUSD)}
              >
                <span>USDC/PYUSD</span>
                <span className="text-green-600">8.3% APR</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => handleAddLiquidity(SEPOLIA_TOKENS.JPYC, SEPOLIA_TOKENS.PYUSD)}
              >
                <span>JPYC/PYUSD</span>
                <span className="text-green-600">15.7% APR</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
