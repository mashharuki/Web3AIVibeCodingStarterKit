import "@nomicfoundation/hardhat-ethers";
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import 'hardhat-gas-reporter';
import 'hardhat-prettier';
import { HardhatUserConfig } from 'hardhat/config';
import 'solidity-coverage';
import './tasks';

// 環境変数の読み込み
const SEPOLIA_RPC_URL =
  process.env.SEPOLIA_RPC_URL ||
  'https://eth-sepolia.g.alchemy.com/v2/YOUR-PROJECT-ID';
const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  sourcify: {
    enabled: true,
  },
};

export default config;
