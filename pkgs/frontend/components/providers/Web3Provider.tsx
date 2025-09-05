"use client";

import { config } from "@/lib/wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

// React Queryクライアントの作成
const queryClient = new QueryClient();

interface Web3ProviderProps {
  children: React.ReactNode;
}

/**
 * Web3統合のためのプロバイダーコンポーネント
 * wagmi、RainbowKit、React Queryを統合してWeb3機能を提供
 */
export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
