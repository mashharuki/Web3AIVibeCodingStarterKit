"use client";

import { ArrowUpDown, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import { useSwap, type SwapExecuteParams } from "@/hooks/useSwap";
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
import { SwapButton } from "./SwapButton";
import { TokenSelector } from "./TokenSelector";
import { useTxToasts } from "@/hooks/useTxToasts";
import { TRANSACTION_TYPES } from "@/utils/constants";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { LoadingOverlay } from "@/components/feedback/LoadingOverlay";

/**
 * スリッページ設定コンポーネントのプロパティ
 */
interface SlippageSettingsProps {
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
 * スリッページ設定コンポーネント
 */
function SlippageSettings({
  slippage,
  onSlippageChange,
  deadline,
  onDeadlineChange,
}: SlippageSettingsProps) {
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
 * スワップインターフェースコンポーネント
 *
 * トークンスワップのメインUIを提供します。
 * トークン選択、金額入力、スリッページ設定、スワップ実行などの機能を含みます。
 */
export function SwapInterface() {
  // 状態管理
  const [tokenIn, setTokenIn] = useState<Token>(DEFAULT_TOKEN_PAIR[0]);
  const [tokenOut, setTokenOut] = useState<Token>(DEFAULT_TOKEN_PAIR[1]);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { isConnected, address } = useAccount();

  // スワップフックの使用
  const {
    calculation,
    isCalculating,
    calculationError,
    tokenInBalance,
    tokenOutBalance,
    isLoadingBalances,
    settings,
    updateSlippage,
    updateDeadline,
    executeSwap,
    isExecuting,
    transactionHash,
    isConfirming,
    executionError,
    calculateSwapAmount,
    needsApproval,
    approveToken,
    isApproving,
    validation,
  } = useSwap({
    tokenIn,
    tokenOut,
    initialSlippage: UI_CONSTANTS.DEFAULT_SLIPPAGE,
    initialDeadline: UI_CONSTANTS.DEFAULT_DEADLINE,
    watch: true,
  });

  // トランザクションのトースト通知
  useTxToasts({
    type: TRANSACTION_TYPES.SWAP,
    isExecuting,
    isConfirming,
    transactionHash: transactionHash,
    error: executionError,
  });

  // 入力金額の変更処理
  const handleAmountInChange = useCallback(
    (value: string) => {
      const normalized = normalizeNumericInput(value, tokenIn?.decimals || 18);
      setAmountIn(normalized);

      // 出力金額を計算
      if (normalized && tokenIn && tokenOut && Number(normalized) > 0) {
        const calc = calculateSwapAmount(normalized, tokenIn, tokenOut);
        if (calc) {
          const outputAmount = formatTokenAmount(calc.amountOut, tokenOut.decimals, {
            maximumFractionDigits: 6,
          });
          setAmountOut(outputAmount);
        } else {
          setAmountOut("");
        }
      } else {
        setAmountOut("");
      }
    },
    [tokenIn, tokenOut, calculateSwapAmount]
  );

  // トークンの入れ替え
  const handleSwapTokens = useCallback(() => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  }, [tokenIn, tokenOut, amountIn, amountOut]);

  // 最大金額の設定
  const handleMaxAmount = useCallback(() => {
    if (tokenIn && tokenInBalance > BigInt(0)) {
      const maxAmount = formatTokenAmount(tokenInBalance, tokenIn.decimals, {
        maximumFractionDigits: tokenIn.decimals,
      });
      handleAmountInChange(maxAmount);
    }
  }, [tokenIn, tokenInBalance, handleAmountInChange]);

  // スワップ実行
  const handleSwap = useCallback(async () => {
    if (!tokenIn || !tokenOut || !amountIn) return;

    try {
      const swapParams: SwapExecuteParams = {
        amountIn,
        tokenIn,
        tokenOut,
        settings,
      };

      await executeSwap(swapParams);

      // 成功時は入力をクリア
      setAmountIn("");
      setAmountOut("");
    } catch (error) {
      console.error("Swap execution error:", error);
    }
  }, [tokenIn, tokenOut, amountIn, settings, executeSwap]);

  // 承認実行
  const handleApprove = useCallback(async () => {
    if (!tokenIn || !calculation) return;

    try {
      await approveToken(tokenIn, calculation.amountIn);
    } catch (error) {
      console.error("Token approval error:", error);
    }
  }, [tokenIn, calculation, approveToken]);

  // ウォレット接続（実際の実装では適切なウォレット接続ライブラリを使用）
  const handleConnectWallet = useCallback(() => {
    // RainbowKit や ConnectKit などのウォレット接続モーダルを開く
    console.log("Connect wallet");
  }, []);

  // 承認が必要かどうかの判定
  const [needsTokenApproval, setNeedsTokenApproval] = useState(false);

  useEffect(() => {
    const checkApproval = async () => {
      if (tokenIn && calculation && isConnected) {
        try {
          const needs = await needsApproval(tokenIn, calculation.amountIn);
          setNeedsTokenApproval(needs);
        } catch (error) {
          console.error("Approval check error:", error);
          setNeedsTokenApproval(true);
        }
      } else {
        setNeedsTokenApproval(false);
      }
    };

    checkApproval();
  }, [tokenIn, calculation, isConnected, needsApproval]);

  return (
    <Card
      className="w-full max-w-md mx-auto"
      aria-busy={isExecuting || isConfirming || isCalculating || isLoadingBalances}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>スワップ</CardTitle>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>取引設定</DialogTitle>
              </DialogHeader>
              <SlippageSettings
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
        {/* 入力トークン */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">支払い</span>
            {tokenIn && tokenInBalance >= BigInt(0) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  残高:{" "}
                  {formatTokenAmount(tokenInBalance, tokenIn.decimals, {
                    maximumFractionDigits: 4,
                    showSymbol: true,
                    symbol: tokenIn.symbol,
                  })}
                </span>
                {tokenInBalance > BigInt(0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleMaxAmount}
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
              value={amountIn}
              onChange={(e) => handleAmountInChange(e.target.value)}
              className="pr-32 text-lg font-medium"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              pattern="[0-9]*[.,]?[0-9]*"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <TokenSelector
                selectedToken={tokenIn}
                onTokenSelect={setTokenIn}
                excludeToken={tokenOut}
                balance={tokenInBalance}
                isLoadingBalance={isLoadingBalances}
              />
            </div>
          </div>

          {/* バリデーションエラー */}
          {!validation.amountIn.isValid && validation.amountIn.error && (
            <p className="text-sm text-destructive">{validation.amountIn.error}</p>
          )}
          {!validation.balance.isValid && validation.balance.error && (
            <p className="text-sm text-destructive">{validation.balance.error}</p>
          )}
        </div>

        {/* トークン入れ替えボタン */}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleSwapTokens}
            className="rounded-full border bg-background hover:bg-accent"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* 出力トークン */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">受取り</span>
            {tokenOut && tokenOutBalance >= BigInt(0) && (
              <span className="text-xs text-muted-foreground">
                残高:{" "}
                {formatTokenAmount(tokenOutBalance, tokenOut.decimals, {
                  maximumFractionDigits: 4,
                  showSymbol: true,
                  symbol: tokenOut.symbol,
                })}
              </span>
            )}
          </div>

          <div className="relative">
            <Input
              type="text"
              placeholder="0.0"
              value={amountOut}
              readOnly
              className="pr-32 text-lg font-medium bg-muted"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              pattern="[0-9]*[.,]?[0-9]*"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <TokenSelector
                selectedToken={tokenOut}
                onTokenSelect={setTokenOut}
                excludeToken={tokenIn}
                balance={tokenOutBalance}
                isLoadingBalance={isLoadingBalances}
              />
            </div>
          </div>
        </div>

        {/* 価格情報 */}
        {calculation && tokenIn && tokenOut && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>交換レート</span>
              <span>
                1 {tokenIn.symbol} ={" "}
                {formatTokenAmount(
                  BigInt(Math.floor(calculation.exchangeRate * 10 ** tokenOut.decimals)),
                  tokenOut.decimals,
                  { maximumFractionDigits: 6 }
                )}{" "}
                {tokenOut.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>価格インパクト</span>
              <span className={calculation.priceImpact > 5 ? "text-yellow-600" : ""}>
                {formatPercentage(calculation.priceImpact)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>手数料</span>
              <span>
                {formatTokenAmount(calculation.fee, tokenIn.decimals, {
                  maximumFractionDigits: 6,
                  showSymbol: true,
                  symbol: tokenIn.symbol,
                })}
              </span>
            </div>
          </div>
        )}

        {/* 価格インパクト警告 */}
        {calculation && calculation.priceImpact > 15 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">高リスク</Badge>
              <span className="text-sm font-medium">価格インパクトが非常に大きいです</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              この取引により価格が大幅に変動する可能性があります。
            </p>
          </div>
        )}

        {/* エラーの統一表示 */}
        <ErrorAlert message={calculationError || executionError} />

        {/* スワップボタン */}
        <SwapButton
          tokenIn={tokenIn}
          tokenOut={tokenOut}
          amountIn={amountIn}
          tokenInBalance={tokenInBalance}
          calculation={calculation}
          settings={settings}
          isExecuting={isExecuting}
          isConfirming={isConfirming}
          isApproving={isApproving}
          needsApproval={needsTokenApproval}
          executionError={executionError}
          calculationError={calculationError}
          onSwap={handleSwap}
          onApprove={handleApprove}
          onConnectWallet={handleConnectWallet}
        />

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
