// コントラクト設定
export const CONTRACT_ADDRESSES = {
  NFT_CONTRACT: "0xEaC471E00787e7360E08C0b9a98BF0160302353e" as const,
  MARKETPLACE_CONTRACT: "0x9C6a56fBBef7EFD2b8dbC5F7DA8a261E00862d51" as const,
} as const;

// チェーン設定
export const CHAIN_CONFIG = {
  SEPOLIA: {
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
        http: ["https://sepolia.infura.io/v3/"],
      },
      public: {
        http: ["https://sepolia.infura.io/v3/"],
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

// NFTメタデータの型定義
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

// NFTの型定義
export interface NFT {
  tokenId: string;
  contractAddress: string;
  owner: string;
  creator: string;
  tokenURI: string;
  metadata?: NFTMetadata;
  isListed: boolean;
  price?: string;
  listingId?: string;
}

// マーケットプレイス出品の型定義
export interface Listing {
  listingId: string;
  seller: string;
  nftContract: string;
  tokenId: string;
  price: string;
  active: boolean;
  listingTime: number;
}

// オファーの型定義
export interface Offer {
  offerId: string;
  bidder: string;
  nftContract: string;
  tokenId: string;
  amount: string;
  expiration: number;
  active: boolean;
}

// 販売履歴の型定義
export interface SaleHistory {
  seller: string;
  buyer: string;
  nftContract: string;
  tokenId: string;
  price: string;
  timestamp: number;
}
