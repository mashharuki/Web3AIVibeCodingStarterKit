"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TOKEN_INFO, getCurrentContracts } from "@/config/contracts";
import {
  usePoolReserves,
  useSwap,
  useSwapAmountOut,
  useTokenAllowance,
  useTokenApproval,
  useTokenBalance,
} from "@/hooks/useSwap";
import { ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";

type TokenKey = "TokenA" | "TokenB";

/**
 * スワップ画面のメインコンポーネント
 */
export function SwapPage() {
  const { address } = useAccount();
  const contracts = getCurrentContracts();

  // スワップの状態
  const [tokenIn, setTokenIn] = useState<TokenKey>("TokenA");
  const [tokenOut, setTokenOut] = useState<TokenKey>("TokenB");
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState("1");

  // カスタムフックの使用
  const { data: tokenInBalance } = useTokenBalance(
    contracts.tokens[tokenIn],
    address
  );
  const { data: tokenOutBalance } = useTokenBalance(
    contracts.tokens[tokenOut],
    address
  );
  const { data: reserves } = usePoolReserves(
    contracts.tokens.TokenA,
    contracts.tokens.TokenB
  );

  // リザーブの計算（Token順序に注意）
  const reserveIn = tokenIn === "TokenA" ? reserves?.[0] : reserves?.[1];
  const reserveOut = tokenIn === "TokenA" ? reserves?.[1] : reserves?.[0];

  const { data: amountOut } = useSwapAmountOut(amountIn, reserveIn, reserveOut);
  const { data: allowance } = useTokenAllowance(
    contracts.tokens[tokenIn],
    address,
    contracts.dex.DexRouter
  );

  // スワップとアプルーブのフック
  const { swap, isPending: isSwapping } = useSwap();
  const { approve, isPending: isApproving } = useTokenApproval();

  // 承認が必要かどうかの判定
  const needsApproval =
    allowance && amountIn ? allowance < parseEther(amountIn) : false;

  // 出力量の計算
  const calculatedAmountOut = amountOut ? formatEther(amountOut) : "0";

  // スリッページを考慮した最小受取量
  const amountOutMin = calculatedAmountOut
    ? (
        (Number(calculatedAmountOut) * (100 - Number(slippage))) /
        100
      ).toString()
    : "0";

  // レート計算
  const rate =
    Number(amountIn) > 0 && Number(calculatedAmountOut) > 0
      ? Number(calculatedAmountOut) / Number(amountIn)
      : 0;

  // トークンの入れ替え
  const handleSwapTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn("");
  };

  // 承認の実行
  const handleApprove = async () => {
    if (!address || !amountIn) return;

    await approve(contracts.tokens[tokenIn], contracts.dex.DexRouter, amountIn);
  };

  // スワップの実行
  const handleSwap = async () => {
    if (!address || !amountIn) return;

    await swap(
      amountIn,
      amountOutMin,
      contracts.tokens[tokenIn],
      contracts.tokens[tokenOut],
      address
    );
  };

  // 最大値設定
  const handleMaxAmount = () => {
    if (tokenInBalance) {
      setAmountIn(formatEther(tokenInBalance));
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">🔄 トークンスワップ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* From トークン */}
          <div className="space-y-2">
            <Label>From</Label>
            <div className="flex space-x-2">
              <Select
                value={tokenIn}
                onValueChange={(value: TokenKey) => setTokenIn(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TokenA">
                    {TOKEN_INFO.TokenA.symbol}
                  </SelectItem>
                  <SelectItem value="TokenB">
                    {TOKEN_INFO.TokenB.symbol}
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1 relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6"
                  onClick={handleMaxAmount}
                >
                  MAX
                </Button>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              残高: {tokenInBalance ? formatEther(tokenInBalance) : "0"}{" "}
              {TOKEN_INFO[tokenIn].symbol}
            </div>
          </div>

          {/* スワップボタン */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSwapTokens}
              className="rounded-full"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To トークン */}
          <div className="space-y-2">
            <Label>To</Label>
            <div className="flex space-x-2">
              <Select
                value={tokenOut}
                onValueChange={(value: TokenKey) => setTokenOut(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TokenA">
                    {TOKEN_INFO.TokenA.symbol}
                  </SelectItem>
                  <SelectItem value="TokenB">
                    {TOKEN_INFO.TokenB.symbol}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="0.0"
                value={calculatedAmountOut}
                readOnly
                className="flex-1 bg-gray-50"
              />
            </div>
            <div className="text-sm text-gray-500">
              残高: {tokenOutBalance ? formatEther(tokenOutBalance) : "0"}{" "}
              {TOKEN_INFO[tokenOut].symbol}
            </div>
          </div>

          {/* スリッページ設定 */}
          <div className="space-y-2">
            <Label>スリッページ許容度</Label>
            <div className="flex space-x-2">
              {["0.5", "1", "3"].map((value) => (
                <Button
                  key={value}
                  variant={slippage === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlippage(value)}
                >
                  {value}%
                </Button>
              ))}
              <Input
                type="number"
                placeholder="Custom"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="w-20"
              />
            </div>
          </div>

          {/* レート情報 */}
          {rate > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>レート</span>
                <span>
                  1 {TOKEN_INFO[tokenIn].symbol} = {rate.toFixed(6)}{" "}
                  {TOKEN_INFO[tokenOut].symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>最小受取量</span>
                <span>
                  {Number(amountOutMin).toFixed(6)}{" "}
                  {TOKEN_INFO[tokenOut].symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>スリッページ許容度</span>
                <span>{slippage}%</span>
              </div>
            </div>
          )}

          {/* 実行ボタン */}
          {!address ? (
            <Button className="w-full" disabled>
              ウォレットを接続してください
            </Button>
          ) : needsApproval ? (
            <Button
              className="w-full"
              onClick={handleApprove}
              disabled={isApproving || !amountIn || Number(amountIn) <= 0}
            >
              {isApproving
                ? "承認中..."
                : `${TOKEN_INFO[tokenIn].symbol}を承認`}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleSwap}
              disabled={
                isSwapping ||
                !amountIn ||
                Number(amountIn) <= 0 ||
                !calculatedAmountOut ||
                Number(calculatedAmountOut) <= 0
              }
            >
              {isSwapping ? "スワップ中..." : "スワップ"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
