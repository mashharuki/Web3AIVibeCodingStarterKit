import { ethers } from "hardhat";

async function main() {
  console.log("Deploying DEXFactory...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  // Deploy DEXFactory with deployer as initial fee setter
  const DEXFactory = await ethers.getContractFactory("DEXFactory");
  const factory = await DEXFactory.deploy(deployer.address);
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  
  console.log("DEXFactory deployed to:", factoryAddress);
  console.log("Owner:", await factory.owner());
  console.log("Fee To Setter:", await factory.feeToSetter());
  console.log("Fee To:", await factory.feeTo());
  console.log("Total Pairs:", Number(await factory.allPairsLength()));
  
  // Save deployment info
  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    contracts: {
      DEXFactory: factoryAddress
    },
    timestamp: new Date().toISOString()
  };
  
  console.log("\nDeployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });