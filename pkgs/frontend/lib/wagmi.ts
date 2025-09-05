import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { sepolia } from "wagmi/chains";

// Sepoliaネットワークの設定
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const fallbackRpc = "https://rpc.sepolia.org"; // CORS対応の公開RPC
const rpcUrl = alchemyKey
  ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
  : fallbackRpc;

export const config = getDefaultConfig({
  appName: "AMM DEX",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id", // 開発用フォールバック
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(rpcUrl),
  },
  ssr: true, // Next.jsのSSRサポート
});

// Sepoliaネットワークの詳細設定
export const sepoliaNetwork = {
  id: 11155111,
  name: "Sepolia",
  network: "sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
  },
  rpcUrls: {
    public: { http: [rpcUrl] },
    default: { http: [rpcUrl] },
  },
  blockExplorers: {
    etherscan: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
    default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
  },
  testnet: true,
} as const;
