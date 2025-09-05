"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWeb3 } from "@/hooks/useWeb3";
import { AlertTriangle, CheckCircle, Loader2, XCircle } from "lucide-react";

/**
 * Web3接続状態を表示するコンポーネント
 * 接続状態、ネットワーク状態、エラー状態を視覚的に表示
 */
export function ConnectionStatus() {
  const { isConnected, isConnecting, isCorrectNetwork, address, chainId, supportedChainName } =
    useWeb3();

  // ローディング状態
  if (isConnecting) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="text-blue-800">ウォレットに接続中...</AlertDescription>
      </Alert>
    );
  }

  // 未接続状態
  if (!isConnected) {
    return (
      <Alert className="border-gray-200 bg-gray-50">
        <XCircle className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-gray-800">
          ウォレットが接続されていません。上部の「ウォレットを接続」ボタンをクリックしてください。
        </AlertDescription>
      </Alert>
    );
  }

  // 間違ったネットワーク
  if (!isCorrectNetwork) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="space-y-2">
            <p>間違ったネットワークに接続されています。</p>
            <p className="text-sm">
              現在のネットワーク: Chain ID {chainId}
              <br />
              必要なネットワーク: {supportedChainName} (Chain ID {11155111})
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // 正常に接続済み
  return (
    <Alert className="border-green-200 bg-green-50">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <div className="space-y-1">
          <p>✅ {supportedChainName}ネットワークに接続済み</p>
          <p className="text-sm font-mono">
            アドレス: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
