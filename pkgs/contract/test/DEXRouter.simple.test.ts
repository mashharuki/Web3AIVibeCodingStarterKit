import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther } from "viem";

describe("DEXRouter Simple Tests", function () {
  async function deploySimpleFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy test tokens
    const TestTokenFactory = await ethers.getContractFactory("TestToken");
    const tokenA = await TestTokenFactory.deploy("Token A", "TKNA", parseEther("10000"));
    const tokenB = await TestTokenFactory.deploy("Token B", "TKNB", parseEther("10000"));
    const weth = await TestTokenFactory.deploy("Wrapped ETH", "WETH", parseEther("10000"));

    // Deploy factory
    const DEXFactoryFactory = await ethers.getContractFactory("DEXFactory");
    const factory = await DEXFactoryFactory.deploy(owner.address);

    // Deploy router
    const DEXRouterFactory = await ethers.getContractFactory("DEXRouter");
    const router = await DEXRouterFactory.deploy(factory.target, weth.target);

    // Transfer tokens to users
    await tokenA.transfer(user1.address, parseEther("1000"));
    await tokenB.transfer(user1.address, parseEther("1000"));

    return {
      factory,
      router,
      tokenA,
      tokenB,
      weth,
      owner,
      user1,
      user2
    };
  }

  describe("Basic Router Functionality", function () {
    it("Should deploy router correctly", async function () {
      const { factory, router, weth } = await loadFixture(deploySimpleFixture);

      expect(await router.factory()).to.equal(factory.target);
      expect(await router.weth()).to.equal(weth.target);
    });

    it("Should add liquidity successfully", async function () {
      const { router, tokenA, tokenB, user1 } = await loadFixture(deploySimpleFixture);

      const amountA = parseEther("100");
      const amountB = parseEther("200");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

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
    });

    it("Should calculate quote correctly", async function () {
      const { router } = await loadFixture(deploySimpleFixture);

      const amountIn = parseEther("10");
      const reserveIn = parseEther("1000");
      const reserveOut = parseEther("2000");

      const amountOut = await router.getAmountOut(amountIn, reserveIn, reserveOut);
      
      // With 0.3% fee: (10 * 997 * 2000) / (1000 * 1000 + 10 * 997)
      // = 19940000 / 1009970 ≈ 19.74
      expect(amountOut).to.be.gt(parseEther("19"));
      expect(amountOut).to.be.lt(parseEther("20"));
    });

    it("Should perform simple swap", async function () {
      const { router, tokenA, tokenB, user1, user2 } = await loadFixture(deploySimpleFixture);

      // Give user2 some tokens for swapping
      await tokenA.transfer(user2.address, parseEther("100"));

      // First add liquidity with user1
      const liquidityA = parseEther("1000");
      const liquidityB = parseEther("1000"); // Use 1:1 ratio for simplicity
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

      // Now perform swap with user2
      const swapAmountIn = parseEther("10");
      const path = [tokenA.target, tokenB.target];

      // Get expected output
      const amountsOut = await router.getAmountsOut(swapAmountIn, path);
      const expectedOut = amountsOut[1];

      // Approve and swap
      await tokenA.connect(user2).approve(router.target, swapAmountIn);

      const initialBalanceB = await tokenB.balanceOf(user2.address);

      await router.connect(user2).swapExactTokensForTokens(
        swapAmountIn,
        expectedOut,
        path,
        user2.address,
        deadline
      );

      const finalBalanceB = await tokenB.balanceOf(user2.address);
      expect(finalBalanceB).to.be.gte(initialBalanceB + expectedOut);
    });
  });
});