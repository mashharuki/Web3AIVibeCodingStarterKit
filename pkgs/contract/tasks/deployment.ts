import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../helpers/contractsJsonHelper";

// Helper function to verify contract deployment
async function verifyContract(hre: HardhatRuntimeEnvironment, address: string, contractName: string) {
  try {
    const contract = await hre.ethers.getContractAt(contractName, address);
    // Try to call a view function to verify the contract is deployed and working
    if (contractName === "DEXFactory") {
      await contract.allPairsLength();
    } else if (contractName === "DEXRouter") {
      await contract.factory();
    } else if (contractName === "TestTokenFaucet") {
      await contract.owner();
    } else if (contractName === "TestTokenA" || contractName === "TestTokenB") {
      await contract.name();
    }
    return true;
  } catch (error) {
    return false;
  }
}

task("deployment:verify", "Verify all deployed contracts")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const networkName = taskArgs.network || hre.network.name;
    
    console.log(`Verifying deployments on ${networkName}...`);
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      
      if (!addresses || !addresses.contracts) {
        console.log("❌ No deployment file found for this network");
        return;
      }
      
      const contracts = addresses.contracts;
      const results: { [key: string]: boolean } = {};
      
      console.log("\n=== Verification Results ===");
      
      // Verify each contract
      for (const [contractName, contractInfo] of Object.entries(contracts)) {
        if (contractInfo && contractInfo.address) {
          console.log(`Verifying ${contractName} at ${contractInfo.address}...`);
          const isValid = await verifyContract(hre, contractInfo.address, contractName);
          results[contractName] = isValid;
          
          if (isValid) {
            console.log(`✅ ${contractName}: Valid`);
          } else {
            console.log(`❌ ${contractName}: Invalid or not deployed`);
          }
        }
      }
      
      // Summary
      const totalContracts = Object.keys(results).length;
      const validContracts = Object.values(results).filter(Boolean).length;
      
      console.log("\n=== Summary ===");
      console.log(`Total contracts: ${totalContracts}`);
      console.log(`Valid contracts: ${validContracts}`);
      console.log(`Invalid contracts: ${totalContracts - validContracts}`);
      
      if (validContracts === totalContracts) {
        console.log("🎉 All contracts are valid!");
      } else {
        console.log("⚠️  Some contracts failed verification");
      }
      
    } catch (error) {
      console.error("❌ Error during verification:", error);
    }
  });

task("deployment:info", "Show deployment information")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const networkName = taskArgs.network || hre.network.name;
    
    console.log(`Deployment information for ${networkName}:`);
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      
      if (!addresses || !addresses.contracts) {
        console.log("❌ No deployment file found for this network");
        return;
      }
      
      const contracts = addresses.contracts;
      
      console.log("\n=== Deployed Contracts ===");
      
      for (const [contractName, contractInfo] of Object.entries(contracts)) {
        if (contractInfo && contractInfo.address) {
          console.log(`${contractName}: ${contractInfo.address}`);
          
          // Get additional info for each contract
          try {
            if (contractName === "DEXFactory") {
              const factory = await hre.ethers.getContractAt("DEXFactory", contractInfo.address);
              const pairsCount = await factory.allPairsLength();
              const owner = await factory.owner();
              console.log(`  - Owner: ${owner}`);
              console.log(`  - Total Pairs: ${pairsCount}`);
            } else if (contractName === "DEXRouter") {
              const router = await hre.ethers.getContractAt("DEXRouter", contractInfo.address);
              const factoryAddress = await router.factory();
              console.log(`  - Factory: ${factoryAddress}`);
            } else if (contractName === "TestTokenFaucet") {
              const faucet = await hre.ethers.getContractAt("TestTokenFaucet", contractInfo.address);
              const owner = await faucet.owner();
              const cooldown = await faucet.getCooldown();
              const supportedTokens = await faucet.getSupportedTokens();
              console.log(`  - Owner: ${owner}`);
              console.log(`  - Cooldown: ${cooldown} seconds`);
              console.log(`  - Supported Tokens: ${supportedTokens.length}`);
            } else if (contractName === "TestTokenA" || contractName === "TestTokenB") {
              const token = await hre.ethers.getContractAt("TestTokenA", contractInfo.address);
              const name = await token.name();
              const symbol = await token.symbol();
              const totalSupply = await token.totalSupply();
              console.log(`  - Name: ${name}`);
              console.log(`  - Symbol: ${symbol}`);
              console.log(`  - Total Supply: ${hre.ethers.formatEther(totalSupply)}`);
            }
          } catch (error) {
            console.log(`  - Error getting details: ${error}`);
          }
          
          console.log("");
        }
      }
      
    } catch (error) {
      console.error("❌ Error getting deployment info:", error);
    }
  });

task("deployment:status", "Check deployment status and health")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const networkName = taskArgs.network || hre.network.name;
    
    console.log(`Checking deployment status on ${networkName}...`);
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      
      if (!addresses || !addresses.contracts) {
        console.log("❌ No deployment file found for this network");
        return;
      }
      
      const contracts = addresses.contracts;
      
      // Check if all required contracts are deployed
      const requiredContracts = ["DEXFactory", "DEXRouter", "TestTokenFaucet", "TestTokenA", "TestTokenB"];
      const deployedContracts = Object.keys(contracts);
      
      console.log("\n=== Deployment Status ===");
      
      let allDeployed = true;
      for (const required of requiredContracts) {
        const isDeployed = deployedContracts.includes(required);
        console.log(`${required}: ${isDeployed ? "✅ Deployed" : "❌ Missing"}`);
        if (!isDeployed) allDeployed = false;
      }
      
      if (!allDeployed) {
        console.log("\n⚠️  Incomplete deployment detected");
        return;
      }
      
      console.log("\n=== Integration Status ===");
      
      // Check if factory and router are properly connected
      try {
        const factoryInfo = contracts.DEXFactory;
        const routerInfo = contracts.DEXRouter;
        
        if (factoryInfo && routerInfo) {
          const factory = await hre.ethers.getContractAt("DEXFactory", factoryInfo.address);
          const router = await hre.ethers.getContractAt("DEXRouter", routerInfo.address);
          
          const routerFactory = await router.factory();
          const isConnected = routerFactory.toLowerCase() === factoryInfo.address.toLowerCase();
          console.log(`Factory-Router Connection: ${isConnected ? "✅ Connected" : "❌ Disconnected"}`);
        }
      } catch (error) {
        console.log(`Factory-Router Connection: ❌ Error checking connection`);
      }
      
      // Check if faucet has tokens configured
      try {
        const faucetInfo = contracts.TestTokenFaucet;
        if (faucetInfo) {
          const faucet = await hre.ethers.getContractAt("TestTokenFaucet", faucetInfo.address);
          const supportedTokens = await faucet.getSupportedTokens();
          const hasTokens = supportedTokens.length > 0;
          console.log(`Faucet Configuration: ${hasTokens ? "✅ Configured" : "❌ No tokens configured"}`);
          
          if (hasTokens) {
            console.log(`  - Supported tokens: ${supportedTokens.length}`);
          }
        }
      } catch (error) {
        console.log(`Faucet Configuration: ❌ Error checking configuration`);
      }
      
      // Check if any pairs exist
      try {
        const factoryInfo = contracts.DEXFactory;
        if (factoryInfo) {
          const factory = await hre.ethers.getContractAt("DEXFactory", factoryInfo.address);
          const pairsCount = await factory.allPairsLength();
          console.log(`Trading Pairs: ${pairsCount > 0 ? `✅ ${pairsCount} pairs` : "⚠️  No pairs created"}`);
        }
      } catch (error) {
        console.log(`Trading Pairs: ❌ Error checking pairs`);
      }
      
      console.log("\n=== Overall Status ===");
      console.log("🎉 Deployment appears to be complete and healthy!");
      
    } catch (error) {
      console.error("❌ Error checking deployment status:", error);
    }
  });

task("deployment:setup-demo", "Setup demo environment with initial liquidity")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const networkName = taskArgs.network || hre.network.name;
    
    console.log(`Setting up demo environment on ${networkName}...`);
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      
      if (!addresses || !addresses.contracts) {
        console.log("❌ No deployment file found for this network");
        return;
      }
      
      const contracts = addresses.contracts;
      const [signer] = await hre.ethers.getSigners();
      
      console.log(`Using account: ${signer.address}`);
      
      // Get contract instances
      const factoryInfo = contracts.DEXFactory;
      const routerInfo = contracts.DEXRouter;
      const faucetInfo = contracts.TestTokenFaucet;
      const tokenAInfo = contracts.TestTokenA;
      const tokenBInfo = contracts.TestTokenB;
      
      if (!factoryInfo || !routerInfo || !faucetInfo || !tokenAInfo || !tokenBInfo) {
        throw new Error("Missing required contracts in deployment");
      }
      
      const factory = await hre.ethers.getContractAt("DEXFactory", factoryInfo.address);
      const router = await hre.ethers.getContractAt("DEXRouter", routerInfo.address);
      const faucet = await hre.ethers.getContractAt("TestTokenFaucet", faucetInfo.address);
      const tokenA = await hre.ethers.getContractAt("TestTokenA", tokenAInfo.address);
      const tokenB = await hre.ethers.getContractAt("TestTokenB", tokenBInfo.address);
      
      console.log("\n=== Step 1: Setup Faucet ===");
      
      // Setup faucet if not already configured
      const supportedTokens = await faucet.getSupportedTokens();
      if (supportedTokens.length === 0) {
        console.log("Configuring faucet...");
        
        // Add tokens to faucet
        await faucet.addToken(tokenAInfo.address, hre.ethers.parseEther("1000"));
        await faucet.addToken(tokenBInfo.address, hre.ethers.parseEther("2000"));
        
        // Transfer tokens to faucet
        await tokenA.transfer(faucetInfo.address, hre.ethers.parseEther("100000"));
        await tokenB.transfer(faucetInfo.address, hre.ethers.parseEther("200000"));
        
        console.log("✅ Faucet configured");
      } else {
        console.log("✅ Faucet already configured");
      }
      
      console.log("\n=== Step 2: Create Trading Pair ===");
      
      // Create pair if it doesn't exist
      const existingPair = await factory.getPair(tokenAInfo.address, tokenBInfo.address);
      if (existingPair === hre.ethers.ZeroAddress) {
        console.log("Creating TTA/TTB pair...");
        const tx = await factory.createPair(tokenAInfo.address, tokenBInfo.address);
        await tx.wait();
        console.log("✅ Pair created");
      } else {
        console.log("✅ Pair already exists");
      }
      
      const pairAddress = await factory.getPair(tokenAInfo.address, tokenBInfo.address);
      console.log(`Pair address: ${pairAddress}`);
      
      console.log("\n=== Step 3: Add Initial Liquidity ===");
      
      // Check if pair already has liquidity
      const pair = await hre.ethers.getContractAt("DEXPair", pairAddress);
      const reserves = await pair.getReserves();
      
      if (reserves[0] === 0n && reserves[1] === 0n) {
        console.log("Adding initial liquidity...");
        
        const amountA = hre.ethers.parseEther("10000"); // 10,000 TTA
        const amountB = hre.ethers.parseEther("20000"); // 20,000 TTB (2:1 ratio)
        
        // Approve tokens
        await tokenA.approve(router.target, amountA);
        await tokenB.approve(router.target, amountB);
        
        // Add liquidity
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        await router.addLiquidity(
          tokenAInfo.address,
          tokenBInfo.address,
          amountA,
          amountB,
          amountA * 95n / 100n, // 5% slippage
          amountB * 95n / 100n,
          signer.address,
          deadline
        );
        
        console.log("✅ Initial liquidity added");
      } else {
        console.log("✅ Pair already has liquidity");
      }
      
      console.log("\n=== Demo Environment Ready! ===");
      console.log("You can now:");
      console.log("1. Request tokens from faucet");
      console.log("2. Swap tokens using the router");
      console.log("3. Add/remove liquidity");
      console.log("4. Explore pair information");
      
      console.log("\n=== Quick Start Commands ===");
      console.log(`npx hardhat faucet:request-tokens --token ${tokenAInfo.address} --amount 100 --faucet ${faucetInfo.address} --network ${networkName}`);
      console.log(`npx hardhat router:swap --token-in ${tokenAInfo.address} --token-out ${tokenBInfo.address} --amount-in 10 --router ${routerInfo.address} --network ${networkName}`);
      
    } catch (error) {
      console.error("❌ Error setting up demo environment:", error);
    }
  });

task("deployment:clean", "Clean deployment files")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const networkName = taskArgs.network || hre.network.name;
    
    console.log(`Cleaning deployment files for ${networkName}...`);
    
    try {
      const fs = require("fs");
      const path = require("path");
      
      const outputsDir = path.join(__dirname, "..", "outputs");
      const files = [
        `contracts-${networkName}.json`,
        `contracts-${networkName}-addresses.json`,
        `contracts-${networkName}-deployment.json`
      ];
      
      let cleaned = 0;
      for (const file of files) {
        const filePath = path.join(outputsDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✅ Removed ${file}`);
          cleaned++;
        }
      }
      
      if (cleaned === 0) {
        console.log("No deployment files found to clean");
      } else {
        console.log(`🧹 Cleaned ${cleaned} deployment files`);
      }
      
    } catch (error) {
      console.error("❌ Error cleaning deployment files:", error);
    }
  });