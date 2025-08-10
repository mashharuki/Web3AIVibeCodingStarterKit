"use client";

import { showTransactionToast } from "@/components/ui/TransactionNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOKEN_INFO, getCurrentContracts } from "@/config/contracts";
import { useTokenBalance } from "@/hooks/useSwap";
import { ERC20_ABI } from "@/utils/abi";
import { useEffect } from "react";
import { formatEther } from "viem";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

/**
 * Faucet機能のフック
 */
function useFaucet(tokenAddress: `0x${string}`) {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract({
    mutation: {
      onSuccess: (hash) => {
        console.log("Faucet transaction hash:", hash);
      },
      onError: (error) => {
        console.error("Faucet error:", error);
        showTransactionToast.error(error.message || "Faucetに失敗しました");
      },
    },
  });
  const {
    isLoading: isConfirming,
    isSuccess,
    isError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const requestTokens = () => {
    showTransactionToast.loading("トークンをリクエスト中...");

    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "faucet",
      args: [],
    });
  };

  // トランザクションの状態変化を監視
  useEffect(() => {
    if (hash && isSuccess) {
      showTransactionToast.success(hash, "トークンの取得が完了しました！");
    } else if (isError || error) {
      showTransactionToast.error("Faucetトランザクションが失敗しました");
    }
  }, [hash, isSuccess, isError, error]);

  return {
    requestTokens,
    isPending: isPending || isConfirming,
    hash,
    isSuccess,
  };
}

/**
 * Faucetページコンポーネント
 */
export default function FaucetPage() {
  const { address } = useAccount();
  const contracts = getCurrentContracts();

  // フック
  const faucetTokenA = useFaucet(contracts.tokens.TokenA);
  const faucetTokenB = useFaucet(contracts.tokens.TokenB);

  // トークン残高
  const tokenABalance = useTokenBalance(contracts.tokens.TokenA, address);
  const tokenBBalance = useTokenBalance(contracts.tokens.TokenB, address);

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto">
        {/* ヒーローセクション */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            テストトークン Faucet
          </h1>
          <p className="text-gray-300 text-lg">
            DeFiテスト用トークンを無料で取得
          </p>
        </div>

        {/* メインカード */}
        <Card className="backdrop-blur-sm bg-white/10 border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            {!address ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔐</span>
                </div>
                <p className="text-white text-lg mb-6">ウォレットを接続してください</p>
                <div className="text-gray-400">
                  Faucetを利用するにはウォレット接続が必要です
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* TokenA Faucet */}
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-sm p-8 rounded-2xl border border-yellow-400/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">🟡</span>
                        <h3 className="text-xl font-bold text-white">
                          {TOKEN_INFO.TokenA.name} ({TOKEN_INFO.TokenA.symbol})
                        </h3>
                      </div>
                      <div className="bg-black/20 px-4 py-3 rounded-xl">
                        <p className="text-gray-300 text-sm mb-1">現在の残高</p>
                        <p className="text-white text-lg font-bold">
                          {tokenABalance.data
                            ? Number(formatEther(tokenABalance.data)).toLocaleString()
                            : "0"}{" "}
                          {TOKEN_INFO.TokenA.symbol}
                        </p>
                      </div>
                    </div>
                    <div className="ml-6">
                      <Button
                        onClick={faucetTokenA.requestTokens}
                        disabled={faucetTokenA.isPending}
                        className="h-14 px-8 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl text-white font-bold rounded-xl disabled:opacity-50 disabled:transform-none"
                      >
                        <div className="flex items-center gap-3">
                          {faucetTokenA.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                              <span>取得中...</span>
                            </>
                          ) : (
                            <>
                              <span className="text-lg">💰</span>
                              <span>100 TKA取得</span>
                            </>
                          )}
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* TokenB Faucet */}
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm p-8 rounded-2xl border border-blue-400/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">🔵</span>
                        <h3 className="text-xl font-bold text-white">
                          {TOKEN_INFO.TokenB.name} ({TOKEN_INFO.TokenB.symbol})
                        </h3>
                      </div>
                      <div className="bg-black/20 px-4 py-3 rounded-xl">
                        <p className="text-gray-300 text-sm mb-1">現在の残高</p>
                        <p className="text-white text-lg font-bold">
                          {tokenBBalance.data
                            ? Number(formatEther(tokenBBalance.data)).toLocaleString()
                            : "0"}{" "}
                          {TOKEN_INFO.TokenB.symbol}
                        </p>
                      </div>
                    </div>
                    <div className="ml-6">
                      <Button
                        onClick={faucetTokenB.requestTokens}
                        disabled={faucetTokenB.isPending}
                        className="h-14 px-8 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl text-white font-bold rounded-xl disabled:opacity-50 disabled:transform-none"
                      >
                        <div className="flex items-center gap-3">
                          {faucetTokenB.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                              <span>取得中...</span>
                            </>
                          ) : (
                            <>
                              <span className="text-lg">💰</span>
                              <span>100 TKB取得</span>
                            </>
                          )}
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 注意事項 */}
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm p-6 rounded-2xl border border-cyan-400/20">
                  <h4 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                    <span className="text-xl">📝</span>
                    重要な注意事項
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-cyan-200">
                        <span className="text-sm">⏰</span>
                        <span className="text-sm">各トークンは1日1回まで取得可能</span>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-200">
                        <span className="text-sm">💎</span>
                        <span className="text-sm">1回につき100トークンが取得可能</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-cyan-200">
                        <span className="text-sm">🧪</span>
                        <span className="text-sm">テスト用トークン（実際の価値なし）</span>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-200">
                        <span className="text-sm">🔗</span>
                        <span className="text-sm">Sepoliaテストネット専用</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* コントラクトアドレス情報 */}
                <div className="bg-gradient-to-br from-gray-500/10 to-slate-500/10 backdrop-blur-sm p-6 rounded-2xl border border-gray-400/20">
                  <h4 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                    <span className="text-xl">📋</span>
                    コントラクトアドレス
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-black/20 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🟡</span>
                        <span className="font-semibold text-white">
                          {TOKEN_INFO.TokenA.symbol}:
                        </span>
                      </div>
                      <code className="text-xs text-gray-300 bg-black/30 px-3 py-2 rounded-lg block break-all">
                        {contracts.tokens.TokenA}
                      </code>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🔵</span>
                        <span className="font-semibold text-white">
                          {TOKEN_INFO.TokenB.symbol}:
                        </span>
                      </div>
                      <code className="text-xs text-gray-300 bg-black/30 px-3 py-2 rounded-lg block break-all">
                        {contracts.tokens.TokenB}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
