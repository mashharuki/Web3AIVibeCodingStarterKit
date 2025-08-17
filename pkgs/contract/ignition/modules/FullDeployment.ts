import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";
import DEXFactoryModule from "./DEXFactory";
import DEXRouterModule from "./DEXRouter";
import TestTokenAModule from "./TestTokenA";
import TestTokenBModule from "./TestTokenB";
import TestTokenFaucetModule from "./TestTokenFaucet";

/**
 * Full deployment module that orchestrates all contract deployments
 * and performs initial setup including pair creation and faucet configuration
 */
const FullDeploymentModule = buildModule("FullDeploymentModule", (m) => {
  // Deploy all core contracts
  const { factory } = m.useModule(DEXFactoryModule);
  const { router } = m.useModule(DEXRouterModule);
  const { testTokenA } = m.useModule(TestTokenAModule);
  const { testTokenB } = m.useModule(TestTokenBModule);
  const { testTokenFaucet } = m.useModule(TestTokenFaucetModule);

  // Get deployer account
  const deployer = m.getAccount(0);

  // Create initial token pair
  m.call(factory, "createPair", [testTokenA, testTokenB], {
    id: "createInitialPair",
  });

  // Set up faucet with tokens
  const faucetTokenLimit = parseEther("1000"); // 1000 tokens per request
  
  m.call(
    testTokenFaucet,
    "addToken",
    [testTokenA, faucetTokenLimit],
    {
      id: "addTokenAToFaucet",
    }
  );

  m.call(
    testTokenFaucet,
    "addToken",
    [testTokenB, faucetTokenLimit],
    {
      id: "addTokenBToFaucet",
    }
  );

  // Mint tokens to faucet for distribution
  const faucetSupply = parseEther("1000000"); // 1M tokens for faucet

  m.call(
    testTokenA,
    "mint",
    [testTokenFaucet, faucetSupply],
    {
      id: "mintTokenAToFaucet",
    }
  );

  m.call(
    testTokenB,
    "mint",
    [testTokenFaucet, faucetSupply],
    {
      id: "mintTokenBToFaucet",
    }
  );

  // Mint some tokens to deployer for initial liquidity
  const deployerSupply = parseEther("100000"); // 100K tokens for deployer

  m.call(
    testTokenA,
    "mint",
    [deployer, deployerSupply],
    {
      id: "mintTokenAToDeployer",
    }
  );

  m.call(
    testTokenB,
    "mint",
    [deployer, deployerSupply],
    {
      id: "mintTokenBToDeployer",
    }
  );

  return {
    // Core contracts
    factory,
    router,
    testTokenA,
    testTokenB,
    testTokenFaucet,
  };
});

export default FullDeploymentModule;