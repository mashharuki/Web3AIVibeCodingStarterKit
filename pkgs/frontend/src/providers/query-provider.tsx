'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import { useState } from 'react';

interface QueryProvidersProps {
  children: ReactNode;
}

/**
 * TanStack Queryを使用したサーバー状態管理プロバイダー
 * 非同期データの取得とキャッシュ管理を行います。
 */
export function QueryProviders({ children }: QueryProvidersProps): ReactNode {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5分間データをフレッシュとして扱う
            gcTime: 1000 * 60 * 60 * 24, // 24時間キャッシュを保持
            retry: (failureCount, error) => {
              // ネットワークエラーの場合は最大3回リトライ
              if (error instanceof Error && error.message.includes('network')) {
                return failureCount < 3;
              }
              // その他のエラーは1回だけリトライ
              return failureCount < 1;
            },
            refetchOnWindowFocus: false, // ウィンドウフォーカス時の自動再フェッチを無効化
            refetchOnMount: 'always', // マウント時は必ず再フェッチ
          },
          mutations: {
            retry: false, // Mutationはリトライしない
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 開発環境でのみReact Query DevToolsを表示 */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
