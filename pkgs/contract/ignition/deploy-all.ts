#!/usr/bin/env ts-node

import { ignition, network } from "hardhat";
import {
    backupDeploymentData,
    generateDeploymentSummary,
    getNetworkConfig,
    resetContractAddressesJson,
    validateNetwork,
    writeContractAddress,
} from "../helpers/contractsJsonHelper";
import FullDeploymentModule from "./modules/FullDeployment";

/**
 * Universal deployment script using Hardhat Ignition
 * Works with any configured network (hardhat, localhost, sepolia, etc.)
 */
async function main() {
  console.log("🚀 Starting deployment with Hardhat Ignition...");
  
  // Validate network
  if (!validateNetwork(network.name)) {
    console.warn(`⚠️  Network ${network.name} is not in the predefined list, but proceeding anyway...`);
  }
  
  const networkConfig = getNetworkConfig(network.name);
  console.log(`📡 Deploying to: ${network.name} (Chain ID: ${networkConfig?.chainId || "unknown"})`);
  
  // Backup existing deployment data (skip for hardhat network)
  if (network.name !== "hardhat") {
    try {
      const backupPath = backupDeploymentData(network.name);
      console.log(`📦 Backup created: ${backupPath}`);
    } catch (error) {
      console.log("ℹ️  No existing deployment data to backup");
    }
    
    // Reset deployment file for fresh deployment
    resetContractAddressesJson(network.name);
  }
  
  console.log("\n📋 Deployment Plan:");
  console.log("1. Deploy DEXFactory");
  console.log("2. Deploy TestTokenA");
  console.log("3. Deploy TestTokenB");
  console.log("4. Deploy TestTokenFaucet");
  console.log("5. Deploy DEXRouter");
  console.log("6. Create initial token pair");
  console.log("7. Configure faucet with tokens");
  console.log("8. Mint tokens for testing");
  
  try {
    // Deploy all contracts using Ignition
    console.log("\n🔥 Executing Ignition deployment...");
    
    const deploymentOptions: any = {};
    
    // Use CREATE2 for deterministic addresses on testnets/mainnet
    if (network.name !== "hardhat" && network.name !== "localhost") {
      deploymentOptions.strategy = "create2";
      deploymentOptions.strategyConfig = {
        salt: "0x0000000000000000000000000000000000000000000000000000000000000001",
      };
    }
    
    const deploymentResult = await ignition.deploy(FullDeploymentModule, deploymentOptions);
    
    console.log("✅ Ignition deployment completed successfully!");
    
    // Extract deployed contract addresses
    const {
      factory,
      router,
      testTokenA,
      testTokenB,
      testTokenFaucet,
    } = deploymentResult;
    
    // Save contract addresses using helper (skip for hardhat network)
    if (network.name !== "hardhat") {
      console.log("\n💾 Saving contract addresses...");
      
      writeContractAddress({
        group: "contracts",
        name: "DEXFactory",
        value: await factory.getAddress(),
        network: network.name,
      });
      
      writeContractAddress({
        group: "contracts",
        name: "DEXRouter",
        value: await router.getAddress(),
        network: network.name,
      });
      
      writeContractAddress({
        group: "contracts",
        name: "TestTokenA",
        value: await testTokenA.getAddress(),
        network: network.name,
      });
      
      writeContractAddress({
        group: "contracts",
        name: "TestTokenB",
        value: await testTokenB.getAddress(),
        network: network.name,
      });
      
      writeContractAddress({
        group: "contracts",
        name: "TestTokenFaucet",
        value: await testTokenFaucet.getAddress(),
        network: network.name,
      });
    }
    
    // Verify deployment by checking contract states
    console.log("\n🔍 Verifying deployment...");
    
    // Check factory state
    const factoryOwner = await factory.owner();
    const factoryPairsLength = await factory.allPairsLength();
    console.log(`Factory owner: ${factoryOwner}`);
    console.log(`Factory pairs count: ${factoryPairsLength}`);
    
    // Check router state
    const routerFactory = await router.factory();
    console.log(`Router factory: ${routerFactory}`);
    
    // Check token states
    const tokenAName = await testTokenA.name();
    const tokenASymbol = await testTokenA.symbol();
    const tokenATotalSupply = await testTokenA.totalSupply();
    console.log(`TokenA: ${tokenAName} (${tokenASymbol}) - Supply: ${tokenATotalSupply}`);
    
    const tokenBName = await testTokenB.name();
    const tokenBSymbol = await testTokenB.symbol();
    const tokenBTotalSupply = await testTokenB.totalSupply();
    console.log(`TokenB: ${tokenBName} (${tokenBSymbol}) - Supply: ${tokenBTotalSupply}`);
    
    // Check faucet state
    const faucetOwner = await testTokenFaucet.owner();
    const tokenALimit = await testTokenFaucet.getTokenLimit(await testTokenA.getAddress());
    const tokenBLimit = await testTokenFaucet.getTokenLimit(await testTokenB.getAddress());
    console.log(`Faucet owner: ${faucetOwner}`);
    console.log(`Faucet TokenA limit: ${tokenALimit}`);
    console.log(`Faucet TokenB limit: ${tokenBLimit}`);
    
    // Check if pair was created
    const pairAddress = await factory.getPair(
      await testTokenA.getAddress(),
      await testTokenB.getAddress()
    );
    console.log(`Created pair address: ${pairAddress}`);
    
    if (pairAddress === "0x0000000000000000000000000000000000000000") {
      console.warn("⚠️  Warning: Token pair was not created successfully");
    } else {
      console.log("✅ Token pair created successfully");
      
      // Save pair address (skip for hardhat network)
      if (network.name !== "hardhat") {
        writeContractAddress({
          group: "pairs",
          name: "TokenA-TokenB",
          value: pairAddress,
          network: network.name,
        });
      }
    }
    
    // Display contract addresses
    console.log("\n📋 Deployed Contract Addresses:");
    console.log(`DEXFactory: ${await factory.getAddress()}`);
    console.log(`DEXRouter: ${await router.getAddress()}`);
    console.log(`TestTokenA: ${await testTokenA.getAddress()}`);
    console.log(`TestTokenB: ${await testTokenB.getAddress()}`);
    console.log(`TestTokenFaucet: ${await testTokenFaucet.getAddress()}`);
    if (pairAddress !== "0x0000000000000000000000000000000000000000") {
      console.log(`TokenA-TokenB Pair: ${pairAddress}`);
    }
    
    // Generate and display deployment summary (skip for hardhat network)
    if (network.name !== "hardhat") {
      const summary = generateDeploymentSummary(network.name);
      console.log(summary);
    }
    
    console.log(`\n🎉 ${network.name} deployment completed successfully!`);
    
    // Network-specific next steps
    if (network.name === "sepolia") {
      if (networkConfig?.blockExplorer) {
        console.log("\n🔍 Verify contracts on Etherscan:");
        console.log(`DEXFactory: ${networkConfig.blockExplorer}/address/${await factory.getAddress()}`);
        console.log(`DEXRouter: ${networkConfig.blockExplorer}/address/${await router.getAddress()}`);
        console.log(`TestTokenA: ${networkConfig.blockExplorer}/address/${await testTokenA.getAddress()}`);
        console.log(`TestTokenB: ${networkConfig.blockExplorer}/address/${await testTokenB.getAddress()}`);
        console.log(`TestTokenFaucet: ${networkConfig.blockExplorer}/address/${await testTokenFaucet.getAddress()}`);
        if (pairAddress !== "0x0000000000000000000000000000000000000000") {
          console.log(`TokenA-TokenB Pair: ${networkConfig.blockExplorer}/address/${pairAddress}`);
        }
      }
      
      console.log("\n📝 Next steps:");
      console.log("1. Verify contracts on Etherscan using: npx hardhat verify --network sepolia <address>");
      console.log("2. Test contract functionality using Hardhat tasks");
      console.log("3. Update frontend configuration with deployed addresses");
    } else if (network.name === "localhost") {
      console.log("\n📝 Next steps:");
      console.log("1. Test contract functionality using Hardhat tasks");
      console.log("2. Run frontend against local deployment");
      console.log("3. Use deployed addresses in your dApp");
    } else if (network.name === "hardhat") {
      console.log("\n📝 Next steps:");
      console.log("1. Use these addresses in your tests");
      console.log("2. Test contract functionality");
    }
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes("insufficient funds")) {
        console.error("\n💡 Tip: Make sure your account has enough ETH");
        if (network.name === "sepolia") {
          console.error("Get Sepolia ETH from: https://sepoliafaucet.com/");
        }
      } else if (error.message.includes("nonce")) {
        console.error("\n💡 Tip: Try resetting your MetaMask account or wait a few minutes");
      } else if (error.message.includes("gas")) {
        console.error("\n💡 Tip: Try increasing gas limit or gas price");
      } else if (error.message.includes("revert")) {
        console.error("\n💡 Tip: Check contract constructor parameters and requirements");
      }
    }
    
    throw error;
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment script failed:", error);
      process.exit(1);
    });
}

export default main;