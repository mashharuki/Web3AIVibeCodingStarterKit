"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";

/**
 * ネットワーク切り替えコンポーネント
 * Sepoliaネットワークへの切り替えを促すUI
 */
export function NetworkSwitcher() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();

  // ウォレットが接続されていない場合は何も表示しない
  if (!isConnected) {
    return null;
  }

  // 正しいネットワーク（Sepolia）に接続済みの場合
  if (chainId === sepolia.id) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Sepoliaテストネットに接続済みです
        </AlertDescription>
      </Alert>
    );
  }

  // 間違ったネットワークに接続している場合
  return (
    <div className="space-y-4">
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          このDEXはSepoliaテストネットワークでのみ動作します。 ネットワークを切り替えてください。
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-2">
        <Button
          onClick={() => switchChain({ chainId: sepolia.id })}
          disabled={isPending}
          className="flex items-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              切り替え中...
            </>
          ) : (
            <>Sepoliaネットワークに切り替え</>
          )}
        </Button>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              ネットワークの切り替えに失敗しました: {error.message}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="text-sm text-gray-600 space-y-2">
        <p>
          <strong>Sepoliaネットワーク情報:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>ネットワーク名: Sepolia</li>
          <li>チェーンID: 11155111</li>
          <li>RPC URL: https://eth-sepolia.g.alchemy.com/v2/[API_KEY]</li>
          <li>ブロックエクスプローラー: https://sepolia.etherscan.io</li>
        </ul>
      </div>
    </div>
  );
}
