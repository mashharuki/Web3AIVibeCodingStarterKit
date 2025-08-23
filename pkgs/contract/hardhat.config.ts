import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-ignition-ethers";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import "./tasks";

dotenv.config();

const { PRIVATE_KEY, ALCHEMY_API_KEY, COINMARKETCAP_API_KEY, ETHERSCAN_API_KEY, GAS_REPORT } =
  process.env;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.30",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: 31337,
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY ?? "",
    },
  },
  gasReporter: {
    enabled: GAS_REPORT !== undefined,
    currency: "USD",
    token: "ETH",
    coinmarketcap: COINMARKETCAP_API_KEY,
    gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
    showTimeSpent: true,
    showMethodSig: true,
  },
  ignition: {
    maxFeeBumps: 1,
    blockPollingInterval: 1_500,
    chainSpecific: {
      sepolia: {
        maxFeeBumps: 1,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
  sourcify: {
    enabled: true,
  },
};

export default config;
