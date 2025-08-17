import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther } from "viem";

describe("DEX Integration Tests", function () {
  async function deployIntegrationFixture() {
    const [owner, user1, user2, feeTo] = await ethers.getSigners();

    // Deploy test tokens
    const TestToken = await ethers.getContractFactory("TestToken");
    const tokenA = await TestToken.deploy("Token A", "TKNA", parseEther("10000"));
    const tokenB = await TestToken.deploy("Token B", "TKNB", parseEther("10000"));

    // Deploy DEXFactory
    const DEXFactory = await ethers.getContractFactory("DEXFactory");
    const factory = await DEXFactory.deploy(feeTo.address);

    // Create pair
    await factory.createPair(tokenA.target, tokenB.target);
    const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
    
    // Get pair contract instance
    const DEXPair = await ethers.getContractFactory("DEXPair");
    const pair = DEXPair.attach(pairAddress);

    // Transfer tokens to users
    await tokenA.transfer(user1.address, parseEther("2000"));
    await tokenB.transfer(user1.address, parseEther("2000"));
    await tokenA.transfer(user2.address, parseEther("2000"));
    await tokenB.transfer(user2.address, parseEther("2000"));

    return {
      owner,
      user1,
      user2,
      feeTo,
      tokenA,
      tokenB,
      factory,
      pair,
    };
  }

  describe("Complete AMM Flow", function () {
    it("Should handle complete liquidity provision and swap flow", async function () {
      const { user1, user2, tokenA, tokenB, pair } = await loadFixture(deployIntegrationFixture);

      // Step 1: User1 provides initial liquidity
      const amount0 = parseEther("100");
      const amount1 = parseEther("200");

      await tokenA.connect(user1).transfer(pair.target, amount0);
      await tokenB.connect(user1).transfer(pair.target, amount1);
      await pair.connect(user1).mint(user1.address);

      // Verify reserves are set correctly
      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0).to.equal(amount0);
      expect(reserve1).to.equal(amount1);

      // Verify LP tokens were minted
      const lpBalance = await pair.balanceOf(user1.address);
      expect(lpBalance).to.be.gt(0n);

      // Step 2: User2 performs a swap
      const swapAmountIn = parseEther("10");
      const initialBalance = await tokenB.balanceOf(user2.address);

      await tokenA.connect(user2).transfer(pair.target, swapAmountIn);
      
      // Calculate expected output using x*y=k formula with 0.3% fee
      const reserveIn = reserve0;
      const reserveOut = reserve1;
      const amountInWithFee = swapAmountIn * 997n; // 0.3% fee
      const numerator = amountInWithFee * reserveOut;
      const denominator = (reserveIn * 1000n) + amountInWithFee;
      const expectedAmountOut = numerator / denominator;

      await pair.connect(user2).swap(0, expectedAmountOut, user2.address, "0x");

      // Verify swap occurred
      const finalBalance = await tokenB.balanceOf(user2.address);
      expect(finalBalance).to.be.gt(initialBalance);

      // Step 3: User1 removes liquidity
      const lpToRemove = lpBalance / 2n;
      await pair.connect(user1).transfer(pair.target, lpToRemove);
      
      const initialTokenABalance = await tokenA.balanceOf(user1.address);
      const initialTokenBBalance = await tokenB.balanceOf(user1.address);

      await pair.connect(user1).burn(user1.address);

      // Verify tokens were returned
      const finalTokenABalance = await tokenA.balanceOf(user1.address);
      const finalTokenBBalance = await tokenB.balanceOf(user1.address);
      
      expect(finalTokenABalance).to.be.gt(initialTokenABalance);
      expect(finalTokenBBalance).to.be.gt(initialTokenBBalance);
    });

    it("Should maintain price consistency across multiple swaps", async function () {
      const { user1, user2, tokenA, tokenB, pair } = await loadFixture(deployIntegrationFixture);

      // Provide initial liquidity
      await tokenA.connect(user1).transfer(pair.target, parseEther("1000"));
      await tokenB.connect(user1).transfer(pair.target, parseEther("2000"));
      await pair.connect(user1).mint(user1.address);

      // Perform multiple small swaps
      for (let i = 0; i < 5; i++) {
        const swapAmount = parseEther("1");
        await tokenA.connect(user2).transfer(pair.target, swapAmount);
        
        // Calculate expected output
        const [reserveA, reserveB] = await pair.getReserves();
        const amountInWithFee = swapAmount * 997n;
        const numerator = amountInWithFee * reserveB;
        const denominator = (reserveA * 1000n) + amountInWithFee;
        const expectedAmountOut = numerator / denominator;

        await pair.connect(user2).swap(0, expectedAmountOut, user2.address, "0x");
      }

      // Verify reserves are still positive and reasonable
      const [finalReserveA, finalReserveB] = await pair.getReserves();
      expect(finalReserveA).to.be.gt(parseEther("1000")); // Should have increased
      expect(finalReserveB).to.be.lt(parseEther("2000")); // Should have decreased
      expect(finalReserveB).to.be.gt(0n); // Should still be positive
    });

    it("Should handle edge case: minimum liquidity provision", async function () {
      const { user1, tokenA, tokenB, pair } = await loadFixture(deployIntegrationFixture);

      // Provide minimum viable liquidity (just above MINIMUM_LIQUIDITY threshold)
      const amount0 = parseEther("0.001"); // 1000000000000000 wei
      const amount1 = parseEther("0.001"); // 1000000000000000 wei

      await tokenA.connect(user1).transfer(pair.target, amount0);
      await tokenB.connect(user1).transfer(pair.target, amount1);
      
      // Should succeed as sqrt(amount0 * amount1) > MINIMUM_LIQUIDITY
      await expect(pair.connect(user1).mint(user1.address)).to.not.be.reverted;

      const lpBalance = await pair.balanceOf(user1.address);
      expect(lpBalance).to.be.gt(0n);
    });
  });

  describe("Protocol Fee Integration", function () {
    it("Should accumulate protocol fees when enabled", async function () {
      const { user1, user2, tokenA, tokenB, factory, pair, feeTo } = await loadFixture(deployIntegrationFixture);

      // Enable protocol fee (must be called by feeToSetter)
      await factory.connect(feeTo).setFeeTo(feeTo.address);

      // Provide initial liquidity
      await tokenA.connect(user1).transfer(pair.target, parseEther("100"));
      await tokenB.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      // Perform swaps to generate fees
      for (let i = 0; i < 10; i++) {
        const swapAmount = parseEther("1");
        await tokenA.connect(user2).transfer(pair.target, swapAmount);
        
        const [reserveA, reserveB] = await pair.getReserves();
        const amountInWithFee = swapAmount * 997n;
        const numerator = amountInWithFee * reserveB;
        const denominator = (reserveA * 1000n) + amountInWithFee;
        const expectedAmountOut = numerator / denominator;

        await pair.connect(user2).swap(0, expectedAmountOut, user2.address, "0x");
      }

      // Add more liquidity to trigger fee minting
      await tokenA.connect(user1).transfer(pair.target, parseEther("10"));
      await tokenB.connect(user1).transfer(pair.target, parseEther("20"));
      await pair.connect(user1).mint(user1.address);

      // Check if protocol fee recipient received LP tokens
      const feeToBalance = await pair.balanceOf(feeTo.address);
      expect(feeToBalance).to.be.gt(0n);
    });
  });
});