import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Test Tokens...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  // Define initial supplies
  const INITIAL_SUPPLY_A = ethers.parseEther("1000000"); // 1M TTA
  const INITIAL_SUPPLY_B = ethers.parseEther("2000000"); // 2M TTB
  
  console.log("\n=== Deploying TestTokenA ===");
  
  // Deploy TestTokenA
  const TestTokenA = await ethers.getContractFactory("TestTokenA");
  const testTokenA = await TestTokenA.deploy(deployer.address, INITIAL_SUPPLY_A);
  await testTokenA.waitForDeployment();
  
  const tokenAAddress = await testTokenA.getAddress();
  console.log("TestTokenA deployed to:", tokenAAddress);
  console.log("Name:", await testTokenA.name());
  console.log("Symbol:", await testTokenA.symbol());
  console.log("Decimals:", await testTokenA.decimals());
  console.log("Total Supply:", ethers.formatEther(await testTokenA.totalSupply()), "TTA");
  console.log("Max Supply:", ethers.formatEther(await testTokenA.maxSupply()), "TTA");
  console.log("Owner:", await testTokenA.owner());
  console.log("Owner Balance:", ethers.formatEther(await testTokenA.balanceOf(deployer.address)), "TTA");
  
  console.log("\n=== Deploying TestTokenB ===");
  
  // Deploy TestTokenB
  const TestTokenB = await ethers.getContractFactory("TestTokenB");
  const testTokenB = await TestTokenB.deploy(deployer.address, INITIAL_SUPPLY_B);
  await testTokenB.waitForDeployment();
  
  const tokenBAddress = await testTokenB.getAddress();
  console.log("TestTokenB deployed to:", tokenBAddress);
  console.log("Name:", await testTokenB.name());
  console.log("Symbol:", await testTokenB.symbol());
  console.log("Decimals:", await testTokenB.decimals());
  console.log("Total Supply:", ethers.formatEther(await testTokenB.totalSupply()), "TTB");
  console.log("Max Supply:", ethers.formatEther(await testTokenB.maxSupply()), "TTB");
  console.log("Owner:", await testTokenB.owner());
  console.log("Owner Balance:", ethers.formatEther(await testTokenB.balanceOf(deployer.address)), "TTB");
  
  // Save deployment info
  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    contracts: {
      TestTokenA: {
        address: tokenAAddress,
        name: "Test Token A",
        symbol: "TTA",
        decimals: 18,
        initialSupply: ethers.formatEther(INITIAL_SUPPLY_A),
        maxSupply: ethers.formatEther(await testTokenA.maxSupply())
      },
      TestTokenB: {
        address: tokenBAddress,
        name: "Test Token B", 
        symbol: "TTB",
        decimals: 18,
        initialSupply: ethers.formatEther(INITIAL_SUPPLY_B),
        maxSupply: ethers.formatEther(await testTokenB.maxSupply())
      }
    },
    timestamp: new Date().toISOString()
  };
  
  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n=== Next Steps ===");
  console.log("1. Verify contracts on Etherscan (if on testnet):");
  console.log(`   npx hardhat verify --network <network> ${tokenAAddress} "${deployer.address}" "${INITIAL_SUPPLY_A}"`);
  console.log(`   npx hardhat verify --network <network> ${tokenBAddress} "${deployer.address}" "${INITIAL_SUPPLY_B}"`);
  console.log("\n2. Setup faucet integration:");
  console.log(`   npx hardhat setup-faucet-tokens --faucet <FAUCET_ADDRESS> --token-a ${tokenAAddress} --token-b ${tokenBAddress}`);
  console.log("\n3. Test token functionality:");
  console.log(`   npx hardhat test-token-info --token ${tokenAAddress}`);
  console.log(`   npx hardhat test-token-info --token ${tokenBAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });