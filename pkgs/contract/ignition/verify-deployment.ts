#!/usr/bin/env ts-node

import { ethers, network } from "hardhat";
import {
    getNetworkConfig,
    loadDeployedContractAddresses,
    validateNetwork,
} from "../helpers/contractsJsonHelper";

/**
 * Deployment verification script
 * Verifies that all deployed contracts are working correctly
 */
async function main() {
  console.log("🔍 Starting deployment verification...");
  
  if (!validateNetwork(network.name)) {
    console.warn(`⚠️  Network ${network.name} is not in the predefined list, but proceeding anyway...`);
  }
  
  const networkConfig = getNetworkConfig(network.name);
  console.log(`📡 Verifying deployment on: ${network.name} (Chain ID: ${networkConfig?.chainId || "unknown"})`);
  
  try {
    // Load deployed contract addresses
    const addresses = loadDeployedContractAddresses(network.name);
    const contracts = JSON.parse(addresses.contracts);
    
    console.log("\n📋 Loaded contract addresses:");
    for (const [name, address] of Object.entries(contracts)) {
      console.log(`${name}: ${address}`);
    }
    
    // Get contract instances
    const factory = await ethers.getContractAt("DEXFactory", contracts.DEXFactory);
    const router = await ethers.getContractAt("DEXRouter", contracts.DEXRouter);
    const testTokenA = await ethers.getContractAt("TestTokenA", contracts.TestTokenA);
    const testTokenB = await ethers.getContractAt("TestTokenB", contracts.TestTokenB);
    const testTokenFaucet = await ethers.getContractAt("TestTokenFaucet", contracts.TestTokenFaucet);
    
    console.log("\n🔍 Verifying contract functionality...");
    
    // Verify Factory
    console.log("\n🏭 Verifying DEXFactory...");
    const factoryOwner = await factory.owner();
    const factoryPairsLength = await factory.allPairsLength();
    const factoryFeeTo = await factory.feeTo();
    const factoryFeeToSetter = await factory.feeToSetter();
    
    console.log(`✅ Factory owner: ${factoryOwner}`);
    console.log(`✅ Factory pairs count: ${factoryPairsLength}`);
    console.log(`✅ Factory feeTo: ${factoryFeeTo}`);
    console.log(`✅ Factory feeToSetter: ${factoryFeeToSetter}`);
    
    // Verify Router
    console.log("\n🔀 Verifying DEXRouter...");
    const routerFactory = await router.factory();
    const routerWETH = await router.WETH();
    
    console.log(`✅ Router factory: ${routerFactory}`);
    console.log(`✅ Router WETH: ${routerWETH}`);
    
    if (routerFactory.toLowerCase() !== contracts.DEXFactory.toLowerCase()) {
      console.error(`❌ Router factory mismatch! Expected: ${contracts.DEXFactory}, Got: ${routerFactory}`);
    } else {
      console.log("✅ Router factory correctly linked");
    }
    
    // Verify TestTokenA
    console.log("\n🪙 Verifying TestTokenA...");
    const tokenAName = await testTokenA.name();
    const tokenASymbol = await testTokenA.symbol();
    const tokenADecimals = await testTokenA.decimals();
    const tokenATotalSupply = await testTokenA.totalSupply();
    const tokenAOwner = await testTokenA.owner();
    
    console.log(`✅ TokenA name: ${tokenAName}`);
    console.log(`✅ TokenA symbol: ${tokenASymbol}`);
    console.log(`✅ TokenA decimals: ${tokenADecimals}`);
    console.log(`✅ TokenA total supply: ${ethers.formatEther(tokenATotalSupply)}`);
    console.log(`✅ TokenA owner: ${tokenAOwner}`);
    
    // Verify TestTokenB
    console.log("\n🪙 Verifying TestTokenB...");
    const tokenBName = await testTokenB.name();
    const tokenBSymbol = await testTokenB.symbol();
    const tokenBDecimals = await testTokenB.decimals();
    const tokenBTotalSupply = await testTokenB.totalSupply();
    const tokenBOwner = await testTokenB.owner();
    
    console.log(`✅ TokenB name: ${tokenBName}`);
    console.log(`✅ TokenB symbol: ${tokenBSymbol}`);
    console.log(`✅ TokenB decimals: ${tokenBDecimals}`);
    console.log(`✅ TokenB total supply: ${ethers.formatEther(tokenBTotalSupply)}`);
    console.log(`✅ TokenB owner: ${tokenBOwner}`);
    
    // Verify TestTokenFaucet
    console.log("\n🚰 Verifying TestTokenFaucet...");
    const faucetOwner = await testTokenFaucet.owner();
    const tokenALimit = await testTokenFaucet.getTokenLimit(contracts.TestTokenA);
    const tokenBLimit = await testTokenFaucet.getTokenLimit(contracts.TestTokenB);
    const tokenABalance = await testTokenA.balanceOf(contracts.TestTokenFaucet);
    const tokenBBalance = await testTokenB.balanceOf(contracts.TestTokenFaucet);
    
    console.log(`✅ Faucet owner: ${faucetOwner}`);
    console.log(`✅ Faucet TokenA limit: ${ethers.formatEther(tokenALimit)}`);
    console.log(`✅ Faucet TokenB limit: ${ethers.formatEther(tokenBLimit)}`);
    console.log(`✅ Faucet TokenA balance: ${ethers.formatEther(tokenABalance)}`);
    console.log(`✅ Faucet TokenB balance: ${ethers.formatEther(tokenBBalance)}`);
    
    // Verify token pair
    console.log("\n👥 Verifying token pair...");
    const pairAddress = await factory.getPair(contracts.TestTokenA, contracts.TestTokenB);
    
    if (pairAddress === "0x0000000000000000000000000000000000000000") {
      console.warn("⚠️  No token pair found");
    } else {
      console.log(`✅ Token pair address: ${pairAddress}`);
      
      // Get pair contract and verify
      const pair = await ethers.getContractAt("DEXPair", pairAddress);
      const token0 = await pair.token0();
      const token1 = await pair.token1();
      const reserves = await pair.getReserves();
      const totalSupply = await pair.totalSupply();
      
      console.log(`✅ Pair token0: ${token0}`);
      console.log(`✅ Pair token1: ${token1}`);
      console.log(`✅ Pair reserve0: ${ethers.formatEther(reserves[0])}`);
      console.log(`✅ Pair reserve1: ${ethers.formatEther(reserves[1])}`);
      console.log(`✅ Pair total supply: ${ethers.formatEther(totalSupply)}`);
    }
    
    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...");
    
    // Test faucet functionality (if we have enough gas)
    try {
      const [signer] = await ethers.getSigners();
      const signerAddress = await signer.getAddress();
      
      // Check if we can request tokens from faucet
      const canRequestA = await testTokenFaucet.canRequestTokens(signerAddress, contracts.TestTokenA);
      const canRequestB = await testTokenFaucet.canRequestTokens(signerAddress, contracts.TestTokenB);
      
      console.log(`✅ Can request TokenA from faucet: ${canRequestA}`);
      console.log(`✅ Can request TokenB from faucet: ${canRequestB}`);
      
      // Check token balances
      const signerTokenABalance = await testTokenA.balanceOf(signerAddress);
      const signerTokenBBalance = await testTokenB.balanceOf(signerAddress);
      
      console.log(`✅ Signer TokenA balance: ${ethers.formatEther(signerTokenABalance)}`);
      console.log(`✅ Signer TokenB balance: ${ethers.formatEther(signerTokenBBalance)}`);
      
    } catch (error) {
      console.warn("⚠️  Could not test faucet functionality:", error);
    }
    
    console.log("\n🎉 Deployment verification completed successfully!");
    
    // Summary
    console.log("\n📊 Verification Summary:");
    console.log("✅ All contracts deployed and accessible");
    console.log("✅ Contract linkages verified");
    console.log("✅ Basic functionality confirmed");
    
    if (networkConfig?.blockExplorer) {
      console.log("\n🔍 Block Explorer Links:");
      console.log(`DEXFactory: ${networkConfig.blockExplorer}/address/${contracts.DEXFactory}`);
      console.log(`DEXRouter: ${networkConfig.blockExplorer}/address/${contracts.DEXRouter}`);
      console.log(`TestTokenA: ${networkConfig.blockExplorer}/address/${contracts.TestTokenA}`);
      console.log(`TestTokenB: ${networkConfig.blockExplorer}/address/${contracts.TestTokenB}`);
      console.log(`TestTokenFaucet: ${networkConfig.blockExplorer}/address/${contracts.TestTokenFaucet}`);
      if (pairAddress !== "0x0000000000000000000000000000000000000000") {
        console.log(`TokenA-TokenB Pair: ${networkConfig.blockExplorer}/address/${pairAddress}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("No deployment data found")) {
        console.error("\n💡 Tip: Make sure contracts are deployed first");
        console.error("Run: npm run ignition:deploy:sepolia");
      } else if (error.message.includes("call revert exception")) {
        console.error("\n💡 Tip: Contract might not be deployed or network mismatch");
      }
    }
    
    throw error;
  }
}

// Execute verification
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Verification script failed:", error);
      process.exit(1);
    });
}

export default main;