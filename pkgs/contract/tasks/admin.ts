import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../helpers/contractsJsonHelper";

// Helper function to check if caller is owner
async function checkOwnership(hre: HardhatRuntimeEnvironment, contract: any, contractName: string) {
  const [signer] = await hre.ethers.getSigners();
  const owner = await contract.owner();
  
  if (signer.address.toLowerCase() !== owner.toLowerCase()) {
    throw new Error(`Only owner (${owner}) can perform this action. Current signer: ${signer.address}`);
  }
  
  console.log(`✅ Ownership verified for ${contractName}`);
}

task("admin:transfer-ownership", "Transfer ownership of a contract")
  .addParam("contract", "Contract name (DEXFactory, TestTokenFaucet, TestTokenA, TestTokenB)")
  .addParam("newOwner", "New owner address")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { contract: contractName, newOwner, network } = taskArgs;
    const networkName = network || hre.network.name;
    
    console.log(`Transferring ownership of ${contractName} to ${newOwner}...`);
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      if (!addresses || !addresses.contracts) {
        throw new Error("No deployment file found for this network");
      }
      
      const contracts = addresses.contracts;
      const contractInfo = contracts[contractName];
      
      if (!contractInfo) {
        throw new Error(`Contract ${contractName} not found in deployment`);
      }
      
      // Get contract instance
      const contractInstance = await hre.ethers.getContractAt(contractName, contractInfo.address);
      
      // Check current ownership
      await checkOwnership(hre, contractInstance, contractName);
      
      // Transfer ownership
      const tx = await contractInstance.transferOwnership(newOwner);
      await tx.wait();
      
      console.log(`✅ Ownership transferred successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      console.log(`New owner: ${newOwner}`);
      
    } catch (error) {
      console.error("❌ Error transferring ownership:", error);
    }
  });

task("admin:renounce-ownership", "Renounce ownership of a contract")
  .addParam("contract", "Contract name (DEXFactory, TestTokenFaucet, TestTokenA, TestTokenB)")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { contract: contractName, network } = taskArgs;
    const networkName = network || hre.network.name;
    
    console.log(`⚠️  WARNING: Renouncing ownership of ${contractName}...`);
    console.log("This action is irreversible and will make the contract ownerless!");
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      if (!addresses || !addresses.contracts) {
        throw new Error("No deployment file found for this network");
      }
      
      const contracts = addresses.contracts;
      const contractInfo = contracts[contractName];
      
      if (!contractInfo) {
        throw new Error(`Contract ${contractName} not found in deployment`);
      }
      
      // Get contract instance
      const contractInstance = await hre.ethers.getContractAt(contractName, contractInfo.address);
      
      // Check current ownership
      await checkOwnership(hre, contractInstance, contractName);
      
      // Renounce ownership
      const tx = await contractInstance.renounceOwnership();
      await tx.wait();
      
      console.log(`✅ Ownership renounced successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      console.log(`Contract is now ownerless`);
      
    } catch (error) {
      console.error("❌ Error renouncing ownership:", error);
    }
  });

task("admin:factory-set-fee-to", "Set fee recipient for DEX factory")
  .addParam("feeTo", "Address to receive fees (use zero address to disable)")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { feeTo, network } = taskArgs;
    const networkName = network || hre.network.name;
    
    console.log(`Setting fee recipient to ${feeTo}...`);
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      if (!addresses || !addresses.contracts) {
        throw new Error("No deployment file found for this network");
      }
      
      const contracts = addresses.contracts;
      const factoryInfo = contracts.DEXFactory;
      
      if (!factoryInfo) {
        throw new Error("DEXFactory not found in deployment");
      }
      
      // Get factory instance
      const factory = await hre.ethers.getContractAt("DEXFactory", factoryInfo.address);
      
      // Check if caller is fee setter
      const [signer] = await hre.ethers.getSigners();
      const feeToSetter = await factory.feeToSetter();
      
      if (signer.address.toLowerCase() !== feeToSetter.toLowerCase()) {
        throw new Error(`Only fee setter (${feeToSetter}) can set feeTo. Current signer: ${signer.address}`);
      }
      
      // Set fee recipient
      const tx = await factory.setFeeTo(feeTo);
      await tx.wait();
      
      console.log(`✅ Fee recipient set successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      
      if (feeTo === hre.ethers.ZeroAddress) {
        console.log(`Fees are now disabled`);
      } else {
        console.log(`Fees will be sent to: ${feeTo}`);
      }
      
    } catch (error) {
      console.error("❌ Error setting fee recipient:", error);
    }
  });

task("admin:factory-set-fee-to-setter", "Set fee setter for DEX factory")
  .addParam("feeToSetter", "Address that can set fee recipient")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { feeToSetter, network } = taskArgs;
    const networkName = network || hre.network.name;
    
    console.log(`Setting fee setter to ${feeToSetter}...`);
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      if (!addresses || !addresses.contracts) {
        throw new Error("No deployment file found for this network");
      }
      
      const contracts = addresses.contracts;
      const factoryInfo = contracts.DEXFactory;
      
      if (!factoryInfo) {
        throw new Error("DEXFactory not found in deployment");
      }
      
      // Get factory instance
      const factory = await hre.ethers.getContractAt("DEXFactory", factoryInfo.address);
      
      // Check if caller is current fee setter
      const [signer] = await hre.ethers.getSigners();
      const currentFeeToSetter = await factory.feeToSetter();
      
      if (signer.address.toLowerCase() !== currentFeeToSetter.toLowerCase()) {
        throw new Error(`Only current fee setter (${currentFeeToSetter}) can change fee setter. Current signer: ${signer.address}`);
      }
      
      // Set new fee setter
      const tx = await factory.setFeeToSetter(feeToSetter);
      await tx.wait();
      
      console.log(`✅ Fee setter updated successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      console.log(`New fee setter: ${feeToSetter}`);
      
    } catch (error) {
      console.error("❌ Error setting fee setter:", error);
    }
  });

task("admin:token-mint", "Mint tokens (owner only)")
  .addParam("token", "Token contract name (TestTokenA or TestTokenB)")
  .addParam("to", "Recipient address")
  .addParam("amount", "Amount to mint (in tokens, not wei)")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { token: tokenName, to, amount, network } = taskArgs;
    const networkName = network || hre.network.name;
    
    console.log(`Minting ${amount} ${tokenName} to ${to}...`);
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      if (!addresses || !addresses.contracts) {
        throw new Error("No deployment file found for this network");
      }
      
      const contracts = addresses.contracts;
      const tokenInfo = contracts[tokenName];
      
      if (!tokenInfo) {
        throw new Error(`Token ${tokenName} not found in deployment`);
      }
      
      // Get token instance
      const token = await hre.ethers.getContractAt(tokenName, tokenInfo.address);
      
      // Check ownership
      await checkOwnership(hre, token, tokenName);
      
      const mintAmount = hre.ethers.parseEther(amount);
      
      // Check max supply
      const currentSupply = await token.totalSupply();
      const maxSupply = await token.maxSupply();
      
      if (currentSupply + mintAmount > maxSupply) {
        throw new Error(`Mint would exceed max supply. Current: ${hre.ethers.formatEther(currentSupply)}, Max: ${hre.ethers.formatEther(maxSupply)}`);
      }
      
      // Mint tokens
      const tx = await token.mint(to, mintAmount);
      await tx.wait();
      
      console.log(`✅ Tokens minted successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      
      // Show updated balances
      const newBalance = await token.balanceOf(to);
      const newSupply = await token.totalSupply();
      
      console.log(`Recipient balance: ${hre.ethers.formatEther(newBalance)} ${tokenName}`);
      console.log(`Total supply: ${hre.ethers.formatEther(newSupply)} ${tokenName}`);
      
    } catch (error) {
      console.error("❌ Error minting tokens:", error);
    }
  });

task("admin:faucet-emergency-withdraw", "Emergency withdraw from faucet (owner only)")
  .addParam("token", "Token address to withdraw")
  .addParam("amount", "Amount to withdraw (in tokens, not wei)")
  .addParam("to", "Address to receive tokens")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { token, amount, to, network } = taskArgs;
    const networkName = network || hre.network.name;
    
    console.log(`Emergency withdrawing ${amount} tokens from faucet to ${to}...`);
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      if (!addresses || !addresses.contracts) {
        throw new Error("No deployment file found for this network");
      }
      
      const contracts = addresses.contracts;
      const faucetInfo = contracts.TestTokenFaucet;
      
      if (!faucetInfo) {
        throw new Error("TestTokenFaucet not found in deployment");
      }
      
      // Get faucet instance
      const faucet = await hre.ethers.getContractAt("TestTokenFaucet", faucetInfo.address);
      
      // Check ownership
      await checkOwnership(hre, faucet, "TestTokenFaucet");
      
      const withdrawAmount = hre.ethers.parseEther(amount);
      
      // Emergency withdraw
      const tx = await faucet.emergencyWithdraw(token, withdrawAmount, to);
      await tx.wait();
      
      console.log(`✅ Emergency withdrawal completed!`);
      console.log(`Transaction hash: ${tx.hash}`);
      
    } catch (error) {
      console.error("❌ Error during emergency withdrawal:", error);
    }
  });

task("admin:pause-faucet", "Pause faucet operations (owner only)")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { network } = taskArgs;
    const networkName = network || hre.network.name;
    
    console.log("Pausing faucet operations...");
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      if (!addresses || !addresses.contracts) {
        throw new Error("No deployment file found for this network");
      }
      
      const contracts = addresses.contracts;
      const faucetInfo = contracts.TestTokenFaucet;
      
      if (!faucetInfo) {
        throw new Error("TestTokenFaucet not found in deployment");
      }
      
      // Get faucet instance
      const faucet = await hre.ethers.getContractAt("TestTokenFaucet", faucetInfo.address);
      
      // Check ownership
      await checkOwnership(hre, faucet, "TestTokenFaucet");
      
      // Check if already paused
      const isPaused = await faucet.paused();
      if (isPaused) {
        console.log("Faucet is already paused");
        return;
      }
      
      // Pause faucet
      const tx = await faucet.pause();
      await tx.wait();
      
      console.log(`✅ Faucet paused successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      
    } catch (error) {
      console.error("❌ Error pausing faucet:", error);
    }
  });

task("admin:unpause-faucet", "Unpause faucet operations (owner only)")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { network } = taskArgs;
    const networkName = network || hre.network.name;
    
    console.log("Unpausing faucet operations...");
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      if (!addresses || !addresses.contracts) {
        throw new Error("No deployment file found for this network");
      }
      
      const contracts = addresses.contracts;
      const faucetInfo = contracts.TestTokenFaucet;
      
      if (!faucetInfo) {
        throw new Error("TestTokenFaucet not found in deployment");
      }
      
      // Get faucet instance
      const faucet = await hre.ethers.getContractAt("TestTokenFaucet", faucetInfo.address);
      
      // Check ownership
      await checkOwnership(hre, faucet, "TestTokenFaucet");
      
      // Check if already unpaused
      const isPaused = await faucet.paused();
      if (!isPaused) {
        console.log("Faucet is already unpaused");
        return;
      }
      
      // Unpause faucet
      const tx = await faucet.unpause();
      await tx.wait();
      
      console.log(`✅ Faucet unpaused successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      
    } catch (error) {
      console.error("❌ Error unpausing faucet:", error);
    }
  });

task("admin:system-status", "Get comprehensive system status")
  .addOptionalParam("network", "Network name (defaults to current network)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { network } = taskArgs;
    const networkName = network || hre.network.name;
    
    console.log(`System status for ${networkName}:`);
    
    try {
      // Load deployed contract addresses
      const addresses = loadDeployedContractAddresses(networkName);
      if (!addresses || !addresses.contracts) {
        throw new Error("No deployment file found for this network");
      }
      
      const contracts = addresses.contracts;
      const [signer] = await hre.ethers.getSigners();
      
      console.log(`\nCurrent signer: ${signer.address}`);
      console.log(`Network: ${networkName}`);
      console.log(`Block number: ${await hre.ethers.provider.getBlockNumber()}`);
      
      console.log("\n=== Contract Ownership Status ===");
      
      // Check ownership of all ownable contracts
      const ownableContracts = ["DEXFactory", "TestTokenFaucet", "TestTokenA", "TestTokenB"];
      
      for (const contractName of ownableContracts) {
        const contractInfo = contracts[contractName];
        if (contractInfo) {
          try {
            const contract = await hre.ethers.getContractAt(contractName, contractInfo.address);
            const owner = await contract.owner();
            const isOwner = owner.toLowerCase() === signer.address.toLowerCase();
            
            console.log(`${contractName}:`);
            console.log(`  Owner: ${owner}`);
            console.log(`  You are owner: ${isOwner ? "✅ Yes" : "❌ No"}`);
          } catch (error) {
            console.log(`${contractName}: ❌ Error checking ownership`);
          }
        }
      }
      
      console.log("\n=== Factory Status ===");
      
      try {
        const factoryInfo = contracts.DEXFactory;
        if (factoryInfo) {
          const factory = await hre.ethers.getContractAt("DEXFactory", factoryInfo.address);
          const feeTo = await factory.feeTo();
          const feeToSetter = await factory.feeToSetter();
          const pairsCount = await factory.allPairsLength();
          
          console.log(`Fee recipient: ${feeTo === hre.ethers.ZeroAddress ? "Disabled" : feeTo}`);
          console.log(`Fee setter: ${feeToSetter}`);
          console.log(`Total pairs: ${pairsCount}`);
          console.log(`You are fee setter: ${feeToSetter.toLowerCase() === signer.address.toLowerCase() ? "✅ Yes" : "❌ No"}`);
        }
      } catch (error) {
        console.log("❌ Error checking factory status");
      }
      
      console.log("\n=== Faucet Status ===");
      
      try {
        const faucetInfo = contracts.TestTokenFaucet;
        if (faucetInfo) {
          const faucet = await hre.ethers.getContractAt("TestTokenFaucet", faucetInfo.address);
          const isPaused = await faucet.paused();
          const cooldown = await faucet.getCooldown();
          const supportedTokens = await faucet.getSupportedTokens();
          
          console.log(`Status: ${isPaused ? "⏸️  Paused" : "▶️  Active"}`);
          console.log(`Cooldown: ${cooldown} seconds`);
          console.log(`Supported tokens: ${supportedTokens.length}`);
        }
      } catch (error) {
        console.log("❌ Error checking faucet status");
      }
      
      console.log("\n=== Token Supply Status ===");
      
      const tokens = ["TestTokenA", "TestTokenB"];
      for (const tokenName of tokens) {
        const tokenInfo = contracts[tokenName];
        if (tokenInfo) {
          try {
            const token = await hre.ethers.getContractAt(tokenName, tokenInfo.address);
            const totalSupply = await token.totalSupply();
            const maxSupply = await token.maxSupply();
            const utilization = (Number(totalSupply) / Number(maxSupply)) * 100;
            
            console.log(`${tokenName}:`);
            console.log(`  Total supply: ${hre.ethers.formatEther(totalSupply)}`);
            console.log(`  Max supply: ${hre.ethers.formatEther(maxSupply)}`);
            console.log(`  Utilization: ${utilization.toFixed(2)}%`);
          } catch (error) {
            console.log(`${tokenName}: ❌ Error checking supply`);
          }
        }
      }
      
    } catch (error) {
      console.error("❌ Error getting system status:", error);
    }
  });