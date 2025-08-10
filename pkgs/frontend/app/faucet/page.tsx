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
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            🚰 Test Token Faucet
          </CardTitle>
          <p className="text-center text-gray-600">
            テスト用トークンを無料で取得できます（1日1回、100トークンまで）
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!address ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">ウォレットを接続してください</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* TokenA Faucet */}
              <div className="p-6 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {TOKEN_INFO.TokenA.name} ({TOKEN_INFO.TokenA.symbol})
                    </h3>
                    <p className="text-sm text-gray-600">
                      現在の残高:{" "}
                      {tokenABalance.data
                        ? formatEther(tokenABalance.data)
                        : "0"}{" "}
                      {TOKEN_INFO.TokenA.symbol}
                    </p>
                  </div>
                  <Button
                    onClick={faucetTokenA.requestTokens}
                    disabled={faucetTokenA.isPending}
                    className="min-w-[120px]"
                  >
                    {faucetTokenA.isPending ? "取得中..." : "100 TKA取得"}
                  </Button>
                </div>
              </div>

              {/* TokenB Faucet */}
              <div className="p-6 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {TOKEN_INFO.TokenB.name} ({TOKEN_INFO.TokenB.symbol})
                    </h3>
                    <p className="text-sm text-gray-600">
                      現在の残高:{" "}
                      {tokenBBalance.data
                        ? formatEther(tokenBBalance.data)
                        : "0"}{" "}
                      {TOKEN_INFO.TokenB.symbol}
                    </p>
                  </div>
                  <Button
                    onClick={faucetTokenB.requestTokens}
                    disabled={faucetTokenB.isPending}
                    className="min-w-[120px]"
                  >
                    {faucetTokenB.isPending ? "取得中..." : "100 TKB取得"}
                  </Button>
                </div>
              </div>

              {/* 注意事項 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">
                  📝 注意事項
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 各トークンは1日1回まで取得可能です</li>
                  <li>• 1回につき100トークンが取得できます</li>
                  <li>• これらはテスト用トークンで、実際の価値はありません</li>
                  <li>• Sepoliaテストネット上でのみ利用可能です</li>
                </ul>
              </div>

              {/* コントラクトアドレス情報 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">
                  📋 コントラクトアドレス
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">
                      {TOKEN_INFO.TokenA.symbol}:
                    </span>
                    <code className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                      {contracts.tokens.TokenA}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">
                      {TOKEN_INFO.TokenB.symbol}:
                    </span>
                    <code className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
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
  );
}
