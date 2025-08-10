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
    <div className="min-h-screen py-12">
      <div className="max-w-lg mx-auto">
        {/* メインカード */}
        <Card className="backdrop-blur-sm bg-white/10 border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8 space-y-6">
            {/* From トークン */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-white">売却トークン</Label>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex space-x-4 mb-4">
                  <Select
                    value={tokenIn}
                    onValueChange={(value: TokenKey) => setTokenIn(value)}
                  >
                    <SelectTrigger className="w-40 h-12 bg-white/10 border-white/20 text-white rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="TokenA" className="text-white hover:bg-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🟡</span>
                          {TOKEN_INFO.TokenA.symbol}
                        </div>
                      </SelectItem>
                      <SelectItem value="TokenB" className="text-white hover:bg-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🔵</span>
                          {TOKEN_INFO.TokenB.symbol}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1 relative">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={amountIn}
                      onChange={(e) => setAmountIn(e.target.value)}
                      className="h-12 text-xl text-white bg-white/10 border-white/20 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 placeholder:text-gray-400"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-7 bg-blue-500/20 border-blue-400/30 text-blue-300 hover:bg-blue-500/30"
                      onClick={handleMaxAmount}
                    >
                      MAX
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-gray-300 bg-black/20 px-3 py-2 rounded-lg">
                  💰 残高: {tokenInBalance ? Number(formatEther(tokenInBalance)).toLocaleString() : "0"}{" "}
                  {TOKEN_INFO[tokenIn].symbol}
                </div>
              </div>
            </div>

            {/* スワップボタン */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="icon"
                onClick={handleSwapTokens}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 border-0 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 text-white"
              >
                <ArrowUpDown className="h-5 w-5" />
              </Button>
            </div>

            {/* To トークン */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-white">購入トークン</Label>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex space-x-4 mb-4">
                  <Select
                    value={tokenOut}
                    onValueChange={(value: TokenKey) => setTokenOut(value)}
                  >
                    <SelectTrigger className="w-40 h-12 bg-white/10 border-white/20 text-white rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="TokenA" className="text-white hover:bg-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🟡</span>
                          {TOKEN_INFO.TokenA.symbol}
                        </div>
                      </SelectItem>
                      <SelectItem value="TokenB" className="text-white hover:bg-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🔵</span>
                          {TOKEN_INFO.TokenB.symbol}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={calculatedAmountOut}
                    readOnly
                    className="flex-1 h-12 text-xl text-white bg-white/5 border-white/10 rounded-xl placeholder:text-gray-400"
                  />
                </div>
                <div className="text-sm text-gray-300 bg-black/20 px-3 py-2 rounded-lg">
                  💰 残高: {tokenOutBalance ? Number(formatEther(tokenOutBalance)).toLocaleString() : "0"}{" "}
                  {TOKEN_INFO[tokenOut].symbol}
                </div>
              </div>
            </div>

            {/* スリッページ設定 */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-white">スリッページ許容度</Label>
              <div className="flex space-x-3">
                {["0.5", "1", "3"].map((value) => (
                  <Button
                    key={value}
                    variant={slippage === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSlippage(value)}
                    className={`h-10 px-4 rounded-xl transition-all duration-200 ${
                      slippage === value
                        ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
                        : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                    }`}
                  >
                    {value}%
                  </Button>
                ))}
                <Input
                  type="number"
                  placeholder="カスタム"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="w-24 h-10 bg-white/10 border-white/20 text-white rounded-xl placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* レート情報 */}
            {rate > 0 && (
              <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 backdrop-blur-sm p-6 rounded-2xl border border-emerald-400/20">
                <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  取引情報
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-white">
                    <span className="text-gray-300">レート</span>
                    <span className="font-semibold">
                      1 {TOKEN_INFO[tokenIn].symbol} = {rate.toFixed(6)}{" "}
                      {TOKEN_INFO[tokenOut].symbol}
                    </span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span className="text-gray-300">最小受取量</span>
                    <span className="font-semibold">
                      {Number(amountOutMin).toFixed(6)}{" "}
                      {TOKEN_INFO[tokenOut].symbol}
                    </span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span className="text-gray-300">スリッページ</span>
                    <span className="font-semibold">{slippage}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* 実行ボタン */}
            {!address ? (
              <Button className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-gray-500 to-gray-600 text-white" disabled>
                🔐 ウォレットを接続してください
              </Button>
            ) : needsApproval ? (
              <Button
                className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                onClick={handleApprove}
                disabled={isApproving || !amountIn || Number(amountIn) <= 0}
              >
                <div className="flex items-center justify-center gap-3">
                  {isApproving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      <span>承認中...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">✅</span>
                      <span>{TOKEN_INFO[tokenIn].symbol}を承認</span>
                    </>
                  )}
                </div>
              </Button>
            ) : (
              <Button
                className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                onClick={handleSwap}
                disabled={
                  isSwapping ||
                  !amountIn ||
                  Number(amountIn) <= 0 ||
                  !calculatedAmountOut ||
                  Number(calculatedAmountOut) <= 0
                }
              >
                <div className="flex items-center justify-center gap-3">
                  {isSwapping ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      <span>スワップ中...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">🚀</span>
                      <span>スワップ実行</span>
                    </>
                  )}
                </div>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
