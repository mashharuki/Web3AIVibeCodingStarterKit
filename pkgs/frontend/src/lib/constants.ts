// ブロックチェーン設定
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 11155111; // Sepolia testnet
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';

// スマートコントラクトアドレス
export const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as `0x${string}`;
export const MARKETPLACE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS as `0x${string}`;

// Privy設定
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID as string;

// Biconomy設定
export const BICONOMY_BUNDLER_URL = process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL as string;
export const BICONOMY_PAYMASTER_API_KEY = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY as string;

// IPFS設定
export const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY as string;
export const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY as string;
export const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT as string;

// アプリケーション設定
export const APP_NAME = 'NFT Marketplace';
export const APP_DESCRIPTION = 'Web3技術を活用したNFTマーケットプレイス';

// ページネーション設定
export const ITEMS_PER_PAGE = 12;

// トランザクション設定
export const TRANSACTION_TIMEOUT_MS = 300000; // 5分

// 価格フォーマット設定
export const PRICE_DECIMALS = 4;
