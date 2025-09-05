"use client";

import { Minus, Settings, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLiquidity, type RemoveLiquidityParams } from "@/hooks/useLiquidity";
import { useTxToasts } from "@/hooks/useTxToasts";
import { TRANSACTION_TYPES } from "@/utils/constants";
import type { Token } from "@/lib/tokens";
import { UI_CONSTANTS, VALIDATION_CONSTANTS } from "@/utils/constants";
import { formatPercentage, formatTokenAmount, isValidNumberString } from "@/utils/formatters";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { LoadingOverlay } from "@/components/feedback/LoadingOverlay";

/**
 * 流動性設定コンポーネントのプロパティ
 */
interface LiquiditySettingsProps {
  /** 現在のスリッページ値 */
  slippage: number;
  /** スリッページ変更コールバック */
  onSlippageChange: (slippage: number) => void;
  /** 現在のデッドライン値 */
  deadline: number;
  /** デッドライン変更コールバック */
  onDeadlineChange: (deadline: number) => void;
}

/**
 * 流動性設定コンポーネント
 */
function LiquiditySettingsDialog({
  slippage,
  onSlippageChange,
  deadline,
  onDeadlineChange,
}: LiquiditySettingsProps) {
  const [customSlippage, setCustomSlippage] = useState("");
  const [customDeadline, setCustomDeadline] = useState("");

  // プリセットスリッページの選択
  const handlePresetSlippage = (value: number) => {
    onSlippageChange(value);
    setCustomSlippage("");
  };

  // カスタムスリッページの変更
  const handleCustomSlippageChange = (value: string) => {
    setCustomSlippage(value);
    const numValue = Number(value);
    if (
      isValidNumberString(value) &&
      numValue >= VALIDATION_CONSTANTS.MIN_SLIPPAGE &&
      numValue <= VALIDATION_CONSTANTS.MAX_SLIPPAGE
    ) {
      onSlippageChange(numValue);
    }
  };

  // カスタムデッドラインの変更
  const handleCustomDeadlineChange = (value: string) => {
    setCustomDeadline(value);
    const numValue = Number(value);
    if (
      isValidNumberString(value) &&
      numValue >= VALIDATION_CONSTANTS.MIN_DEADLINE &&
      numValue <= VALIDATION_CONSTANTS.MAX_DEADLINE
    ) {
      onDeadlineChange(numValue);
    }
  };

  return (
    <div className="space-y-6">
      {/* スリッページ設定 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">スリッページ許容値</label>
          <span className="text-sm text-muted-foreground">{formatPercentage(slippage)}</span>
        </div>

        {/* プリセットボタン */}
        <div className="flex gap-2">
          {UI_CONSTANTS.SLIPPAGE_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              variant={slippage === option && !customSlippage ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetSlippage(option)}
              className="flex-1"
            >
              {formatPercentage(option)}
            </Button>
          ))}
        </div>

        {/* カスタム入力 */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="カスタム"
            value={customSlippage}
            onChange={(e) => handleCustomSlippageChange(e.target.value)}
            className="flex-1"
            min={VALIDATION_CONSTANTS.MIN_SLIPPAGE}
            max={VALIDATION_CONSTANTS.MAX_SLIPPAGE}
            step="0.1"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>

        {/* スリッページ警告 */}
        {slippage < 0.5 && (
          <p className="text-xs text-yellow-600">
            スリッページが低すぎると取引が失敗する可能性があります
          </p>
        )}
        {slippage > 5 && (
          <p className="text-xs text-yellow-600">
            スリッページが高すぎると不利な価格で取引される可能性があります
          </p>
        )}
      </div>

      {/* デッドライン設定 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">取引デッドライン</label>
          <span className="text-sm text-muted-foreground">{deadline}分</span>
        </div>

        {/* プリセットボタン */}
        <div className="flex gap-2">
          {UI_CONSTANTS.DEADLINE_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              variant={deadline === option && !customDeadline ? "default" : "outline"}
              size="sm"
              onClick={() => {
                onDeadlineChange(option);
                setCustomDeadline("");
              }}
              className="flex-1"
            >
              {option}分
            </Button>
          ))}
        </div>

        {/* カスタム入力 */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="カスタム"
            value={customDeadline}
            onChange={(e) => handleCustomDeadlineChange(e.target.value)}
            className="flex-1"
            min={VALIDATION_CONSTANTS.MIN_DEADLINE}
            max={VALIDATION_CONSTANTS.MAX_DEADLINE}
            step="1"
          />
          <span className="text-sm text-muted-foreground">分</span>
        </div>
      </div>
    </div>
  );
}

/**
 * プール管理コンポーネントのプロパティ
 */
export interface PoolManagerProps {
  /** 管理対象のトークンA */
  tokenA: Token;
  /** 管理対象のトークンB */
  tokenB: Token;
  /** 初期表示モード */
  initialMode?: "add" | "remove";
}

/**
 * プール管理コンポーネント
 *
 * 特定のトークンペアの流動性管理（追加・除去）を行うUIを提供します。
 * 既存のLPポジションの表示、流動性の除去、追加流動性の提供などの機能を含みます。
 */
export function PoolManager({ tokenA, tokenB, initialMode = "remove" }: PoolManagerProps) {
  // 状態管理
  const [mode, setMode] = useState<"add" | "remove">(initialMode);
  const [removePercentage, setRemovePercentage] = useState(25);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { isConnected } = useAccount();

  // 流動性フックの使用
  const {
    lpPositions,
    isLoadingPositions,
    positionsError,
    removeLiquidityCalculation,
    isCalculatingRemove,
    removeCalculationError,
    tokenABalance,
    tokenBBalance,
    lpTokenBalance,
    isLoadingBalances,
    settings,
    updateSlippage,
    updateDeadline,
    removeLiquidity,
    isExecuting,
    transactionHash,
    isConfirming,
    executionError,
    calculateRemoveLiquidity,
    needsApproval,
    approveToken,
    isApproving,
    validation,
  } = useLiquidity({
    tokenA,
    tokenB,
    initialSlippage: UI_CONSTANTS.DEFAULT_SLIPPAGE,
    initialDeadline: UI_CONSTANTS.DEFAULT_DEADLINE,
    watch: true,
  });

  // トランザクションのトースト通知（流動性除去）
  useTxToasts({
    type: TRANSACTION_TYPES.REMOVE_LIQUIDITY,
    isExecuting,
    isConfirming,
    transactionHash: transactionHash,
    error: executionError,
  });

  // 現在のLPポジション
  const currentPosition = useMemo(() => {
    return lpPositions.find(
      (position) =>
        (position.tokenA.address.toLowerCase() === tokenA.address.toLowerCase() &&
          position.tokenB.address.toLowerCase() === tokenB.address.toLowerCase()) ||
        (position.tokenA.address.toLowerCase() === tokenB.address.toLowerCase() &&
          position.tokenB.address.toLowerCase() === tokenA.address.toLowerCase())
    );
  }, [lpPositions, tokenA, tokenB]);

  // ウォレット残高表示ブロック
  const WalletBalances = () => (
    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
      <div className="rounded-md bg-muted/50 p-2">
        <div className="mb-1">残高 {tokenA.symbol}</div>
        <div className="font-medium text-foreground">
          {formatTokenAmount(tokenABalance, tokenA.decimals, { maximumFractionDigits: 6 })}
        </div>
      </div>
      <div className="rounded-md bg-muted/50 p-2">
        <div className="mb-1">残高 {tokenB.symbol}</div>
        <div className="font-medium text-foreground">
          {formatTokenAmount(tokenBBalance, tokenB.decimals, { maximumFractionDigits: 6 })}
        </div>
      </div>
      <div className="rounded-md bg-muted/50 p-2">
        <div className="mb-1">残高 LP</div>
        <div className="font-medium text-foreground">
          {formatTokenAmount(lpTokenBalance, 18, { maximumFractionDigits: 6 })}
        </div>
      </div>
    </div>
  );

  // 除去割合の変更処理
  const handlePercentageChange = useCallback((percentage: number) => {
    setRemovePercentage(Math.max(0, Math.min(100, percentage)));
  }, []);

  // プリセット割合の選択
  const handlePresetPercentage = useCallback((percentage: number) => {
    setRemovePercentage(percentage);
  }, []);

  // 流動性除去実行
  const handleRemoveLiquidity = useCallback(async () => {
    if (!tokenA || !tokenB || removePercentage <= 0) return;

    try {
      const removeParams: RemoveLiquidityParams = {
        tokenA,
        tokenB,
        percentage: removePercentage,
        settings,
      };

      await removeLiquidity(removeParams);

      // 成功時は割合をリセット
      setRemovePercentage(25);
    } catch (error) {
      console.error("Remove liquidity execution error:", error);
    }
  }, [tokenA, tokenB, removePercentage, settings, removeLiquidity]);

  // 承認実行（LPトークン）
  const handleApproveLPToken = useCallback(async () => {
    if (!currentPosition || !removeLiquidityCalculation) return;

    try {
      const lpToken = {
        address: currentPosition.pairAddress,
        symbol: "LP",
        name: "LP Token",
        decimals: 18,
      };
      await approveToken(lpToken, removeLiquidityCalculation.liquidityToRemove);
    } catch (error) {
      console.error("LP token approval error:", error);
    }
  }, [currentPosition, removeLiquidityCalculation, approveToken]);

  // ウォレット接続
  const handleConnectWallet = useCallback(() => {
    console.log("Connect wallet");
  }, []);

  // 承認が必要かどうかの判定
  const [needsLPApproval, setNeedsLPApproval] = useState(false);

  useEffect(() => {
    const checkApproval = async () => {
      if (currentPosition && removeLiquidityCalculation && isConnected) {
        try {
          const lpToken = {
            address: currentPosition.pairAddress,
            symbol: "LP",
            name: "LP Token",
            decimals: 18,
          };
          const needs = await needsApproval(lpToken, removeLiquidityCalculation.liquidityToRemove);
          setNeedsLPApproval(needs);
        } catch (error) {
          console.error("LP approval check error:", error);
          setNeedsLPApproval(true);
        }
      } else {
        setNeedsLPApproval(false);
      }
    };

    checkApproval();
  }, [currentPosition, removeLiquidityCalculation, isConnected, needsApproval]);

  // 除去計算の更新
  useEffect(() => {
    if (tokenA && tokenB && removePercentage > 0) {
      calculateRemoveLiquidity(removePercentage, tokenA, tokenB);
    }
  }, [tokenA, tokenB, removePercentage, calculateRemoveLiquidity]);

  // 実行可能かどうかの判定
  const canExecute = useMemo(() => {
    return (
      isConnected &&
      currentPosition &&
      removePercentage > 0 &&
      removeLiquidityCalculation &&
      !needsLPApproval &&
      validation.percentage.isValid
    );
  }, [
    isConnected,
    currentPosition,
    removePercentage,
    removeLiquidityCalculation,
    needsLPApproval,
    validation.percentage,
  ]);

  // ポジションが存在しない場合の表示
  if (!isLoadingPositions && !currentPosition) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            プール管理
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <div className="text-muted-foreground">
              <p>このペアの流動性ポジションが見つかりません</p>
              <p className="text-sm">
                {tokenA.symbol}/{tokenB.symbol} ペアに流動性を提供してください
              </p>
            </div>
            <Button onClick={() => setMode("add")} className="w-full">
              流動性を追加
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="w-full max-w-md mx-auto"
      aria-busy={isExecuting || isConfirming}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5" />
            流動性を除去
          </CardTitle>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>流動性設定</DialogTitle>
              </DialogHeader>
              <LiquiditySettingsDialog
                slippage={settings.slippageTolerance}
                onSlippageChange={updateSlippage}
                deadline={settings.deadline}
                onDeadlineChange={updateDeadline}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 relative">
        <LoadingOverlay show={isExecuting || isConfirming} />
        {/* 現在のポジション情報 */}
        {currentPosition && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {currentPosition.tokenA.symbol}/{currentPosition.tokenB.symbol}
              </span>
              <Badge variant="secondary">APR: {formatPercentage(currentPosition.apr)}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">プールシェア</p>
                <p className="font-medium">{formatPercentage(currentPosition.shareOfPool)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">LPトークン</p>
                <p className="font-medium">
                  {formatTokenAmount(currentPosition.lpBalance, 18, {
                    maximumFractionDigits: 6,
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">引き出し可能額</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>{currentPosition.tokenA.symbol}</span>
                  <span className="font-medium">
                    {formatTokenAmount(
                      currentPosition.withdrawableAmountA,
                      currentPosition.tokenA.decimals,
                      { maximumFractionDigits: 6 }
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{currentPosition.tokenB.symbol}</span>
                  <span className="font-medium">
                    {formatTokenAmount(
                      currentPosition.withdrawableAmountB,
                      currentPosition.tokenB.decimals,
                      { maximumFractionDigits: 6 }
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ウォレット残高 */}
        <WalletBalances />

        {/* 除去割合設定 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">除去する割合</label>
            <span className="text-sm text-muted-foreground">
              {formatPercentage(removePercentage)}
            </span>
          </div>

          {/* プリセット割合ボタン */}
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map((percentage) => (
              <Button
                key={percentage}
                type="button"
                variant={removePercentage === percentage ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetPercentage(percentage)}
              >
                {percentage}%
              </Button>
            ))}
          </div>

          {/* カスタム割合入力 */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="カスタム"
              value={removePercentage}
              onChange={(e) => handlePercentageChange(Number(e.target.value))}
              className="flex-1"
              min="0"
              max="100"
              step="1"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>

          {/* 割合スライダー（簡易版） */}
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={removePercentage}
            onChange={(e) => handlePercentageChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* 除去予定情報 */}
        {removeLiquidityCalculation && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>除去するLPトークン</span>
              <span>
                {formatTokenAmount(removeLiquidityCalculation.liquidityToRemove, 18, {
                  maximumFractionDigits: 6,
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>受け取る{tokenA.symbol}</span>
              <span>
                {formatTokenAmount(removeLiquidityCalculation.amountA, tokenA.decimals, {
                  maximumFractionDigits: 6,
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>受け取る{tokenB.symbol}</span>
              <span>
                {formatTokenAmount(removeLiquidityCalculation.amountB, tokenB.decimals, {
                  maximumFractionDigits: 6,
                })}
              </span>
            </div>
          </div>
        )}

        {/* エラーの統一表示 */}
        <ErrorAlert message={removeCalculationError || positionsError || executionError} />

        {/* 承認・実行ボタン */}
        <div className="space-y-2">
          {!isConnected ? (
            <Button onClick={handleConnectWallet} className="w-full" size="lg">
              ウォレットを接続
            </Button>
          ) : (
            <>
              {/* LPトークン承認 */}
              {needsLPApproval && (
                <Button
                  onClick={handleApproveLPToken}
                  disabled={isApproving || !currentPosition}
                  className="w-full"
                  size="lg"
                >
                  {isApproving ? "承認中..." : "LPトークンを承認"}
                </Button>
              )}

              {/* 流動性除去実行 */}
              <Button
                onClick={handleRemoveLiquidity}
                disabled={!canExecute || isExecuting || isConfirming || isCalculatingRemove}
                className="w-full"
                size="lg"
                variant="destructive"
              >
                {isExecuting
                  ? "実行中..."
                  : isConfirming
                    ? "確認中..."
                    : isCalculatingRemove
                      ? "計算中..."
                      : "流動性を除去"}
              </Button>
            </>
          )}
        </div>

        {/* トランザクションハッシュ */}
        {transactionHash && (
          <div className="text-center">
            <a
              href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Etherscanで確認
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
