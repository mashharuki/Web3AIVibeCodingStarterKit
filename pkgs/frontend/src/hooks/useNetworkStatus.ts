'use client';

import { useEffect, useState } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

// Network Information API の型定義
interface NetworkConnection {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkConnection;
  mozConnection?: NetworkConnection;
  webkitConnection?: NetworkConnection;
}

/**
 * ネットワーク接続状態を監視するフック
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateNetworkStatus = () => {
      const status: NetworkStatus = {
        isOnline: navigator.onLine,
      };

      // Network Information API がサポートされている場合
      if ('connection' in navigator) {
        const navWithConnection = navigator as NavigatorWithConnection;
        const connection = navWithConnection.connection || 
                          navWithConnection.mozConnection || 
                          navWithConnection.webkitConnection;
        
        if (connection) {
          status.connectionType = connection.type;
          status.effectiveType = connection.effectiveType;
          status.downlink = connection.downlink;
          status.rtt = connection.rtt;
        }
      }

      setNetworkStatus(status);
    };

    // 初期状態の設定
    updateNetworkStatus();

    // イベントリスナーの設定
    const handleOnline = () => {
      console.log('Network: Online');
      updateNetworkStatus();
    };

    const handleOffline = () => {
      console.log('Network: Offline');
      updateNetworkStatus();
    };

    const handleConnectionChange = () => {
      console.log('Network: Connection changed');
      updateNetworkStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API のイベントリスナー
    if ('connection' in navigator) {
      const navWithConnection = navigator as NavigatorWithConnection;
      const connection = navWithConnection.connection;
      if (connection) {
        connection.addEventListener('change', handleConnectionChange);
      }
    }

    // クリーンアップ
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const navWithConnection = navigator as NavigatorWithConnection;
        const connection = navWithConnection.connection;
        if (connection) {
          connection.removeEventListener('change', handleConnectionChange);
        }
      }
    };
  }, []);

  return networkStatus;
}

/**
 * オフライン状態でのユーザー体験向上のためのフック
 */
export function useOfflineSupport() {
  const networkStatus = useNetworkStatus();
  const [pendingActions, setPendingActions] = useState<Array<{
    id: string;
    action: () => Promise<void>;
    description: string;
    timestamp: Date;
  }>>([]);

  // オンラインに復帰した時に保留中のアクションを実行
  useEffect(() => {
    if (networkStatus.isOnline && pendingActions.length > 0) {
      console.log('Network restored. Executing pending actions...');
      
      // 保留中のアクションを順次実行
      const executePendingActions = async () => {
        for (const pendingAction of pendingActions) {
          try {
            await pendingAction.action();
            console.log(`Executed pending action: ${pendingAction.description}`);
          } catch (error) {
            console.error(`Failed to execute pending action: ${pendingAction.description}`, error);
          }
        }
        setPendingActions([]);
      };

      executePendingActions();
    }
  }, [networkStatus.isOnline, pendingActions]);

  const addPendingAction = (
    action: () => Promise<void>,
    description: string
  ) => {
    const id = Date.now().toString();
    setPendingActions(prev => [...prev, {
      id,
      action,
      description,
      timestamp: new Date(),
    }]);
    return id;
  };

  const removePendingAction = (id: string) => {
    setPendingActions(prev => prev.filter(action => action.id !== id));
  };

  return {
    networkStatus,
    pendingActions,
    addPendingAction,
    removePendingAction,
  };
}
