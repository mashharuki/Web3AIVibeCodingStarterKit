import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { TestTokenA, TestTokenB, TestTokenFaucet } from "../typechain-types";

describe("TestTokens Integration with Faucet", function () {
  let testTokenA: TestTokenA;
  let testTokenB: TestTokenB;
  let faucet: TestTokenFaucet;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  
  const INITIAL_SUPPLY_A = ethers.parseEther("1000000"); // 1M TTA
  const INITIAL_SUPPLY_B = ethers.parseEther("2000000"); // 2M TTB
  const FAUCET_SUPPLY_A = ethers.parseEther("100000"); // 100K TTA for faucet
  const FAUCET_SUPPLY_B = ethers.parseEther("200000"); // 200K TTB for faucet
  const DAILY_LIMIT_A = ethers.parseEther("1000"); // 1K TTA per day
  const DAILY_LIMIT_B = ethers.parseEther("2000"); // 2K TTB per day

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy test tokens
    const TestTokenAFactory = await ethers.getContractFactory("TestTokenA");
    testTokenA = await TestTokenAFactory.deploy(owner.address, INITIAL_SUPPLY_A);
    await testTokenA.waitForDeployment();
    
    const TestTokenBFactory = await ethers.getContractFactory("TestTokenB");
    testTokenB = await TestTokenBFactory.deploy(owner.address, INITIAL_SUPPLY_B);
    await testTokenB.waitForDeployment();
    
    // Deploy faucet
    const TestTokenFaucetFactory = await ethers.getContractFactory("TestTokenFaucet");
    faucet = await TestTokenFaucetFactory.deploy(owner.address);
    await faucet.waitForDeployment();
    
    // Setup faucet with tokens
    await faucet.addToken(await testTokenA.getAddress(), DAILY_LIMIT_A);
    await faucet.addToken(await testTokenB.getAddress(), DAILY_LIMIT_B);
    
    // Transfer tokens to faucet
    await testTokenA.transfer(await faucet.getAddress(), FAUCET_SUPPLY_A);
    await testTokenB.transfer(await faucet.getAddress(), FAUCET_SUPPLY_B);
  });

  describe("Faucet Integration", function () {
    it("Should allow users to request TestTokenA from faucet", async function () {
      const requestAmount = ethers.parseEther("500");
      
      await faucet.connect(user1).requestTokens(await testTokenA.getAddress(), requestAmount);
      
      expect(await testTokenA.balanceOf(user1.address)).to.equal(requestAmount);
      expect(await testTokenA.balanceOf(await faucet.getAddress())).to.equal(FAUCET_SUPPLY_A - requestAmount);
    });

    it("Should allow users to request TestTokenB from faucet", async function () {
      const requestAmount = ethers.parseEther("1000");
      
      await faucet.connect(user1).requestTokens(await testTokenB.getAddress(), requestAmount);
      
      expect(await testTokenB.balanceOf(user1.address)).to.equal(requestAmount);
      expect(await testTokenB.balanceOf(await faucet.getAddress())).to.equal(FAUCET_SUPPLY_B - requestAmount);
    });

    it("Should enforce daily limits for TestTokenA", async function () {
      const requestAmount = DAILY_LIMIT_A + ethers.parseEther("1");
      
      await expect(faucet.connect(user1).requestTokens(await testTokenA.getAddress(), requestAmount))
        .to.be.revertedWithCustomError(faucet, "ExceedsLimit");
    });

    it("Should enforce daily limits for TestTokenB", async function () {
      const requestAmount = DAILY_LIMIT_B + ethers.parseEther("1");
      
      await expect(faucet.connect(user1).requestTokens(await testTokenB.getAddress(), requestAmount))
        .to.be.revertedWithCustomError(faucet, "ExceedsLimit");
    });

    it("Should enforce cooldown period for TestTokenA", async function () {
      const requestAmount = ethers.parseEther("500");
      
      // First request should succeed
      await faucet.connect(user1).requestTokens(await testTokenA.getAddress(), requestAmount);
      
      // Second request immediately should fail
      await expect(faucet.connect(user1).requestTokens(await testTokenA.getAddress(), requestAmount))
        .to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
    });

    it("Should enforce cooldown period for TestTokenB", async function () {
      const requestAmount = ethers.parseEther("1000");
      
      // First request should succeed
      await faucet.connect(user1).requestTokens(await testTokenB.getAddress(), requestAmount);
      
      // Second request immediately should fail
      await expect(faucet.connect(user1).requestTokens(await testTokenB.getAddress(), requestAmount))
        .to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
    });

    it("Should allow different users to request tokens simultaneously", async function () {
      const requestAmountA = ethers.parseEther("500");
      const requestAmountB = ethers.parseEther("1000");
      
      await faucet.connect(user1).requestTokens(await testTokenA.getAddress(), requestAmountA);
      await faucet.connect(user2).requestTokens(await testTokenB.getAddress(), requestAmountB);
      
      expect(await testTokenA.balanceOf(user1.address)).to.equal(requestAmountA);
      expect(await testTokenB.balanceOf(user2.address)).to.equal(requestAmountB);
    });

    it("Should allow owner to mint additional tokens for faucet", async function () {
      const mintAmount = ethers.parseEther("50000");
      const faucetAddress = await faucet.getAddress();
      
      await testTokenA.mint(faucetAddress, mintAmount);
      
      expect(await testTokenA.balanceOf(faucetAddress)).to.equal(FAUCET_SUPPLY_A + mintAmount);
    });

    it("Should handle faucet running out of tokens", async function () {
      const faucetAddress = await faucet.getAddress();
      const faucetBalance = await testTokenA.balanceOf(faucetAddress);
      const excessiveAmount = faucetBalance + ethers.parseEther("1");
      
      // Update limit to allow the excessive amount
      await faucet.setTokenLimit(await testTokenA.getAddress(), excessiveAmount);
      
      await expect(faucet.connect(user1).requestTokens(await testTokenA.getAddress(), excessiveAmount))
        .to.be.revertedWithCustomError(faucet, "InsufficientFaucetBalance");
    });

    it("Should allow owner to update token limits", async function () {
      const newLimit = ethers.parseEther("5000");
      
      await faucet.setTokenLimit(await testTokenA.getAddress(), newLimit);
      
      expect(await faucet.getTokenLimit(await testTokenA.getAddress())).to.equal(newLimit);
      
      // Should now allow requests up to new limit
      await faucet.connect(user1).requestTokens(await testTokenA.getAddress(), newLimit);
      expect(await testTokenA.balanceOf(user1.address)).to.equal(newLimit);
    });

    it("Should track last request times correctly", async function () {
      const requestAmount = ethers.parseEther("500");
      const tokenAddress = await testTokenA.getAddress();
      
      // Check initial state
      expect(await faucet.getLastRequestTime(user1.address, tokenAddress)).to.equal(0);
      
      // Make request
      const tx = await faucet.connect(user1).requestTokens(tokenAddress, requestAmount);
      const receipt = await tx.wait();
      const blockTimestamp = (await ethers.provider.getBlock(receipt!.blockNumber))!.timestamp;
      
      // Check updated timestamp
      expect(await faucet.getLastRequestTime(user1.address, tokenAddress)).to.equal(blockTimestamp);
    });

    it("Should show correct remaining cooldown time", async function () {
      const requestAmount = ethers.parseEther("500");
      const tokenAddress = await testTokenA.getAddress();
      
      // Make initial request
      await faucet.connect(user1).requestTokens(tokenAddress, requestAmount);
      
      // Check remaining cooldown (should be close to 24 hours)
      const remainingCooldown = await faucet.getRemainingCooldown(user1.address, tokenAddress);
      const expectedCooldown = 24 * 60 * 60; // 24 hours in seconds
      
      // Allow for small timing differences
      expect(remainingCooldown).to.be.closeTo(expectedCooldown, 10);
    });

    it("Should allow emergency withdrawal by owner", async function () {
      const withdrawAmount = ethers.parseEther("10000");
      const faucetAddress = await faucet.getAddress();
      const initialOwnerBalance = await testTokenA.balanceOf(owner.address);
      
      await faucet.emergencyWithdraw(await testTokenA.getAddress(), withdrawAmount, owner.address);
      
      expect(await testTokenA.balanceOf(owner.address)).to.equal(initialOwnerBalance + withdrawAmount);
      expect(await testTokenA.balanceOf(faucetAddress)).to.equal(FAUCET_SUPPLY_A - withdrawAmount);
    });
  });

  describe("Token Compatibility", function () {
    it("Should verify TestTokenA implements all required IERC20 functions", async function () {
      // Test all IERC20 functions are callable
      expect(await testTokenA.name()).to.equal("Test Token A");
      expect(await testTokenA.symbol()).to.equal("TTA");
      expect(await testTokenA.decimals()).to.equal(18);
      expect(await testTokenA.totalSupply()).to.equal(INITIAL_SUPPLY_A);
      expect(await testTokenA.balanceOf(owner.address)).to.be.gt(0);
      
      // Test transfer functions
      const transferAmount = ethers.parseEther("100");
      await testTokenA.approve(user1.address, transferAmount);
      expect(await testTokenA.allowance(owner.address, user1.address)).to.equal(transferAmount);
      
      await testTokenA.transfer(user1.address, transferAmount);
      expect(await testTokenA.balanceOf(user1.address)).to.equal(transferAmount);
    });

    it("Should verify TestTokenB implements all required IERC20 functions", async function () {
      // Test all IERC20 functions are callable
      expect(await testTokenB.name()).to.equal("Test Token B");
      expect(await testTokenB.symbol()).to.equal("TTB");
      expect(await testTokenB.decimals()).to.equal(18);
      expect(await testTokenB.totalSupply()).to.equal(INITIAL_SUPPLY_B);
      expect(await testTokenB.balanceOf(owner.address)).to.be.gt(0);
      
      // Test transfer functions
      const transferAmount = ethers.parseEther("100");
      await testTokenB.approve(user1.address, transferAmount);
      expect(await testTokenB.allowance(owner.address, user1.address)).to.equal(transferAmount);
      
      await testTokenB.transfer(user1.address, transferAmount);
      expect(await testTokenB.balanceOf(user1.address)).to.equal(transferAmount);
    });

    it("Should work with DEX contracts (basic compatibility test)", async function () {
      // This test verifies the tokens can be used in DEX operations
      // by testing basic transfer and approval operations that DEX would use
      
      const user1Balance = ethers.parseEther("1000");
      const user2Balance = ethers.parseEther("2000");
      
      // Transfer tokens to users (simulating initial distribution)
      await testTokenA.transfer(user1.address, user1Balance);
      await testTokenB.transfer(user2.address, user2Balance);
      
      // Users approve each other (simulating DEX router approvals)
      await testTokenA.connect(user1).approve(user2.address, user1Balance);
      await testTokenB.connect(user2).approve(user1.address, user2Balance);
      
      // Cross transfers (simulating swap operations)
      const swapAmountA = ethers.parseEther("500");
      const swapAmountB = ethers.parseEther("1000");
      
      await testTokenA.connect(user2).transferFrom(user1.address, user2.address, swapAmountA);
      await testTokenB.connect(user1).transferFrom(user2.address, user1.address, swapAmountB);
      
      // Verify final balances
      expect(await testTokenA.balanceOf(user1.address)).to.equal(user1Balance - swapAmountA);
      expect(await testTokenA.balanceOf(user2.address)).to.equal(swapAmountA);
      expect(await testTokenB.balanceOf(user1.address)).to.equal(swapAmountB);
      expect(await testTokenB.balanceOf(user2.address)).to.equal(user2Balance - swapAmountB);
    });
  });

  describe("Supply Management", function () {
    it("Should allow owner to mint additional TestTokenA for ecosystem needs", async function () {
      const mintAmount = ethers.parseEther("100000");
      const initialSupply = await testTokenA.totalSupply();
      const initialOwnerBalance = await testTokenA.balanceOf(owner.address);
      
      await testTokenA.mint(owner.address, mintAmount);
      
      expect(await testTokenA.totalSupply()).to.equal(initialSupply + mintAmount);
      expect(await testTokenA.balanceOf(owner.address)).to.equal(initialOwnerBalance + mintAmount);
    });

    it("Should allow owner to mint additional TestTokenB for ecosystem needs", async function () {
      const mintAmount = ethers.parseEther("200000");
      const initialSupply = await testTokenB.totalSupply();
      const initialOwnerBalance = await testTokenB.balanceOf(owner.address);
      
      await testTokenB.mint(owner.address, mintAmount);
      
      expect(await testTokenB.totalSupply()).to.equal(initialSupply + mintAmount);
      expect(await testTokenB.balanceOf(owner.address)).to.equal(initialOwnerBalance + mintAmount);
    });

    it("Should prevent minting beyond maximum supply", async function () {
      const maxSupply = await testTokenA.maxSupply();
      const currentSupply = await testTokenA.totalSupply();
      const excessiveAmount = maxSupply - currentSupply + ethers.parseEther("1");
      
      await expect(testTokenA.mint(owner.address, excessiveAmount))
        .to.be.revertedWith("Exceeds maximum supply");
    });
  });
});