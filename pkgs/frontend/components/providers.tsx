'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // PrivyのApp IDが設定されていない場合はProviderなしで表示
  const appId = process.env.NEXT_PUBLIC_APP_ID;
  
  if (!mounted) {
    return <div>{children}</div>;
  }

  // App IDが未設定の場合はPrivy Providerを使わずに表示
  if (!appId) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </ThemeProvider>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // 認証設定
        loginMethods: ['email', 'wallet', 'farcaster', 'google'],
        appearance: {
          theme: 'light',
          accentColor: '#8B5CF6',
          logo: '/logo.png',
        },
        // Web3設定
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        // 法的設定
        legal: {
          termsAndConditionsUrl: '/terms',
          privacyPolicyUrl: '/privacy',
        },
      }}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </ThemeProvider>
    </PrivyProvider>
  );
}
