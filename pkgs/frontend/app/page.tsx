"use client";

import { SwapInterface } from "@/components/swap/SwapInterface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, TrendingUp, Users, Zap } from "lucide-react";
import Link from "next/link";

/**
 * メインページ（スワップ画面）
 *
 * AMM DEXのメイン機能であるトークンスワップを提供
 */
export default function Home() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
      {/* ページヘッダー */}
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4">AMM DEX</h1>
        <p className="text-base md:text-xl text-muted-foreground mb-4 md:mb-6">
          Uniswap風のAMM（Automated Market Maker）DEXです
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-6 md:mb-8">
          <Badge variant="outline">Sepolia Testnet</Badge>
          <Badge variant="outline">学習用プロジェクト</Badge>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* スワップインターフェース */}
        <div className="lg:col-span-2 flex justify-center">
          <div className="w-full max-w-md sm:max-w-lg md:max-w-xl">
            <SwapInterface />
          </div>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 機能紹介 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">主な機能</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">高速スワップ</h4>
                  <p className="text-sm text-muted-foreground">3つのトークン間で瞬時にスワップ</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">流動性提供</h4>
                  <p className="text-sm text-muted-foreground">流動性を提供して手数料を獲得</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">リアルタイム価格</h4>
                  <p className="text-sm text-muted-foreground">AMM式による自動価格調整</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">セキュア</h4>
                  <p className="text-sm text-muted-foreground">OpenZeppelin準拠のコントラクト</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 対応トークン */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">対応トークン</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                    U
                  </div>
                  <span className="font-medium">USDC</span>
                </div>
                <Badge variant="outline">USD Coin</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                    J
                  </div>
                  <span className="font-medium">JPYC</span>
                </div>
                <Badge variant="outline">JPY Coin</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                    P
                  </div>
                  <span className="font-medium">PYUSD</span>
                </div>
                <Badge variant="outline">PayPal USD</Badge>
              </div>
            </CardContent>
          </Card>

          {/* クイックアクション */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">その他の機能</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/liquidity" className="block">
                <Button variant="outline" className="w-full justify-start">
                  流動性を提供
                </Button>
              </Link>
              <Link href="/pools" className="block">
                <Button variant="outline" className="w-full justify-start">
                  プール一覧
                </Button>
              </Link>
              <Link href="/liquidity/manage" className="block">
                <Button variant="outline" className="w-full justify-start">
                  ポジション管理
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 統計情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">統計情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">総TVL</span>
                <span className="text-sm font-medium">$0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">24h取引量</span>
                <span className="text-sm font-medium">$0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">アクティブプール</span>
                <span className="text-sm font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">総取引数</span>
                <span className="text-sm font-medium">0</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* フッター情報 */}
      <Card className="mt-12">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">学習用AMM DEXについて</h3>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              このプロジェクトは、Uniswap V2のコア機能を参考にした学習用のAMM DEXです。 Ethereum
              Sepoliaテストネット上で動作し、実際の資金を使わずにDEXの仕組みを学ぶことができます。
              スマートコントラクトはOpenZeppelinライブラリを使用してセキュアに実装されています。
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Badge variant="outline">Solidity</Badge>
              <Badge variant="outline">Next.js</Badge>
              <Badge variant="outline">Wagmi</Badge>
              <Badge variant="outline">Tailwind CSS</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
