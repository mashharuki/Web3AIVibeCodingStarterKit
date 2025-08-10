/**
 * デプロイされたコントラクトのアドレス設定
 */

export const CONTRACTS = {
  // Sepolia テストネット
  sepolia: {
    tokens: {
      TokenA: "0x9987f02c5AFaa19Acd07C2d9D3b440518e3280D1" as const,
      TokenB: "0x2ED83286F3eA4953f29fBBd09490e6A32E26F512" as const,
    },
    dex: {
      DexFactory: "0x1c71Bc825B7569c9FD5b7528EBC03A4d2919AdD4" as const,
      DexRouter: "0x72800394D5e9C4a0Df5AAb2ce8D6351eF898c66d" as const,
    },
    pairs: {
      "TokenA-TokenB": "0x6483FF87EDdFc48116AF78a94CDF67d82Ce0290c" as const,
    },
  },
} as const;

/**
 * 現在の環境で使用するコントラクトアドレス
 */
export const getCurrentContracts = () => {
  // 本番では環境変数やチェーンIDで切り替える
  return CONTRACTS.sepolia;
};

/**
 * トークン情報
 */
export const TOKEN_INFO = {
  TokenA: {
    symbol: "TKA",
    name: "TokenA",
    decimals: 18,
  },
  TokenB: {
    symbol: "TKB",
    name: "TokenB",
    decimals: 18,
  },
} as const;

/**
 * サポートするチェーン
 */
export const SUPPORTED_CHAINS = {
  sepolia: {
    id: 11155111,
    name: "Sepolia",
    network: "sepolia",
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    rpcUrls: {
      default: {
        http: ["https://rpc.sepolia.org"],
      },
      public: {
        http: ["https://rpc.sepolia.org"],
      },
    },
    blockExplorers: {
      default: {
        name: "Etherscan",
        url: "https://sepolia.etherscan.io",
      },
    },
  },
} as const;
