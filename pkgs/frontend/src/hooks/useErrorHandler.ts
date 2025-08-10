import { useToast } from '@/hooks/useToast';
import { useCallback } from 'react';

export interface ErrorInfo {
  message: string;
  code?: string | number;
  details?: unknown;
  timestamp: Date;
}

/**
 * アプリケーション全体のエラーハンドリングフック
 */
export function useErrorHandler() {
  const { error: showErrorToast } = useToast();

  const handleError = useCallback((error: unknown, context?: string) => {
    console.error('Error occurred:', error, 'Context:', context);

    let errorMessage = 'An unexpected error occurred';
    let errorCode: string | number | undefined;

    // エラーの種類に応じてメッセージを設定
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Web3エラーの処理
      if (error.message.includes('User denied transaction')) {
        errorMessage = 'Transaction was cancelled by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network connection error. Please check your connection';
      } else if (error.message.includes('MetaMask')) {
        errorMessage = 'Please check your wallet connection';
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      // API エラーレスポンスの処理
      const errorObj = error as Record<string, unknown>;
      if (typeof errorObj.message === 'string') {
        errorMessage = errorObj.message;
      }
      if (typeof errorObj.code === 'string' || typeof errorObj.code === 'number') {
        errorCode = errorObj.code;
      }
      if (errorObj.status === 404) {
        errorMessage = 'Resource not found';
      } else if (errorObj.status === 403) {
        errorMessage = 'Access denied';
      } else if (errorObj.status === 500) {
        errorMessage = 'Server error. Please try again later';
      }
    }

    // コンテキスト情報を追加
    if (context) {
      errorMessage = `${context}: ${errorMessage}`;
    }

    // エラー情報を作成
    const errorInfo: ErrorInfo = {
      message: errorMessage,
      code: errorCode,
      details: error,
      timestamp: new Date(),
    };

    // トーストでエラーを表示
    showErrorToast('Error', errorMessage);

    // エラーログを保存（開発環境でのみ）
    if (process.env.NODE_ENV === 'development') {
      const errorLog = {
        ...errorInfo,
        userAgent: navigator.userAgent,
        url: window.location.href,
      };
      localStorage.setItem(
        `error_${Date.now()}`,
        JSON.stringify(errorLog)
      );
    }

    return errorInfo;
  }, [showErrorToast]);

  const handleAsyncError = useCallback(async (
    asyncOperation: () => Promise<unknown>,
    context?: string
  ) => {
    try {
      return await asyncOperation();
    } catch (error) {
      handleError(error, context);
      throw error; // re-throw to allow caller to handle if needed
    }
  }, [handleError]);

  const clearErrorLogs = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('error_'));
      for (const key of keys) {
        localStorage.removeItem(key);
      }
    }
  }, []);

  const getErrorLogs = useCallback((): ErrorInfo[] => {
    if (process.env.NODE_ENV !== 'development') return [];
    
    const keys = Object.keys(localStorage).filter(key => key.startsWith('error_'));
    return keys.map(key => {
      try {
        return JSON.parse(localStorage.getItem(key) || '');
      } catch {
        return null;
      }
    }).filter(Boolean);
  }, []);

  return {
    handleError,
    handleAsyncError,
    clearErrorLogs,
    getErrorLogs,
  };
}
