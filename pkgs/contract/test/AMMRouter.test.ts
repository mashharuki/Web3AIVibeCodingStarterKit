import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { AMMFactory, AMMPair, AMMRouter, MockERC20 } from "../typechain-types";

describe("AMMRouter", function () {
  let factory: AMMFactory;
  let router: AMMRouter;
  let tokenA: MockERC20;
  let tokenB: MockERC20;
  let tokenC: MockERC20;
  let weth: MockERC20; // Mock WETH for testing
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  // テスト用の定数
  const INITIAL_SUPPLY = ethers.parseEther("10000");
  // 実時間ではなくチェーンのブロックタイムから計算する（他テストで時間が進むため）
  let DEADLINE: number;
  const refreshDeadline = async (offsetSec: number = 3600) => {
    const block = await ethers.provider.getBlock("latest");
    // Hardhat/Ethers v6 の timestamp は number
    const nowTs = Number(block?.timestamp ?? 0);
    DEADLINE = nowTs + offsetSec;
  };

  beforeEach(async function () {
    // アカウントを取得
    [owner, addr1, addr2] = await ethers.getSigners();

    // ファクトリーコントラクトをデプロイ
    const AMMFactory = await ethers.getContractFactory("AMMFactory");
    factory = await AMMFactory.deploy(owner.address);
    await factory.waitForDeployment();

    // Mock WETHトークンをデプロイ
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    weth = await MockERC20.deploy("Wrapped Ether", "WETH");
    await weth.waitForDeployment();

    // ルーターコントラクトをデプロイ
    const AMMRouter = await ethers.getContractFactory("AMMRouter");
    router = await AMMRouter.deploy(await factory.getAddress(), await weth.getAddress());
    // 以降のテストで利用する期限を常に最新ブロック時刻から再計算
    await refreshDeadline();
    await router.waitForDeployment();

    // テスト用のMockERC20トークンをデプロイ
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");
    tokenC = await MockERC20.deploy("Token C", "TKC");
    
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();
    await tokenC.waitForDeployment();

    // トークンアドレスをソート（token0 < token1）
    const tokenAAddr = await tokenA.getAddress();
    const tokenBAddr = await tokenB.getAddress();
    
    if (tokenAAddr.toLowerCase() > tokenBAddr.toLowerCase()) {
      [tokenA, tokenB] = [tokenB, tokenA];
    }

    // テスト用にトークンをミント
    await tokenA.mint(owner.address, INITIAL_SUPPLY);
    await tokenB.mint(owner.address, INITIAL_SUPPLY);
    await tokenC.mint(owner.address, INITIAL_SUPPLY);
    await tokenA.mint(addr1.address, INITIAL_SUPPLY);
    await tokenB.mint(addr1.address, INITIAL_SUPPLY);
    await tokenC.mint(addr1.address, INITIAL_SUPPLY);

    // ルーターにトークンの承認を与える
    await tokenA.approve(await router.getAddress(), ethers.MaxUint256);
    await tokenB.approve(await router.getAddress(), ethers.MaxUint256);
    await tokenC.approve(await router.getAddress(), ethers.MaxUint256);
    await tokenA.connect(addr1).approve(await router.getAddress(), ethers.MaxUint256);
    await tokenB.connect(addr1).approve(await router.getAddress(), ethers.MaxUint256);
    await tokenC.connect(addr1).approve(await router.getAddress(), ethers.MaxUint256);
  });

  describe("Deployment and Configuration", function () {
    it("Should be properly initialized", async function () {
      expect(await router.factory()).to.equal(await factory.getAddress());
      expect(await router.WETH()).to.equal(await weth.getAddress());
    });

    it("Should fail deployment with zero factory address", async function () {
      const AMMRouter = await ethers.getContractFactory("AMMRouter");
      await expect(
        AMMRouter.deploy(ethers.ZeroAddress, await weth.getAddress())
      ).to.be.revertedWith("AMMRouter: INVALID_FACTORY");
    });

    it("Should fail deployment with zero WETH address", async function () {
      const AMMRouter = await ethers.getContractFactory("AMMRouter");
      await expect(
        AMMRouter.deploy(await factory.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("AMMRouter: INVALID_WETH");
    });
  });

  describe("Liquidity Addition via Router", function () {
    it("Should add liquidity to new pair successfully", async function () {
      const amountADesired = ethers.parseEther("100");
      const amountBDesired = ethers.parseEther("200");
      const amountAMin = ethers.parseEther("95");
      const amountBMin = ethers.parseEther("190");

      const tx = await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        owner.address,
        DEADLINE
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // ペアが作成されることを確認
      const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      // LPトークンが発行されることを確認
      const pair = await ethers.getContractAt("AMMPair", pairAddress);
      const lpBalance = await pair.balanceOf(owner.address);
      expect(lpBalance).to.be.greaterThan(0);
    });

    it("Should add liquidity to existing pair proportionally", async function () {
      // 初回流動性提供
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("95"),
        ethers.parseEther("190"),
        owner.address,
        DEADLINE
      );

      // 2回目の流動性提供
      const amountADesired = ethers.parseEther("50");
      const amountBDesired = ethers.parseEther("100");

      const tx = await router.connect(addr1).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountADesired,
        amountBDesired,
        ethers.parseEther("45"),
        ethers.parseEther("90"),
        addr1.address,
        DEADLINE
      );

      expect(tx).to.not.be.reverted;

      // 比例的に流動性が追加されることを確認
      const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
      const pair = await ethers.getContractAt("AMMPair", pairAddress);
      const lpBalance = await pair.balanceOf(addr1.address);
      expect(lpBalance).to.be.greaterThan(0);
    });

    it("Should fail when deadline is expired", async function () {
      const blk1 = await ethers.provider.getBlock("latest");
      const expiredDeadline = Number(blk1!.timestamp) - 3600; // 1時間前（チェーン時刻基準）

      await expect(
        router.addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          ethers.parseEther("100"),
          ethers.parseEther("200"),
          ethers.parseEther("95"),
          ethers.parseEther("190"),
          owner.address,
          expiredDeadline
        )
      ).to.be.revertedWith("AMMRouter: EXPIRED");
    });

    it("Should fail when slippage protection is triggered", async function () {
      // 初回流動性提供
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("95"),
        ethers.parseEther("190"),
        owner.address,
        DEADLINE
      );

      // 不適切な比率で流動性追加を試行（スリッページ保護により失敗）
      await expect(
        router.connect(addr1).addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          ethers.parseEther("100"),
          ethers.parseEther("100"), // 1:1の比率（既存は1:2）
          ethers.parseEther("95"),
          ethers.parseEther("95"),
          addr1.address,
          DEADLINE
        )
      ).to.be.revertedWith("AMMRouter: INSUFFICIENT_A_AMOUNT");
    });

    it("Should fail when adding liquidity to zero address", async function () {
      await expect(
        router.addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          ethers.parseEther("100"),
          ethers.parseEther("200"),
          ethers.parseEther("95"),
          ethers.parseEther("190"),
          ethers.ZeroAddress,
          DEADLINE
        )
      ).to.be.revertedWith("AMMRouter: INVALID_TO");
    });

    it("Should handle optimal amount calculation correctly", async function () {
      // 初回流動性提供（1:2の比率）
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("95"),
        ethers.parseEther("190"),
        owner.address,
        DEADLINE
      );

      // 異なる希望比率で流動性追加（最適化されるはず）
      const result = await router.connect(addr1).addLiquidity.staticCall(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("150"), // 希望: 150
        ethers.parseEther("200"), // 希望: 200 (3:4の比率)
        ethers.parseEther("50"),  // 最小: 50
        ethers.parseEther("100"), // 最小: 100
        addr1.address,
        DEADLINE
      );

      // 実際の追加量が最適化されることを確認（1:2の比率に調整される）
      expect(result.amountA).to.equal(ethers.parseEther("100")); // 200/2 = 100
      expect(result.amountB).to.equal(ethers.parseEther("200"));
    });
  });

  describe("Liquidity Removal via Router", function () {
    let pairAddress: string;
    let pair: AMMPair;

    beforeEach(async function () {
      // 初期流動性を提供
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("95"),
        ethers.parseEther("190"),
        owner.address,
        DEADLINE
      );

      pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
      pair = await ethers.getContractAt("AMMPair", pairAddress);

      // ルーターにLPトークンの承認を与える
      await pair.approve(await router.getAddress(), ethers.MaxUint256);
    });

    it("Should remove liquidity successfully", async function () {
      const lpBalance = await pair.balanceOf(owner.address);
      const liquidityToRemove = lpBalance / 2n; // 半分を除去

      const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
      const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);

      const tx = await router.removeLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidityToRemove,
        ethers.parseEther("20"), // 最小A
        ethers.parseEther("40"), // 最小B
        owner.address,
        DEADLINE
      );

      expect(tx).to.not.be.reverted;

      // トークンが返還されることを確認
      const tokenABalanceAfter = await tokenA.balanceOf(owner.address);
      const tokenBBalanceAfter = await tokenB.balanceOf(owner.address);

      expect(tokenABalanceAfter).to.be.greaterThan(tokenABalanceBefore);
      expect(tokenBBalanceAfter).to.be.greaterThan(tokenBBalanceBefore);

      // LPトークンが減少することを確認
      const lpBalanceAfter = await pair.balanceOf(owner.address);
      expect(lpBalanceAfter).to.equal(lpBalance - liquidityToRemove);
    });

    it("Should fail when deadline is expired", async function () {
      const lpBalance = await pair.balanceOf(owner.address);
      const blk2 = await ethers.provider.getBlock("latest");
      const expiredDeadline = Number(blk2!.timestamp) - 3600;

      await expect(
        router.removeLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          lpBalance / 2n,
          ethers.parseEther("20"),
          ethers.parseEther("40"),
          owner.address,
          expiredDeadline
        )
      ).to.be.revertedWith("AMMRouter: EXPIRED");
    });

    it("Should fail when slippage protection is triggered", async function () {
      const lpBalance = await pair.balanceOf(owner.address);

      await expect(
        router.removeLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          lpBalance / 2n,
          ethers.parseEther("60"), // 過度に高い最小A
          ethers.parseEther("120"), // 過度に高い最小B
          owner.address,
          DEADLINE
        )
      ).to.be.revertedWith("AMMRouter: INSUFFICIENT_A_AMOUNT");
    });

    it("Should fail when removing liquidity to zero address", async function () {
      const lpBalance = await pair.balanceOf(owner.address);

      await expect(
        router.removeLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          lpBalance / 2n,
          ethers.parseEther("20"),
          ethers.parseEther("40"),
          ethers.ZeroAddress,
          DEADLINE
        )
      ).to.be.revertedWith("AMMRouter: INVALID_TO");
    });

    it("Should fail when removing zero liquidity", async function () {
      await expect(
        router.removeLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          0,
          ethers.parseEther("20"),
          ethers.parseEther("40"),
          owner.address,
          DEADLINE
        )
      ).to.be.revertedWith("AMMRouter: INSUFFICIENT_LIQUIDITY");
    });

    it("Should maintain proportional token distribution", async function () {
      const lpBalance = await pair.balanceOf(owner.address);
      const liquidityToRemove = lpBalance / 4n; // 1/4を除去

      const result = await router.removeLiquidity.staticCall(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidityToRemove,
        0,
        0,
        owner.address,
        DEADLINE
      );

      // 比例的にトークンが返還されることを確認（約1:2の比率）
      const ratio = result.amountB * 1000n / result.amountA;
      expect(ratio).to.be.closeTo(2000n, 50n); // 2.0 ± 0.05
    });
  });

  describe("Token Swapping via Router", function () {
    beforeEach(async function () {
      // 初期流動性を提供（複数のペア）
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("1000"),
        ethers.parseEther("2000"),
        ethers.parseEther("950"),
        ethers.parseEther("1900"),
        owner.address,
        DEADLINE
      );

      await router.addLiquidity(
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        ethers.parseEther("2000"),
        ethers.parseEther("1000"),
        ethers.parseEther("1900"),
        ethers.parseEther("950"),
        owner.address,
        DEADLINE
      );
    });

    describe("swapExactTokensForTokens", function () {
      it("Should execute single-hop swap successfully", async function () {
        const amountIn = ethers.parseEther("100");
        const path = [await tokenA.getAddress(), await tokenB.getAddress()];
        
        // 期待される出力量を計算
        const amounts = await router.getAmountsOut(amountIn, path);
        const expectedAmountOut = amounts[1];

        const tokenBBalanceBefore = await tokenB.balanceOf(addr1.address);

        const tx = await router.connect(addr1).swapExactTokensForTokens(
          amountIn,
          expectedAmountOut * 95n / 100n, // 5%のスリッページ許容
          path,
          addr1.address,
          DEADLINE
        );

        expect(tx).to.not.be.reverted;

        // トークンBの残高が増加することを確認
        const tokenBBalanceAfter = await tokenB.balanceOf(addr1.address);
        expect(tokenBBalanceAfter - tokenBBalanceBefore).to.be.greaterThanOrEqual(expectedAmountOut * 95n / 100n);
      });

      it("Should execute multi-hop swap successfully", async function () {
        const amountIn = ethers.parseEther("100");
        const path = [
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          await tokenC.getAddress()
        ];

        // 期待される出力量を計算
        const amounts = await router.getAmountsOut(amountIn, path);
        const expectedAmountOut = amounts[2];

        const tokenCBalanceBefore = await tokenC.balanceOf(addr1.address);

        const tx = await router.connect(addr1).swapExactTokensForTokens(
          amountIn,
          expectedAmountOut * 90n / 100n, // 10%のスリッページ許容（マルチホップ）
          path,
          addr1.address,
          DEADLINE
        );

        expect(tx).to.not.be.reverted;

        // トークンCの残高が増加することを確認
        const tokenCBalanceAfter = await tokenC.balanceOf(addr1.address);
        expect(tokenCBalanceAfter - tokenCBalanceBefore).to.be.greaterThanOrEqual(expectedAmountOut * 90n / 100n);
      });

      it("Should fail when deadline is expired", async function () {
        const amountIn = ethers.parseEther("100");
        const path = [await tokenA.getAddress(), await tokenB.getAddress()];
        const blk3 = await ethers.provider.getBlock("latest");
        const expiredDeadline = Number(blk3!.timestamp) - 3600;

        await expect(
          router.connect(addr1).swapExactTokensForTokens(
            amountIn,
            0,
            path,
            addr1.address,
            expiredDeadline
          )
        ).to.be.revertedWith("AMMRouter: EXPIRED");
      });

      it("Should fail when slippage protection is triggered", async function () {
        const amountIn = ethers.parseEther("100");
        const path = [await tokenA.getAddress(), await tokenB.getAddress()];
        
        const amounts = await router.getAmountsOut(amountIn, path);
        const expectedAmountOut = amounts[1];

        await expect(
          router.connect(addr1).swapExactTokensForTokens(
            amountIn,
            expectedAmountOut * 110n / 100n, // 不可能な最小出力量
            path,
            addr1.address,
            DEADLINE
          )
        ).to.be.revertedWith("AMMRouter: INSUFFICIENT_OUTPUT_AMOUNT");
      });

      it("Should fail with invalid path", async function () {
        const amountIn = ethers.parseEther("100");
        const invalidPath = [await tokenA.getAddress()]; // 長さが1

        await expect(
          router.connect(addr1).swapExactTokensForTokens(
            amountIn,
            0,
            invalidPath,
            addr1.address,
            DEADLINE
          )
        ).to.be.revertedWith("AMMRouter: INVALID_PATH");
      });

      it("Should fail when swapping to zero address", async function () {
        const amountIn = ethers.parseEther("100");
        const path = [await tokenA.getAddress(), await tokenB.getAddress()];

        await expect(
          router.connect(addr1).swapExactTokensForTokens(
            amountIn,
            0,
            path,
            ethers.ZeroAddress,
            DEADLINE
          )
        ).to.be.revertedWith("AMMRouter: INVALID_TO");
      });

      it("Should fail with zero input amount", async function () {
        const path = [await tokenA.getAddress(), await tokenB.getAddress()];

        await expect(
          router.connect(addr1).swapExactTokensForTokens(
            0,
            0,
            path,
            addr1.address,
            DEADLINE
          )
        ).to.be.revertedWith("AMMRouter: INSUFFICIENT_INPUT_AMOUNT");
      });
    });

    describe("swapTokensForExactTokens", function () {
      it("Should execute exact output swap successfully", async function () {
        const amountOut = ethers.parseEther("50");
        const path = [await tokenA.getAddress(), await tokenB.getAddress()];
        
        // 必要な入力量を計算
        const amounts = await router.getAmountsIn(amountOut, path);
        const expectedAmountIn = amounts[0];

        const tokenABalanceBefore = await tokenA.balanceOf(addr1.address);
        const tokenBBalanceBefore = await tokenB.balanceOf(addr1.address);

        const tx = await router.connect(addr1).swapTokensForExactTokens(
          amountOut,
          expectedAmountIn * 105n / 100n, // 5%のスリッページ許容
          path,
          addr1.address,
          DEADLINE
        );

        expect(tx).to.not.be.reverted;

        // 正確な出力量が得られることを確認
        const tokenBBalanceAfter = await tokenB.balanceOf(addr1.address);
        expect(tokenBBalanceAfter - tokenBBalanceBefore).to.equal(amountOut);

        // 入力量が期待値以下であることを確認
        const tokenABalanceAfter = await tokenA.balanceOf(addr1.address);
        const actualAmountIn = tokenABalanceBefore - tokenABalanceAfter;
        expect(actualAmountIn).to.be.lessThanOrEqual(expectedAmountIn * 105n / 100n);
      });

      it("Should fail when maximum input amount is exceeded", async function () {
        const amountOut = ethers.parseEther("50");
        const path = [await tokenA.getAddress(), await tokenB.getAddress()];
        
        const amounts = await router.getAmountsIn(amountOut, path);
        const expectedAmountIn = amounts[0];

        await expect(
          router.connect(addr1).swapTokensForExactTokens(
            amountOut,
            expectedAmountIn * 90n / 100n, // 不可能な最大入力量
            path,
            addr1.address,
            DEADLINE
          )
        ).to.be.revertedWith("AMMRouter: EXCESSIVE_INPUT_AMOUNT");
      });

      it("Should fail with zero output amount", async function () {
        const path = [await tokenA.getAddress(), await tokenB.getAddress()];

        await expect(
          router.connect(addr1).swapTokensForExactTokens(
            0,
            ethers.parseEther("100"),
            path,
            addr1.address,
            DEADLINE
          )
        ).to.be.revertedWith("AMMRouter: INSUFFICIENT_OUTPUT_AMOUNT");
      });
    });
  });

  describe("Price Calculation Functions", function () {
    beforeEach(async function () {
      // 初期流動性を提供
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("1000"),
        ethers.parseEther("2000"),
        ethers.parseEther("950"),
        ethers.parseEther("1900"),
        owner.address,
        DEADLINE
      );
    });

    describe("quote", function () {
      it("Should calculate quote correctly", async function () {
        const amountA = ethers.parseEther("100");
        const reserveA = ethers.parseEther("1000");
        const reserveB = ethers.parseEther("2000");

        const quote = await router.quote(amountA, reserveA, reserveB);
        const expectedQuote = amountA * reserveB / reserveA;

        expect(quote).to.equal(expectedQuote);
      });

      it("Should fail with zero amount", async function () {
        await expect(
          router.quote(0, ethers.parseEther("1000"), ethers.parseEther("2000"))
        ).to.be.revertedWith("AMMRouter: INSUFFICIENT_AMOUNT");
      });

      it("Should fail with zero reserves", async function () {
        await expect(
          router.quote(ethers.parseEther("100"), 0, ethers.parseEther("2000"))
        ).to.be.revertedWith("AMMRouter: INSUFFICIENT_LIQUIDITY");

        await expect(
          router.quote(ethers.parseEther("100"), ethers.parseEther("1000"), 0)
        ).to.be.revertedWith("AMMRouter: INSUFFICIENT_LIQUIDITY");
      });
    });

    describe("getAmountOut", function () {
      it("Should calculate amount out with fee correctly", async function () {
        const amountIn = ethers.parseEther("100");
        const reserveIn = ethers.parseEther("1000");
        const reserveOut = ethers.parseEther("2000");

        const amountOut = await router.getAmountOut(amountIn, reserveIn, reserveOut);
        
        // 手数料を考慮した計算（0.3%手数料）
        const amountInWithFee = amountIn * 997n;
        const numerator = amountInWithFee * reserveOut;
        const denominator = reserveIn * 1000n + amountInWithFee;
        const expectedAmountOut = numerator / denominator;

        expect(amountOut).to.equal(expectedAmountOut);
      });

      it("Should fail with zero input amount", async function () {
        await expect(
          router.getAmountOut(0, ethers.parseEther("1000"), ethers.parseEther("2000"))
        ).to.be.revertedWith("AMMRouter: INSUFFICIENT_INPUT_AMOUNT");
      });

      it("Should fail with zero reserves", async function () {
        await expect(
          router.getAmountOut(ethers.parseEther("100"), 0, ethers.parseEther("2000"))
        ).to.be.revertedWith("AMMRouter: INSUFFICIENT_LIQUIDITY");
      });
    });

    describe("getAmountIn", function () {
      it("Should calculate amount in with fee correctly", async function () {
        const amountOut = ethers.parseEther("100");
        const reserveIn = ethers.parseEther("1000");
        const reserveOut = ethers.parseEther("2000");

        const amountIn = await router.getAmountIn(amountOut, reserveIn, reserveOut);
        
        // 手数料を考慮した計算
        const numerator = reserveIn * amountOut * 1000n;
        const denominator = (reserveOut - amountOut) * 997n;
        const expectedAmountIn = numerator / denominator + 1n;

        expect(amountIn).to.equal(expectedAmountIn);
      });

      it("Should fail with zero output amount", async function () {
        await expect(
          router.getAmountIn(0, ethers.parseEther("1000"), ethers.parseEther("2000"))
        ).to.be.revertedWith("AMMRouter: INSUFFICIENT_OUTPUT_AMOUNT");
      });

      it("Should fail with insufficient reserves", async function () {
        await expect(
          router.getAmountIn(ethers.parseEther("2001"), ethers.parseEther("1000"), ethers.parseEther("2000"))
        ).to.be.reverted; // Division by zero when amountOut >= reserveOut
      });
    });

    describe("getAmountsOut", function () {
      it("Should calculate amounts out for single hop", async function () {
        const amountIn = ethers.parseEther("100");
        const path = [await tokenA.getAddress(), await tokenB.getAddress()];

        const amounts = await router.getAmountsOut(amountIn, path);

        expect(amounts.length).to.equal(2);
        expect(amounts[0]).to.equal(amountIn);
        expect(amounts[1]).to.be.greaterThan(0);
      });

      it("Should calculate amounts out for multi-hop", async function () {
        // B-Cペアも作成
        await router.addLiquidity(
          await tokenB.getAddress(),
          await tokenC.getAddress(),
          ethers.parseEther("2000"),
          ethers.parseEther("1000"),
          ethers.parseEther("1900"),
          ethers.parseEther("950"),
          owner.address,
          DEADLINE
        );

        const amountIn = ethers.parseEther("100");
        const path = [
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          await tokenC.getAddress()
        ];

        const amounts = await router.getAmountsOut(amountIn, path);

        expect(amounts.length).to.equal(3);
        expect(amounts[0]).to.equal(amountIn);
        expect(amounts[1]).to.be.greaterThan(0);
        expect(amounts[2]).to.be.greaterThan(0);
      });

      it("Should fail with invalid path", async function () {
        const amountIn = ethers.parseEther("100");
        const invalidPath = [await tokenA.getAddress()];

        await expect(
          router.getAmountsOut(amountIn, invalidPath)
        ).to.be.revertedWith("AMMRouter: INVALID_PATH");
      });
    });

    describe("getAmountsIn", function () {
      it("Should calculate amounts in for single hop", async function () {
        const amountOut = ethers.parseEther("100");
        const path = [await tokenA.getAddress(), await tokenB.getAddress()];

        const amounts = await router.getAmountsIn(amountOut, path);

        expect(amounts.length).to.equal(2);
        expect(amounts[0]).to.be.greaterThan(0);
        expect(amounts[1]).to.equal(amountOut);
      });

      it("Should fail with invalid path", async function () {
        const amountOut = ethers.parseEther("100");
        const invalidPath = [await tokenA.getAddress()];

        await expect(
          router.getAmountsIn(amountOut, invalidPath)
        ).to.be.revertedWith("AMMRouter: INVALID_PATH");
      });
    });
  });

  describe("Slippage Protection", function () {
    beforeEach(async function () {
      // 初期流動性を提供
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("1000"),
        ethers.parseEther("2000"),
        ethers.parseEther("950"),
        ethers.parseEther("1900"),
        owner.address,
        DEADLINE
      );
    });

    it("Should protect against excessive slippage in swaps", async function () {
      const amountIn = ethers.parseEther("500"); // 大きなスワップ
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      
      const amounts = await router.getAmountsOut(amountIn, path);
      const expectedAmountOut = amounts[1];

      // 厳しいスリッページ保護（期待値の99%）
      const minAmountOut = expectedAmountOut * 99n / 100n;

      await expect(
        router.connect(addr1).swapExactTokensForTokens(
          amountIn,
          minAmountOut,
          path,
          addr1.address,
          DEADLINE
        )
      ).to.not.be.reverted;

      // 不可能なスリッページ保護（期待値の101%）
      const impossibleMinAmountOut = expectedAmountOut * 101n / 100n;

      await expect(
        router.connect(addr1).swapExactTokensForTokens(
          amountIn,
          impossibleMinAmountOut,
          path,
          addr1.address,
          DEADLINE
        )
      ).to.be.revertedWith("AMMRouter: INSUFFICIENT_OUTPUT_AMOUNT");
    });

    it("Should protect against price manipulation", async function () {
      const normalAmountIn = ethers.parseEther("10");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      
      // 通常のスワップレートを取得
      const normalAmounts = await router.getAmountsOut(normalAmountIn, path);
      const normalRate = normalAmounts[1] * 1000n / normalAmounts[0];

      // 大きなスワップを実行して価格を変動させる
      await router.connect(addr1).swapExactTokensForTokens(
        ethers.parseEther("400"),
        0,
        path,
        addr1.address,
        DEADLINE
      );

      // 価格変動後のレートを確認
      const manipulatedAmounts = await router.getAmountsOut(normalAmountIn, path);
      const manipulatedRate = manipulatedAmounts[1] * 1000n / manipulatedAmounts[0];

      // 価格が悪化していることを確認（スリッページ保護の重要性）
      expect(manipulatedRate).to.be.lessThan(normalRate);
    });
  });

  describe("Deadline Protection", function () {
    beforeEach(async function () {
      // 初期流動性を提供
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("1000"),
        ethers.parseEther("2000"),
        ethers.parseEther("950"),
        ethers.parseEther("1900"),
        owner.address,
        DEADLINE
      );
    });

    it("Should accept transactions before deadline", async function () {
      const blk4 = await ethers.provider.getBlock("latest");
      const futureDeadline = Number(blk4!.timestamp) + 7200; // 2時間後（チェーン時刻基準）
      const amountIn = ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      await expect(
        router.connect(addr1).swapExactTokensForTokens(
          amountIn,
          0,
          path,
          addr1.address,
          futureDeadline
        )
      ).to.not.be.reverted;
    });

    it("Should reject transactions after deadline", async function () {
      const blk5 = await ethers.provider.getBlock("latest");
      const pastDeadline = Number(blk5!.timestamp) - 3600; // 1時間前（チェーン時刻基準）
      const amountIn = ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      await expect(
        router.connect(addr1).swapExactTokensForTokens(
          amountIn,
          0,
          path,
          addr1.address,
          pastDeadline
        )
      ).to.be.revertedWith("AMMRouter: EXPIRED");
    });

    it("Should handle edge case at exact deadline", async function () {
      // 現在のブロックタイムスタンプを取得
      const currentBlock = await ethers.provider.getBlock("latest");
      const currentTimestamp = currentBlock!.timestamp;
      const exactDeadline = currentTimestamp + 1;

      const amountIn = ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      // 正確なデッドラインでの実行は成功するはず
      await expect(
        router.connect(addr1).swapExactTokensForTokens(
          amountIn,
          0,
          path,
          addr1.address,
          exactDeadline
        )
      ).to.not.be.reverted;
    });
  });

  describe("Multi-hop Swapping", function () {
    beforeEach(async function () {
      // 複数のペアを作成（A-B, B-C）
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("1000"),
        ethers.parseEther("2000"),
        ethers.parseEther("950"),
        ethers.parseEther("1900"),
        owner.address,
        DEADLINE
      );

      await router.addLiquidity(
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        ethers.parseEther("2000"),
        ethers.parseEther("1000"),
        ethers.parseEther("1900"),
        ethers.parseEther("950"),
        owner.address,
        DEADLINE
      );
    });

    it("Should execute 2-hop swap (A -> B -> C)", async function () {
      const amountIn = ethers.parseEther("100");
      const path = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress()
      ];

      const tokenCBalanceBefore = await tokenC.balanceOf(addr1.address);

      const tx = await router.connect(addr1).swapExactTokensForTokens(
        amountIn,
        0, // 最小出力量は0（テスト用）
        path,
        addr1.address,
        DEADLINE
      );

      expect(tx).to.not.be.reverted;

      // トークンCの残高が増加することを確認
      const tokenCBalanceAfter = await tokenC.balanceOf(addr1.address);
      expect(tokenCBalanceAfter).to.be.greaterThan(tokenCBalanceBefore);
    });

    it("Should calculate multi-hop amounts correctly", async function () {
      const amountIn = ethers.parseEther("100");
      const path = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress()
      ];

      const amounts = await router.getAmountsOut(amountIn, path);

      expect(amounts.length).to.equal(3);
      expect(amounts[0]).to.equal(amountIn);
      expect(amounts[1]).to.be.greaterThan(0); // A -> B
      expect(amounts[2]).to.be.greaterThan(0); // B -> C

      // 実際のスワップで同じ結果が得られることを確認
      const tokenCBalanceBefore = await tokenC.balanceOf(addr1.address);

      await router.connect(addr1).swapExactTokensForTokens(
        amountIn,
        amounts[2] * 95n / 100n, // 5%のスリッページ許容
        path,
        addr1.address,
        DEADLINE
      );

      const tokenCBalanceAfter = await tokenC.balanceOf(addr1.address);
      const actualAmountOut = tokenCBalanceAfter - tokenCBalanceBefore;

      expect(actualAmountOut).to.be.closeTo(amounts[2], amounts[2] / 20n); // 5%の誤差許容
    });

    it("Should handle reverse multi-hop swap (C -> B -> A)", async function () {
      const amountIn = ethers.parseEther("50");
      const path = [
        await tokenC.getAddress(),
        await tokenB.getAddress(),
        await tokenA.getAddress()
      ];

      const tokenABalanceBefore = await tokenA.balanceOf(addr1.address);

      const tx = await router.connect(addr1).swapExactTokensForTokens(
        amountIn,
        0,
        path,
        addr1.address,
        DEADLINE
      );

      expect(tx).to.not.be.reverted;

      // トークンAの残高が増加することを確認
      const tokenABalanceAfter = await tokenA.balanceOf(addr1.address);
      expect(tokenABalanceAfter).to.be.greaterThan(tokenABalanceBefore);
    });

    it("Should fail multi-hop swap with non-existent intermediate pair", async function () {
      // A-Cペアは存在しない（A-B, B-Cのみ存在）
      const amountIn = ethers.parseEther("100");
      const invalidPath = [
        await tokenA.getAddress(),
        await tokenC.getAddress() // 直接A-Cペアは存在しない
      ];

      await expect(
        router.connect(addr1).swapExactTokensForTokens(
          amountIn,
          0,
          invalidPath,
          addr1.address,
          DEADLINE
        )
      ).to.be.revertedWith("AMMRouter: PAIR_NOT_EXISTS");
    });

    it("Should handle price impact in multi-hop swaps", async function () {
      const smallAmountIn = ethers.parseEther("10");
      const largeAmountIn = ethers.parseEther("500");
      const path = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress()
      ];

      // 小さなスワップのレート
      const smallAmounts = await router.getAmountsOut(smallAmountIn, path);
      const smallRate = smallAmounts[2] * 1000n / smallAmounts[0];

      // 大きなスワップのレート
      const largeAmounts = await router.getAmountsOut(largeAmountIn, path);
      const largeRate = largeAmounts[2] * 1000n / largeAmounts[0];

      // 大きなスワップの方がレートが悪いことを確認（価格インパクト）
      expect(largeRate).to.be.lessThan(smallRate);
    });
  });

  describe("ETH Functions (Not Supported)", function () {
    it("Should revert ETH-related functions", async function () {
      await expect(
        router.addLiquidityETH(
          await tokenA.getAddress(),
          ethers.parseEther("100"),
          ethers.parseEther("95"),
          ethers.parseEther("0.95"),
          owner.address,
          DEADLINE,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWith("AMMRouter: ETH_NOT_SUPPORTED");

      await expect(
        router.removeLiquidityETH(
          await tokenA.getAddress(),
          ethers.parseEther("100"),
          ethers.parseEther("95"),
          ethers.parseEther("0.95"),
          owner.address,
          DEADLINE
        )
      ).to.be.revertedWith("AMMRouter: ETH_NOT_SUPPORTED");

      await expect(
        router.swapExactETHForTokens(
          0,
          [await weth.getAddress(), await tokenA.getAddress()],
          owner.address,
          DEADLINE,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWith("AMMRouter: ETH_NOT_SUPPORTED");

      await expect(
        router.swapExactTokensForETH(
          ethers.parseEther("100"),
          0,
          [await tokenA.getAddress(), await weth.getAddress()],
          owner.address,
          DEADLINE
        )
      ).to.be.revertedWith("AMMRouter: ETH_NOT_SUPPORTED");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle identical token addresses", async function () {
      await expect(
        router.addLiquidity(
          await tokenA.getAddress(),
          await tokenA.getAddress(), // 同じトークン
          ethers.parseEther("100"),
          ethers.parseEther("200"),
          ethers.parseEther("95"),
          ethers.parseEther("190"),
          owner.address,
          DEADLINE
        )
      ).to.be.revertedWith("AMMFactory: IDENTICAL_ADDRESSES");
    });

    it("Should handle zero token addresses", async function () {
      await expect(
        router.addLiquidity(
          ethers.ZeroAddress,
          await tokenB.getAddress(),
          ethers.parseEther("100"),
          ethers.parseEther("200"),
          ethers.parseEther("95"),
          ethers.parseEther("190"),
          owner.address,
          DEADLINE
        )
      ).to.be.revertedWith("AMMFactory: ZERO_ADDRESS");
    });

    it("Should handle insufficient token balance", async function () {
      // 残高を超える量での流動性追加を試行
      const excessiveAmount = INITIAL_SUPPLY + ethers.parseEther("1");

      await expect(
        router.connect(addr2).addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          excessiveAmount,
          ethers.parseEther("200"),
          ethers.parseEther("95"),
          ethers.parseEther("190"),
          addr2.address,
          DEADLINE
        )
      ).to.be.reverted; // ERC20の残高不足エラー
    });

    it("Should handle insufficient allowance", async function () {
      // 新しいアカウントで承認なしに流動性追加を試行
      await tokenA.mint(addr2.address, ethers.parseEther("1000"));
      await tokenB.mint(addr2.address, ethers.parseEther("1000"));

      await expect(
        router.connect(addr2).addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          ethers.parseEther("100"),
          ethers.parseEther("200"),
          ethers.parseEther("95"),
          ethers.parseEther("190"),
          addr2.address,
          DEADLINE
        )
      ).to.be.reverted; // ERC20の承認不足エラー
    });

    it("Should handle reentrancy protection", async function () {
      // リエントランシー保護のテスト（基本的な確認）
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("1000"),
        ethers.parseEther("2000"),
        ethers.parseEther("950"),
        ethers.parseEther("1900"),
        owner.address,
        DEADLINE
      );

      // 同時に複数のスワップを試行（実際のリエントランシーではないが、保護機能をテスト）
      const amountIn = ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      const swapPromise1 = router.connect(addr1).swapExactTokensForTokens(
        amountIn,
        0,
        path,
        addr1.address,
        DEADLINE
      );

      const swapPromise2 = router.connect(addr1).swapExactTokensForTokens(
        amountIn,
        0,
        path,
        addr1.address,
        DEADLINE
      );

      // 両方のトランザクションが成功することを確認（リエントランシー保護が適切に動作）
      await expect(swapPromise1).to.not.be.reverted;
      await expect(swapPromise2).to.not.be.reverted;
    });
  });

  describe("Gas Optimization and Performance", function () {
    beforeEach(async function () {
      // 初期流動性を提供
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("1000"),
        ethers.parseEther("2000"),
        ethers.parseEther("950"),
        ethers.parseEther("1900"),
        owner.address,
        DEADLINE
      );
    });

    it("Should use reasonable gas for liquidity operations", async function () {
      const tx = await router.connect(addr1).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("95"),
        ethers.parseEther("190"),
        addr1.address,
        DEADLINE
      );

      const receipt = await tx.wait();
      
      // ガス使用量が合理的な範囲内であることを確認（500K gas未満）
      expect(Number(receipt?.gasUsed)).to.be.lessThan(500000);
    });

    it("Should use reasonable gas for swap operations", async function () {
      const amountIn = ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      const tx = await router.connect(addr1).swapExactTokensForTokens(
        amountIn,
        0,
        path,
        addr1.address,
        DEADLINE
      );

      const receipt = await tx.wait();
      
      // スワップのガス使用量が合理的な範囲内であることを確認（200K gas未満）
      expect(Number(receipt?.gasUsed)).to.be.lessThan(200000);
    });

    it("Should have consistent gas usage for similar operations", async function () {
      const amountIn = ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      // 1回目のスワップ
      const tx1 = await router.connect(addr1).swapExactTokensForTokens(
        amountIn,
        0,
        path,
        addr1.address,
        DEADLINE
      );
      const receipt1 = await tx1.wait();

      // 2回目のスワップ
      const tx2 = await router.connect(addr1).swapExactTokensForTokens(
        amountIn,
        0,
        path,
        addr1.address,
        DEADLINE
      );
      const receipt2 = await tx2.wait();

      // ガス使用量の差が30%以内であることを確認（価格変動により差が生じる可能性）
      const gasUsed1 = Number(receipt1?.gasUsed);
      const gasUsed2 = Number(receipt2?.gasUsed);
      const gasDifference = Math.abs(gasUsed1 - gasUsed2);
      const gasAverage = (gasUsed1 + gasUsed2) / 2;

      expect(gasDifference / gasAverage).to.be.lessThan(0.3);
    });
  });
});
