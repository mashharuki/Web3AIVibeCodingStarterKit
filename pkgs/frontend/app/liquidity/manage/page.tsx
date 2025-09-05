"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PoolManager } from "@/components/liquidity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Token } from "@/lib/tokens";
import { SEPOLIA_TOKENS, getTokenByAddress } from "@/lib/tokens";
import { usePairData } from "@/hooks/usePairData";
import type { Address } from "viem";
import { ArrowLeft } from "lucide-react";

/**
 * 流動性管理ページの内部コンポーネント
 */
function LiquidityManagePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URLパラメータからトークンペアを取得
  const tokenAParam = searchParams.get("tokenA");
  const tokenBParam = searchParams.get("tokenB");
  const rawPairParam = searchParams.get("pair");
  const pairParam =
    rawPairParam && /^0x[a-fA-F0-9]{40}$/.test(rawPairParam) ? (rawPairParam as Address) : null;
  const mode = (searchParams.get("mode") as "add" | "remove") || "add";

  // デフォルトトークンペアの設定
  const [tokenA, setTokenA] = useState<Token>(() => {
    if (tokenAParam) {
      return getTokenByAddress(tokenAParam as `0x${string}`) || SEPOLIA_TOKENS.USDC;
    }
    return SEPOLIA_TOKENS.USDC;
  });

  const [tokenB, setTokenB] = useState<Token>(() => {
    if (tokenBParam) {
      return getTokenByAddress(tokenBParam as `0x${string}`) || SEPOLIA_TOKENS.JPYC;
    }
    return SEPOLIA_TOKENS.JPYC;
  });

  const [currentMode, setCurrentMode] = useState<"add" | "remove">(mode);

  // pair パラメータがある場合、ペアコントラクトから token0/token1 を解決
  const { pair, exists } = usePairData({
    pairAddress: pairParam as Address,
    enabled: Boolean(pairParam),
    watch: false,
  });

  useEffect(() => {
    if (!pairParam || !exists || !pair) return;
    const resolvedA = getTokenByAddress(pair.token0 as `0x${string}`);
    const resolvedB = getTokenByAddress(pair.token1 as `0x${string}`);
    if (resolvedA && resolvedB) {
      setTokenA(resolvedA);
      setTokenB(resolvedB);
    }
    // tokenA/tokenB が URL に無ければ、解決した値でURLを更新して共有可能にする
    const hasTokenParams = Boolean(tokenAParam) && Boolean(tokenBParam);
    if (!hasTokenParams) {
      const params = new URLSearchParams(searchParams);
      params.set("tokenA", (resolvedA?.address || tokenA.address) as `0x${string}`);
      params.set("tokenB", (resolvedB?.address || tokenB.address) as `0x${string}`);
      if (!params.get("mode")) params.set("mode", currentMode);
      // pair は維持
      router.replace(`/liquidity/manage?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairParam, exists, pair]);

  // 戻るボタンのハンドラ
  const handleBack = () => {
    router.back();
  };

  // モード切り替えハンドラ
  const handleModeChange = (newMode: "add" | "remove") => {
    setCurrentMode(newMode);
    // URLパラメータを更新
    const params = new URLSearchParams(searchParams);
    params.set("mode", newMode);
    // 現在のトークン情報もURLに反映（共有しやすくする）
    params.set("tokenA", tokenA.address as `0x${string}`);
    params.set("tokenB", tokenB.address as `0x${string}`);
    // pair があれば維持
    if (pairParam) params.set("pair", pairParam);
    router.replace(`/liquidity/manage?${params.toString()}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* ページヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">プール管理</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-sm">
                {tokenA.symbol}/{tokenB.symbol}
              </Badge>
              <span className="text-muted-foreground">流動性の追加・除去を行います</span>
            </div>
          </div>
        </div>
      </div>

      {/* モード切り替えタブ */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            <Button
              variant={currentMode === "add" ? "default" : "ghost"}
              onClick={() => handleModeChange("add")}
              className="flex-1"
            >
              流動性を追加
            </Button>
            <Button
              variant={currentMode === "remove" ? "default" : "ghost"}
              onClick={() => handleModeChange("remove")}
              className="flex-1"
            >
              流動性を除去
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* プール管理コンポーネント */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{currentMode === "add" ? "流動性を追加" : "流動性を除去"}</CardTitle>
            </CardHeader>
            <CardContent>
              <PoolManager tokenA={tokenA} tokenB={tokenB} initialMode={currentMode} />
            </CardContent>
          </Card>
        </div>

        {/* サイドバー情報 */}
        <div className="space-y-6">
          {/* プール情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">プール情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">ペア</span>
                <span className="text-sm font-medium">
                  {tokenA.symbol}/{tokenB.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">手数料</span>
                <span className="text-sm font-medium">0.3%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">TVL</span>
                <span className="text-sm font-medium">$0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">24h Volume</span>
                <span className="text-sm font-medium">$0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">APR</span>
                <span className="text-sm font-medium text-green-600">0%</span>
              </div>
            </CardContent>
          </Card>

          {/* 注意事項 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentMode === "add" ? "流動性追加について" : "流動性除去について"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentMode === "add" ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">LPトークンを受け取り</h4>
                      <p className="text-sm text-muted-foreground">
                        流動性提供の証明としてLPトークンが発行されます
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">取引手数料を獲得</h4>
                      <p className="text-sm text-muted-foreground">
                        プールでの取引から手数料収益を得られます
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">インパーマネントロス</h4>
                      <p className="text-sm text-muted-foreground">
                        価格変動により損失が発生する可能性があります
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">LPトークンをバーン</h4>
                      <p className="text-sm text-muted-foreground">
                        LPトークンを燃やして元のトークンを回収します
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">手数料収益も含む</h4>
                      <p className="text-sm text-muted-foreground">
                        蓄積された取引手数料も一緒に受け取れます
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">部分的な除去も可能</h4>
                      <p className="text-sm text-muted-foreground">
                        全額ではなく一部のみ除去することも可能です
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* クイックアクション */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">クイックアクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/liquidity")}
              >
                流動性一覧に戻る
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/pools")}
              >
                全プールを表示
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/")}
              >
                スワップ画面へ
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
/**
 * 
流動性管理ページ
 * 
 * 特定のプールの流動性を管理（追加・除去）するページ
 */
export default function LiquidityManagePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      }
    >
      <LiquidityManagePageContent />
    </Suspense>
  );
}
