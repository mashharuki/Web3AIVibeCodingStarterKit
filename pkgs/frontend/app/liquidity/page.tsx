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
  } = useOptimalLiquidityAmount(pairAddress as `0x${string}`, amountA, amountB, baseToken);

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
  }, [optimalAmountA, optimalAmountB, needsCalculation, isCalculating, baseToken, amountA, amountB]);

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
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            💧 流動性管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">流動性追加</TabsTrigger>
              <TabsTrigger value="remove">流動性削除</TabsTrigger>
            </TabsList>

            {/* 流動性追加タブ */}
            <TabsContent value="add" className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* TokenA選択と入力 */}
                  <div className="space-y-2">
                    <Label>トークンA</Label>
                    <Select
                      value={tokenA}
                      onValueChange={(value) =>
                        setTokenA(value as keyof typeof contracts.tokens)
                      }
                    >
                      <SelectTrigger>
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
                      value={amountA}
                      onChange={(e) => handleAmountAChange(e.target.value)}
                      disabled={isCalculating}
                    />
                    <p className="text-sm text-gray-600">
                      残高:{" "}
                      {tokenABalance.data
                        ? formatEther(tokenABalance.data)
                        : "0"}{" "}
                      {TOKEN_INFO[tokenA].symbol}
                      {baseToken === "A" && (
                        <span className="ml-2 text-blue-600 font-medium">
                          (基準)
                        </span>
                      )}
                    </p>
                  </div>

                  {/* TokenB選択と入力 */}
                  <div className="space-y-2">
                    <Label>トークンB</Label>
                    <Select
                      value={tokenB}
                      onValueChange={(value) =>
                        setTokenB(value as keyof typeof contracts.tokens)
                      }
                    >
                      <SelectTrigger>
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
                      value={amountB}
                      onChange={(e) => handleAmountBChange(e.target.value)}
                      disabled={isCalculating}
                    />
                    <p className="text-sm text-gray-600">
                      残高:{" "}
                      {tokenBBalance.data
                        ? formatEther(tokenBBalance.data)
                        : "0"}{" "}
                      {TOKEN_INFO[tokenB].symbol}
                      {baseToken === "B" && (
                        <span className="ml-2 text-blue-600 font-medium">
                          (基準)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* 最適量計算情報とローディング */}
                {isCalculating && (
                  <div className="p-4 bg-yellow-50 rounded-lg flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600" />
                    <p className="text-yellow-700 font-medium">最適量を計算中...</p>
                  </div>
                )}

                {hasError && error && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-red-700 font-medium">❌ エラー: {error.message || "計算に失敗しました"}</p>
                  </div>
                )}

                {!isCalculating && !hasError && needsCalculation && reserveA && reserveB && (
                  <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                    <h4 className="font-medium text-blue-900">📊 プール情報</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>現在のリザーブ: {reserveA.toFixed(6)} TKA / {reserveB.toFixed(6)} TKB</p>
                      <p>プール比率: 1 TKA = {(reserveB / reserveA).toFixed(6)} TKB</p>
                      <p className="font-medium">
                        最適量: {Number(optimalAmountA).toFixed(6)} TKA / {Number(optimalAmountB).toFixed(6)} TKB
                      </p>
                      <p className="text-xs text-blue-600">
                        💡 {baseToken === "A" ? "TokenA" : "TokenB"}を基準にして自動計算されました
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleAddLiquidity}
                  className="w-full"
                  disabled={
                    !address ||
                    !amountA ||
                    !amountB ||
                    isAddingLiquidity ||
                    isApprovingA ||
                    isApprovingB
                  }
                >
                  {isApprovingA
                    ? `${TOKEN_INFO[tokenA].symbol}を承認中...`
                    : isApprovingB
                      ? `${TOKEN_INFO[tokenB].symbol}を承認中...`
                      : isAddingLiquidity
                        ? "流動性追加中..."
                        : "流動性を追加"}
                </Button>
              </div>
            </TabsContent>

            {/* 流動性削除タブ */}
            <TabsContent value="remove" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>削除するLPトークン量</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={lpAmount}
                    onChange={(e) => setLpAmount(e.target.value)}
                  />
                  <p className="text-sm text-gray-600">
                    LP残高:{" "}
                    {lpTokenBalance.data
                      ? formatEther(lpTokenBalance.data)
                      : "0"}
                  </p>
                </div>

                {/* ペア情報表示 */}
                {pairInfo.reserves && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">ペア情報</h3>
                    <p className="text-sm">
                      {TOKEN_INFO[tokenA].symbol}:{" "}
                      {formatEther(pairInfo.reserves[0])}
                    </p>
                    <p className="text-sm">
                      {TOKEN_INFO[tokenB].symbol}:{" "}
                      {formatEther(pairInfo.reserves[1])}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleRemoveLiquidity}
                  className="w-full"
                  variant="destructive"
                  disabled={
                    !address ||
                    !lpAmount ||
                    isRemovingLiquidity ||
                    isApprovingLP
                  }
                >
                  {isApprovingLP
                    ? "LPトークンを承認中..."
                    : isRemovingLiquidity
                      ? "流動性削除中..."
                      : "流動性を削除"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
