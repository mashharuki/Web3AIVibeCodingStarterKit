"use client";

import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";
import { sepolia } from "wagmi/chains";

/**
 * Web3接続状態を管理するカスタムフック
 * ウォレット接続、ネットワーク状態、アカウント情報を提供
 */
export function useWeb3() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Sepoliaネットワークに接続しているかチェック
  const isCorrectNetwork = chainId === sepolia.id;

  // 接続状態の詳細情報
  const connectionStatus = {
    isConnected,
    isConnecting: isConnecting || isReconnecting || isPending,
    isCorrectNetwork,
    address,
    chainId,
  };

  // 利用可能なコネクター
  const availableConnectors = connectors;

  return {
    // 接続状態
    ...connectionStatus,

    // アクション
    connect,
    disconnect,

    // コネクター
    connectors: availableConnectors,

    // ネットワーク情報
    supportedChainId: sepolia.id,
    supportedChainName: sepolia.name,
  };
}
