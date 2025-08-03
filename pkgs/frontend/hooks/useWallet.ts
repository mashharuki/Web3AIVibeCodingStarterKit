'use client';

import { createWalletClientFromPrivy } from '@/lib/web3';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import type { WalletClient } from 'viem';

// Privyウォレット型の拡張
interface PrivyWallet {
  address: string;
  getEthereumProvider: () => Promise<unknown>;
}

export function useWallet() {
  const { user, authenticated, login, logout } = usePrivy();
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const setupWallet = async () => {
      if (authenticated && user?.wallet?.address) {
        try {
          // Privyからウォレットプロバイダーを取得
          const wallet = user.wallet as unknown as PrivyWallet;
          const provider = await wallet.getEthereumProvider();
          if (provider) {
            const client = createWalletClientFromPrivy(provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> });
            setWalletClient(client);
          }
        } catch (error) {
          console.error('ウォレット設定エラー:', error);
        }
      } else {
        setWalletClient(null);
      }
    };

    setupWallet();
  }, [authenticated, user]);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      await login();
    } catch (error) {
      console.error('ウォレット接続エラー:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await logout();
      setWalletClient(null);
    } catch (error) {
      console.error('ウォレット切断エラー:', error);
    }
  };

  return {
    user,
    authenticated,
    walletClient,
    address: user?.wallet?.address,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
}
