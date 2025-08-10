'use client';

import { PRIVY_APP_ID } from '@/lib/constants';
import { PrivyProvider } from '@privy-io/react-auth';
import type { ReactNode } from 'react';

interface PrivyProvidersProps {
  children: ReactNode;
}

/**
 * Privyを使用したWeb3認証プロバイダー
 * ユーザーの認証とウォレット管理を行います。
 */
export function PrivyProviders({ children }: PrivyProvidersProps): ReactNode {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // UI設定
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          logo: '/logo.png',
        },
        // 認証方法の設定
        loginMethods: ['email', 'wallet', 'google', 'twitter'],
        // 埋め込みウォレットの設定
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        // デフォルトチェーンの設定
        defaultChain: {
          id: 11155111, // Sepolia testnet
          name: 'Sepolia',
          network: 'sepolia',
          nativeCurrency: {
            decimals: 18,
            name: 'Ethereum',
            symbol: 'ETH',
          },
          rpcUrls: {
            default: {
              http: ['https://eth-sepolia.g.alchemy.com/v2/demo'],
            },
            public: {
              http: ['https://eth-sepolia.g.alchemy.com/v2/demo'],
            },
          },
          blockExplorers: {
            default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
          },
        },
        supportedChains: [
          {
            id: 11155111,
            name: 'Sepolia',
            network: 'sepolia',
            nativeCurrency: {
              decimals: 18,
              name: 'Ethereum',
              symbol: 'ETH',
            },
            rpcUrls: {
              default: {
                http: ['https://eth-sepolia.g.alchemy.com/v2/demo'],
              },
              public: {
                http: ['https://eth-sepolia.g.alchemy.com/v2/demo'],
              },
            },
            blockExplorers: {
              default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
            },
          },
        ],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
