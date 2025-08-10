import { create } from "zustand";

/**
 * UI状態の型定義
 */
interface UIState {
  // モーダル状態
  isSwapModalOpen: boolean;
  isLiquidityModalOpen: boolean;
  isTransactionModalOpen: boolean;

  // トランザクション状態
  transactionStatus: "idle" | "pending" | "success" | "error";
  transactionHash?: string;
  transactionError?: string;

  // UI操作
  setSwapModalOpen: (open: boolean) => void;
  setLiquidityModalOpen: (open: boolean) => void;
  setTransactionModalOpen: (open: boolean) => void;

  // トランザクション操作
  setTransactionStatus: (
    status: "idle" | "pending" | "success" | "error"
  ) => void;
  setTransactionHash: (hash?: string) => void;
  setTransactionError: (error?: string) => void;
  resetTransaction: () => void;
}

/**
 * UI状態のストア
 */
export const useUIStore = create<UIState>((set) => ({
  // 初期状態
  isSwapModalOpen: false,
  isLiquidityModalOpen: false,
  isTransactionModalOpen: false,
  transactionStatus: "idle",
  transactionHash: undefined,
  transactionError: undefined,

  // UI操作
  setSwapModalOpen: (open: boolean) => set({ isSwapModalOpen: open }),
  setLiquidityModalOpen: (open: boolean) => set({ isLiquidityModalOpen: open }),
  setTransactionModalOpen: (open: boolean) =>
    set({ isTransactionModalOpen: open }),

  // トランザクション操作
  setTransactionStatus: (status) => set({ transactionStatus: status }),
  setTransactionHash: (hash) => set({ transactionHash: hash }),
  setTransactionError: (error) => set({ transactionError: error }),
  resetTransaction: () =>
    set({
      transactionStatus: "idle",
      transactionHash: undefined,
      transactionError: undefined,
    }),
}));

/**
 * DEX データ状態の型定義
 */
interface DEXDataState {
  // トークン残高
  tokenABalance?: bigint;
  tokenBBalance?: bigint;
  lpTokenBalance?: bigint;

  // プール情報
  reserveA?: bigint;
  reserveB?: bigint;
  totalSupply?: bigint;

  // スワップ情報
  swapRate?: number;
  priceImpact?: number;

  // データ更新
  setTokenBalances: (
    tokenA?: bigint,
    tokenB?: bigint,
    lpToken?: bigint
  ) => void;
  setPoolData: (
    reserveA?: bigint,
    reserveB?: bigint,
    totalSupply?: bigint
  ) => void;
  setSwapData: (rate?: number, impact?: number) => void;
  clearData: () => void;
}

/**
 * DEX データのストア
 */
export const useDEXDataStore = create<DEXDataState>((set) => ({
  // 初期状態
  tokenABalance: undefined,
  tokenBBalance: undefined,
  lpTokenBalance: undefined,
  reserveA: undefined,
  reserveB: undefined,
  totalSupply: undefined,
  swapRate: undefined,
  priceImpact: undefined,

  // データ更新
  setTokenBalances: (tokenA, tokenB, lpToken) =>
    set({
      tokenABalance: tokenA,
      tokenBBalance: tokenB,
      lpTokenBalance: lpToken,
    }),
  setPoolData: (reserveA, reserveB, totalSupply) =>
    set({
      reserveA,
      reserveB,
      totalSupply,
    }),
  setSwapData: (rate, impact) =>
    set({
      swapRate: rate,
      priceImpact: impact,
    }),
  clearData: () =>
    set({
      tokenABalance: undefined,
      tokenBBalance: undefined,
      lpTokenBalance: undefined,
      reserveA: undefined,
      reserveB: undefined,
      totalSupply: undefined,
      swapRate: undefined,
      priceImpact: undefined,
    }),
}));
