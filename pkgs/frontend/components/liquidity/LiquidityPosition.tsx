"use client";

import { ExternalLink, Minus, Plus, TrendingUp } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { useAccount } from "wagmi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiquidity, type LPPosition } from "@/hooks/useLiquidity";
import type { Token } from "@/lib/tokens";
import { getAllTokens } from "@/lib/tokens";
import { formatPercentage, formatTokenAmount } from "@/utils/formatters";

/**
 * 個別LPポジションカードのプロパティ
 */
interface LPPositionCardProps {
  /** LPポジション情報 */
  position: LPPosition;
  /** 管理ボタンクリック時のコールバック */
  onManage: (tokenA: Token, tokenB: Token) => void;
  /** 流動性追加ボタンクリック時のコールバック */
  onAddLiquidity: (tokenA: Token, tokenB: Token) => void;
}

/**
 * 個別LPポジションカードコンポーネント
 */
function LPPositionCard({ position, onManage, onAddLiquidity }: LPPositionCardProps) {
  // 手数料収益の合計値を計算
  const totalEarnedFeesUSD = useMemo(() => {
    // 実際の実装では、トークン価格を取得してUSD換算する
    // ここでは簡略化して0を返す
    return 0;
  }, [position.earnedFees]);

  // APRの色分け
  const getAPRColor = (apr: number) => {
    if (apr >= 20) return "text-green-600";
    if (apr >= 10) return "text-blue-600";
    if (apr >= 5) return "text-yellow-600";
    return "text-muted-foreground";
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* トークンペアのロゴ */}
            <div className="flex items-center -space-x-2">
              <div className="relative w-8 h-8 flex-shrink-0">
                {position.tokenA.logoURI ? (
                  <Image
                    src={position.tokenA.logoURI}
                    alt={`${position.tokenA.symbol} logo`}
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-background"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    {position.tokenA.symbol.slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="relative w-8 h-8 flex-shrink-0">
                {position.tokenB.logoURI ? (
                  <Image
                    src={position.tokenB.logoURI}
                    alt={`${position.tokenB.symbol} logo`}
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-background"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    {position.tokenB.symbol.slice(0, 2)}
                  </div>
                )}
              </div>
            </div>

            {/* ペア名 */}
            <div>
              <h3 className="font-semibold">
                {position.tokenA.symbol}/{position.tokenB.symbol}
              </h3>
              <p className="text-sm text-muted-foreground">流動性プール</p>
            </div>
          </div>

          {/* APRバッジ */}
          <Badge variant="secondary" className={getAPRColor(position.apr)}>
            APR: {formatPercentage(position.apr)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ポジション概要 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">プールシェア</p>
            <p className="font-medium">{formatPercentage(position.shareOfPool)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">LPトークン</p>
            <p className="font-medium">
              {formatTokenAmount(position.lpBalance, 18, {
                maximumFractionDigits: 6,
              })}
            </p>
          </div>
        </div>

        {/* 引き出し可能額 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">引き出し可能額</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <div className="flex items-center gap-2">
                <div className="relative w-5 h-5">
                  {position.tokenA.logoURI ? (
                    <Image
                      src={position.tokenA.logoURI}
                      alt={`${position.tokenA.symbol} logo`}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-xs">
                      {position.tokenA.symbol.slice(0, 1)}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium">{position.tokenA.symbol}</span>
              </div>
              <span className="text-sm font-medium">
                {formatTokenAmount(position.withdrawableAmountA, position.tokenA.decimals, {
                  maximumFractionDigits: 6,
                })}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <div className="flex items-center gap-2">
                <div className="relative w-5 h-5">
                  {position.tokenB.logoURI ? (
                    <Image
                      src={position.tokenB.logoURI}
                      alt={`${position.tokenB.symbol} logo`}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-xs">
                      {position.tokenB.symbol.slice(0, 1)}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium">{position.tokenB.symbol}</span>
              </div>
              <span className="text-sm font-medium">
                {formatTokenAmount(position.withdrawableAmountB, position.tokenB.decimals, {
                  maximumFractionDigits: 6,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* 手数料収益 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">獲得手数料</p>
            <p className="text-sm text-muted-foreground">${totalEarnedFeesUSD.toFixed(2)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>{position.tokenA.symbol}</span>
              <span>
                {formatTokenAmount(position.earnedFees.tokenA, position.tokenA.decimals, {
                  maximumFractionDigits: 6,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{position.tokenB.symbol}</span>
              <span>
                {formatTokenAmount(position.earnedFees.tokenB, position.tokenB.decimals, {
                  maximumFractionDigits: 6,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddLiquidity(position.tokenA, position.tokenB)}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-1" />
            追加
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onManage(position.tokenA, position.tokenB)}
            className="flex-1"
          >
            <Minus className="h-4 w-4 mr-1" />
            除去
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a
              href={`https://sepolia.etherscan.io/address/${position.pairAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 流動性ポジション表示コンポーネントのプロパティ
 */
export interface LiquidityPositionProps {
  /** 管理ボタンクリック時のコールバック */
  onManage?: (tokenA: Token, tokenB: Token) => void;
  /** 流動性追加ボタンクリック時のコールバック */
  onAddLiquidity?: (tokenA: Token, tokenB: Token) => void;
  /** 新しい流動性追加ボタンクリック時のコールバック */
  onCreatePosition?: () => void;
  /** 表示するトークンペアのフィルター */
  tokenFilter?: Token[];
  /** コンパクト表示モード */
  compact?: boolean;
}

/**
 * 流動性ポジション表示コンポーネント
 *
 * ユーザーの全LPポジションを表示し、管理機能へのアクセスを提供します。
 * ポジション一覧、収益情報、管理アクションなどの機能を含みます。
 */
export function LiquidityPosition({
  onManage,
  onAddLiquidity,
  onCreatePosition,
  tokenFilter,
  compact = false,
}: LiquidityPositionProps) {
  const { isConnected } = useAccount();

  // 全トークンの取得（フィルター用）
  const allTokens = getAllTokens();

  // 流動性フックの使用（全ペアを監視）
  const { lpPositions, isLoadingPositions, positionsError } = useLiquidity({
    watch: true,
  });

  // フィルタリングされたポジション
  const filteredPositions = useMemo(() => {
    if (!tokenFilter || tokenFilter.length === 0) {
      return lpPositions;
    }

    return lpPositions.filter((position) => {
      const tokenAddresses = tokenFilter.map((token) => token.address.toLowerCase());
      return (
        tokenAddresses.includes(position.tokenA.address.toLowerCase()) ||
        tokenAddresses.includes(position.tokenB.address.toLowerCase())
      );
    });
  }, [lpPositions, tokenFilter]);

  // 総ポジション価値の計算（簡略化）
  const totalPositionValue = useMemo(() => {
    // 実際の実装では、各トークンの価格を取得してUSD換算する
    return 0;
  }, [filteredPositions]);

  // 総収益の計算（簡略化）
  const totalEarnings = useMemo(() => {
    // 実際の実装では、各ポジションの手数料収益を合計する
    return 0;
  }, [filteredPositions]);

  // デフォルトのコールバック関数
  const handleManage = onManage || (() => console.log("Manage position"));
  const handleAddLiquidity = onAddLiquidity || (() => console.log("Add liquidity"));
  const handleCreatePosition = onCreatePosition || (() => console.log("Create position"));

  // ウォレット未接続時の表示
  if (!isConnected) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">ウォレットを接続してください</h3>
              <p className="text-muted-foreground">
                流動性ポジションを表示するにはウォレットの接続が必要です
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ローディング中の表示
  if (isLoadingPositions) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">ポジション情報を読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // エラー時の表示
  if (positionsError) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <div className="text-destructive">
              <h3 className="text-lg font-semibold">エラーが発生しました</h3>
              <p className="text-sm">{positionsError}</p>
            </div>
            <Button onClick={() => window.location.reload()}>再読み込み</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ポジションが存在しない場合の表示
  if (filteredPositions.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">流動性ポジションがありません</h3>
              <p className="text-muted-foreground">
                トークンペアに流動性を提供して収益を獲得しましょう
              </p>
            </div>
            <Button onClick={handleCreatePosition} className="w-full max-w-xs">
              <Plus className="h-4 w-4 mr-2" />
              流動性を追加
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* サマリーカード（コンパクトモードでは非表示） */}
      {!compact && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              ポジションサマリー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">総ポジション数</p>
                <p className="text-2xl font-bold">{filteredPositions.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">総ポジション価値</p>
                <p className="text-2xl font-bold">${totalPositionValue.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">総収益</p>
                <p className="text-2xl font-bold text-green-600">+${totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ポジション一覧 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">流動性ポジション ({filteredPositions.length})</h2>
          <Button onClick={handleCreatePosition} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            新規追加
          </Button>
        </div>

        <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
          {filteredPositions.map((position, index) => (
            <LPPositionCard
              key={`${position.pairAddress}-${index}`}
              position={position}
              onManage={handleManage}
              onAddLiquidity={handleAddLiquidity}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
