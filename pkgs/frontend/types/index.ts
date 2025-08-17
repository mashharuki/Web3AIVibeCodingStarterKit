// Token型定義
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  chainId: number;
}

// Pool型定義
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

// Transaction型定義
export interface Transaction {
  hash: string;
  type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'faucet_request';
  status: 'pending' | 'confirmed' | 'failed';
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

// Faucet型定義
export interface FaucetRequest {
  user: string;
  token: Token;
  amount: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  nextRequestTime: number;
}

export interface FaucetConfig {
  token: Token;
  dailyLimit: string;
  requestCooldown: number; // seconds
  isActive: boolean;
}