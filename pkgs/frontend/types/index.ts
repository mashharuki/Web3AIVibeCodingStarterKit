// 基本的な型定義

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  chainId: number;
}

export interface Pool {
  address: string;
  token0: Token;
  token1: Token;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  fee: number; // 0.3% = 3000
  volume24h: string;
  tvl: string;
  apr: number;
}

export interface Position {
  poolAddress: string;
  pool: Pool;
  liquidity: string;
  token0Amount: string;
  token1Amount: string;
  unclaimedFees0: string;
  unclaimedFees1: string;
}

export interface Transaction {
  hash: string;
  type: "swap" | "add_liquidity" | "remove_liquidity" | "faucet_request";
  status: "pending" | "confirmed" | "failed";
  timestamp: number;
  from: string;
  to?: string;
  tokens: {
    tokenIn?: Token;
    tokenOut?: Token;
    amountIn?: string;
    amountOut?: string;
  };
  gasUsed?: string;
  gasPrice?: string;
}

export interface FaucetRequest {
  user: string;
  token: Token;
  amount: string;
  timestamp: number;
  status: "pending" | "completed" | "failed";
  nextRequestTime: number;
}

export interface FaucetConfig {
  token: Token;
  dailyLimit: string;
  requestCooldown: number; // seconds
  isActive: boolean;
}

// Web3関連の型
export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
}

export interface ContractAddresses {
  factory: string;
  router: string;
  faucet: string;
  testTokenA: string;
  testTokenB: string;
}

// UI関連の型
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}
