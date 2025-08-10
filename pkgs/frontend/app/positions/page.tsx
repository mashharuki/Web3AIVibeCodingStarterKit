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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{pairName}</h3>
            <Badge variant="secondary" className="mt-1">
              {sharePercentage.toFixed(4)}% のシェア
            </Badge>
          </div>
          <Link href="/liquidity">
            <Button variant="outline" size="sm">
              管理
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {/* LPトークン残高 */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">LPトークン残高:</span>
            <span className="font-medium">{formatEther(lpBalanceValue)}</span>
          </div>

          {/* 保有トークン量 */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{tokenASymbol}:</span>
            <span className="font-medium">{formatEther(userTokenA)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{tokenBSymbol}:</span>
            <span className="font-medium">{formatEther(userTokenB)}</span>
          </div>

          {/* プール情報 */}
          {reserves && (
            <div className="pt-3 border-t">
              <p className="text-xs text-gray-500 mb-2">プール全体の流動性</p>
              <div className="flex justify-between text-xs text-gray-600">
                <span>
                  {tokenASymbol}: {formatEther(reserves[0])}
                </span>
                <span>
                  {tokenBSymbol}: {formatEther(reserves[1])}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* コントラクトアドレス */}
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-1">ペアアドレス</p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded block truncate">
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
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            📊 流動性ポジション
          </CardTitle>
          <p className="text-center text-gray-600">
            あなたが提供している流動性プールの一覧
          </p>
        </CardHeader>
        <CardContent>
          {!address ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">ウォレットを接続してください</p>
              <p className="text-sm text-gray-400">
                ウォレットを接続すると、あなたの流動性ポジションが表示されます
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  まだ流動性を提供していません
                </p>
                <Link href="/liquidity">
                  <Button>流動性を追加する</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
