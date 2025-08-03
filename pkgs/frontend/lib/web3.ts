import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from "viem/chains";

// EthereumProvider型の定義
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

// Public client for reading blockchain data
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

// Wallet client factory (will be created with user's wallet)
export const createWalletClientFromPrivy = (provider: EthereumProvider) => {
  return createWalletClient({
    chain: sepolia,
    transport: custom(provider),
  });
};

// Utility functions for Web3 operations
export const formatEther = (wei: bigint): string => {
  return (Number(wei) / 1e18).toString();
};

export const parseEther = (ether: string): bigint => {
  return BigInt(Math.floor(Number.parseFloat(ether) * 1e18));
};

export const truncateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatPrice = (price: string): string => {
  const num = Number.parseFloat(price);
  if (num === 0) return "0";
  if (num < 0.001) return "< 0.001";
  return num.toFixed(3);
};
