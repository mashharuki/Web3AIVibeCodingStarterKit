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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TOKEN_INFO, getCurrentContracts } from "@/config/contracts";
import {
  useAddLiquidity,
  useLPTokenBalance,
  useOptimalLiquidityAmount,
  usePairInfo,
  useRemoveLiquidity,
} from "@/hooks/useLiquidity";
import {
  useTokenAllowance,
  useTokenApproval,
  useTokenBalance,
} from "@/hooks/useSwap";
import { useCallback, useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";

/**
 * 流動性管理画面コンポーネント
 */
export default function LiquidityPage() {
  const { address } = useAccount();
  const contracts = getCurrentContracts();

  // タブの状態
  const [activeTab, setActiveTab] = useState("add");

  // 流動性追加の状態
  const [tokenA, setTokenA] = useState<keyof typeof contracts.tokens>("TokenA");
  const [tokenB, setTokenB] = useState<keyof typeof contracts.tokens>("TokenB");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");

  // 流動性削除の状態
  const [lpAmount, setLpAmount] = useState("");

  // フック
  const {
    addLiquidity,
    isPending: isAddingLiquidity,
    currentStep: addStep,
    setCurrentStep: setAddStep,
  } = useAddLiquidity();
  const {
    removeLiquidity,
    isPending: isRemovingLiquidity,
    currentStep: removeStep,
    setCurrentStep: setRemoveStep,
  } = useRemoveLiquidity();
  const { approve: approveTokenA, isPending: isApprovingA } =
    useTokenApproval();
  const { approve: approveTokenB, isPending: isApprovingB } =
    useTokenApproval();
  const { approve: approveLPToken, isPending: isApprovingLP } =
    useTokenApproval();

  // トークン残高
  const tokenABalance = useTokenBalance(contracts.tokens[tokenA], address);
  const tokenBBalance = useTokenBalance(contracts.tokens[tokenB], address);

  // ペア情報
  const pairAddress =
    tokenA !== tokenB
      ? contracts.pairs[
          `${tokenA}-${tokenB}` as keyof typeof contracts.pairs
        ] ||
        contracts.pairs[`${tokenB}-${tokenA}` as keyof typeof contracts.pairs]
      : undefined;
  const lpTokenBalance = useLPTokenBalance(
    pairAddress as `0x${string}`,
    address
  );
  const pairInfo = usePairInfo(pairAddress as `0x${string}`);

  // 最適量計算とベーストークンの状態
  const [baseToken, setBaseToken] = useState<"A" | "B">("A");

  const {
    optimalAmountA,
    optimalAmountB,
    needsCalculation,
    reserveA,
    reserveB,
    ratio,
    isCalculating,
    hasError,
    error,
  } = useOptimalLiquidityAmount(
    pairAddress as `0x${string}`,
    amountA,
    amountB,
    baseToken
  );

  // 承認状況
  const allowanceA = useTokenAllowance(
    contracts.tokens[tokenA],
    address,
    contracts.dex.DexRouter
  );
  const allowanceB = useTokenAllowance(
    contracts.tokens[tokenB],
    address,
    contracts.dex.DexRouter
  );
  const lpAllowance = useTokenAllowance(
    pairAddress as `0x${string}`,
    address,
    contracts.dex.DexRouter
  );

  /**
   * 流動性追加を実行する
   */
  const handleAddLiquidity = useCallback(async () => {
    if (!address || !amountA || !amountB) return;

    // 最適量を使用
    const finalAmountA = needsCalculation ? optimalAmountA : amountA;
    const finalAmountB = needsCalculation ? optimalAmountB : amountB;

    console.log("流動性追加 - 計算された最適量:", {
      originalA: amountA,
      originalB: amountB,
      optimalA: finalAmountA,
      optimalB: finalAmountB,
      needsCalculation,
      reserveA,
      reserveB,
      ratio,
    });

    // 承認が必要かチェック
    const amountAWei = parseEther(finalAmountA);
    const amountBWei = parseEther(finalAmountB);

    // TokenAの承認チェック
    if ((allowanceA.data ?? BigInt(0)) < amountAWei) {
      setAddStep("approving-a");
      await approveTokenA(
        contracts.tokens[tokenA],
        contracts.dex.DexRouter,
        finalAmountA
      );
      return;
    }

    // TokenBの承認チェック
    if ((allowanceB.data ?? BigInt(0)) < amountBWei) {
      setAddStep("approving-b");
      await approveTokenB(
        contracts.tokens[tokenB],
        contracts.dex.DexRouter,
        finalAmountB
      );
      return;
    }

    // 流動性追加実行
    const amountAMin = (parseEther(finalAmountA) * BigInt(95)) / BigInt(100); // 5%スリッページ許容
    const amountBMin = (parseEther(finalAmountB) * BigInt(95)) / BigInt(100); // 5%スリッページ許容

    await addLiquidity(
      contracts.tokens[tokenA],
      contracts.tokens[tokenB],
      finalAmountA,
      finalAmountB,
      formatEther(amountAMin),
      formatEther(amountBMin),
      address
    );
  }, [
    address,
    amountA,
    amountB,
    needsCalculation,
    optimalAmountA,
    optimalAmountB,
    reserveA,
    reserveB,
    ratio,
    allowanceA.data,
    allowanceB.data,
    tokenA,
    tokenB,
    contracts.tokens,
    contracts.dex.DexRouter,
    setAddStep,
    approveTokenA,
    approveTokenB,
    addLiquidity,
  ]);

  /**
   * 流動性削除を実行する
   */
  const handleRemoveLiquidity = useCallback(async () => {
    if (!address || !lpAmount) return;

    // LP トークンの承認が必要かチェック
    const lpAmountWei = parseEther(lpAmount);

    if ((lpAllowance.data ?? BigInt(0)) < lpAmountWei) {
      setRemoveStep("approving-lp");
      await approveLPToken(
        pairAddress as `0x${string}`,
        contracts.dex.DexRouter,
        lpAmount
      );
      return;
    }

    // 最小受取量を計算（5%スリッページ許容）
    const amountAMin = "0"; // 簡略化のため0に設定
    const amountBMin = "0"; // 簡略化のため0に設定

    await removeLiquidity(
      contracts.tokens[tokenA],
      contracts.tokens[tokenB],
      lpAmount,
      amountAMin,
      amountBMin,
      address
    );
  }, [
    address,
    lpAmount,
    lpAllowance.data,
    pairAddress,
    contracts.dex.DexRouter,
    contracts.tokens,
    tokenA,
    tokenB,
    setRemoveStep,
    approveLPToken,
    removeLiquidity,
  ]);

  // 最適量の自動入力機能
  useEffect(() => {
    if (!needsCalculation || isCalculating) return;

    // TokenAがベースの場合、TokenBを自動更新
    if (baseToken === "A" && amountA && optimalAmountB !== amountB) {
      const numOptimalB = Number(optimalAmountB);
      if (!Number.isNaN(numOptimalB) && numOptimalB > 0) {
        setAmountB(numOptimalB.toFixed(8).replace(/\.?0+$/, ""));
      }
    }

    // TokenBがベースの場合、TokenAを自動更新
    if (baseToken === "B" && amountB && optimalAmountA !== amountA) {
      const numOptimalA = Number(optimalAmountA);
      if (!Number.isNaN(numOptimalA) && numOptimalA > 0) {
        setAmountA(numOptimalA.toFixed(8).replace(/\.?0+$/, ""));
      }
    }
  }, [
    optimalAmountA,
    optimalAmountB,
    needsCalculation,
    isCalculating,
    baseToken,
    amountA,
    amountB,
  ]);

  // TokenA入力時の処理
  const handleAmountAChange = useCallback((value: string) => {
    setAmountA(value);
    setBaseToken("A");
  }, []);

  // TokenB入力時の処理
  const handleAmountBChange = useCallback((value: string) => {
    setAmountB(value);
    setBaseToken("B");
  }, []);

  // 承認完了後の自動進行
  useEffect(() => {
    // TokenA承認完了後、TokenBをチェック
    if (addStep === "approving-a" && !isApprovingA) {
      const amountAWei = parseEther(amountA || "0");
      if ((allowanceA.data ?? BigInt(0)) >= amountAWei) {
        // TokenBの承認をチェック
        setTimeout(() => handleAddLiquidity(), 1000);
      }
    }
    // TokenB承認完了後、流動性追加を実行
    if (addStep === "approving-b" && !isApprovingB) {
      const amountBWei = parseEther(amountB || "0");
      if ((allowanceB.data ?? BigInt(0)) >= amountBWei) {
        setTimeout(() => handleAddLiquidity(), 1000);
      }
    }
  }, [
    addStep,
    isApprovingA,
    isApprovingB,
    allowanceA.data,
    allowanceB.data,
    amountA,
    amountB,
    handleAddLiquidity,
  ]);

  // LP承認完了後の自動進行
  useEffect(() => {
    if (removeStep === "approving-lp" && !isApprovingLP) {
      const lpAmountWei = parseEther(lpAmount || "0");
      if ((lpAllowance.data ?? BigInt(0)) >= lpAmountWei) {
        setTimeout(() => handleRemoveLiquidity(), 1000);
      }
    }
  }, [
    removeStep,
    isApprovingLP,
    lpAllowance.data,
    lpAmount,
    handleRemoveLiquidity,
  ]);

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto">
        {/* ヒーローセクション */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">流動性管理</h1>
          <p className="text-gray-300 text-lg">
            プールに流動性を提供して取引手数料を獲得
          </p>
        </div>

        {/* メインカード */}
        <Card className="backdrop-blur-sm bg-white/10 border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm rounded-2xl p-1 mb-8 border border-white/20">
                <TabsTrigger
                  value="add"
                  className="rounded-xl font-medium text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
                >
                  <span className="mr-2">➕</span>
                  流動性追加
                </TabsTrigger>
                <TabsTrigger
                  value="remove"
                  className="rounded-xl font-medium text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
                >
                  <span className="mr-2">➖</span>
                  流動性削除
                </TabsTrigger>
              </TabsList>

              {/* 流動性追加タブ */}
              <TabsContent value="add" className="space-y-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* TokenA選択と入力 */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold text-white">
                        トークンA
                      </Label>
                      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <Select
                          value={tokenA}
                          onValueChange={(value) =>
                            setTokenA(value as keyof typeof contracts.tokens)
                          }
                        >
                          <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white rounded-xl mb-4">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            <SelectItem
                              value="TokenA"
                              className="text-white hover:bg-gray-800"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🟡</span>
                                {TOKEN_INFO.TokenA.symbol}
                              </div>
                            </SelectItem>
                            <SelectItem
                              value="TokenB"
                              className="text-white hover:bg-gray-800"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🔵</span>
                                {TOKEN_INFO.TokenB.symbol}
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="0.0"
                            value={amountA}
                            onChange={(e) =>
                              handleAmountAChange(e.target.value)
                            }
                            disabled={isCalculating}
                            className="h-12 text-xl text-white bg-white/10 border-white/20 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 placeholder:text-gray-400"
                          />
                          {isCalculating && baseToken === "A" && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="text-sm text-gray-300 bg-black/20 px-3 py-1 rounded-lg">
                            💰 残高:{" "}
                            {tokenABalance.data
                              ? Number(
                                  formatEther(tokenABalance.data)
                                ).toLocaleString()
                              : "0"}{" "}
                            {TOKEN_INFO[tokenA].symbol}
                          </div>
                          {baseToken === "A" && (
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full font-medium text-xs border border-blue-400/30">
                              基準
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* TokenB選択と入力 */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold text-white">
                        トークンB
                      </Label>
                      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <Select
                          value={tokenB}
                          onValueChange={(value) =>
                            setTokenB(value as keyof typeof contracts.tokens)
                          }
                        >
                          <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white rounded-xl mb-4">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            <SelectItem
                              value="TokenA"
                              className="text-white hover:bg-gray-800"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🟡</span>
                                {TOKEN_INFO.TokenA.symbol}
                              </div>
                            </SelectItem>
                            <SelectItem
                              value="TokenB"
                              className="text-white hover:bg-gray-800"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🔵</span>
                                {TOKEN_INFO.TokenB.symbol}
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="0.0"
                            value={amountB}
                            onChange={(e) =>
                              handleAmountBChange(e.target.value)
                            }
                            disabled={isCalculating}
                            className="h-12 text-xl text-white bg-white/10 border-white/20 rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 placeholder:text-gray-400"
                          />
                          {isCalculating && baseToken === "B" && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="text-sm text-gray-300 bg-black/20 px-3 py-1 rounded-lg">
                            💰 残高:{" "}
                            {tokenBBalance.data
                              ? Number(
                                  formatEther(tokenBBalance.data)
                                ).toLocaleString()
                              : "0"}{" "}
                            {TOKEN_INFO[tokenB].symbol}
                          </div>
                          {baseToken === "B" && (
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full font-medium text-xs border border-purple-400/30">
                              基準
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 最適量計算情報とローディング */}
                  {isCalculating && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-400/20 p-6 backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 via-yellow-400/10 to-yellow-400/0 animate-pulse" />
                      <div className="relative flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-yellow-300 mb-1">
                            最適量を計算中...
                          </h4>
                          <p className="text-yellow-200 text-sm">
                            プールの現在比率を取得して最適な流動性量を算出しています
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasError && error && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-400/20 p-6 backdrop-blur-sm">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white text-xl">❌</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-red-300 mb-1">
                            計算エラー
                          </h4>
                          <p className="text-red-200 text-sm">
                            {error.message || "計算に失敗しました"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isCalculating &&
                    !hasError &&
                    needsCalculation &&
                    reserveA &&
                    reserveB && (
                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-400/20 p-6 backdrop-blur-sm">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 via-indigo-400/5 to-purple-400/5" />
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="text-white text-lg">📊</span>
                            </div>
                            <h4 className="text-xl font-bold text-white">
                              プール情報
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                              <div className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-1">
                                現在のリザーブ
                              </div>
                              <div className="text-sm font-bold text-white">
                                {reserveA.toFixed(4)} TKA /{" "}
                                {reserveB.toFixed(4)} TKB
                              </div>
                            </div>

                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                              <div className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-1">
                                プール比率
                              </div>
                              <div className="text-sm font-bold text-white">
                                1 TKA = {(reserveB / reserveA).toFixed(6)} TKB
                              </div>
                            </div>

                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                              <div className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-1">
                                計算基準
                              </div>
                              <div className="text-sm font-bold text-white">
                                Token{baseToken} ベース
                              </div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl p-4 border border-emerald-400/30">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-emerald-300 text-lg">
                                ✨
                              </span>
                              <span className="font-semibold text-emerald-200">
                                最適流動性量
                              </span>
                            </div>
                            <div className="text-lg font-bold text-white">
                              {Number(optimalAmountA).toFixed(6)} TKA /{" "}
                              {Number(optimalAmountB).toFixed(6)} TKB
                            </div>
                            <div className="text-xs text-emerald-300 mt-1">
                              💡 {baseToken === "A" ? "TokenA" : "TokenB"}
                              を基準として自動計算されました
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  <Button
                    onClick={handleAddLiquidity}
                    className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                    disabled={
                      !address ||
                      !amountA ||
                      !amountB ||
                      isAddingLiquidity ||
                      isApprovingA ||
                      isApprovingB
                    }
                  >
                    <div className="flex items-center justify-center gap-3">
                      {isApprovingA ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          <span>{TOKEN_INFO[tokenA].symbol}を承認中...</span>
                        </>
                      ) : isApprovingB ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          <span>{TOKEN_INFO[tokenB].symbol}を承認中...</span>
                        </>
                      ) : isAddingLiquidity ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          <span>流動性追加中...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xl">💧</span>
                          <span>流動性を追加</span>
                        </>
                      )}
                    </div>
                  </Button>
                </div>
              </TabsContent>

              {/* 流動性削除タブ */}
              <TabsContent value="remove" className="space-y-6">
                <div className="space-y-6">
                  {/* LP入力エリア */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-800">
                      削除するLPトークン量
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={lpAmount}
                        onChange={(e) => setLpAmount(e.target.value)}
                        className="h-16 text-xl text-center bg-gray-50/50 border-2 border-gray-200 rounded-2xl focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all duration-200"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg inline-block">
                        💰 LP残高:{" "}
                        {lpTokenBalance.data
                          ? formatEther(lpTokenBalance.data)
                          : "0"}
                      </p>
                    </div>
                  </div>

                  {/* ペア情報表示 */}
                  {pairInfo.reserves && (
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-2xl border border-red-100">
                      <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                        <span className="text-xl">📊</span>
                        プール情報
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/70 p-4 rounded-xl">
                          <div className="text-xs text-gray-500 mb-1">
                            {TOKEN_INFO[tokenA].symbol}
                          </div>
                          <div className="text-lg font-bold text-gray-800">
                            {Number(
                              formatEther(pairInfo.reserves[0])
                            ).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-white/70 p-4 rounded-xl">
                          <div className="text-xs text-gray-500 mb-1">
                            {TOKEN_INFO[tokenB].symbol}
                          </div>
                          <div className="text-lg font-bold text-gray-800">
                            {Number(
                              formatEther(pairInfo.reserves[1])
                            ).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleRemoveLiquidity}
                    className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                    disabled={
                      !address ||
                      !lpAmount ||
                      isRemovingLiquidity ||
                      isApprovingLP
                    }
                  >
                    <div className="flex items-center justify-center gap-3">
                      {isApprovingLP ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          <span>LPトークンを承認中...</span>
                        </>
                      ) : isRemovingLiquidity ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          <span>流動性削除中...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xl">🔥</span>
                          <span>流動性を削除</span>
                        </>
                      )}
                    </div>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
