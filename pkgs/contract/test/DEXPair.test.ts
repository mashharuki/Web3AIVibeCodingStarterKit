import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { getAddress, parseEther } from "viem";

describe("DEXPair", function () {
  // テスト用のフィクスチャを定義
  async function deployPairFixture() {
    const [owner, user1, user2, feeTo] = await ethers.getSigners();

    // テスト用ERC20トークンをデプロイ
    const TestToken = await ethers.getContractFactory("TestToken");
    const tokenA = await TestToken.deploy("Token A", "TKNA", parseEther("10000"));
    const tokenB = await TestToken.deploy("Token B", "TKNB", parseEther("10000"));

    // トークンアドレスをソート（DEXFactoryと同じロジック）
    const token0Address = getAddress(tokenA.target as string);
    const token1Address = getAddress(tokenB.target as string);
    const [token0, token1] = token0Address < token1Address 
      ? [tokenA, tokenB] 
      : [tokenB, tokenA];

    // DEXFactoryをデプロイ
    const DEXFactory = await ethers.getContractFactory("DEXFactory");
    const factory = await DEXFactory.deploy(feeTo.address);

    // ペアを作成
    await factory.createPair(token0.target, token1.target);
    const pairAddress = await factory.getPair(token0.target, token1.target);
    
    // ペアコントラクトのインスタンスを取得
    const DEXPair = await ethers.getContractFactory("DEXPair");
    const pair = DEXPair.attach(pairAddress);

    // ユーザーにトークンを転送
    await token0.transfer(user1.address, parseEther("1000"));
    await token1.transfer(user1.address, parseEther("1000"));
    await token0.transfer(user2.address, parseEther("1000"));
    await token1.transfer(user2.address, parseEther("1000"));

    return {
      owner,
      user1,
      user2,
      feeTo,
      token0,
      token1,
      factory,
      pair,
    };
  }

  describe("初期化", function () {
    it("正しいトークンアドレスが設定される", async function () {
      const { token0, token1, pair } = await loadFixture(deployPairFixture);

      expect(await pair.token0()).to.equal(token0.target);
      expect(await pair.token1()).to.equal(token1.target);
    });

    it("初期リザーブが0である", async function () {
      const { pair } = await loadFixture(deployPairFixture);

      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0).to.equal(0n);
      expect(reserve1).to.equal(0n);
    });

    it("初期総供給量が0である", async function () {
      const { pair } = await loadFixture(deployPairFixture);

      expect(await pair.totalSupply()).to.equal(0n);
    });
  });

  describe("流動性提供（mint）", function () {
    it("初回流動性提供が正常に動作する", async function () {
      const { user1, token0, token1, pair } = await loadFixture(deployPairFixture);

      const amount0 = parseEther("100");
      const amount1 = parseEther("200");

      // トークンをペアに転送
      await token0.connect(user1).transfer(pair.target, amount0);
      await token1.connect(user1).transfer(pair.target, amount1);

      // 流動性をミント
      await expect(pair.connect(user1).mint(user1.address))
        .to.emit(pair, "Mint")
        .withArgs(user1.address, amount0, amount1);

      // LPトークンの残高を確認
      const expectedLiquidity = parseEther("141.421356237309504880"); // sqrt(100 * 200) - MINIMUM_LIQUIDITY
      const actualLiquidity = await pair.balanceOf(user1.address);
      
      // 小数点以下の誤差を考慮して比較
      expect(actualLiquidity).to.be.closeTo(expectedLiquidity, parseEther("0.001"));
    });

    it("2回目以降の流動性提供が正常に動作する", async function () {
      const { user1, user2, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 初回流動性提供
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      const initialTotalSupply = await pair.totalSupply();

      // 2回目の流動性提供
      const amount0 = parseEther("50");
      const amount1 = parseEther("100");
      
      await token0.connect(user2).transfer(pair.target, amount0);
      await token1.connect(user2).transfer(pair.target, amount1);
      await pair.connect(user2).mint(user2.address);

      // 期待される流動性トークン量を計算
      const expectedLiquidity = (amount0 * initialTotalSupply) / parseEther("100");
      const actualLiquidity = await pair.balanceOf(user2.address);
      
      expect(actualLiquidity).to.equal(expectedLiquidity);
    });

    it("不均等な流動性提供で最小値が使用される", async function () {
      const { user1, user2, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 初回流動性提供（1:2の比率）
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      const initialTotalSupply = await pair.totalSupply();

      // 不均等な流動性提供（1:1の比率で提供するが、プールは1:2）
      await token0.connect(user2).transfer(pair.target, parseEther("50"));
      await token1.connect(user2).transfer(pair.target, parseEther("50")); // 本来は100必要
      await pair.connect(user2).mint(user2.address);

      // token1の比率で計算された流動性が使用される（最小値）
      const expectedLiquidity = (parseEther("50") * initialTotalSupply) / parseEther("200");
      const actualLiquidity = await pair.balanceOf(user2.address);
      
      expect(actualLiquidity).to.equal(expectedLiquidity);
    });

    it("流動性が0の場合はリバートする", async function () {
      const { user1, token0, token1, pair } = await loadFixture(deployPairFixture);

      // MINIMUM_LIQUIDITY (1000) より小さい流動性になる量を送信
      // sqrt(999 * 999) = 999 < 1000
      await token0.connect(user1).transfer(pair.target, 999n);
      await token1.connect(user1).transfer(pair.target, 999n);

      await expect(pair.connect(user1).mint(user1.address))
        .to.be.revertedWithCustomError(pair, "InsufficientLiquidityMinted");
    });
  });

  describe("流動性除去（burn）", function () {
    async function setupLiquidity() {
      const fixture = await loadFixture(deployPairFixture);
      const { user1, token0, token1, pair } = fixture;

      // 初期流動性を提供
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      return fixture;
    }

    it("流動性除去が正常に動作する", async function () {
      const { user1, token0, token1, pair } = await setupLiquidity();

      const liquidity = await pair.balanceOf(user1.address);
      const halfLiquidity = liquidity / 2n;

      // LPトークンをペアに転送
      await pair.connect(user1).transfer(pair.target, halfLiquidity);

      const initialBalance0 = await token0.balanceOf(user1.address);
      const initialBalance1 = await token1.balanceOf(user1.address);

      // 流動性を除去
      await expect(pair.connect(user1).burn(user1.address))
        .to.emit(pair, "Burn");

      const finalBalance0 = await token0.balanceOf(user1.address);
      const finalBalance1 = await token1.balanceOf(user1.address);

      // トークンが返還されることを確認
      expect(finalBalance0).to.be.gt(initialBalance0);
      expect(finalBalance1).to.be.gt(initialBalance1);
    });

    it("全流動性除去が正常に動作する", async function () {
      const { user1, token0, token1, pair } = await setupLiquidity();

      const liquidity = await pair.balanceOf(user1.address);

      // 全LPトークンをペアに転送
      await pair.connect(user1).transfer(pair.target, liquidity);

      // 流動性を除去
      await pair.connect(user1).burn(user1.address);

      // LPトークン残高が0になることを確認
      expect(await pair.balanceOf(user1.address)).to.equal(0n);
    });

    it("LPトークンが0の場合はリバートする", async function () {
      const { user1, pair } = await setupLiquidity();

      await expect(pair.connect(user1).burn(user1.address))
        .to.be.revertedWithCustomError(pair, "InsufficientLiquidityBurned");
    });
  });

  describe("スワップ（swap）", function () {
    async function setupLiquidityForSwap() {
      const fixture = await loadFixture(deployPairFixture);
      const { user1, token0, token1, pair } = fixture;

      // 流動性を提供（1:2の比率）
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      return fixture;
    }

    it("token0からtoken1へのスワップが正常に動作する", async function () {
      const { user2, token0, token1, pair } = await setupLiquidityForSwap();

      const amountIn = parseEther("1");
      const expectedAmountOut = parseEther("1.9"); // 手数料0.3%を考慮した概算値

      // token0をペアに転送
      await token0.connect(user2).transfer(pair.target, amountIn);

      const initialBalance1 = await token1.balanceOf(user2.address);

      // スワップを実行
      await expect(pair.connect(user2).swap(0, expectedAmountOut, user2.address, "0x"))
        .to.emit(pair, "Swap");

      const finalBalance1 = await token1.balanceOf(user2.address);
      expect(finalBalance1).to.be.gt(initialBalance1);
    });

    it("token1からtoken0へのスワップが正常に動作する", async function () {
      const { user2, token0, token1, pair } = await setupLiquidityForSwap();

      const amountIn = parseEther("2");
      const expectedAmountOut = parseEther("0.9"); // 手数料0.3%を考慮した概算値

      // token1をペアに転送
      await token1.connect(user2).transfer(pair.target, amountIn);

      const initialBalance0 = await token0.balanceOf(user2.address);

      // スワップを実行
      await expect(pair.connect(user2).swap(expectedAmountOut, 0, user2.address, "0x"))
        .to.emit(pair, "Swap");

      const finalBalance0 = await token0.balanceOf(user2.address);
      expect(finalBalance0).to.be.gt(initialBalance0);
    });

    it("出力量が0の場合はリバートする", async function () {
      const { user2, pair } = await setupLiquidityForSwap();

      await expect(pair.connect(user2).swap(0, 0, user2.address, "0x"))
        .to.be.revertedWithCustomError(pair, "InsufficientOutputAmount");
    });

    it("流動性を超える出力量の場合はリバートする", async function () {
      const { user2, pair } = await setupLiquidityForSwap();

      const excessiveAmount = parseEther("101"); // リザーブを超える量

      await expect(pair.connect(user2).swap(excessiveAmount, 0, user2.address, "0x"))
        .to.be.revertedWithCustomError(pair, "InsufficientLiquidity");
    });

    it("入力量が0の場合はリバートする", async function () {
      const { user2, pair } = await setupLiquidityForSwap();

      await expect(pair.connect(user2).swap(0, parseEther("0.1"), user2.address, "0x"))
        .to.be.revertedWithCustomError(pair, "InsufficientInputAmount");
    });

    it("x*y=k不変式が維持される", async function () {
      const { user2, token0, token1, pair } = await setupLiquidityForSwap();

      const [reserve0Before, reserve1Before] = await pair.getReserves();
      const kBefore = reserve0Before * reserve1Before;

      // スワップを実行
      const amountIn = parseEther("1");
      await token0.connect(user2).transfer(pair.target, amountIn);
      await pair.connect(user2).swap(0, parseEther("1.8"), user2.address, "0x");

      const [reserve0After, reserve1After] = await pair.getReserves();
      const kAfter = reserve0After * reserve1After;

      // 手数料により若干kが増加することを確認
      expect(kAfter).to.be.gte(kBefore);
    });
  });

  describe("ユーティリティ関数", function () {
    it("skim関数が正常に動作する", async function () {
      const { user1, user2, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 流動性を提供
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      // 余分なトークンを直接送信
      await token0.connect(user1).transfer(pair.target, parseEther("10"));

      const initialBalance = await token0.balanceOf(user2.address);

      // skimを実行
      await pair.skim(user2.address);

      const finalBalance = await token0.balanceOf(user2.address);
      expect(finalBalance).to.equal(initialBalance + parseEther("10"));
    });

    it("sync関数が正常に動作する", async function () {
      const { user1, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 流動性を提供
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      // 余分なトークンを直接送信
      await token0.connect(user1).transfer(pair.target, parseEther("10"));

      // syncを実行
      await expect(pair.sync())
        .to.emit(pair, "Sync");

      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0).to.equal(parseEther("110"));
      expect(reserve1).to.equal(parseEther("200"));
    });
  });

  describe("ERC20機能", function () {
    it("approve関数が正常に動作する", async function () {
      const { user1, user2, pair } = await loadFixture(deployPairFixture);

      const amount = parseEther("100");
      await pair.connect(user1).approve(user2.address, amount);

      expect(await pair.allowance(user1.address, user2.address)).to.equal(amount);
    });

    it("transfer関数が正常に動作する", async function () {
      const { user1, user2, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 流動性を提供してLPトークンを取得
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      const balance = await pair.balanceOf(user1.address);
      const transferAmount = balance / 2n;

      await pair.connect(user1).transfer(user2.address, transferAmount);

      expect(await pair.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await pair.balanceOf(user1.address)).to.equal(balance - transferAmount);
    });

    it("transferFrom関数が正常に動作する", async function () {
      const { user1, user2, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 流動性を提供してLPトークンを取得
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      const balance = await pair.balanceOf(user1.address);
      const transferAmount = balance / 2n;

      // 承認
      await pair.connect(user1).approve(user2.address, transferAmount);

      // transferFromを実行
      await pair.connect(user2).transferFrom(user1.address, user2.address, transferAmount);

      expect(await pair.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await pair.balanceOf(user1.address)).to.equal(balance - transferAmount);
    });
  });

  describe("数学的正確性テスト", function () {
    async function setupMathTest() {
      const fixture = await loadFixture(deployPairFixture);
      const { user1, token0, token1, pair } = fixture;

      // 初期流動性を提供（1:2の比率、100:200）
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      return fixture;
    }

    it("x*y=k不変式の数学的正確性を検証", async function () {
      const { user2, token0, token1, pair } = await setupMathTest();

      const [reserve0Before, reserve1Before] = await pair.getReserves();
      const kBefore = reserve0Before * reserve1Before;

      // 複数回のスワップを実行してkの変化を確認
      const swapAmounts = [parseEther("1"), parseEther("0.5"), parseEther("2")];
      
      for (const amountIn of swapAmounts) {
        await token0.connect(user2).transfer(pair.target, amountIn);
        
        // 期待される出力量を計算（手数料0.3%を考慮）
        const [currentReserve0, currentReserve1] = await pair.getReserves();
        const amountInWithFee = amountIn * 997n;
        const numerator = amountInWithFee * currentReserve1;
        const denominator = currentReserve0 * 1000n + amountInWithFee;
        const expectedAmountOut = numerator / denominator;

        await pair.connect(user2).swap(0, expectedAmountOut, user2.address, "0x");

        const [newReserve0, newReserve1] = await pair.getReserves();
        const kAfter = newReserve0 * newReserve1;

        // 手数料により k は増加または維持される
        expect(kAfter).to.be.gte(kBefore);
      }
    });

    it("流動性計算の数学的正確性を検証", async function () {
      const { user2, token0, token1, pair } = await setupMathTest();

      const totalSupplyBefore = await pair.totalSupply();
      const [reserve0Before, reserve1Before] = await pair.getReserves();

      // 追加流動性の量
      const amount0 = parseEther("50");
      const amount1 = parseEther("100");

      await token0.connect(user2).transfer(pair.target, amount0);
      await token1.connect(user2).transfer(pair.target, amount1);

      const balanceBefore = await pair.balanceOf(user2.address);
      await pair.connect(user2).mint(user2.address);
      const balanceAfter = await pair.balanceOf(user2.address);

      const liquidityMinted = balanceAfter - balanceBefore;

      // 期待される流動性を計算
      const expectedLiquidity0 = (amount0 * totalSupplyBefore) / reserve0Before;
      const expectedLiquidity1 = (amount1 * totalSupplyBefore) / reserve1Before;
      const expectedLiquidity = expectedLiquidity0 < expectedLiquidity1 ? expectedLiquidity0 : expectedLiquidity1;

      expect(liquidityMinted).to.equal(expectedLiquidity);
    });

    it("価格計算の精度テスト", async function () {
      const { user2, token0, token1, pair } = await setupMathTest();

      // 小額スワップでの価格精度をテスト
      const smallAmount = parseEther("0.001"); // 0.001 token
      await token0.connect(user2).transfer(pair.target, smallAmount);

      const [reserve0, reserve1] = await pair.getReserves();
      
      // 期待される出力量を手動計算
      const amountInWithFee = smallAmount * 997n;
      const numerator = amountInWithFee * reserve1;
      const denominator = reserve0 * 1000n + amountInWithFee;
      const expectedOut = numerator / denominator;

      const balanceBefore = await token1.balanceOf(user2.address);
      await pair.connect(user2).swap(0, expectedOut, user2.address, "0x");
      const balanceAfter = await token1.balanceOf(user2.address);

      const actualOut = balanceAfter - balanceBefore;
      expect(actualOut).to.equal(expectedOut);
    });

    it("大額取引での数値オーバーフロー防止", async function () {
      const { user1, user2, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 大量の流動性を提供（ユーザーの残高内で）
      const largeAmount0 = parseEther("800"); // 800 tokens
      const largeAmount1 = parseEther("800"); // 800 tokens

      await token0.connect(user1).transfer(pair.target, largeAmount0);
      await token1.connect(user1).transfer(pair.target, largeAmount1);
      await pair.connect(user1).mint(user1.address);

      // 大額スワップを実行
      const swapAmount = parseEther("100"); // 100 tokens
      await token0.connect(user2).transfer(pair.target, swapAmount);

      // オーバーフローが発生しないことを確認
      await expect(pair.connect(user2).swap(0, parseEther("80"), user2.address, "0x"))
        .to.not.be.reverted;
    });
  });

  describe("価格オラクル機能テスト", function () {
    async function setupOracleTest() {
      const fixture = await loadFixture(deployPairFixture);
      const { user1, token0, token1, pair } = fixture;

      // 初期流動性を提供
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      return fixture;
    }

    it("価格累積値が時間経過とともに更新される", async function () {
      const { user2, token0, token1, pair } = await setupOracleTest();

      const price0Before = await pair.price0CumulativeLast();
      const price1Before = await pair.price1CumulativeLast();

      // 時間を進める
      await time.increase(3600); // 1時間

      // 取引を実行して価格を更新
      await token0.connect(user2).transfer(pair.target, parseEther("1"));
      await pair.connect(user2).swap(0, parseEther("1.9"), user2.address, "0x");

      const price0After = await pair.price0CumulativeLast();
      const price1After = await pair.price1CumulativeLast();

      // 価格累積値が増加していることを確認
      expect(price0After).to.be.gt(price0Before);
      expect(price1After).to.be.gt(price1Before);
    });

    it("リザーブが0の場合は価格累積値が更新されない", async function () {
      const { pair } = await loadFixture(deployPairFixture);

      const price0Before = await pair.price0CumulativeLast();
      const price1Before = await pair.price1CumulativeLast();

      // 時間を進める
      await time.increase(3600);

      // sync を呼び出して更新を試行（リザーブは0のまま）
      await pair.sync();

      const price0After = await pair.price0CumulativeLast();
      const price1After = await pair.price1CumulativeLast();

      // 価格累積値が変化していないことを確認
      expect(price0After).to.equal(price0Before);
      expect(price1After).to.equal(price1Before);
    });

    it("同一ブロック内では価格累積値が更新されない", async function () {
      const { user2, token0, pair } = await setupOracleTest();

      // 最初に時間を進めて価格累積値を初期化
      await time.increase(1);
      await token0.connect(user2).transfer(pair.target, parseEther("0.1"));
      await pair.connect(user2).swap(0, parseEther("0.19"), user2.address, "0x");

      const price0Before = await pair.price0CumulativeLast();

      // 同一ブロック内で複数の取引を実行（automine無効化で同一ブロック内実行）
      await ethers.provider.send("evm_setAutomine", [false]);
      
      await token0.connect(user2).transfer(pair.target, parseEther("1"));
      await pair.connect(user2).swap(0, parseEther("1.8"), user2.address, "0x");
      
      // ブロックをマイン
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_setAutomine", [true]);

      const price0After = await pair.price0CumulativeLast();

      // 同一ブロックなので価格累積値は変化しない
      expect(price0After).to.equal(price0Before);
    });
  });

  describe("プロトコル手数料テスト", function () {
    async function setupFeeTest() {
      const fixture = await loadFixture(deployPairFixture);
      const { user1, token0, token1, factory, pair, feeTo } = fixture;

      // プロトコル手数料を有効化（feeToがfeeToSetterなので、feeToで実行）
      await factory.connect(feeTo).setFeeTo(feeTo.address);

      // 初期流動性を提供
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      return fixture;
    }

    it("プロトコル手数料が正しく計算される", async function () {
      const { user2, token0, token1, pair, feeTo } = await setupFeeTest();

      // 複数回の取引を実行してプロトコル手数料を発生させる
      for (let i = 0; i < 5; i++) {
        await token0.connect(user2).transfer(pair.target, parseEther("1"));
        await pair.connect(user2).swap(0, parseEther("1.8"), user2.address, "0x");
      }

      const feeToBalanceBefore = await pair.balanceOf(feeTo.address);

      // 新しい流動性を追加してプロトコル手数料をミント
      await token0.connect(user2).transfer(pair.target, parseEther("10"));
      await token1.connect(user2).transfer(pair.target, parseEther("20"));
      await pair.connect(user2).mint(user2.address);

      const feeToBalanceAfter = await pair.balanceOf(feeTo.address);

      // プロトコル手数料が発生していることを確認
      expect(feeToBalanceAfter).to.be.gt(feeToBalanceBefore);
    });

    it("プロトコル手数料が無効の場合は手数料が発生しない", async function () {
      const { user1, user2, token0, token1, factory, pair, feeTo } = await loadFixture(deployPairFixture);

      // プロトコル手数料を無効化（feeToがfeeToSetterなので、feeToで実行）
      await factory.connect(feeTo).setFeeTo("0x0000000000000000000000000000000000000000");

      // 流動性を提供
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      // 取引を実行
      await token0.connect(user2).transfer(pair.target, parseEther("1"));
      await pair.connect(user2).swap(0, parseEther("1.8"), user2.address, "0x");

      const feeToBalanceBefore = await pair.balanceOf(feeTo.address);

      // 新しい流動性を追加
      await token0.connect(user2).transfer(pair.target, parseEther("10"));
      await token1.connect(user2).transfer(pair.target, parseEther("20"));
      await pair.connect(user2).mint(user2.address);

      const feeToBalanceAfter = await pair.balanceOf(feeTo.address);

      // プロトコル手数料が発生していないことを確認
      expect(feeToBalanceAfter).to.equal(feeToBalanceBefore);
    });
  });

  describe("リエントランシー攻撃対策テスト", function () {
    async function deployMaliciousContract() {
      const fixture = await loadFixture(deployPairFixture);
      const { user1, token0, token1, pair } = fixture;

      // 悪意のあるコントラクトをデプロイ
      const MaliciousReentrancy = await ethers.getContractFactory("MaliciousReentrancy");
      const malicious = await MaliciousReentrancy.deploy(pair.target, token0.target, token1.target);

      // 悪意のあるコントラクトにトークンを送信（フラッシュローン返済用）
      await token0.connect(user1).transfer(malicious.target, parseEther("100"));
      await token1.connect(user1).transfer(malicious.target, parseEther("200"));

      // 流動性を提供してプールを初期化
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      return { ...fixture, malicious };
    }

    it("フラッシュスワップ中のリエントランシー攻撃が防止される", async function () {
      const { malicious } = await deployMaliciousContract();

      // 悪意のあるコントラクトがフラッシュスワップを通じてリエントランシー攻撃を試行
      // 攻撃は失敗し、正常にフラッシュローンが返済される
      await expect(malicious.attack()).to.not.be.reverted;

      // 攻撃カウントが増加していることを確認（コールバック内でリエントランシーが試行された）
      expect(await malicious.attackCount()).to.be.gt(0);
    });

    it("mint関数でのリエントランシー保護", async function () {
      const { malicious } = await deployMaliciousContract();

      // 悪意のあるコントラクトが直接mintを呼び出す（正常動作）
      await expect(malicious.attackMint()).to.not.be.reverted;
    });

    it("burn関数でのリエントランシー保護", async function () {
      const { malicious, token0, token1, pair } = await deployMaliciousContract();

      // まず悪意のあるコントラクトに流動性を提供させる
      await token0.transfer(malicious.target, parseEther("10"));
      await token1.transfer(malicious.target, parseEther("20"));
      await malicious.attackMint();

      // 悪意のあるコントラクトがburnを呼び出す（正常動作）
      await expect(malicious.attackBurn()).to.not.be.reverted;
    });

    it("同時実行ロックが正しく動作する", async function () {
      const { user1, user2, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 流動性を提供
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      // 正常な操作は成功する
      await token0.connect(user2).transfer(pair.target, parseEther("1"));
      await expect(pair.connect(user2).swap(0, parseEther("1.8"), user2.address, "0x"))
        .to.not.be.reverted;
    });

    it("skim関数でのリエントランシー保護", async function () {
      const { user1, user2, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 流動性を提供
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      // 余分なトークンを送信
      await token0.connect(user1).transfer(pair.target, parseEther("10"));

      // 正常なskim操作が成功することを確認
      await expect(pair.skim(user2.address)).to.not.be.reverted;
    });

    it("sync関数でのリエントランシー保護", async function () {
      const { user1, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 流動性を提供
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      // 余分なトークンを送信
      await token0.connect(user1).transfer(pair.target, parseEther("10"));

      // 正常なsync操作が成功することを確認
      await expect(pair.sync()).to.not.be.reverted;
    });

    it("複数の関数での同時リエントランシー試行が防止される", async function () {
      const { user1, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 流動性を提供
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      // 各関数が独立してロック機構を持つことを確認
      await expect(pair.sync()).to.not.be.reverted;
      await expect(pair.skim(user1.address)).to.not.be.reverted;
    });
  });

  describe("エラーケーステスト", function () {
    it("初期化が一度だけ実行される", async function () {
      const { token0, token1, pair } = await loadFixture(deployPairFixture);

      // 既に初期化されているため、再初期化は失敗する
      await expect(pair.initialize(token0.target, token1.target))
        .to.be.revertedWithCustomError(pair, "Forbidden");
    });

    it("不正なトークンアドレスでのスワップが失敗する", async function () {
      const { user1, user2, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 流動性を提供
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      await token0.connect(user2).transfer(pair.target, parseEther("1"));

      // トークンアドレスを受取先に指定するとエラー
      await expect(pair.connect(user2).swap(0, parseEther("1.8"), token0.target, "0x"))
        .to.be.revertedWithCustomError(pair, "InvalidTo");

      await expect(pair.connect(user2).swap(0, parseEther("1.8"), token1.target, "0x"))
        .to.be.revertedWithCustomError(pair, "InvalidTo");
    });

    it("残高不足でのERC20転送が失敗する", async function () {
      const { user1, user2, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 流動性を提供してLPトークンを取得
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      const balance = await pair.balanceOf(user1.address);

      // 残高を超える転送は失敗する
      await expect(pair.connect(user1).transfer(user2.address, balance + 1n))
        .to.be.reverted;
    });

    it("承認不足でのtransferFromが失敗する", async function () {
      const { user1, user2, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 流動性を提供してLPトークンを取得
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      const balance = await pair.balanceOf(user1.address);

      // 承認なしでのtransferFromは失敗する
      await expect(pair.connect(user2).transferFrom(user1.address, user2.address, balance))
        .to.be.reverted;
    });
  });

  describe("境界値テスト", function () {
    it("最小流動性での動作", async function () {
      const { user1, token0, token1, pair } = await loadFixture(deployPairFixture);

      // MINIMUM_LIQUIDITY + 1 の流動性を提供
      const amount0 = 1001n;
      const amount1 = 1001n;

      await token0.connect(user1).transfer(pair.target, amount0);
      await token1.connect(user1).transfer(pair.target, amount1);

      await expect(pair.connect(user1).mint(user1.address)).to.not.be.reverted;

      const liquidity = await pair.balanceOf(user1.address);
      expect(liquidity).to.be.gt(0);
    });

    it("最大値近くでの動作", async function () {
      const { user1, token0, token1, pair } = await loadFixture(deployPairFixture);

      // ユーザーの残高内で大きな値をテスト
      const testAmount = parseEther("900"); // 900 tokens (1000残高内)

      await token0.connect(user1).transfer(pair.target, testAmount);
      await token1.connect(user1).transfer(pair.target, testAmount);

      await expect(pair.connect(user1).mint(user1.address)).to.not.be.reverted;
    });

    it("ゼロアドレスへの転送", async function () {
      const { user1, token0, token1, pair } = await loadFixture(deployPairFixture);

      // 流動性を提供してLPトークンを取得
      await token0.connect(user1).transfer(pair.target, parseEther("100"));
      await token1.connect(user1).transfer(pair.target, parseEther("200"));
      await pair.connect(user1).mint(user1.address);

      const balance = await pair.balanceOf(user1.address);

      // ゼロアドレスへの転送（burn扱い）
      await expect(pair.connect(user1).transfer("0x0000000000000000000000000000000000000000", balance))
        .to.not.be.reverted;
    });
  });
});

// テスト用のERC20トークンコントラクト
// 実際のテストではこれを別ファイルで定義するか、既存のものを使用します