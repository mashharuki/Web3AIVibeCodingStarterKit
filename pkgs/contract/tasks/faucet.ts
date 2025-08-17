import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// Helper function to get faucet contract
async function getFaucetContract(hre: HardhatRuntimeEnvironment, faucetAddress: string) {
  return await hre.ethers.getContractAt("TestTokenFaucet", faucetAddress);
}

// Helper function to get token contract
async function getTokenContract(hre: HardhatRuntimeEnvironment, tokenAddress: string) {
  return await hre.ethers.getContractAt("TestToken", tokenAddress);
}

task("faucet:add-token", "Add a token to the faucet")
  .addParam("token", "Token contract address")
  .addParam("limit", "Daily limit amount (in tokens, not wei)")
  .addParam("faucet", "Faucet contract address")
  .setAction(async (taskArgs, hre) => {
    const { token, limit, faucet: faucetAddress } = taskArgs;
    
    try {
      const faucet = await getFaucetContract(hre, faucetAddress);
      const limitWei = hre.ethers.parseEther(limit);
      
      console.log(`Adding token ${token} with limit ${limit} tokens...`);
      
      const tx = await faucet.addToken(token, limitWei);
      await tx.wait();
      
      console.log(`✅ Token added successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      
      // Verify the token was added
      const isSupported = await faucet.isTokenSupported(token);
      const tokenLimit = await faucet.getTokenLimit(token);
      
      console.log(`Token supported: ${isSupported}`);
      console.log(`Token limit: ${hre.ethers.formatEther(tokenLimit)} tokens`);
      
    } catch (error) {
      console.error("❌ Error adding token:", error);
    }
  });

task("faucet:remove-token", "Remove a token from the faucet")
  .addParam("token", "Token contract address")
  .addParam("faucet", "Faucet contract address")
  .setAction(async (taskArgs, hre) => {
    const { token, faucet: faucetAddress } = taskArgs;
    
    try {
      const faucet = await getFaucetContract(hre, faucetAddress);
      
      console.log(`Removing token ${token}...`);
      
      const tx = await faucet.removeToken(token);
      await tx.wait();
      
      console.log(`✅ Token removed successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      
    } catch (error) {
      console.error("❌ Error removing token:", error);
    }
  });

task("faucet:set-limit", "Set token limit")
  .addParam("token", "Token contract address")
  .addParam("limit", "New daily limit amount (in tokens, not wei)")
  .addParam("faucet", "Faucet contract address")
  .setAction(async (taskArgs, hre) => {
    const { token, limit, faucet: faucetAddress } = taskArgs;
    
    try {
      const faucet = await getFaucetContract(hre, faucetAddress);
      const limitWei = hre.ethers.parseEther(limit);
      
      console.log(`Setting limit for token ${token} to ${limit} tokens...`);
      
      const tx = await faucet.setTokenLimit(token, limitWei);
      await tx.wait();
      
      console.log(`✅ Token limit updated successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      
    } catch (error) {
      console.error("❌ Error setting token limit:", error);
    }
  });

task("faucet:set-cooldown", "Set cooldown period")
  .addParam("cooldown", "Cooldown period in seconds")
  .addParam("faucet", "Faucet contract address")
  .setAction(async (taskArgs, hre) => {
    const { cooldown, faucet: faucetAddress } = taskArgs;
    
    try {
      const faucet = await getFaucetContract(hre, faucetAddress);
      
      console.log(`Setting cooldown to ${cooldown} seconds...`);
      
      const tx = await faucet.setCooldown(cooldown);
      await tx.wait();
      
      console.log(`✅ Cooldown updated successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      
      // Verify the cooldown was set
      const newCooldown = await faucet.getCooldown();
      console.log(`New cooldown: ${newCooldown} seconds (${Number(newCooldown) / 3600} hours)`);
      
    } catch (error) {
      console.error("❌ Error setting cooldown:", error);
    }
  });

task("faucet:request-tokens", "Request tokens from the faucet")
  .addParam("token", "Token contract address")
  .addParam("amount", "Amount to request (in tokens, not wei)")
  .addParam("faucet", "Faucet contract address")
  .setAction(async (taskArgs, hre) => {
    const { token, amount, faucet: faucetAddress } = taskArgs;
    
    try {
      const faucet = await getFaucetContract(hre, faucetAddress);
      const amountWei = hre.ethers.parseEther(amount);
      
      // Check if user can request tokens
      const [signer] = await hre.ethers.getSigners();
      const remainingCooldown = await faucet.getRemainingCooldown(signer.address, token);
      
      if (remainingCooldown > 0) {
        console.log(`❌ Cooldown not expired. Remaining time: ${remainingCooldown} seconds`);
        return;
      }
      
      // Check token limit
      const tokenLimit = await faucet.getTokenLimit(token);
      if (amountWei > tokenLimit) {
        console.log(`❌ Amount exceeds limit. Max: ${hre.ethers.formatEther(tokenLimit)} tokens`);
        return;
      }
      
      console.log(`Requesting ${amount} tokens from ${token}...`);
      
      const tx = await faucet.requestTokens(token, amountWei);
      await tx.wait();
      
      console.log(`✅ Tokens requested successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      
      // Check new balance
      const tokenContract = await getTokenContract(hre, token);
      const balance = await tokenContract.balanceOf(signer.address);
      console.log(`New token balance: ${hre.ethers.formatEther(balance)} tokens`);
      
    } catch (error) {
      console.error("❌ Error requesting tokens:", error);
    }
  });

task("faucet:info", "Get faucet information")
  .addParam("faucet", "Faucet contract address")
  .addOptionalParam("token", "Specific token address to check")
  .setAction(async (taskArgs, hre) => {
    const { token, faucet: faucetAddress } = taskArgs;
    
    try {
      const faucet = await getFaucetContract(hre, faucetAddress);
      
      console.log("=== Faucet Information ===");
      
      // Basic info
      const owner = await faucet.owner();
      const cooldown = await faucet.getCooldown();
      
      console.log(`Owner: ${owner}`);
      console.log(`Cooldown: ${cooldown} seconds (${Number(cooldown) / 3600} hours)`);
      
      // Supported tokens
      const supportedTokens = await faucet.getSupportedTokens();
      console.log(`\nSupported tokens: ${supportedTokens.length}`);
      
      for (const tokenAddr of supportedTokens) {
        const tokenContract = await getTokenContract(hre, tokenAddr);
        const tokenName = await tokenContract.name();
        const tokenSymbol = await tokenContract.symbol();
        const tokenLimit = await faucet.getTokenLimit(tokenAddr);
        const faucetBalance = await tokenContract.balanceOf(faucet.target);
        
        console.log(`\n📄 ${tokenName} (${tokenSymbol})`);
        console.log(`   Address: ${tokenAddr}`);
        console.log(`   Daily limit: ${hre.ethers.formatEther(tokenLimit)} tokens`);
        console.log(`   Faucet balance: ${hre.ethers.formatEther(faucetBalance)} tokens`);
      }
      
      // Specific token info
      if (token) {
        console.log(`\n=== Token Specific Info: ${token} ===`);
        
        const [signer] = await hre.ethers.getSigners();
        const isSupported = await faucet.isTokenSupported(token);
        
        if (isSupported) {
          const lastRequestTime = await faucet.getLastRequestTime(signer.address, token);
          const remainingCooldown = await faucet.getRemainingCooldown(signer.address, token);
          
          console.log(`Last request: ${lastRequestTime > 0 ? new Date(Number(lastRequestTime) * 1000).toLocaleString() : 'Never'}`);
          console.log(`Remaining cooldown: ${remainingCooldown} seconds`);
          console.log(`Can request: ${remainingCooldown === 0n ? 'Yes' : 'No'}`);
        } else {
          console.log(`Token not supported by faucet`);
        }
      }
      
    } catch (error) {
      console.error("❌ Error getting faucet info:", error);
    }
  });

task("faucet:emergency-withdraw", "Emergency withdraw tokens from faucet")
  .addParam("token", "Token contract address")
  .addParam("amount", "Amount to withdraw (in tokens, not wei)")
  .addParam("to", "Address to receive tokens")
  .addParam("faucet", "Faucet contract address")
  .setAction(async (taskArgs, hre) => {
    const { token, amount, to, faucet: faucetAddress } = taskArgs;
    
    try {
      const faucet = await getFaucetContract(hre, faucetAddress);
      const amountWei = hre.ethers.parseEther(amount);
      
      console.log(`Emergency withdrawing ${amount} tokens from ${token} to ${to}...`);
      
      const tx = await faucet.emergencyWithdraw(token, amountWei, to);
      await tx.wait();
      
      console.log(`✅ Emergency withdrawal successful!`);
      console.log(`Transaction hash: ${tx.hash}`);
      
    } catch (error) {
      console.error("❌ Error during emergency withdrawal:", error);
    }
  });

task("faucet:fund", "Fund the faucet with tokens")
  .addParam("token", "Token contract address")
  .addParam("amount", "Amount to transfer (in tokens, not wei)")
  .addParam("faucet", "Faucet contract address")
  .setAction(async (taskArgs, hre) => {
    const { token, amount, faucet: faucetAddress } = taskArgs;
    
    try {
      const tokenContract = await getTokenContract(hre, token);
      const amountWei = hre.ethers.parseEther(amount);
      
      console.log(`Funding faucet with ${amount} tokens...`);
      
      const tx = await tokenContract.transfer(faucetAddress, amountWei);
      await tx.wait();
      
      console.log(`✅ Faucet funded successfully!`);
      console.log(`Transaction hash: ${tx.hash}`);
      
      // Check new faucet balance
      const balance = await tokenContract.balanceOf(faucetAddress);
      console.log(`New faucet balance: ${hre.ethers.formatEther(balance)} tokens`);
      
    } catch (error) {
      console.error("❌ Error funding faucet:", error);
    }
  });