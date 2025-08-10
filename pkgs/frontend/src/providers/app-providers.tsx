'use client';

import { ErrorWrapper } from '@/components/error-boundary';
import { PWAInstaller } from '@/components/pwa-installer';
import { ToastProvider } from '@/components/toast';
import type { ReactNode } from 'react';
import { PrivyProviders } from './privy-provider';
import { QueryProviders } from './query-provider';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * アプリケーション全体のプロバイダーを統合するコンポーネント
 * 認証、クエリ管理、通知などの機能を提供します。
 */
export function AppProviders({ children }: AppProvidersProps): ReactNode {
  return (
    <ErrorWrapper>
      <QueryProviders>
        <PrivyProviders>
          <ToastProvider>
            <PWAInstaller />
            {children}
          </ToastProvider>
        </PrivyProviders>
      </QueryProviders>
    </ErrorWrapper>
  );
}
