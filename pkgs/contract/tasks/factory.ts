import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("factory:create-pair", "Create a new trading pair")
  .addParam("tokenA", "Address of token A")
  .addParam("tokenB", "Address of token B")
  .addOptionalParam("factory", "Factory contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { tokenA, tokenB, factory: factoryAddress } = taskArgs;
    
    console.log(`Creating pair for tokens: ${tokenA} and ${tokenB}`);
    
    // Get the factory contract
    let factory;
    if (factoryAddress) {
      factory = await hre.ethers.getContractAt("DEXFactory", factoryAddress);
    } else {
      // Try to get from deployments
      console.log("No factory address provided, please specify --factory <address>");
      return;
    }
    
    // Check if pair already exists
    const existingPair = await factory.getPair(tokenA, tokenB);
    if (existingPair !== hre.ethers.ZeroAddress) {
      console.log(`Pair already exists at: ${existingPair}`);
      return;
    }
    
    // Create the pair
    const tx = await factory.createPair(tokenA, tokenB);
    console.log(`Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block: ${receipt?.blockNumber}`);
    
    // Get the new pair address
    const pairAddress = await factory.getPair(tokenA, tokenB);
    console.log(`New pair created at: ${pairAddress}`);
    
    // Get total pairs count
    const totalPairs = await factory.allPairsLength();
    console.log(`Total pairs: ${totalPairs}`);
  });

task("factory:get-pair", "Get pair address for two tokens")
  .addParam("tokenA", "Address of token A")
  .addParam("tokenB", "Address of token B")
  .addOptionalParam("factory", "Factory contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { tokenA, tokenB, factory: factoryAddress } = taskArgs;
    
    if (!factoryAddress) {
      console.log("Please specify --factory <address>");
      return;
    }
    
    const factory = await hre.ethers.getContractAt("DEXFactory", factoryAddress);
    const pairAddress = await factory.getPair(tokenA, tokenB);
    
    if (pairAddress === hre.ethers.ZeroAddress) {
      console.log("Pair does not exist");
    } else {
      console.log(`Pair address: ${pairAddress}`);
    }
  });

task("factory:list-pairs", "List all pairs")
  .addOptionalParam("factory", "Factory contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { factory: factoryAddress } = taskArgs;
    
    if (!factoryAddress) {
      console.log("Please specify --factory <address>");
      return;
    }
    
    const factory = await hre.ethers.getContractAt("DEXFactory", factoryAddress);
    const totalPairs = await factory.allPairsLength();
    
    console.log(`Total pairs: ${totalPairs}`);
    
    for (let i = 0; i < Number(totalPairs); i++) {
      const pairAddress = await factory.allPairs(i);
      console.log(`Pair ${i}: ${pairAddress}`);
    }
  });

task("factory:set-fee-to", "Set the fee recipient address")
  .addParam("feeTo", "Address to receive fees")
  .addOptionalParam("factory", "Factory contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { feeTo, factory: factoryAddress } = taskArgs;
    
    if (!factoryAddress) {
      console.log("Please specify --factory <address>");
      return;
    }
    
    const factory = await hre.ethers.getContractAt("DEXFactory", factoryAddress);
    
    // Check if caller is the fee setter
    const [signer] = await hre.ethers.getSigners();
    const feeToSetter = await factory.feeToSetter();
    
    if (signer.address !== feeToSetter) {
      console.log(`Error: Only fee setter (${feeToSetter}) can set feeTo. Current signer: ${signer.address}`);
      return;
    }
    
    const tx = await factory.setFeeTo(feeTo);
    console.log(`Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block: ${receipt?.blockNumber}`);
    console.log(`Fee recipient set to: ${feeTo}`);
  });

task("factory:info", "Get factory information")
  .addOptionalParam("factory", "Factory contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { factory: factoryAddress } = taskArgs;
    
    if (!factoryAddress) {
      console.log("Please specify --factory <address>");
      return;
    }
    
    const factory = await hre.ethers.getContractAt("DEXFactory", factoryAddress);
    
    const owner = await factory.owner();
    const feeTo = await factory.feeTo();
    const feeToSetter = await factory.feeToSetter();
    const totalPairs = await factory.allPairsLength();
    
    console.log("=== Factory Information ===");
    console.log(`Address: ${factoryAddress}`);
    console.log(`Owner: ${owner}`);
    console.log(`Fee To: ${feeTo}`);
    console.log(`Fee To Setter: ${feeToSetter}`);
    console.log(`Total Pairs: ${totalPairs}`);
  });