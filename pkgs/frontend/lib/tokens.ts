/**
 * Sepolia テストネットワーク上のトークン設定
 * AMM DEX で使用する ERC20 トークンの定義
 */

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

/**
 * Sepolia ネットワーク上の対象トークン
 */
export const SEPOLIA_TOKENS: Record<string, Token> = {
  USDC: {
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoURI: "/tokens/usdc.svg",
  },
  JPYC: {
    address: "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB",
    symbol: "JPYC",
    name: "JPY Coin",
    decimals: 18,
    logoURI: "/tokens/jpyc.png",
  },
  PYUSD: {
    address: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
    symbol: "PYUSD",
    name: "PayPal USD",
    decimals: 6,
    logoURI: "/tokens/pyusd.png",
  },
} as const;

/**
 * トークンアドレスからトークン情報を取得
 */
export function getTokenByAddress(address: string): Token | undefined {
  return Object.values(SEPOLIA_TOKENS).find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * トークンシンボルからトークン情報を取得
 */
export function getTokenBySymbol(symbol: string): Token | undefined {
  return SEPOLIA_TOKENS[symbol.toUpperCase()];
}

/**
 * 全てのトークンリストを取得
 */
export function getAllTokens(): Token[] {
  return Object.values(SEPOLIA_TOKENS);
}

/**
 * トークンペアの組み合わせを生成
 */
export function getTokenPairs(): Array<[Token, Token]> {
  const tokens = getAllTokens();
  const pairs: Array<[Token, Token]> = [];

  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      pairs.push([tokens[i], tokens[j]]);
    }
  }

  return pairs;
}

/**
 * デフォルトトークンペア（USDC/JPYC）
 */
export const DEFAULT_TOKEN_PAIR: [Token, Token] = [SEPOLIA_TOKENS.USDC, SEPOLIA_TOKENS.JPYC];

/**
 * トークンアドレスのバリデーション
 */
export function isValidTokenAddress(address: string): boolean {
  return Object.values(SEPOLIA_TOKENS).some(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
}
