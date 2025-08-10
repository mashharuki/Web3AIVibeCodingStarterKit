import { useCallback, useState } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

/**
 * トースト通知を管理するカスタムフック
 * フェーズ3.2: トランザクションフィードバックの強化
 */
export const useToast = () => {
  const [state, setState] = useState<ToastState>({
    toasts: [],
  });

  /**
   * トーストを追加
   */
  const dismissToast = useCallback((id: string) => {
    setState(prev => ({
      toasts: prev.toasts.filter(t => t.id !== id),
    }));
  }, []);

  const toast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000,
    };

    setState(prev => ({
      toasts: [...prev.toasts, newToast],
    }));

    // 自動削除タイマー
    const duration = newToast.duration;
    if (duration && duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, [dismissToast]);

  /**
   * トーストを削除
   */

  /**
   * すべてのトーストを削除
   */
  const dismissAll = useCallback(() => {
    setState({ toasts: [] });
  }, []);

  /**
   * 成功トースト
   */
  const success = useCallback((title: string, description?: string) => {
    return toast({ title, description, type: 'success' });
  }, [toast]);

  /**
   * エラートースト
   */
  const error = useCallback((title: string, description?: string) => {
    return toast({ title, description, type: 'error', duration: 8000 });
  }, [toast]);

  /**
   * 警告トースト
   */
  const warning = useCallback((title: string, description?: string) => {
    return toast({ title, description, type: 'warning' });
  }, [toast]);

  /**
   * 情報トースト
   */
  const info = useCallback((title: string, description?: string) => {
    return toast({ title, description, type: 'info' });
  }, [toast]);

  return {
    toasts: state.toasts,
    toast,
    success,
    error,
    warning,
    info,
    dismiss: dismissToast,
    dismissAll,
  };
};
