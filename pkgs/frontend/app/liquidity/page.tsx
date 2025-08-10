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

    // 承認が必要かチェック
    const amountAWei = parseEther(amountA);
    const amountBWei = parseEther(amountB);

    // TokenAの承認チェック
    if ((allowanceA.data ?? BigInt(0)) < amountAWei) {
      setAddStep("approving-a");
      await approveTokenA(
        contracts.tokens[tokenA],
        contracts.dex.DexRouter,
        amountA
      );
      return;
    }

    // TokenBの承認チェック
    if ((allowanceB.data ?? BigInt(0)) < amountBWei) {
      setAddStep("approving-b");
      await approveTokenB(
        contracts.tokens[tokenB],
        contracts.dex.DexRouter,
        amountB
      );
      return;
    }

    // 流動性追加実行
    const amountAMin = (parseEther(amountA) * BigInt(95)) / BigInt(100); // 5%スリッページ許容
    const amountBMin = (parseEther(amountB) * BigInt(95)) / BigInt(100); // 5%スリッページ許容

    await addLiquidity(
      contracts.tokens[tokenA],
      contracts.tokens[tokenB],
      amountA,
      amountB,
      formatEther(amountAMin),
      formatEther(amountBMin),
      address
    );
  }, [
    address,
    amountA,
    amountB,
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
                      onChange={(e) => setAmountA(e.target.value)}
                    />
                    <p className="text-sm text-gray-600">
                      残高:{" "}
                      {tokenABalance.data
                        ? formatEther(tokenABalance.data)
                        : "0"}{" "}
                      {TOKEN_INFO[tokenA].symbol}
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
                      onChange={(e) => setAmountB(e.target.value)}
                    />
                    <p className="text-sm text-gray-600">
                      残高:{" "}
                      {tokenBBalance.data
                        ? formatEther(tokenBBalance.data)
                        : "0"}{" "}
                      {TOKEN_INFO[tokenB].symbol}
                    </p>
                  </div>
                </div>

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
