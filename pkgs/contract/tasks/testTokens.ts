import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Deploy TestTokenA contract
 */
task("deploy-test-token-a", "Deploy TestTokenA contract")
  .addParam("owner", "Initial owner address")
  .addOptionalParam("supply", "Initial supply in ether (default: 1000000)", "1000000")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { owner, supply } = taskArgs;
    
    console.log("Deploying TestTokenA...");
    console.log("Owner:", owner);
    console.log("Initial Supply:", supply, "TTA");
    
    const TestTokenA = await hre.ethers.getContractFactory("TestTokenA");
    const initialSupply = hre.ethers.parseEther(supply);
    
    const testTokenA = await TestTokenA.deploy(owner, initialSupply);
    await testTokenA.waitForDeployment();
    
    const address = await testTokenA.getAddress();
    console.log("TestTokenA deployed to:", address);
    
    // Verify deployment
    const name = await testTokenA.name();
    const symbol = await testTokenA.symbol();
    const totalSupply = await testTokenA.totalSupply();
    const ownerBalance = await testTokenA.balanceOf(owner);
    
    console.log("Contract Details:");
    console.log("- Name:", name);
    console.log("- Symbol:", symbol);
    console.log("- Total Supply:", hre.ethers.formatEther(totalSupply), "TTA");
    console.log("- Owner Balance:", hre.ethers.formatEther(ownerBalance), "TTA");
    
    return address;
  });

/**
 * Deploy TestTokenB contract
 */
task("deploy-test-token-b", "Deploy TestTokenB contract")
  .addParam("owner", "Initial owner address")
  .addOptionalParam("supply", "Initial supply in ether (default: 2000000)", "2000000")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { owner, supply } = taskArgs;
    
    console.log("Deploying TestTokenB...");
    console.log("Owner:", owner);
    console.log("Initial Supply:", supply, "TTB");
    
    const TestTokenB = await hre.ethers.getContractFactory("TestTokenB");
    const initialSupply = hre.ethers.parseEther(supply);
    
    const testTokenB = await TestTokenB.deploy(owner, initialSupply);
    await testTokenB.waitForDeployment();
    
    const address = await testTokenB.getAddress();
    console.log("TestTokenB deployed to:", address);
    
    // Verify deployment
    const name = await testTokenB.name();
    const symbol = await testTokenB.symbol();
    const totalSupply = await testTokenB.totalSupply();
    const ownerBalance = await testTokenB.balanceOf(owner);
    
    console.log("Contract Details:");
    console.log("- Name:", name);
    console.log("- Symbol:", symbol);
    console.log("- Total Supply:", hre.ethers.formatEther(totalSupply), "TTB");
    console.log("- Owner Balance:", hre.ethers.formatEther(ownerBalance), "TTB");
    
    return address;
  });

/**
 * Mint tokens to specified address
 */
task("mint-test-token", "Mint test tokens to specified address")
  .addParam("token", "Token contract address")
  .addParam("to", "Recipient address")
  .addParam("amount", "Amount to mint in ether")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { token, to, amount } = taskArgs;
    
    console.log("Minting test tokens...");
    console.log("Token:", token);
    console.log("To:", to);
    console.log("Amount:", amount, "tokens");
    
    // Get contract instance (works for both TestTokenA and TestTokenB)
    const TestToken = await hre.ethers.getContractAt("TestTokenA", token);
    const mintAmount = hre.ethers.parseEther(amount);
    
    // Check current supply and max supply
    const currentSupply = await TestToken.totalSupply();
    const maxSupply = await TestToken.maxSupply();
    const symbol = await TestToken.symbol();
    
    console.log("Current Supply:", hre.ethers.formatEther(currentSupply), symbol);
    console.log("Max Supply:", hre.ethers.formatEther(maxSupply), symbol);
    
    if (currentSupply + mintAmount > maxSupply) {
      throw new Error("Mint amount would exceed maximum supply");
    }
    
    // Mint tokens
    const tx = await TestToken.mint(to, mintAmount);
    await tx.wait();
    
    console.log("Minted", amount, symbol, "to", to);
    console.log("Transaction hash:", tx.hash);
    
    // Verify mint
    const newBalance = await TestToken.balanceOf(to);
    const newSupply = await TestToken.totalSupply();
    
    console.log("New recipient balance:", hre.ethers.formatEther(newBalance), symbol);
    console.log("New total supply:", hre.ethers.formatEther(newSupply), symbol);
  });

/**
 * Transfer tokens between addresses
 */
task("transfer-test-token", "Transfer test tokens between addresses")
  .addParam("token", "Token contract address")
  .addParam("from", "Sender address (must be signer)")
  .addParam("to", "Recipient address")
  .addParam("amount", "Amount to transfer in ether")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { token, from, to, amount } = taskArgs;
    
    console.log("Transferring test tokens...");
    console.log("Token:", token);
    console.log("From:", from);
    console.log("To:", to);
    console.log("Amount:", amount, "tokens");
    
    // Get signer for the from address
    const signers = await hre.ethers.getSigners();
    const signer = signers.find(s => s.address.toLowerCase() === from.toLowerCase());
    
    if (!signer) {
      throw new Error(`No signer found for address ${from}`);
    }
    
    // Get contract instance
    const TestToken = await hre.ethers.getContractAt("TestTokenA", token, signer);
    const transferAmount = hre.ethers.parseEther(amount);
    const symbol = await TestToken.symbol();
    
    // Check balance
    const senderBalance = await TestToken.balanceOf(from);
    console.log("Sender balance:", hre.ethers.formatEther(senderBalance), symbol);
    
    if (senderBalance < transferAmount) {
      throw new Error("Insufficient balance for transfer");
    }
    
    // Transfer tokens
    const tx = await TestToken.transfer(to, transferAmount);
    await tx.wait();
    
    console.log("Transferred", amount, symbol, "from", from, "to", to);
    console.log("Transaction hash:", tx.hash);
    
    // Verify transfer
    const newSenderBalance = await TestToken.balanceOf(from);
    const newRecipientBalance = await TestToken.balanceOf(to);
    
    console.log("New sender balance:", hre.ethers.formatEther(newSenderBalance), symbol);
    console.log("New recipient balance:", hre.ethers.formatEther(newRecipientBalance), symbol);
  });

/**
 * Get token information
 */
task("test-token-info", "Get test token information")
  .addParam("token", "Token contract address")
  .addOptionalParam("account", "Account address to check balance")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { token, account } = taskArgs;
    
    console.log("Getting test token information...");
    console.log("Token:", token);
    
    // Get contract instance
    const TestToken = await hre.ethers.getContractAt("TestTokenA", token);
    
    // Get basic info
    const name = await TestToken.name();
    const symbol = await TestToken.symbol();
    const decimals = await TestToken.decimals();
    const totalSupply = await TestToken.totalSupply();
    const maxSupply = await TestToken.maxSupply();
    const owner = await TestToken.owner();
    
    console.log("\n=== Token Information ===");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Decimals:", decimals);
    console.log("Total Supply:", hre.ethers.formatEther(totalSupply), symbol);
    console.log("Max Supply:", hre.ethers.formatEther(maxSupply), symbol);
    console.log("Owner:", owner);
    console.log("Supply Utilization:", ((Number(totalSupply) / Number(maxSupply)) * 100).toFixed(2) + "%");
    
    if (account) {
      const balance = await TestToken.balanceOf(account);
      console.log("\n=== Account Information ===");
      console.log("Account:", account);
      console.log("Balance:", hre.ethers.formatEther(balance), symbol);
      console.log("% of Total Supply:", ((Number(balance) / Number(totalSupply)) * 100).toFixed(2) + "%");
    }
  });

/**
 * Setup test tokens for faucet
 */
task("setup-faucet-tokens", "Setup test tokens for faucet integration")
  .addParam("faucet", "Faucet contract address")
  .addParam("tokenA", "TestTokenA contract address")
  .addParam("tokenB", "TestTokenB contract address")
  .addOptionalParam("limitA", "Daily limit for TokenA in ether (default: 1000)", "1000")
  .addOptionalParam("limitB", "Daily limit for TokenB in ether (default: 2000)", "2000")
  .addOptionalParam("supplyA", "Supply to transfer to faucet for TokenA in ether (default: 100000)", "100000")
  .addOptionalParam("supplyB", "Supply to transfer to faucet for TokenB in ether (default: 200000)", "200000")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { faucet, tokenA, tokenB, limitA, limitB, supplyA, supplyB } = taskArgs;
    
    console.log("Setting up test tokens for faucet...");
    console.log("Faucet:", faucet);
    console.log("TokenA:", tokenA);
    console.log("TokenB:", tokenB);
    
    // Get contract instances
    const Faucet = await hre.ethers.getContractAt("TestTokenFaucet", faucet);
    const TestTokenA = await hre.ethers.getContractAt("TestTokenA", tokenA);
    const TestTokenB = await hre.ethers.getContractAt("TestTokenB", tokenB);
    
    const limitAmountA = hre.ethers.parseEther(limitA);
    const limitAmountB = hre.ethers.parseEther(limitB);
    const supplyAmountA = hre.ethers.parseEther(supplyA);
    const supplyAmountB = hre.ethers.parseEther(supplyB);
    
    console.log("\n=== Adding tokens to faucet ===");
    
    // Add TokenA to faucet
    const isTokenASupported = await Faucet.isTokenSupported(tokenA);
    if (!isTokenASupported) {
      console.log("Adding TestTokenA to faucet...");
      const tx1 = await Faucet.addToken(tokenA, limitAmountA);
      await tx1.wait();
      console.log("TestTokenA added with daily limit:", limitA, "TTA");
    } else {
      console.log("TestTokenA already supported, updating limit...");
      const tx1 = await Faucet.setTokenLimit(tokenA, limitAmountA);
      await tx1.wait();
      console.log("TestTokenA limit updated to:", limitA, "TTA");
    }
    
    // Add TokenB to faucet
    const isTokenBSupported = await Faucet.isTokenSupported(tokenB);
    if (!isTokenBSupported) {
      console.log("Adding TestTokenB to faucet...");
      const tx2 = await Faucet.addToken(tokenB, limitAmountB);
      await tx2.wait();
      console.log("TestTokenB added with daily limit:", limitB, "TTB");
    } else {
      console.log("TestTokenB already supported, updating limit...");
      const tx2 = await Faucet.setTokenLimit(tokenB, limitAmountB);
      await tx2.wait();
      console.log("TestTokenB limit updated to:", limitB, "TTB");
    }
    
    console.log("\n=== Transferring tokens to faucet ===");
    
    // Transfer TokenA to faucet
    console.log("Transferring", supplyA, "TTA to faucet...");
    const tx3 = await TestTokenA.transfer(faucet, supplyAmountA);
    await tx3.wait();
    console.log("Transferred", supplyA, "TTA to faucet");
    
    // Transfer TokenB to faucet
    console.log("Transferring", supplyB, "TTB to faucet...");
    const tx4 = await TestTokenB.transfer(faucet, supplyAmountB);
    await tx4.wait();
    console.log("Transferred", supplyB, "TTB to faucet");
    
    console.log("\n=== Verification ===");
    
    // Verify setup
    const faucetBalanceA = await TestTokenA.balanceOf(faucet);
    const faucetBalanceB = await TestTokenB.balanceOf(faucet);
    const limitA_check = await Faucet.getTokenLimit(tokenA);
    const limitB_check = await Faucet.getTokenLimit(tokenB);
    
    console.log("Faucet TestTokenA balance:", hre.ethers.formatEther(faucetBalanceA), "TTA");
    console.log("Faucet TestTokenB balance:", hre.ethers.formatEther(faucetBalanceB), "TTB");
    console.log("TestTokenA daily limit:", hre.ethers.formatEther(limitA_check), "TTA");
    console.log("TestTokenB daily limit:", hre.ethers.formatEther(limitB_check), "TTB");
    
    console.log("\n✅ Faucet setup completed successfully!");
  });