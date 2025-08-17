import { ethers, network } from "hardhat";
import {
    type ContractInfo,
    backupDeploymentData,
    generateDeploymentSummary,
    getNetworkConfig,
    resetContractAddressesJson,
    validateNetwork,
    writeContractDeployment,
} from "../helpers/contractsJsonHelper";

/**
 * Enhanced deployment script using contractsJsonHelper
 */
async function main() {
  console.log("🚀 Starting enhanced deployment process...");
  
  // Validate network
  if (!validateNetwork(network.name)) {
    throw new Error(`Unsupported network: ${network.name}`);
  }
  
  const networkConfig = getNetworkConfig(network.name);
  console.log(`📡 Deploying to: ${network.name} (Chain ID: ${networkConfig?.chainId})`);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);
  
  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // Backup existing deployment data
  try {
    const backupPath = backupDeploymentData(network.name);
    console.log(`📦 Backup created: ${backupPath}`);
  } catch (error) {
    console.log("ℹ️  No existing deployment data to backup");
  }
  
  // Reset deployment file for fresh deployment
  resetContractAddressesJson(network.name);
  
  console.log("\n📋 Deployment Plan:");
  console.log("1. Deploy DEXFactory");
  console.log("2. Deploy TestTokenA");
  console.log("3. Deploy TestTokenB");
  console.log("4. Deploy TestTokenFaucet");
  console.log("5. Deploy DEXRouter");
  console.log("6. Initialize contracts");
  
  // Deploy DEXFactory
  console.log("\n🏭 Deploying DEXFactory...");
  const DEXFactory = await ethers.getContractFactory("DEXFactory");
  const factory = await DEXFactory.deploy(deployer.address);
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  const factoryDeployTx = factory.deploymentTransaction();
  
  const factoryInfo: ContractInfo = {
    address: factoryAddress,
    deploymentTx: factoryDeployTx?.hash || "",
    blockNumber: factoryDeployTx?.blockNumber || 0,
    gasUsed: factoryDeployTx?.gasLimit?.toString() || "0",
    constructorArgs: [deployer.address],
    verified: false,
  };
  
  writeContractDeployment({
    contractName: "DEXFactory",
    contractInfo: factoryInfo,
    network: network.name,
    deployer: deployer.address,
  });
  
  // Deploy TestTokenA
  console.log("\n🪙 Deploying TestTokenA...");
  const TestTokenA = await ethers.getContractFactory("TestTokenA");
  const initialSupply = ethers.parseEther("1000000"); // 1M tokens initial supply
  const tokenA = await TestTokenA.deploy(deployer.address, initialSupply);
  await tokenA.waitForDeployment();
  
  const tokenAAddress = await tokenA.getAddress();
  const tokenADeployTx = tokenA.deploymentTransaction();
  
  const tokenAInfo: ContractInfo = {
    address: tokenAAddress,
    deploymentTx: tokenADeployTx?.hash || "",
    blockNumber: tokenADeployTx?.blockNumber || 0,
    gasUsed: tokenADeployTx?.gasLimit?.toString() || "0",
    constructorArgs: [deployer.address, initialSupply.toString()],
    verified: false,
  };
  
  writeContractDeployment({
    contractName: "TestTokenA",
    contractInfo: tokenAInfo,
    network: network.name,
    deployer: deployer.address,
  });
  
  // Deploy TestTokenB
  console.log("\n🪙 Deploying TestTokenB...");
  const TestTokenB = await ethers.getContractFactory("TestTokenB");
  const tokenB = await TestTokenB.deploy(deployer.address, initialSupply);
  await tokenB.waitForDeployment();
  
  const tokenBAddress = await tokenB.getAddress();
  const tokenBDeployTx = tokenB.deploymentTransaction();
  
  const tokenBInfo: ContractInfo = {
    address: tokenBAddress,
    deploymentTx: tokenBDeployTx?.hash || "",
    blockNumber: tokenBDeployTx?.blockNumber || 0,
    gasUsed: tokenBDeployTx?.gasLimit?.toString() || "0",
    constructorArgs: [deployer.address, initialSupply.toString()],
    verified: false,
  };
  
  writeContractDeployment({
    contractName: "TestTokenB",
    contractInfo: tokenBInfo,
    network: network.name,
    deployer: deployer.address,
  });
  
  // Deploy TestTokenFaucet
  console.log("\n🚰 Deploying TestTokenFaucet...");
  const TestTokenFaucet = await ethers.getContractFactory("TestTokenFaucet");
  const faucet = await TestTokenFaucet.deploy(deployer.address);
  await faucet.waitForDeployment();
  
  const faucetAddress = await faucet.getAddress();
  const faucetDeployTx = faucet.deploymentTransaction();
  
  const faucetInfo: ContractInfo = {
    address: faucetAddress,
    deploymentTx: faucetDeployTx?.hash || "",
    blockNumber: faucetDeployTx?.blockNumber || 0,
    gasUsed: faucetDeployTx?.gasLimit?.toString() || "0",
    constructorArgs: [deployer.address],
    verified: false,
  };
  
  writeContractDeployment({
    contractName: "TestTokenFaucet",
    contractInfo: faucetInfo,
    network: network.name,
    deployer: deployer.address,
  });
  
  // Deploy DEXRouter
  console.log("\n🔀 Deploying DEXRouter...");
  const DEXRouter = await ethers.getContractFactory("DEXRouter");
  // Using deployer address as WETH placeholder for testing (since zero address is not allowed)
  const wethAddress = deployer.address;
  const router = await DEXRouter.deploy(factoryAddress, wethAddress);
  await router.waitForDeployment();
  
  const routerAddress = await router.getAddress();
  const routerDeployTx = router.deploymentTransaction();
  
  const routerInfo: ContractInfo = {
    address: routerAddress,
    deploymentTx: routerDeployTx?.hash || "",
    blockNumber: routerDeployTx?.blockNumber || 0,
    gasUsed: routerDeployTx?.gasLimit?.toString() || "0",
    constructorArgs: [factoryAddress, wethAddress],
    verified: false,
  };
  
  writeContractDeployment({
    contractName: "DEXRouter",
    contractInfo: routerInfo,
    network: network.name,
    deployer: deployer.address,
  });
  
  // Initialize contracts
  console.log("\n⚙️  Initializing contracts...");
  
  // Set up faucet with tokens
  console.log("Setting up faucet with tokens...");
  await faucet.addToken(tokenAAddress, ethers.parseEther("1000"));
  await faucet.addToken(tokenBAddress, ethers.parseEther("1000"));
  
  // Mint tokens to faucet
  await tokenA.mint(faucetAddress, ethers.parseEther("1000000"));
  await tokenB.mint(faucetAddress, ethers.parseEther("1000000"));
  
  console.log("✅ Contract initialization completed");
  
  // Generate and display deployment summary
  const summary = generateDeploymentSummary(network.name);
  console.log(summary);
  
  console.log("\n🎉 Deployment completed successfully!");
  
  if (networkConfig?.blockExplorer) {
    console.log("\n🔍 Verify contracts on block explorer:");
    console.log(`DEXFactory: ${networkConfig.blockExplorer}/address/${factoryAddress}`);
    console.log(`TestTokenA: ${networkConfig.blockExplorer}/address/${tokenAAddress}`);
    console.log(`TestTokenB: ${networkConfig.blockExplorer}/address/${tokenBAddress}`);
    console.log(`TestTokenFaucet: ${networkConfig.blockExplorer}/address/${faucetAddress}`);
    console.log(`DEXRouter: ${networkConfig.blockExplorer}/address/${routerAddress}`);
  }
  
  console.log("\n📝 Next steps:");
  console.log("1. Verify contracts on Etherscan (if on testnet/mainnet)");
  console.log("2. Test contract functionality using Hardhat tasks");
  console.log("3. Update frontend configuration with deployed addresses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });