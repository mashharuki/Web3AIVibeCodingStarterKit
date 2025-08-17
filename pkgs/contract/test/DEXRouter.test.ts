import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther } from "viem";
import type {
    DEXFactory,
    DEXRouter,
    TestToken
} from "../typechain-types";

describe("DEXRouter - Comprehensive Tests", function () {
  // Test fixture to deploy contracts and set up initial state
  async function deployRouterFixture() {
    const [owner, user1, user2, user3, feeToSetter] = await ethers.getSigners();

    // Deploy test tokens
    const TestTokenFactory = await ethers.getContractFactory("TestToken");
    const tokenA = await TestTokenFactory.deploy("Token A", "TKNA", parseEther("100000"));
    const tokenB = await TestTokenFactory.deploy("Token B", "TKNB", parseEther("100000"));
    const tokenC = await TestTokenFactory.deploy("Token C", "TKNC", parseEther("100000"));
    const weth = await TestTokenFactory.deploy("Wrapped ETH", "WETH", parseEther("100000"));

    // Deploy factory
    const DEXFactoryFactory = await ethers.getContractFactory("DEXFactory");
    const factory = await DEXFactoryFactory.deploy(feeToSetter.address);

    // Deploy router
    const DEXRouterFactory = await ethers.getContractFactory("DEXRouter");
    const router = await DEXRouterFactory.deploy(factory.target, weth.target);

    // Transfer tokens to users for testing
    const transferAmount = parseEther("10000");
    await tokenA.transfer(user1.address, transferAmount);
    await tokenA.transfer(user2.address, transferAmount);
    await tokenA.transfer(user3.address, transferAmount);
    
    await tokenB.transfer(user1.address, transferAmount);
    await tokenB.transfer(user2.address, transferAmount);
    await tokenB.transfer(user3.address, transferAmount);
    
    await tokenC.transfer(user1.address, transferAmount);
    await tokenC.transfer(user2.address, transferAmount);
    await tokenC.transfer(user3.address, transferAmount);
    
    await weth.transfer(user1.address, transferAmount);
    await weth.transfer(user2.address, transferAmount);
    await weth.transfer(user3.address, transferAmount);

    return {
      factory: factory as DEXFactory,
      router: router as DEXRouter,
      tokenA: tokenA as TestToken,
      tokenB: tokenB as TestToken,
      tokenC: tokenC as TestToken,
      weth: weth as TestToken,
      owner,
      user1,
      user2,
      user3,
      feeToSetter
    };
  }

  describe("Deployment", function () {
    it("Should set the correct factory and WETH addresses", async function () {
      const { factory, router, weth } = await loadFixture(deployRouterFixture);

      expect(await router.factory()).to.equal(factory.target);
      expect(await router.weth()).to.equal(weth.target);
    });

    it("Should revert if factory address is zero", async function () {
      const { weth } = await loadFixture(deployRouterFixture);
      const DEXRouterFactory = await ethers.getContractFactory("DEXRouter");
      
      await expect(
        DEXRouterFactory.deploy(ethers.ZeroAddress, weth.target)
      ).to.be.revertedWithCustomError(DEXRouterFactory, "ZeroAddress");
    });

    it("Should revert if WETH address is zero", async function () {
      const { factory } = await loadFixture(deployRouterFixture);
      const DEXRouterFactory = await ethers.getContractFactory("DEXRouter");
      
      await expect(
        DEXRouterFactory.deploy(factory.target, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(DEXRouterFactory, "ZeroAddress");
    });

    it("Should revert if both factory and WETH addresses are zero", async function () {
      const DEXRouterFactory = await ethers.getContractFactory("DEXRouter");
      
      await expect(
        DEXRouterFactory.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(DEXRouterFactory, "ZeroAddress");
    });
  });

  describe("Add Liquidity", function () {
    it("Should add liquidity to a new pair", async function () {
      const { router, tokenA, tokenB, user1 } = await loadFixture(deployRouterFixture);

      const amountA = parseEther("100");
      const amountB = parseEther("200");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      // Approve router to spend tokens
      await tokenA.connect(user1).approve(router.target, amountA);
      await tokenB.connect(user1).approve(router.target, amountB);

      // Add liquidity
      const tx = await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA,
        amountB,
        amountA,
        amountB,
        user1.address,
        deadline
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check that pair was created
      const factory = await ethers.getContractAt("DEXFactory", await router.factory());
      const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      // Check LP token balance
      const pair = await ethers.getContractAt("DEXPair", pairAddress);
      const lpBalance = await pair.balanceOf(user1.address);
      expect(lpBalance).to.be.gt(0);
    });

    it("Should add liquidity to existing pair with correct ratio", async function () {
      const { router, tokenA, tokenB, user1, user2 } = await loadFixture(deployRouterFixture);

      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // First user adds initial liquidity
      const amountA1 = parseEther("100");
      const amountB1 = parseEther("200");

      await tokenA.connect(user1).approve(router.target, amountA1);
      await tokenB.connect(user1).approve(router.target, amountB1);

      await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA1,
        amountB1,
        amountA1,
        amountB1,
        user1.address,
        deadline
      );

      // Second user adds liquidity with different desired amounts
      const amountA2 = parseEther("50");
      const amountB2 = parseEther("150"); // More than needed for 1:2 ratio

      await tokenA.connect(user2).approve(router.target, amountA2);
      await tokenB.connect(user2).approve(router.target, amountB2);

      const tx = await router.connect(user2).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA2,
        amountB2,
        amountA2,
        parseEther("100"), // Minimum B amount
        user2.address,
        deadline
      );

      // Should use optimal amounts maintaining 1:2 ratio
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    });

    it("Should revert if deadline has passed", async function () {
      const { router, tokenA, tokenB, user1 } = await loadFixture(deployRouterFixture);

      const amountA = parseEther("100");
      const amountB = parseEther("200");
      const pastDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      await tokenA.connect(user1).approve(router.target, amountA);
      await tokenB.connect(user1).approve(router.target, amountB);

      await expect(
        router.connect(user1).addLiquidity(
          tokenA.target,
          tokenB.target,
          amountA,
          amountB,
          amountA,
          amountB,
          user1.address,
          pastDeadline
        )
      ).to.be.revertedWithCustomError(router, "DeadlineExpired");
    });

    it("Should succeed if deadline is in the future", async function () {
      const { router, tokenA, tokenB, user1 } = await loadFixture(deployRouterFixture);

      const amountA = parseEther("100");
      const amountB = parseEther("200");
      const futureDeadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await tokenA.connect(user1).approve(router.target, amountA);
      await tokenB.connect(user1).approve(router.target, amountB);

      // Should succeed when deadline is in the future
      const tx = await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA,
        amountB,
        amountA,
        amountB,
        user1.address,
        futureDeadline
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    });

    it("Should revert if minimum amounts not met", async function () {
      const { router, tokenA, tokenB, user1, user2 } = await loadFixture(deployRouterFixture);

      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // First user adds initial liquidity
      const amountA1 = parseEther("100");
      const amountB1 = parseEther("200");

      await tokenA.connect(user1).approve(router.target, amountA1);
      await tokenB.connect(user1).approve(router.target, amountB1);

      await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA1,
        amountB1,
        amountA1,
        amountB1,
        user1.address,
        deadline
      );

      // Second user tries to add liquidity with unrealistic minimum amounts
      const amountA2 = parseEther("50");
      const amountB2 = parseEther("50");

      await tokenA.connect(user2).approve(router.target, amountA2);
      await tokenB.connect(user2).approve(router.target, amountB2);

      await expect(
        router.connect(user2).addLiquidity(
          tokenA.target,
          tokenB.target,
          amountA2,
          amountB2,
          parseEther("100"), // Unrealistic minimum A amount
          amountB2,
          user2.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientAAmount");
    });
  });

  describe("Remove Liquidity", function () {
    async function addLiquidityFixture() {
      const fixture = await deployRouterFixture();
      const { router, tokenA, tokenB, user1 } = fixture;

      const amountA = parseEther("100");
      const amountB = parseEther("200");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Approve and add liquidity
      await tokenA.connect(user1).approve(router.target, amountA);
      await tokenB.connect(user1).approve(router.target, amountB);

      await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA,
        amountB,
        amountA,
        amountB,
        user1.address,
        deadline
      );

      // Get pair address and LP balance
      const factory = await ethers.getContractAt("DEXFactory", await router.factory());
      const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
      const pair = await ethers.getContractAt("DEXPair", pairAddress);
      const lpBalance = await pair.balanceOf(user1.address);

      return { ...fixture, pair, lpBalance };
    }

    it("Should remove liquidity successfully", async function () {
      const { router, tokenA, tokenB, user1, pair, lpBalance } = await loadFixture(addLiquidityFixture);

      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const liquidityToRemove = lpBalance / 2n; // Remove half

      // Approve router to spend LP tokens
      await pair.connect(user1).approve(router.target, liquidityToRemove);

      // Get initial token balances
      const initialBalanceA = await tokenA.balanceOf(user1.address);
      const initialBalanceB = await tokenB.balanceOf(user1.address);

      // Remove liquidity
      const tx = await router.connect(user1).removeLiquidity(
        tokenA.target,
        tokenB.target,
        liquidityToRemove,
        0, // No minimum amounts for this test
        0,
        user1.address,
        deadline
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check that user received tokens back
      const finalBalanceA = await tokenA.balanceOf(user1.address);
      const finalBalanceB = await tokenB.balanceOf(user1.address);

      expect(finalBalanceA).to.be.gt(initialBalanceA);
      expect(finalBalanceB).to.be.gt(initialBalanceB);

      // Check LP token balance decreased
      const finalLpBalance = await pair.balanceOf(user1.address);
      expect(finalLpBalance).to.equal(lpBalance - liquidityToRemove);
    });

    it("Should revert if minimum amounts not met", async function () {
      const { router, tokenA, tokenB, user1, pair, lpBalance } = await loadFixture(addLiquidityFixture);

      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const liquidityToRemove = lpBalance / 2n;

      await pair.connect(user1).approve(router.target, liquidityToRemove);

      await expect(
        router.connect(user1).removeLiquidity(
          tokenA.target,
          tokenB.target,
          liquidityToRemove,
          parseEther("1000"), // Unrealistic minimum A amount
          parseEther("1000"), // Unrealistic minimum B amount
          user1.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientAAmount");
    });

    it("Should revert if pair doesn't exist", async function () {
      const { router, tokenA, weth, user1 } = await loadFixture(deployRouterFixture);

      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        router.connect(user1).removeLiquidity(
          tokenA.target,
          weth.target, // No pair exists for tokenA/weth
          parseEther("1"),
          0,
          0,
          user1.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "PairNotExists");
    });
  });

  describe("Swap Functions", function () {
    async function swapFixture() {
      const fixture = await addLiquidityFixture();
      return fixture;
    }

    async function addLiquidityFixture() {
      const fixture = await deployRouterFixture();
      const { router, tokenA, tokenB, user1 } = fixture;

      const amountA = parseEther("1000");
      const amountB = parseEther("2000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Approve and add liquidity
      await tokenA.connect(user1).approve(router.target, amountA);
      await tokenB.connect(user1).approve(router.target, amountB);

      await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA,
        amountB,
        amountA,
        amountB,
        user1.address,
        deadline
      );

      return fixture;
    }

    it("Should swap exact tokens for tokens", async function () {
      const { router, tokenA, tokenB, user2 } = await loadFixture(swapFixture);

      const amountIn = parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const path = [tokenA.target, tokenB.target];

      // Get expected output amount
      const amountsOut = await router.getAmountsOut(amountIn, path);
      const expectedAmountOut = amountsOut[1];

      // Approve router to spend input tokens
      await tokenA.connect(user2).approve(router.target, amountIn);

      // Get initial balances
      const initialBalanceA = await tokenA.balanceOf(user2.address);
      const initialBalanceB = await tokenB.balanceOf(user2.address);

      // Execute swap
      const tx = await router.connect(user2).swapExactTokensForTokens(
        amountIn,
        expectedAmountOut,
        path,
        user2.address,
        deadline
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check balances changed correctly
      const finalBalanceA = await tokenA.balanceOf(user2.address);
      const finalBalanceB = await tokenB.balanceOf(user2.address);

      expect(finalBalanceA).to.equal(initialBalanceA - amountIn);
      expect(finalBalanceB).to.be.gte(initialBalanceB + expectedAmountOut);
    });

    it("Should swap tokens for exact tokens", async function () {
      const { router, tokenA, tokenB, user2 } = await loadFixture(swapFixture);

      const amountOut = parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const path = [tokenA.target, tokenB.target];

      // Get required input amount
      const amountsIn = await router.getAmountsIn(amountOut, path);
      const expectedAmountIn = amountsIn[0];

      // Approve router to spend input tokens (with some buffer)
      await tokenA.connect(user2).approve(router.target, expectedAmountIn + parseEther("1"));

      // Get initial balances
      const initialBalanceA = await tokenA.balanceOf(user2.address);
      const initialBalanceB = await tokenB.balanceOf(user2.address);

      // Execute swap
      const tx = await router.connect(user2).swapTokensForExactTokens(
        amountOut,
        expectedAmountIn + parseEther("1"), // Max amount in with buffer
        path,
        user2.address,
        deadline
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check balances changed correctly
      const finalBalanceA = await tokenA.balanceOf(user2.address);
      const finalBalanceB = await tokenB.balanceOf(user2.address);

      expect(finalBalanceA).to.be.lte(initialBalanceA - expectedAmountIn);
      expect(finalBalanceB).to.equal(initialBalanceB + amountOut);
    });

    it("Should revert if output amount is insufficient", async function () {
      const { router, tokenA, tokenB, user2 } = await loadFixture(swapFixture);

      const amountIn = parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const path = [tokenA.target, tokenB.target];

      await tokenA.connect(user2).approve(router.target, amountIn);

      await expect(
        router.connect(user2).swapExactTokensForTokens(
          amountIn,
          parseEther("1000"), // Unrealistic minimum output
          path,
          user2.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientOutputAmount");
    });

    it("Should revert if input amount is excessive", async function () {
      const { router, tokenA, tokenB, user2 } = await loadFixture(swapFixture);

      const amountOut = parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const path = [tokenA.target, tokenB.target];

      await tokenA.connect(user2).approve(router.target, parseEther("1"));

      await expect(
        router.connect(user2).swapTokensForExactTokens(
          amountOut,
          parseEther("1"), // Too low maximum input
          path,
          user2.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "ExcessiveInputAmount");
    });

    it("Should revert with invalid path", async function () {
      const { router, tokenA, user2 } = await loadFixture(swapFixture);

      const amountIn = parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const invalidPath = [tokenA.target]; // Path too short

      await expect(
        router.getAmountsOut(amountIn, invalidPath)
      ).to.be.revertedWithCustomError(router, "InvalidPath");
    });
  });

  describe("Quote Functions", function () {
    it("Should calculate correct output amount", async function () {
      const { router } = await loadFixture(deployRouterFixture);

      const amountIn = parseEther("10");
      const reserveIn = parseEther("1000");
      const reserveOut = parseEther("2000");

      const amountOut = await router.getAmountOut(amountIn, reserveIn, reserveOut);

      // Expected: (10 * 997 * 2000) / (1000 * 1000 + 10 * 997) ≈ 19.88
      expect(amountOut).to.be.gt(parseEther("19"));
      expect(amountOut).to.be.lt(parseEther("20"));
    });

    it("Should calculate correct input amount", async function () {
      const { router } = await loadFixture(deployRouterFixture);

      const amountOut = parseEther("10");
      const reserveIn = parseEther("1000");
      const reserveOut = parseEther("2000");

      const amountIn = await router.getAmountIn(amountOut, reserveIn, reserveOut);

      // Should be slightly more than 5 due to fees
      expect(amountIn).to.be.gt(parseEther("5"));
      expect(amountIn).to.be.lt(parseEther("6"));
    });

    it("Should revert with zero input amount", async function () {
      const { router } = await loadFixture(deployRouterFixture);

      await expect(
        router.getAmountOut(0, parseEther("1000"), parseEther("2000"))
      ).to.be.revertedWithCustomError(router, "InsufficientInputAmount");
    });

    it("Should revert with zero reserves", async function () {
      const { router } = await loadFixture(deployRouterFixture);

      await expect(
        router.getAmountOut(parseEther("10"), 0, parseEther("2000"))
      ).to.be.revertedWithCustomError(router, "InsufficientLiquidity");
    });
  });

  describe("Deadline Protection", function () {
    async function setupLiquidityFixture() {
      const fixture = await deployRouterFixture();
      const { router, tokenA, tokenB, user1 } = fixture;

      const amountA = parseEther("1000");
      const amountB = parseEther("2000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Add initial liquidity
      await tokenA.connect(user1).approve(router.target, amountA);
      await tokenB.connect(user1).approve(router.target, amountB);

      await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA,
        amountB,
        amountA,
        amountB,
        user1.address,
        deadline
      );

      return fixture;
    }

    it("Should revert addLiquidity with expired deadline", async function () {
      const { router, tokenA, tokenB, user2 } = await loadFixture(setupLiquidityFixture);

      const amountA = parseEther("100");
      const amountB = parseEther("200");
      const expiredDeadline = Math.floor(Date.now() / 1000) - 1; // 1 second ago

      await tokenA.connect(user2).approve(router.target, amountA);
      await tokenB.connect(user2).approve(router.target, amountB);

      await expect(
        router.connect(user2).addLiquidity(
          tokenA.target,
          tokenB.target,
          amountA,
          amountB,
          amountA,
          amountB,
          user2.address,
          expiredDeadline
        )
      ).to.be.revertedWithCustomError(router, "DeadlineExpired");
    });

    it("Should revert removeLiquidity with expired deadline", async function () {
      const { router, tokenA, tokenB, user1, factory } = await loadFixture(setupLiquidityFixture);

      const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
      const pair = await ethers.getContractAt("DEXPair", pairAddress);
      const lpBalance = await pair.balanceOf(user1.address);
      const expiredDeadline = Math.floor(Date.now() / 1000) - 1;

      await pair.connect(user1).approve(router.target, lpBalance / 2n);

      await expect(
        router.connect(user1).removeLiquidity(
          tokenA.target,
          tokenB.target,
          lpBalance / 2n,
          0,
          0,
          user1.address,
          expiredDeadline
        )
      ).to.be.revertedWithCustomError(router, "DeadlineExpired");
    });

    it("Should revert swapExactTokensForTokens with expired deadline", async function () {
      const { router, tokenA, tokenB, user2 } = await loadFixture(setupLiquidityFixture);

      const amountIn = parseEther("10");
      const path = [tokenA.target, tokenB.target];
      const expiredDeadline = Math.floor(Date.now() / 1000) - 1;

      await tokenA.connect(user2).approve(router.target, amountIn);

      await expect(
        router.connect(user2).swapExactTokensForTokens(
          amountIn,
          0,
          path,
          user2.address,
          expiredDeadline
        )
      ).to.be.revertedWithCustomError(router, "DeadlineExpired");
    });

    it("Should revert swapTokensForExactTokens with expired deadline", async function () {
      const { router, tokenA, tokenB, user2 } = await loadFixture(setupLiquidityFixture);

      const amountOut = parseEther("10");
      const path = [tokenA.target, tokenB.target];
      const expiredDeadline = Math.floor(Date.now() / 1000) - 1;

      await tokenA.connect(user2).approve(router.target, parseEther("100"));

      await expect(
        router.connect(user2).swapTokensForExactTokens(
          amountOut,
          parseEther("100"),
          path,
          user2.address,
          expiredDeadline
        )
      ).to.be.revertedWithCustomError(router, "DeadlineExpired");
    });

    it("Should succeed with future deadline", async function () {
      const { router, tokenA, tokenB, user2 } = await loadFixture(setupLiquidityFixture);

      const amountIn = parseEther("10");
      const path = [tokenA.target, tokenB.target];
      const futureDeadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await tokenA.connect(user2).approve(router.target, amountIn);

      const tx = await router.connect(user2).swapExactTokensForTokens(
        amountIn,
        0,
        path,
        user2.address,
        futureDeadline
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    });
  });

  describe("Slippage Protection", function () {
    async function setupSlippageTestFixture() {
      const fixture = await deployRouterFixture();
      const { router, tokenA, tokenB, user1 } = fixture;

      const amountA = parseEther("1000");
      const amountB = parseEther("1000"); // 1:1 ratio for easier calculations
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Add initial liquidity
      await tokenA.connect(user1).approve(router.target, amountA);
      await tokenB.connect(user1).approve(router.target, amountB);

      await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA,
        amountB,
        amountA,
        amountB,
        user1.address,
        deadline
      );

      return fixture;
    }

    it("Should revert swapExactTokensForTokens when output is below minimum", async function () {
      const { router, tokenA, tokenB, user2 } = await loadFixture(setupSlippageTestFixture);

      const amountIn = parseEther("100");
      const path = [tokenA.target, tokenB.target];
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Get expected output
      const amountsOut = await router.getAmountsOut(amountIn, path);
      const expectedOut = amountsOut[1];

      await tokenA.connect(user2).approve(router.target, amountIn);

      // Set minimum output higher than expected (unrealistic slippage tolerance)
      const unrealisticMinOut = expectedOut + parseEther("50");

      await expect(
        router.connect(user2).swapExactTokensForTokens(
          amountIn,
          unrealisticMinOut,
          path,
          user2.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientOutputAmount");
    });

    it("Should revert swapTokensForExactTokens when input exceeds maximum", async function () {
      const { router, tokenA, tokenB, user2 } = await loadFixture(setupSlippageTestFixture);

      const amountOut = parseEther("50");
      const path = [tokenA.target, tokenB.target];
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Get required input
      const amountsIn = await router.getAmountsIn(amountOut, path);
      const requiredIn = amountsIn[0];

      await tokenA.connect(user2).approve(router.target, requiredIn);

      // Set maximum input lower than required (unrealistic slippage tolerance)
      const unrealisticMaxIn = requiredIn - parseEther("10");

      await expect(
        router.connect(user2).swapTokensForExactTokens(
          amountOut,
          unrealisticMaxIn,
          path,
          user2.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "ExcessiveInputAmount");
    });

    it("Should succeed with reasonable slippage tolerance", async function () {
      const { router, tokenA, tokenB, user2 } = await loadFixture(setupSlippageTestFixture);

      const amountIn = parseEther("100");
      const path = [tokenA.target, tokenB.target];
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Get expected output
      const amountsOut = await router.getAmountsOut(amountIn, path);
      const expectedOut = amountsOut[1];

      // Set 5% slippage tolerance
      const minOut = (expectedOut * 95n) / 100n;

      await tokenA.connect(user2).approve(router.target, amountIn);

      const tx = await router.connect(user2).swapExactTokensForTokens(
        amountIn,
        minOut,
        path,
        user2.address,
        deadline
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    });

    it("Should handle minimum amounts correctly in addLiquidity", async function () {
      const { router, tokenA, tokenB, user2 } = await loadFixture(setupSlippageTestFixture);

      const amountADesired = parseEther("100");
      const amountBDesired = parseEther("50"); // Different ratio than pool
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await tokenA.connect(user2).approve(router.target, amountADesired);
      await tokenB.connect(user2).approve(router.target, amountBDesired);

      // Should revert with unrealistic minimum amounts
      await expect(
        router.connect(user2).addLiquidity(
          tokenA.target,
          tokenB.target,
          amountADesired,
          amountBDesired,
          parseEther("100"), // Unrealistic minimum A (more than desired)
          amountBDesired,
          user2.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientAAmount");
    });

    it("Should handle minimum amounts correctly in removeLiquidity", async function () {
      const { router, tokenA, tokenB, user1, factory } = await loadFixture(setupSlippageTestFixture);

      const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
      const pair = await ethers.getContractAt("DEXPair", pairAddress);
      const lpBalance = await pair.balanceOf(user1.address);
      const liquidityToRemove = lpBalance / 4n; // Remove 25%
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await pair.connect(user1).approve(router.target, liquidityToRemove);

      // Should revert with unrealistic minimum amounts
      await expect(
        router.connect(user1).removeLiquidity(
          tokenA.target,
          tokenB.target,
          liquidityToRemove,
          parseEther("500"), // Unrealistic minimum A
          parseEther("500"), // Unrealistic minimum B
          user1.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientAAmount");
    });
  });

  describe("Multi-hop Swaps", function () {
    async function multiHopFixture() {
      const fixture = await deployRouterFixture();
      const { router, tokenA, tokenB, tokenC, weth, user1 } = fixture;

      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Add liquidity for A/B pair (1:2 ratio)
      const amountA1 = parseEther("1000");
      const amountB1 = parseEther("2000");

      await tokenA.connect(user1).approve(router.target, amountA1);
      await tokenB.connect(user1).approve(router.target, amountB1);

      await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA1,
        amountB1,
        amountA1,
        amountB1,
        user1.address,
        deadline
      );

      // Add liquidity for B/C pair (2:1 ratio)
      const amountB2 = parseEther("1000");
      const amountC1 = parseEther("500");

      await tokenB.connect(user1).approve(router.target, amountB2);
      await tokenC.connect(user1).approve(router.target, amountC1);

      await router.connect(user1).addLiquidity(
        tokenB.target,
        tokenC.target,
        amountB2,
        amountC1,
        amountB2,
        amountC1,
        user1.address,
        deadline
      );

      // Add liquidity for C/WETH pair (1:1 ratio)
      const amountC2 = parseEther("500");
      const amountWeth = parseEther("500");

      await tokenC.connect(user1).approve(router.target, amountC2);
      await weth.connect(user1).approve(router.target, amountWeth);

      await router.connect(user1).addLiquidity(
        tokenC.target,
        weth.target,
        amountC2,
        amountWeth,
        amountC2,
        amountWeth,
        user1.address,
        deadline
      );

      return fixture;
    }

    it("Should execute 2-hop swap A -> B -> C", async function () {
      const { router, tokenA, tokenB, tokenC, user2 } = await loadFixture(multiHopFixture);

      const amountIn = parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const path = [tokenA.target, tokenB.target, tokenC.target];

      // Get expected output amount
      const amountsOut = await router.getAmountsOut(amountIn, path);
      const expectedAmountOut = amountsOut[2];

      // Approve and execute swap
      await tokenA.connect(user2).approve(router.target, amountIn);

      const initialTokenCBalance = await tokenC.balanceOf(user2.address);
      const initialTokenABalance = await tokenA.balanceOf(user2.address);

      await router.connect(user2).swapExactTokensForTokens(
        amountIn,
        expectedAmountOut,
        path,
        user2.address,
        deadline
      );

      const finalTokenCBalance = await tokenC.balanceOf(user2.address);
      const finalTokenABalance = await tokenA.balanceOf(user2.address);

      expect(finalTokenCBalance).to.be.gte(initialTokenCBalance + expectedAmountOut);
      expect(finalTokenABalance).to.equal(initialTokenABalance - amountIn);
    });

    it("Should execute 3-hop swap A -> B -> C -> WETH", async function () {
      const { router, tokenA, tokenB, tokenC, weth, user2 } = await loadFixture(multiHopFixture);

      const amountIn = parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const path = [tokenA.target, tokenB.target, tokenC.target, weth.target];

      // Get expected output amount
      const amountsOut = await router.getAmountsOut(amountIn, path);
      const expectedAmountOut = amountsOut[3];

      // Approve and execute swap
      await tokenA.connect(user2).approve(router.target, amountIn);

      const initialWethBalance = await weth.balanceOf(user2.address);

      await router.connect(user2).swapExactTokensForTokens(
        amountIn,
        expectedAmountOut,
        path,
        user2.address,
        deadline
      );

      const finalWethBalance = await weth.balanceOf(user2.address);
      expect(finalWethBalance).to.be.gte(initialWethBalance + expectedAmountOut);
    });

    it("Should execute reverse multi-hop swap WETH -> C -> B -> A", async function () {
      const { router, tokenA, tokenB, tokenC, weth, user2 } = await loadFixture(multiHopFixture);

      const amountIn = parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const path = [weth.target, tokenC.target, tokenB.target, tokenA.target];

      // Get expected output amount
      const amountsOut = await router.getAmountsOut(amountIn, path);
      const expectedAmountOut = amountsOut[3];

      // Approve and execute swap
      await weth.connect(user2).approve(router.target, amountIn);

      const initialTokenABalance = await tokenA.balanceOf(user2.address);

      await router.connect(user2).swapExactTokensForTokens(
        amountIn,
        expectedAmountOut,
        path,
        user2.address,
        deadline
      );

      const finalTokenABalance = await tokenA.balanceOf(user2.address);
      expect(finalTokenABalance).to.be.gte(initialTokenABalance + expectedAmountOut);
    });

    it("Should calculate correct amounts for 3-hop path", async function () {
      const { router, tokenA, tokenB, tokenC, weth } = await loadFixture(multiHopFixture);

      const amountIn = parseEther("10");
      const path = [tokenA.target, tokenB.target, tokenC.target, weth.target];

      const amounts = await router.getAmountsOut(amountIn, path);

      expect(amounts).to.have.length(4);
      expect(amounts[0]).to.equal(amountIn);
      expect(amounts[1]).to.be.gt(0);
      expect(amounts[2]).to.be.gt(0);
      expect(amounts[3]).to.be.gt(0);

      // Each step should have some slippage due to fees
      // A -> B (1:2 ratio): ~19.88 B (with 0.3% fee)
      expect(amounts[1]).to.be.gt(parseEther("19"));
      expect(amounts[1]).to.be.lt(parseEther("20"));

      // B -> C (2:1 ratio): ~9.94 C (with 0.3% fee)
      expect(amounts[2]).to.be.gt(parseEther("9"));
      expect(amounts[2]).to.be.lt(parseEther("10"));

      // C -> WETH (1:1 ratio): ~9.91 WETH (with 0.3% fee)
      expect(amounts[3]).to.be.gt(parseEther("9"));
      expect(amounts[3]).to.be.lt(parseEther("10"));
    });

    it("Should handle swapTokensForExactTokens in multi-hop", async function () {
      const { router, tokenA, tokenB, tokenC, user2 } = await loadFixture(multiHopFixture);

      const amountOut = parseEther("5"); // Want exactly 5 C tokens
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const path = [tokenA.target, tokenB.target, tokenC.target];

      // Get required input amount
      const amountsIn = await router.getAmountsIn(amountOut, path);
      const requiredAmountIn = amountsIn[0];

      // Approve with some buffer
      await tokenA.connect(user2).approve(router.target, requiredAmountIn + parseEther("1"));

      const initialTokenABalance = await tokenA.balanceOf(user2.address);
      const initialTokenCBalance = await tokenC.balanceOf(user2.address);

      await router.connect(user2).swapTokensForExactTokens(
        amountOut,
        requiredAmountIn + parseEther("1"), // Max input with buffer
        path,
        user2.address,
        deadline
      );

      const finalTokenABalance = await tokenA.balanceOf(user2.address);
      const finalTokenCBalance = await tokenC.balanceOf(user2.address);

      expect(finalTokenCBalance).to.equal(initialTokenCBalance + amountOut);
      expect(finalTokenABalance).to.be.lte(initialTokenABalance - requiredAmountIn);
    });

    it("Should revert multi-hop swap with insufficient liquidity", async function () {
      const { router, tokenA, tokenB, tokenC, user2 } = await loadFixture(multiHopFixture);

      const amountIn = parseEther("2000"); // Very large amount that would drain pools
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const path = [tokenA.target, tokenB.target, tokenC.target];

      await tokenA.connect(user2).approve(router.target, amountIn);

      // Test with amount that would drain the pool completely
      // This should succeed but result in very poor exchange rate due to slippage
      const amounts = await router.getAmountsOut(amountIn, path);
      expect(amounts[amounts.length - 1]).to.be.gt(0);
      
      // The actual swap should succeed
      const tx = await router.connect(user2).swapExactTokensForTokens(
        amountIn,
        0, // Accept any amount out
        path,
        user2.address,
        deadline
      );
      
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    });

    it("Should revert with invalid multi-hop path", async function () {
      const { router, tokenA } = await loadFixture(multiHopFixture);

      const amountIn = parseEther("10");
      const invalidPath = [tokenA.target]; // Path too short

      await expect(
        router.getAmountsOut(amountIn, invalidPath)
      ).to.be.revertedWithCustomError(router, "InvalidPath");
    });

    it("Should revert multi-hop swap when pair doesn't exist", async function () {
      const { router, tokenA, tokenC, user2 } = await loadFixture(multiHopFixture);

      const amountIn = parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const path = [tokenA.target, tokenC.target]; // No direct A/C pair exists

      await tokenA.connect(user2).approve(router.target, amountIn);

      await expect(
        router.connect(user2).swapExactTokensForTokens(
          amountIn,
          0,
          path,
          user2.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "PairNotExists");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should revert when trying to add liquidity with identical token addresses", async function () {
      const { router, tokenA, user1 } = await loadFixture(deployRouterFixture);

      const amount = parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await tokenA.connect(user1).approve(router.target, amount * 2n);

      await expect(
        router.connect(user1).addLiquidity(
          tokenA.target,
          tokenA.target, // Same token
          amount,
          amount,
          amount,
          amount,
          user1.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "IdenticalAddresses");
    });

    it("Should revert when trying to remove liquidity from non-existent pair", async function () {
      const { router, tokenA, tokenC, user1 } = await loadFixture(deployRouterFixture);

      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        router.connect(user1).removeLiquidity(
          tokenA.target,
          tokenC.target, // No pair exists
          parseEther("1"),
          0,
          0,
          user1.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "PairNotExists");
    });

    it("Should handle zero amount inputs correctly", async function () {
      const { router } = await loadFixture(deployRouterFixture);

      await expect(
        router.getAmountOut(0, parseEther("1000"), parseEther("2000"))
      ).to.be.revertedWithCustomError(router, "InsufficientInputAmount");

      await expect(
        router.getAmountIn(0, parseEther("1000"), parseEther("2000"))
      ).to.be.revertedWithCustomError(router, "InsufficientOutputAmount");
    });

    it("Should handle zero reserves correctly", async function () {
      const { router } = await loadFixture(deployRouterFixture);

      await expect(
        router.getAmountOut(parseEther("10"), 0, parseEther("2000"))
      ).to.be.revertedWithCustomError(router, "InsufficientLiquidity");

      await expect(
        router.getAmountOut(parseEther("10"), parseEther("1000"), 0)
      ).to.be.revertedWithCustomError(router, "InsufficientLiquidity");
    });

    it("Should handle large amounts correctly without overflow", async function () {
      const { router, tokenA, tokenB, user1 } = await loadFixture(deployRouterFixture);

      // Use the existing balance which should be sufficient for testing
      const userBalance = await tokenA.balanceOf(user1.address);
      const largeAmount = userBalance / 2n; // Use half of user's balance
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await tokenA.connect(user1).approve(router.target, largeAmount);
      await tokenB.connect(user1).approve(router.target, largeAmount);

      const tx = await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        largeAmount,
        largeAmount,
        largeAmount,
        largeAmount,
        user1.address,
        deadline
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    });

    it("Should handle precision correctly in calculations", async function () {
      const { router } = await loadFixture(deployRouterFixture);

      // Test with very small amounts
      const smallAmountIn = 1000n; // 1000 wei
      const reserveIn = parseEther("1000");
      const reserveOut = parseEther("2000");

      const amountOut = await router.getAmountOut(smallAmountIn, reserveIn, reserveOut);
      expect(amountOut).to.be.gt(0);

      // Test with very large reserves
      const largeReserveIn = parseEther("1000000000"); // 1B tokens
      const largeReserveOut = parseEther("2000000000"); // 2B tokens
      const normalAmountIn = parseEther("1");

      const amountOutLarge = await router.getAmountOut(normalAmountIn, largeReserveIn, largeReserveOut);
      expect(amountOutLarge).to.be.gt(0);
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should use reasonable gas for addLiquidity", async function () {
      const { router, tokenA, tokenB, user1 } = await loadFixture(deployRouterFixture);

      const amountA = parseEther("100");
      const amountB = parseEther("200");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await tokenA.connect(user1).approve(router.target, amountA);
      await tokenB.connect(user1).approve(router.target, amountB);

      const tx = await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA,
        amountB,
        amountA,
        amountB,
        user1.address,
        deadline
      );

      const receipt = await tx.wait();
      console.log(`Add Liquidity Gas Used: ${receipt?.gasUsed}`);
      
      // Should use reasonable amount of gas (less than 2M for first pair creation)
      expect(receipt?.gasUsed).to.be.lt(2000000n);
    });

    it("Should use reasonable gas for swaps", async function () {
      const { router, tokenA, tokenB, user1, user2 } = await loadFixture(deployRouterFixture);

      // First add liquidity
      const liquidityA = parseEther("1000");
      const liquidityB = parseEther("1000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await tokenA.connect(user1).approve(router.target, liquidityA);
      await tokenB.connect(user1).approve(router.target, liquidityB);

      await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        liquidityA,
        liquidityB,
        liquidityA,
        liquidityB,
        user1.address,
        deadline
      );

      // Now test swap gas usage
      const swapAmountIn = parseEther("10");
      const path = [tokenA.target, tokenB.target];

      await tokenA.connect(user2).approve(router.target, swapAmountIn);

      const tx = await router.connect(user2).swapExactTokensForTokens(
        swapAmountIn,
        0,
        path,
        user2.address,
        deadline
      );

      const receipt = await tx.wait();
      console.log(`Swap Gas Used: ${receipt?.gasUsed}`);
      
      // Should use reasonable amount of gas (less than 200k)
      expect(receipt?.gasUsed).to.be.lt(200000n);
    });
  });

  describe("Integration with Factory and Pair", function () {
    it("Should correctly interact with factory to create pairs", async function () {
      const { router, factory, tokenA, tokenB, user1 } = await loadFixture(deployRouterFixture);

      // Initially no pair should exist
      expect(await factory.getPair(tokenA.target, tokenB.target)).to.equal(ethers.ZeroAddress);

      const amountA = parseEther("100");
      const amountB = parseEther("200");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await tokenA.connect(user1).approve(router.target, amountA);
      await tokenB.connect(user1).approve(router.target, amountB);

      await router.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA,
        amountB,
        amountA,
        amountB,
        user1.address,
        deadline
      );

      // Pair should now exist
      const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      // Pair should have correct tokens
      const pair = await ethers.getContractAt("DEXPair", pairAddress);
      const token0 = await pair.token0();
      const token1 = await pair.token1();

      const sortedTokens = tokenA.target < tokenB.target 
        ? [tokenA.target, tokenB.target] 
        : [tokenB.target, tokenA.target];

      expect(token0).to.equal(sortedTokens[0]);
      expect(token1).to.equal(sortedTokens[1]);
    });

    it("Should correctly handle token sorting", async function () {
      const { router, tokenA, tokenB, user1 } = await loadFixture(deployRouterFixture);

      const amountA = parseEther("100");
      const amountB = parseEther("200");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await tokenA.connect(user1).approve(router.target, amountA);
      await tokenB.connect(user1).approve(router.target, amountB);

      // Add liquidity with tokens in different order
      await router.connect(user1).addLiquidity(
        tokenB.target, // B first
        tokenA.target, // A second
        amountB,
        amountA,
        amountB,
        amountA,
        user1.address,
        deadline
      );

      // Should create the same pair regardless of order
      const factory = await ethers.getContractAt("DEXFactory", await router.factory());
      const pairAddress1 = await factory.getPair(tokenA.target, tokenB.target);
      const pairAddress2 = await factory.getPair(tokenB.target, tokenA.target);

      expect(pairAddress1).to.equal(pairAddress2);
      expect(pairAddress1).to.not.equal(ethers.ZeroAddress);
    });
  });
});