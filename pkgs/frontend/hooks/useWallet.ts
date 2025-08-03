'use client';

import { createWalletClientFromPrivy } from '@/lib/web3';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import type { WalletClient } from 'viem';

export function useWallet() {
  const { user, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const setupWallet = async () => {
      if (authenticated && wallets.length > 0) {
        try {
          // 埋め込みウォレットを取得
          const wallet = wallets.find(w => w.walletClientType === 'privy');
          if (wallet) {
            const provider = await wallet.getEthereumProvider();
            if (provider) {
              const client = createWalletClientFromPrivy(provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> });
              setWalletClient(client);
            }
          }
        } catch (error) {
          console.error('ウォレット設定エラー:', error);
        }
      } else {
        setWalletClient(null);
      }
    };

    setupWallet();
  }, [authenticated, wallets]);

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

  // walletsからアドレスを取得
  const address = wallets.length > 0 ? wallets[0].address : undefined;

  return {
    user,
    authenticated,
    walletClient,
    address,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
}
