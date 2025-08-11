"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOKEN_INFO, getCurrentContracts } from "@/config/contracts";
import {
  useLPTokenBalance,
  usePairInfo,
  usePairTotalSupply,
} from "@/hooks/useLiquidity";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

/**
 * 単一のポジション情報を表示するコンポーネント
 */
function PositionCard({
  pairName,
  pairAddress,
  tokenASymbol,
  tokenBSymbol,
}: {
  pairName: string;
  pairAddress: `0x${string}`;
  tokenASymbol: string;
  tokenBSymbol: string;
}) {
  const { address } = useAccount();

  // データを取得
  const lpBalance = useLPTokenBalance(pairAddress, address);
  const pairInfo = usePairInfo(pairAddress);
  const totalSupply = usePairTotalSupply(pairAddress);

  // ローディング中
  if (lpBalance.isLoading || pairInfo.isLoading || totalSupply.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // LPトークン残高がない場合はスキップ
  const lpBalanceValue = lpBalance.data || BigInt(0);
  if (lpBalanceValue === BigInt(0)) {
    return null;
  }

  // シェア率を計算
  const totalSupplyValue = totalSupply.data || BigInt(0);
  const sharePercentage =
    totalSupplyValue > BigInt(0)
      ? Number((lpBalanceValue * BigInt(10000)) / totalSupplyValue) / 100
      : 0;

  // ユーザーの保有トークン量を計算
  const reserves = pairInfo.reserves;
  const userTokenA =
    reserves && totalSupplyValue > BigInt(0)
      ? (reserves[0] * lpBalanceValue) / totalSupplyValue
      : BigInt(0);
  const userTokenB =
    reserves && totalSupplyValue > BigInt(0)
      ? (reserves[1] * lpBalanceValue) / totalSupplyValue
      : BigInt(0);

  return (
    <Card className="backdrop-blur-sm bg-white/10 border-white/20 shadow-xl rounded-2xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-lg">💎</span>
              </div>
              <h3 className="text-xl font-bold text-white">{pairName}</h3>
            </div>
            <Badge
              variant="secondary"
              className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 font-semibold"
            >
              {sharePercentage.toFixed(4)}% のシェア
            </Badge>
          </div>
          <Link href="/liquidity">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-semibold rounded-xl"
            >
              管理
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {/* LPトークン残高 */}
          <div className="bg-black/20 p-4 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">LPトークン残高:</span>
              <span className="font-bold text-white text-lg">
                {Number(formatEther(lpBalanceValue)).toLocaleString()}
              </span>
            </div>
          </div>

          {/* 保有トークン量 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-400/20">
              <div className="text-center">
                <div className="text-yellow-300 text-xs mb-1">
                  {tokenASymbol}
                </div>
                <div className="text-white font-bold text-lg">
                  {Number(formatEther(userTokenA)).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-400/20">
              <div className="text-center">
                <div className="text-blue-300 text-xs mb-1">{tokenBSymbol}</div>
                <div className="text-white font-bold text-lg">
                  {Number(formatEther(userTokenB)).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* プール情報 */}
          {reserves && (
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <p className="text-gray-300 text-sm mb-3 font-semibold">
                プール全体の流動性
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-yellow-300 text-xs mb-1">
                    {tokenASymbol}
                  </div>
                  <div className="text-white text-sm font-medium">
                    {Number(formatEther(reserves[0])).toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-blue-300 text-xs mb-1">
                    {tokenBSymbol}
                  </div>
                  <div className="text-white text-sm font-medium">
                    {Number(formatEther(reserves[1])).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* コントラクトアドレス */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-gray-300 text-xs mb-2 font-semibold">
            ペアアドレス
          </p>
          <code className="text-xs bg-black/30 text-gray-300 px-3 py-2 rounded-lg block break-all">
            {pairAddress}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ポジション表示ページコンポーネント
 */
export default function PositionsPage() {
  const { address } = useAccount();
  const contracts = getCurrentContracts();

  // 利用可能なペア一覧
  const pairs = [
    {
      name: "TKA-TKB",
      address: contracts.pairs["TokenA-TokenB"],
      tokenASymbol: TOKEN_INFO.TokenA.symbol,
      tokenBSymbol: TOKEN_INFO.TokenB.symbol,
    },
  ];

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto">
        {/* メインカード */}
        <Card className="backdrop-blur-sm bg-white/10 border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            {!address ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🔐</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  ウォレットを接続してください
                </h3>
                <p className="text-gray-400 mb-8">
                  ウォレットを接続すると、あなたの流動性ポジションが表示されます
                </p>
                <div className="bg-cyan-500/10 p-6 rounded-2xl border border-cyan-400/20 max-w-md mx-auto">
                  <div className="flex items-center gap-3 text-cyan-300">
                    <span className="text-xl">💡</span>
                    <span className="text-sm">
                      接続後、流動性を提供したプールの詳細情報を確認できます
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {pairs.map((pair) => (
                  <PositionCard
                    key={pair.address}
                    pairName={pair.name}
                    pairAddress={pair.address as `0x${string}`}
                    tokenASymbol={pair.tokenASymbol}
                    tokenBSymbol={pair.tokenBSymbol}
                  />
                ))}

                {/* ポジションがない場合の表示 */}
                <div className="text-center py-12">
                  <Link href="/liquidity">
                    <Button className="h-14 px-8 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl text-white font-bold rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">💧</span>
                        <span>流動性を追加する</span>
                      </div>
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
