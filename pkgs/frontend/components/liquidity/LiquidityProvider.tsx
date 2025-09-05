"use client";

import { Plus, Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { TokenSelector } from "@/components/swap/TokenSelector";
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
import { useLiquidity, type AddLiquidityParams } from "@/hooks/useLiquidity";
import { useTxToasts } from "@/hooks/useTxToasts";
import { TRANSACTION_TYPES } from "@/utils/constants";
import type { Token } from "@/lib/tokens";
import { DEFAULT_TOKEN_PAIR } from "@/lib/tokens";
import { UI_CONSTANTS, VALIDATION_CONSTANTS } from "@/utils/constants";
import {
    formatPercentage,
    formatTokenAmount,
    isValidNumberString,
    limitDecimals,
    normalizeNumericInput,
} from "@/utils/formatters";
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
 * 流動性提供コンポーネント
 *
 * トークンペアに流動性を提供するためのUIを提供します。
 * トークン選択、金額入力、比率計算、流動性追加実行などの機能を含みます。
 */
export function LiquidityProvider() {
  // 状態管理
  const [tokenA, setTokenA] = useState<Token>(DEFAULT_TOKEN_PAIR[0]);
  const [tokenB, setTokenB] = useState<Token>(DEFAULT_TOKEN_PAIR[1]);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { isConnected } = useAccount();

  // 流動性フックの使用
  const {
    addLiquidityCalculation,
    isCalculatingAdd,
    addCalculationError,
    tokenABalance,
    tokenBBalance,
    isLoadingBalances,
    settings,
    updateSlippage,
    updateDeadline,
    addLiquidity,
    isExecuting,
    transactionHash,
    isConfirming,
    executionError,
    calculateAddLiquidity,
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

  // トランザクションのトースト通知（流動性追加）
  useTxToasts({
    type: TRANSACTION_TYPES.ADD_LIQUIDITY,
    isExecuting,
    isConfirming,
    transactionHash: transactionHash,
    error: executionError,
  });

  // トークンAの金額変更処理
  const handleAmountAChange = useCallback(
    (value: string) => {
      const normalized = normalizeNumericInput(value, tokenA?.decimals || 18);
      setAmountA(normalized);

      // トークンBの金額を自動計算
      if (normalized && tokenA && tokenB && Number(normalized) > 0) {
        const calc = calculateAddLiquidity(normalized, "0", tokenA, tokenB);
        if (calc && calc.amountB > BigInt(0)) {
          const amountBFormatted = formatTokenAmount(calc.amountB, tokenB.decimals, {
            maximumFractionDigits: 6,
          });
          setAmountB(amountBFormatted);
        } else {
          setAmountB("");
        }
      } else {
        setAmountB("");
      }
    },
    [tokenA, tokenB, calculateAddLiquidity]
  );

  // トークンBの金額変更処理
  const handleAmountBChange = useCallback(
    (value: string) => {
      const normalized = normalizeNumericInput(value, tokenB?.decimals || 18);
      setAmountB(normalized);

      // トークンAの金額を自動計算
      if (normalized && tokenA && tokenB && Number(normalized) > 0) {
        const calc = calculateAddLiquidity("0", normalized, tokenA, tokenB);
        if (calc && calc.amountA > BigInt(0)) {
          const amountAFormatted = formatTokenAmount(calc.amountA, tokenA.decimals, {
            maximumFractionDigits: 6,
          });
          setAmountA(amountAFormatted);
        } else {
          setAmountA("");
        }
      } else {
        setAmountA("");
      }
    },
    [tokenA, tokenB, calculateAddLiquidity]
  );

  // 最大金額の設定（トークンA）
  const handleMaxAmountA = useCallback(() => {
    if (tokenA && tokenABalance > BigInt(0)) {
      const maxAmount = formatTokenAmount(tokenABalance, tokenA.decimals, {
        maximumFractionDigits: tokenA.decimals,
      });
      handleAmountAChange(maxAmount);
    }
  }, [tokenA, tokenABalance, handleAmountAChange]);

  // 最大金額の設定（トークンB）
  const handleMaxAmountB = useCallback(() => {
    if (tokenB && tokenBBalance > BigInt(0)) {
      const maxAmount = formatTokenAmount(tokenBBalance, tokenB.decimals, {
        maximumFractionDigits: tokenB.decimals,
      });
      handleAmountBChange(maxAmount);
    }
  }, [tokenB, tokenBBalance, handleAmountBChange]);

  // 流動性追加実行
  const handleAddLiquidity = useCallback(async () => {
    if (!tokenA || !tokenB || !amountA || !amountB) return;

    try {
      const liquidityParams: AddLiquidityParams = {
        tokenA,
        tokenB,
        amountADesired: amountA,
        amountBDesired: amountB,
        settings,
      };

      await addLiquidity(liquidityParams);

      // 成功時は入力をクリア
      setAmountA("");
      setAmountB("");
    } catch (error) {
      console.error("Add liquidity execution error:", error);
    }
  }, [tokenA, tokenB, amountA, amountB, settings, addLiquidity]);

  // 承認実行（トークンA）
  const handleApproveTokenA = useCallback(async () => {
    if (!tokenA || !addLiquidityCalculation) return;

    try {
      await approveToken(tokenA, addLiquidityCalculation.amountA);
    } catch (error) {
      console.error("Token A approval error:", error);
    }
  }, [tokenA, addLiquidityCalculation, approveToken]);

  // 承認実行（トークンB）
  const handleApproveTokenB = useCallback(async () => {
    if (!tokenB || !addLiquidityCalculation) return;

    try {
      await approveToken(tokenB, addLiquidityCalculation.amountB);
    } catch (error) {
      console.error("Token B approval error:", error);
    }
  }, [tokenB, addLiquidityCalculation, approveToken]);

  // ウォレット接続
  const handleConnectWallet = useCallback(() => {
    console.log("Connect wallet");
  }, []);

  // 承認が必要かどうかの判定
  const [needsTokenAApproval, setNeedsTokenAApproval] = useState(false);
  const [needsTokenBApproval, setNeedsTokenBApproval] = useState(false);

  useEffect(() => {
    const checkApprovals = async () => {
      if (tokenA && tokenB && addLiquidityCalculation && isConnected) {
        try {
          const [needsA, needsB] = await Promise.all([
            needsApproval(tokenA, addLiquidityCalculation.amountA),
            needsApproval(tokenB, addLiquidityCalculation.amountB),
          ]);
          setNeedsTokenAApproval(needsA);
          setNeedsTokenBApproval(needsB);
        } catch (error) {
          console.error("Approval check error:", error);
          setNeedsTokenAApproval(true);
          setNeedsTokenBApproval(true);
        }
      } else {
        setNeedsTokenAApproval(false);
        setNeedsTokenBApproval(false);
      }
    };

    checkApprovals();
  }, [tokenA, tokenB, addLiquidityCalculation, isConnected, needsApproval]);

  // 実行可能かどうかの判定
  const canExecute = useMemo(() => {
    return (
      isConnected &&
      tokenA &&
      tokenB &&
      amountA &&
      amountB &&
      Number(amountA) > 0 &&
      Number(amountB) > 0 &&
      addLiquidityCalculation &&
      !needsTokenAApproval &&
      !needsTokenBApproval &&
      validation.amountA.isValid &&
      validation.amountB.isValid &&
      validation.balanceA.isValid &&
      validation.balanceB.isValid
    );
  }, [
    isConnected,
    tokenA,
    tokenB,
    amountA,
    amountB,
    addLiquidityCalculation,
    needsTokenAApproval,
    needsTokenBApproval,
    validation,
  ]);

  return (
    <Card
      className="w-full max-w-md mx-auto"
      aria-busy={isExecuting || isConfirming || isCalculatingAdd || isLoadingBalances}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            流動性を追加
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
        {/* トークンA入力 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">トークンA</span>
            {tokenA && tokenABalance >= BigInt(0) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  残高:{" "}
                  {formatTokenAmount(tokenABalance, tokenA.decimals, {
                    maximumFractionDigits: 4,
                    showSymbol: true,
                    symbol: tokenA.symbol,
                  })}
                </span>
                {tokenABalance > BigInt(0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleMaxAmountA}
                    className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    最大
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <Input
              type="text"
              placeholder="0.0"
              value={amountA}
              onChange={(e) => handleAmountAChange(e.target.value)}
              className="pr-32 text-lg font-medium"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              pattern="[0-9]*[.,]?[0-9]*"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <TokenSelector
                selectedToken={tokenA}
                onTokenSelect={setTokenA}
                excludeToken={tokenB}
                balance={tokenABalance}
                isLoadingBalance={isLoadingBalances}
              />
            </div>
          </div>

          {/* バリデーションエラー */}
          {!validation.amountA.isValid && validation.amountA.error && (
            <p className="text-sm text-destructive">{validation.amountA.error}</p>
          )}
          {!validation.balanceA.isValid && validation.balanceA.error && (
            <p className="text-sm text-destructive">{validation.balanceA.error}</p>
          )}
        </div>

        {/* プラスアイコン */}
        <div className="flex justify-center">
          <div className="rounded-full border bg-background p-2">
            <Plus className="h-4 w-4" />
          </div>
        </div>

        {/* トークンB入力 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">トークンB</span>
            {tokenB && tokenBBalance >= BigInt(0) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  残高:{" "}
                  {formatTokenAmount(tokenBBalance, tokenB.decimals, {
                    maximumFractionDigits: 4,
                    showSymbol: true,
                    symbol: tokenB.symbol,
                  })}
                </span>
                {tokenBBalance > BigInt(0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleMaxAmountB}
                    className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    最大
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <Input
              type="text"
              placeholder="0.0"
              value={amountB}
              onChange={(e) => handleAmountBChange(e.target.value)}
              className="pr-32 text-lg font-medium"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              pattern="[0-9]*[.,]?[0-9]*"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <TokenSelector
                selectedToken={tokenB}
                onTokenSelect={setTokenB}
                excludeToken={tokenA}
                balance={tokenBBalance}
                isLoadingBalance={isLoadingBalances}
              />
            </div>
          </div>

          {/* バリデーションエラー */}
          {!validation.amountB.isValid && validation.amountB.error && (
            <p className="text-sm text-destructive">{validation.amountB.error}</p>
          )}
          {!validation.balanceB.isValid && validation.balanceB.error && (
            <p className="text-sm text-destructive">{validation.balanceB.error}</p>
          )}
        </div>

        {/* 流動性情報 */}
        {addLiquidityCalculation && tokenA && tokenB && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>プール内シェア</span>
              <span>{formatPercentage(addLiquidityCalculation.shareOfPool)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>交換レート</span>
              <span>
                1 {tokenA.symbol} = {addLiquidityCalculation.exchangeRate.toFixed(6)}{" "}
                {tokenB.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>発行LPトークン</span>
              <span>
                {formatTokenAmount(addLiquidityCalculation.liquidityMinted, 18, {
                  maximumFractionDigits: 6,
                })}
              </span>
            </div>
          </div>
        )}

        {/* エラーの統一表示 */}
        <ErrorAlert message={addCalculationError || executionError} />

        {/* 承認・実行ボタン */}
        <div className="space-y-2">
          {!isConnected ? (
            <Button onClick={handleConnectWallet} className="w-full" size="lg">
              ウォレットを接続
            </Button>
          ) : (
            <>
              {/* トークンA承認 */}
              {needsTokenAApproval && (
                <Button
                  onClick={handleApproveTokenA}
                  disabled={isApproving || !tokenA}
                  className="w-full"
                  size="lg"
                >
                  {isApproving ? "承認中..." : `${tokenA?.symbol}を承認`}
                </Button>
              )}

              {/* トークンB承認 */}
              {needsTokenBApproval && (
                <Button
                  onClick={handleApproveTokenB}
                  disabled={isApproving || !tokenB}
                  className="w-full"
                  size="lg"
                >
                  {isApproving ? "承認中..." : `${tokenB?.symbol}を承認`}
                </Button>
              )}

              {/* 流動性追加実行 */}
              <Button
                onClick={handleAddLiquidity}
                disabled={!canExecute || isExecuting || isConfirming || isCalculatingAdd}
                className="w-full"
                size="lg"
              >
                {isExecuting
                  ? "実行中..."
                  : isConfirming
                    ? "確認中..."
                    : isCalculatingAdd
                      ? "計算中..."
                      : "流動性を追加"}
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
