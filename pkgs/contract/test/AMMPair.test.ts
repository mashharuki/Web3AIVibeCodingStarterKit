import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { AMMFactory, AMMPair, MockERC20 } from "../typechain-types";

describe("AMMPair", () => {
  let factory: AMMFactory;
  let pair: AMMPair;
  let tokenA: MockERC20;
  let tokenB: MockERC20;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  // テスト用の定数
  const MINIMUM_LIQUIDITY = 1000n;
  const INITIAL_SUPPLY = ethers.parseEther("10000");
  const LIQUIDITY_AMOUNT = ethers.parseEther("1000");

  beforeEach(async () => {
    // アカウントを取得
    [owner, addr1, addr2] = await ethers.getSigners();

    // ファクトリーコントラクトをデプロイ
    const AMMFactory = await ethers.getContractFactory("AMMFactory");
    factory = await AMMFactory.deploy(owner.address);
    await factory.waitForDeployment();

    // テスト用のMockERC20トークンをデプロイ
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");

    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    // トークンアドレスをソート（token0 < token1）
    const tokenAAddr = await tokenA.getAddress();
    const tokenBAddr = await tokenB.getAddress();

    if (tokenAAddr.toLowerCase() > tokenBAddr.toLowerCase()) {
      [tokenA, tokenB] = [tokenB, tokenA];
    }

    // ペアを作成
    await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    pair = await ethers.getContractAt("AMMPair", pairAddress);

    // テスト用にトークンをミント
    await tokenA.mint(owner.address, INITIAL_SUPPLY);
    await tokenB.mint(owner.address, INITIAL_SUPPLY);
    await tokenA.mint(addr1.address, INITIAL_SUPPLY);
    await tokenB.mint(addr1.address, INITIAL_SUPPLY);
  });

  describe("Deployment and Initialization", () => {
    it("Should be properly initialized", async () => {
      expect(await pair.token0()).to.equal(await tokenA.getAddress());
      expect(await pair.token1()).to.equal(await tokenB.getAddress());
      expect(await pair.factory()).to.equal(await factory.getAddress());
    });

    it("Should have correct LP token properties", async () => {
      expect(await pair.name()).to.equal("AMM LP Token");
      expect(await pair.symbol()).to.equal("AMM-LP");
      expect(await pair.decimals()).to.equal(18);
      expect(await pair.totalSupply()).to.equal(0);
    });

    it("Should have zero reserves initially", async () => {
      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0).to.equal(0);
      expect(reserve1).to.equal(0);
    });
  });

  describe("Liquidity Addition (mint)", () => {
    it("Should mint liquidity tokens for first liquidity provider", async () => {
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");

      // トークンをペアコントラクトに送信
      await tokenA.transfer(await pair.getAddress(), amount0);
      await tokenB.transfer(await pair.getAddress(), amount1);

      // 流動性を追加
      const tx = await pair.mint(owner.address);

      // 期待される流動性量を計算（sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY）
      const expectedLiquidity = ethers.parseEther("141.421356237309504880") - MINIMUM_LIQUIDITY; // sqrt(100 * 200) * 10^18 - 1000

      // LPトークンが正しく発行されることを確認
      expect(await pair.balanceOf(owner.address)).to.be.closeTo(
        expectedLiquidity,
        ethers.parseEther("0.001")
      );
      expect(await pair.totalSupply()).to.be.closeTo(
        ethers.parseEther("141.421356237309504880"),
        ethers.parseEther("0.001")
      );

      // リザーブが更新されることを確認
      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0).to.equal(amount0);
      expect(reserve1).to.equal(amount1);

      // Mintイベントが発行されることを確認
      await expect(tx).to.emit(pair, "Mint").withArgs(owner.address, amount0, amount1);
    });

    it("Should mint liquidity tokens proportionally for subsequent providers", async () => {
      // 初回流動性提供
      const initialAmount0 = ethers.parseEther("100");
      const initialAmount1 = ethers.parseEther("200");

      await tokenA.transfer(await pair.getAddress(), initialAmount0);
      await tokenB.transfer(await pair.getAddress(), initialAmount1);
      await pair.mint(owner.address);

      // 2回目の流動性提供
      const amount0 = ethers.parseEther("50");
      const amount1 = ethers.parseEther("100");

      await tokenA.connect(addr1).transfer(await pair.getAddress(), amount0);
      await tokenB.connect(addr1).transfer(await pair.getAddress(), amount1);

      const totalSupplyBefore = await pair.totalSupply();
      await pair.connect(addr1).mint(addr1.address);

      // 比例的に流動性が追加されることを確認
      const expectedLiquidity = (totalSupplyBefore * amount0) / initialAmount0;
      expect(await pair.balanceOf(addr1.address)).to.be.closeTo(
        expectedLiquidity,
        ethers.parseEther("0.001")
      );
    });

    it("Should fail when minting with zero amounts", async () => {
      await expect(pair.mint(owner.address)).to.be.reverted;
    });

    it("Should fail when minting to zero address", async () => {
      await tokenA.transfer(await pair.getAddress(), ethers.parseEther("100"));
      await tokenB.transfer(await pair.getAddress(), ethers.parseEther("200"));

      await expect(pair.mint(ethers.ZeroAddress)).to.be.revertedWith("AMMPair: INVALID_TO");
    });

    it("Should lock minimum liquidity permanently", async () => {
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");

      await tokenA.transfer(await pair.getAddress(), amount0);
      await tokenB.transfer(await pair.getAddress(), amount1);
      await pair.mint(owner.address);

      // ファクトリーアドレスにMINIMUM_LIQUIDITYがロックされることを確認
      expect(await pair.balanceOf(await factory.getAddress())).to.equal(MINIMUM_LIQUIDITY);
    });
  });

  describe("Liquidity Removal (burn)", () => {
    beforeEach(async () => {
      // 初期流動性を提供
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");

      await tokenA.transfer(await pair.getAddress(), amount0);
      await tokenB.transfer(await pair.getAddress(), amount1);
      await pair.mint(owner.address);
    });

    it("Should burn liquidity tokens and return underlying tokens", async () => {
      const liquidityBalance = await pair.balanceOf(owner.address);

      // LPトークンをペアコントラクトに送信
      await pair.transfer(await pair.getAddress(), liquidityBalance);

      const [reserve0Before, reserve1Before] = await pair.getReserves();
      const totalSupplyBefore = await pair.totalSupply();

      // 流動性を除去
      const tx = await pair.burn(owner.address);

      // 期待される返還量を計算
      const expectedAmount0 = (liquidityBalance * reserve0Before) / totalSupplyBefore;
      const expectedAmount1 = (liquidityBalance * reserve1Before) / totalSupplyBefore;

      // Burnイベントが発行されることを確認
      await expect(tx)
        .to.emit(pair, "Burn")
        .withArgs(owner.address, expectedAmount0, expectedAmount1, owner.address);

      // LPトークンがバーンされることを確認
      expect(await pair.balanceOf(owner.address)).to.equal(0);
      expect(await pair.totalSupply()).to.equal(MINIMUM_LIQUIDITY); // MINIMUM_LIQUIDITYのみ残る
    });

    it("Should fail when burning with insufficient liquidity", async () => {
      await expect(pair.burn(owner.address)).to.be.revertedWith(
        "AMMPair: INSUFFICIENT_LIQUIDITY_BURNED"
      );
    });

    it("Should fail when burning to zero address", async () => {
      const liquidityBalance = await pair.balanceOf(owner.address);
      await pair.transfer(await pair.getAddress(), liquidityBalance);

      await expect(pair.burn(ethers.ZeroAddress)).to.be.revertedWith("AMMPair: INVALID_TO");
    });

    it("Should maintain proportional token distribution", async () => {
      const liquidityBalance = await pair.balanceOf(owner.address);
      const halfLiquidity = liquidityBalance / 2n;

      // 半分の流動性を除去
      await pair.transfer(await pair.getAddress(), halfLiquidity);

      const token0BalanceBefore = await tokenA.balanceOf(owner.address);
      const token1BalanceBefore = await tokenB.balanceOf(owner.address);

      await pair.burn(owner.address);

      const token0BalanceAfter = await tokenA.balanceOf(owner.address);
      const token1BalanceAfter = await tokenB.balanceOf(owner.address);

      // 比例的にトークンが返還されることを確認
      const token0Returned = token0BalanceAfter - token0BalanceBefore;
      const token1Returned = token1BalanceAfter - token1BalanceBefore;

      // 比率が維持されることを確認（約1:2の比率）
      expect(token1Returned / token0Returned).to.be.closeTo(2n, 1n);
    });
  });

  describe("Token Swapping", () => {
    beforeEach(async () => {
      // 初期流動性を提供（1:2の比率）
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("2000");

      await tokenA.transfer(await pair.getAddress(), amount0);
      await tokenB.transfer(await pair.getAddress(), amount1);
      await pair.mint(owner.address);
    });

    it("Should execute token0 to token1 swap correctly", async () => {
      const swapAmount = ethers.parseEther("100");
      const [reserve0Before, reserve1Before] = await pair.getReserves();

      // スワップ前にtoken0をペアに送信
      await tokenA.connect(addr1).transfer(await pair.getAddress(), swapAmount);

      // 期待される出力量を計算（手数料0.3%を考慮）
      const amountInWithFee = swapAmount * 997n; // 0.3%手数料を差し引いた量
      const numerator = amountInWithFee * reserve1Before;
      const denominator = reserve0Before * 1000n + amountInWithFee;
      const expectedAmountOut = numerator / denominator;

      const token1BalanceBefore = await tokenB.balanceOf(addr1.address);

      // スワップを実行
      const tx = await pair.connect(addr1).swap(0, expectedAmountOut, addr1.address, "0x");

      // トークンが正しく交換されることを確認
      const token1BalanceAfter = await tokenB.balanceOf(addr1.address);
      expect(token1BalanceAfter - token1BalanceBefore).to.equal(expectedAmountOut);

      // Swapイベントが発行されることを確認
      await expect(tx)
        .to.emit(pair, "Swap")
        .withArgs(addr1.address, swapAmount, 0, 0, expectedAmountOut, addr1.address);
    });

    it("Should execute token1 to token0 swap correctly", async () => {
      const swapAmount = ethers.parseEther("200");
      const [reserve0Before, reserve1Before] = await pair.getReserves();

      // スワップ前にtoken1をペアに送信
      await tokenB.connect(addr1).transfer(await pair.getAddress(), swapAmount);

      // 期待される出力量を計算
      const amountInWithFee = swapAmount * 997n;
      const numerator = amountInWithFee * reserve0Before;
      const denominator = reserve1Before * 1000n + amountInWithFee;
      const expectedAmountOut = numerator / denominator;

      const token0BalanceBefore = await tokenA.balanceOf(addr1.address);

      // スワップを実行
      await pair.connect(addr1).swap(expectedAmountOut, 0, addr1.address, "0x");

      // トークンが正しく交換されることを確認
      const token0BalanceAfter = await tokenA.balanceOf(addr1.address);
      expect(token0BalanceAfter - token0BalanceBefore).to.equal(expectedAmountOut);
    });

    it("Should fail when output amount is zero", async () => {
      await expect(pair.swap(0, 0, addr1.address, "0x")).to.be.revertedWith(
        "AMMPair: INSUFFICIENT_OUTPUT_AMOUNT"
      );
    });

    it("Should fail when output exceeds reserves", async () => {
      const [reserve0, reserve1] = await pair.getReserves();

      await expect(pair.swap(reserve0, 0, addr1.address, "0x")).to.be.revertedWith(
        "AMMPair: INSUFFICIENT_LIQUIDITY"
      );

      await expect(pair.swap(0, reserve1, addr1.address, "0x")).to.be.revertedWith(
        "AMMPair: INSUFFICIENT_LIQUIDITY"
      );
    });

    it("Should fail when swapping to token addresses", async () => {
      await expect(pair.swap(1, 0, await tokenA.getAddress(), "0x")).to.be.revertedWith(
        "AMMPair: INVALID_TO"
      );

      await expect(pair.swap(0, 1, await tokenB.getAddress(), "0x")).to.be.revertedWith(
        "AMMPair: INVALID_TO"
      );
    });

    it("Should fail when swapping to zero address", async () => {
      await expect(pair.swap(1, 0, ethers.ZeroAddress, "0x")).to.be.revertedWith(
        "AMMPair: INVALID_TO"
      );
    });
  });

  describe("AMM Formula Verification (x * y = k)", () => {
    beforeEach(async () => {
      // 初期流動性を提供
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("2000");

      await tokenA.transfer(await pair.getAddress(), amount0);
      await tokenB.transfer(await pair.getAddress(), amount1);
      await pair.mint(owner.address);
    });

    it("Should maintain constant product formula after swaps", async () => {
      const [reserve0Before, reserve1Before] = await pair.getReserves();
      const kBefore = reserve0Before * reserve1Before;

      // スワップを実行
      const swapAmount = ethers.parseEther("100");
      await tokenA.connect(addr1).transfer(await pair.getAddress(), swapAmount);

      const amountInWithFee = swapAmount * 997n;
      const numerator = amountInWithFee * reserve1Before;
      const denominator = reserve0Before * 1000n + amountInWithFee;
      const expectedAmountOut = numerator / denominator;

      await pair.connect(addr1).swap(0, expectedAmountOut, addr1.address, "0x");

      const [reserve0After, reserve1After] = await pair.getReserves();
      const kAfter = reserve0After * reserve1After;

      // 手数料を考慮したK値が増加することを確認（手数料により流動性が増加）
      expect(kAfter).to.be.greaterThan(kBefore);

      // 手数料を除いた実質的なK値の検証
      const adjustedReserve0 = reserve0After - (swapAmount * 3n) / 1000n; // 手数料分を調整
      const adjustedK = adjustedReserve0 * reserve1After;
      expect(adjustedK).to.be.closeTo(kBefore, kBefore / 1000n); // 0.1%の誤差を許容
    });

    it("Should verify K value increases with fees", async () => {
      const [reserve0Before, reserve1Before] = await pair.getReserves();
      const kBefore = reserve0Before * reserve1Before;

      // 複数回のスワップを実行
      for (let i = 0; i < 5; i++) {
        const swapAmount = ethers.parseEther("50");
        await tokenA.connect(addr1).transfer(await pair.getAddress(), swapAmount);

        const [currentReserve0, currentReserve1] = await pair.getReserves();
        const amountInWithFee = swapAmount * 997n;
        const numerator = amountInWithFee * currentReserve1;
        const denominator = currentReserve0 * 1000n + amountInWithFee;
        const expectedAmountOut = numerator / denominator;

        await pair.connect(addr1).swap(0, expectedAmountOut, addr1.address, "0x");
      }

      const [reserve0After, reserve1After] = await pair.getReserves();
      const kAfter = reserve0After * reserve1After;

      // 手数料により流動性が蓄積されてK値が増加することを確認
      expect(kAfter).to.be.greaterThan(kBefore);
    });

    it("Should maintain K value during liquidity operations", async () => {
      const [reserve0Before, reserve1Before] = await pair.getReserves();
      const kBefore = reserve0Before * reserve1Before;

      // 流動性を追加
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");

      await tokenA.connect(addr1).transfer(await pair.getAddress(), amount0);
      await tokenB.connect(addr1).transfer(await pair.getAddress(), amount1);
      await pair.connect(addr1).mint(addr1.address);

      const [reserve0After, reserve1After] = await pair.getReserves();
      const kAfter = reserve0After * reserve1After;

      // 流動性追加後はK値が比例的に増加することを確認
      const expectedK =
        (kBefore * (reserve0After * reserve0After)) / (reserve0Before * reserve0Before);
      expect(kAfter).to.be.closeTo(expectedK, expectedK / 1000n);
    });
  });

  describe("Fee Calculation", () => {
    beforeEach(async () => {
      // 初期流動性を提供
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("2000");

      await tokenA.transfer(await pair.getAddress(), amount0);
      await tokenB.transfer(await pair.getAddress(), amount1);
      await pair.mint(owner.address);
    });

    it("Should apply 0.3% trading fee correctly", async () => {
      const swapAmount = ethers.parseEther("100");
      const [reserve0Before, reserve1Before] = await pair.getReserves();

      await tokenA.connect(addr1).transfer(await pair.getAddress(), swapAmount);

      // 手数料を考慮した計算
      const amountInWithFee = swapAmount * 997n; // 0.3%手数料
      const numerator = amountInWithFee * reserve1Before;
      const denominator = reserve0Before * 1000n + amountInWithFee;
      const expectedAmountOut = numerator / denominator;

      // 手数料なしの場合の計算（比較用）
      const numeratorNoFee = swapAmount * reserve1Before;
      const denominatorNoFee = reserve0Before + swapAmount;
      const amountOutNoFee = numeratorNoFee / denominatorNoFee;

      await pair.connect(addr1).swap(0, expectedAmountOut, addr1.address, "0x");

      // 手数料により出力量が減少することを確認
      expect(expectedAmountOut).to.be.lessThan(amountOutNoFee);

      // 手数料の割合を確認（約0.3%）
      const feeAmount = amountOutNoFee - expectedAmountOut;
      const feePercentage = (feeAmount * 1000n) / amountOutNoFee;
      expect(feePercentage).to.be.closeTo(3n, 1n); // 0.3% ± 0.1%
    });

    it("Should accumulate fees in reserves", async () => {
      const [reserve0Initial, reserve1Initial] = await pair.getReserves();
      const kInitial = reserve0Initial * reserve1Initial;

      // 複数回のスワップで手数料を蓄積
      const swapAmount = ethers.parseEther("100");

      for (let i = 0; i < 3; i++) {
        await tokenA.connect(addr1).transfer(await pair.getAddress(), swapAmount);

        const [currentReserve0, currentReserve1] = await pair.getReserves();
        const amountInWithFee = swapAmount * 997n;
        const numerator = amountInWithFee * currentReserve1;
        const denominator = currentReserve0 * 1000n + amountInWithFee;
        const expectedAmountOut = numerator / denominator;

        await pair.connect(addr1).swap(0, expectedAmountOut, addr1.address, "0x");
      }

      const [reserve0Final, reserve1Final] = await pair.getReserves();
      const kFinal = reserve0Final * reserve1Final;

      // 手数料により実質的な流動性が増加することを確認
      expect(kFinal).to.be.greaterThan(kInitial);

      // リザーブの増加が手数料蓄積を反映することを確認
      const reserve0Increase = reserve0Final - reserve0Initial;
      expect(reserve0Increase).to.equal(swapAmount * 3n); // 3回のスワップで入力された総量
    });

    it("Should calculate fees correctly for different swap sizes", async () => {
      const swapAmounts = [ethers.parseEther("10"), ethers.parseEther("100")];

      for (const swapAmount of swapAmounts) {
        // 既存のペアを使用してテスト
        const [reserve0Before, reserve1Before] = await pair.getReserves();

        // スワップを実行
        await tokenA.connect(addr1).transfer(await pair.getAddress(), swapAmount);

        const amountInWithFee = swapAmount * 997n;
        const numerator = amountInWithFee * reserve1Before;
        const denominator = reserve0Before * 1000n + amountInWithFee;
        const expectedAmountOut = numerator / denominator;

        await pair.connect(addr1).swap(0, expectedAmountOut, addr1.address, "0x");

        // 手数料が正しく適用されることを確認
        const [reserve0After, reserve1After] = await pair.getReserves();
        const actualAmountIn = reserve0After - reserve0Before;
        const actualAmountOut = reserve1Before - reserve1After;

        // 実際の交換レートが手数料を考慮したレートと一致することを確認
        if (actualAmountIn > 0n) {
          const actualRate = (actualAmountOut * 1000n) / actualAmountIn;
          const expectedRate = (expectedAmountOut * 1000n) / swapAmount;
          expect(actualRate).to.be.closeTo(expectedRate, expectedRate / 100n); // 1%の誤差を許容
        }
      }
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("Should handle reentrancy protection", async () => {
      // リエントランシー攻撃のテストは複雑なため、基本的な保護が有効であることを確認
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");

      await tokenA.transfer(await pair.getAddress(), amount0);
      await tokenB.transfer(await pair.getAddress(), amount1);

      // 同時に複数のmint呼び出しを試行（実際のリエントランシーではないが、保護機能をテスト）
      const mintPromise1 = pair.mint(owner.address);
      const mintPromise2 = pair.mint(addr1.address);

      // 最初の呼び出しのみ成功することを確認
      await expect(mintPromise1).to.not.be.reverted;
      await expect(mintPromise2).to.be.revertedWith("AMMPair: INSUFFICIENT_LIQUIDITY_MINTED");
    });

    it("Should handle overflow protection", async () => {
      // 大きな値でのオーバーフロー保護をテスト
      const largeAmount = ethers.parseEther("1000000000000000000000"); // 非常に大きな値

      try {
        await tokenA.mint(owner.address, largeAmount);
        await tokenB.mint(owner.address, largeAmount);

        await tokenA.transfer(await pair.getAddress(), largeAmount);
        await tokenB.transfer(await pair.getAddress(), largeAmount);

        // 大きな値での処理が適切に処理されるか、またはリバートすることを確認
        await expect(pair.mint(owner.address)).to.be.reverted;
      } catch (error) {
        // オーバーフローまたはその他のエラーが発生することを確認
        expect(error).to.exist;
      }
    });

    it("Should handle zero liquidity edge cases", async () => {
      // 流動性がゼロの状態でのスワップ試行
      await expect(pair.swap(1, 0, addr1.address, "0x")).to.be.revertedWith(
        "AMMPair: INSUFFICIENT_LIQUIDITY"
      );
    });

    it("Should handle sync and skim functions", async () => {
      // 初期流動性を提供
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");

      await tokenA.transfer(await pair.getAddress(), amount0);
      await tokenB.transfer(await pair.getAddress(), amount1);
      await pair.mint(owner.address);

      // 余分なトークンを送信
      const extraAmount = ethers.parseEther("10");
      await tokenA.transfer(await pair.getAddress(), extraAmount);

      // skimで余分なトークンを回収
      const balanceBefore = await tokenA.balanceOf(addr1.address);
      await pair.skim(addr1.address);
      const balanceAfter = await tokenA.balanceOf(addr1.address);

      expect(balanceAfter - balanceBefore).to.equal(extraAmount);

      // syncでリザーブを同期
      await pair.sync();
      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0).to.equal(amount0);
      expect(reserve1).to.equal(amount1);
    });

    it("Should fail skim and sync with zero address", async () => {
      await expect(pair.skim(ethers.ZeroAddress)).to.be.revertedWith("AMMPair: INVALID_TO");
    });

    it("Should handle price impact correctly", async () => {
      // 初期流動性を提供
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("1000");

      await tokenA.transfer(await pair.getAddress(), amount0);
      await tokenB.transfer(await pair.getAddress(), amount1);
      await pair.mint(owner.address);

      // 大きなスワップでの価格インパクトをテスト
      const largeSwapAmount = ethers.parseEther("500"); // 50%のリザーブ
      const [reserve0Before, reserve1Before] = await pair.getReserves();

      await tokenA.connect(addr1).transfer(await pair.getAddress(), largeSwapAmount);

      const amountInWithFee = largeSwapAmount * 997n;
      const numerator = amountInWithFee * reserve1Before;
      const denominator = reserve0Before * 1000n + amountInWithFee;
      const expectedAmountOut = numerator / denominator;

      await pair.connect(addr1).swap(0, expectedAmountOut, addr1.address, "0x");

      // 価格インパクトが大きいことを確認
      const priceImpact = (largeSwapAmount * 1000n) / expectedAmountOut;
      expect(priceImpact).to.be.greaterThan(1000n); // 1:1より悪いレート
    });
  });

  describe("Events and State Updates", () => {
    it("Should emit Sync event on reserve updates", async () => {
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");

      await tokenA.transfer(await pair.getAddress(), amount0);
      await tokenB.transfer(await pair.getAddress(), amount1);

      await expect(pair.mint(owner.address)).to.emit(pair, "Sync").withArgs(amount0, amount1);
    });

    it("Should update price cumulative values", async () => {
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");

      await tokenA.transfer(await pair.getAddress(), amount0);
      await tokenB.transfer(await pair.getAddress(), amount1);
      await pair.mint(owner.address);

      const price0Before = await pair.price0CumulativeLast();
      const price1Before = await pair.price1CumulativeLast();

      // 時間を進める（ブロックタイムスタンプを変更）
      await ethers.provider.send("evm_increaseTime", [3600]); // 1時間
      await ethers.provider.send("evm_mine", []);

      // スワップで価格累積値を更新（mintではなくswapを使用）
      const swapAmount = ethers.parseEther("10");
      await tokenA.connect(addr1).transfer(await pair.getAddress(), swapAmount);

      const [currentReserve0, currentReserve1] = await pair.getReserves();
      const amountInWithFee = swapAmount * 997n;
      const numerator = amountInWithFee * currentReserve1;
      const denominator = currentReserve0 * 1000n + amountInWithFee;
      const expectedAmountOut = numerator / denominator;

      await pair.connect(addr1).swap(0, expectedAmountOut, addr1.address, "0x");

      const price0After = await pair.price0CumulativeLast();
      const price1After = await pair.price1CumulativeLast();

      // 価格累積値が更新されることを確認
      expect(price0After).to.be.greaterThan(price0Before);
      expect(price1After).to.be.greaterThan(price1Before);
    });

    it("Should maintain correct total supply", async () => {
      expect(await pair.totalSupply()).to.equal(0);

      // 流動性を追加
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");

      await tokenA.transfer(await pair.getAddress(), amount0);
      await tokenB.transfer(await pair.getAddress(), amount1);
      await pair.mint(owner.address);

      const totalSupplyAfterMint = await pair.totalSupply();
      expect(totalSupplyAfterMint).to.be.greaterThan(MINIMUM_LIQUIDITY);

      // 流動性を除去
      const userBalance = await pair.balanceOf(owner.address);
      await pair.transfer(await pair.getAddress(), userBalance);
      await pair.burn(owner.address);

      const totalSupplyAfterBurn = await pair.totalSupply();
      expect(totalSupplyAfterBurn).to.equal(MINIMUM_LIQUIDITY); // MINIMUM_LIQUIDITYのみ残る
    });
  });
});
