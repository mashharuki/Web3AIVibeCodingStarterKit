'use client';

import { useEffect } from 'react';

/**
 * PWAサービスワーカーを登録するコンポーネント
 */
export function PWAInstaller(): null {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // サービスワーカーの登録
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
          
          // 更新チェック
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 新しいバージョンが利用可能
                  console.log('New content is available; please refresh.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log('ServiceWorker registration failed: ', error);
        });

      // インストールプロンプトのハンドリング
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let deferredPrompt: Event | null = null;

      const handleBeforeInstallPrompt = (e: Event) => {
        // インストールプロンプトを延期
        e.preventDefault();
        deferredPrompt = e;
        
        // カスタムインストールボタンを表示する場合の処理
        // showInstallButton();
        console.log('Install prompt is ready');
      };

      const handleAppInstalled = () => {
        console.log('PWA was installed');
        deferredPrompt = null;
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      // クリーンアップ
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  return null;
}
