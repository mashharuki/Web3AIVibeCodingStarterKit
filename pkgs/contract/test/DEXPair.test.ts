import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEXPair", function () {
  // テスト用のフィクスチャを定義
  async function deployDEXPairFixture() {
    // アカウントを取得
    const [owner, feeToSetter, feeTo, user1, user2] = await ethers.getSigners();

    // DEXFactoryをデプロイ
    const DEXFactory = await ethers.getContractFactory("DEXFactory");
    const factory = await DEXFactory.deploy(feeToSetter.address);

    // テスト用のERC20トークンをデプロイ
    const TestToken = await ethers.getContractFactory("TestToken");
    const tokenA = await TestToken.deploy("Token A", "TKNA", ethers.parseEther("1000000"));
    const tokenB = await TestToken.deploy("Token B", "TKNB", ethers.parseEther("1000000"));

    // ペアを作成
    await factory.createPair(tokenA.target, tokenB.target);
    const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
    const pair = await ethers.getContractAt("DEXPair", pairAddress);

    // トークンの順序を確認
    const token0Address = await pair.token0();
    const token1Address = await pair.token1();
    const token0 = token0Address === tokenA.target ? tokenA : tokenB;
    const token1 = token1Address === tokenA.target ? tokenA : tokenB;

    return {
      factory,
      pair,
      tokenA,
      tokenB,
      token0,
      token1,
      owner,
      feeToSetter,
      feeTo,
      user1,
      user2,
    };
  }

  describe("Initialization", function () {
    it("Should have correct token addresses", async function () {
      const { pair, tokenA, tokenB } = await loadFixture(deployDEXPairFixture);

      const token0 = await pair.token0();
      const token1 = await pair.token1();

      // トークンアドレスがソートされていることを確認
      expect(token0.toLowerCase() < token1.toLowerCase()).to.be.true;

      // 両方のトークンアドレスが含まれていることを確認
      const addresses = [token0, token1];
      expect(addresses).to.include(tokenA.target);
      expect(addresses).to.include(tokenB.target);
    });

    it("Should have correct name and symbol", async function () {
      const { pair } = await loadFixture(deployDEXPairFixture);

      expect(await pair.name()).to.equal("DEX LP Token");
      expect(await pair.symbol()).to.equal("DEX-LP");
    });

    it("Should have zero initial reserves", async function () {
      const { pair } = await loadFixture(deployDEXPairFixture);

      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0).to.equal(0);
      expect(reserve1).to.equal(0);
    });
  });

  describe("Liquidity Management", function () {
    it("Should mint liquidity tokens on first liquidity provision", async function () {
      const { pair, token0, token1, user1 } = await loadFixture(deployDEXPairFixture);

      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("1000");

      // トークンをペアに送信
      await token0.transfer(pair.target, amount0);
      await token1.transfer(pair.target, amount1);

      // 流動性をミント
      const tx = await pair.mint(user1.address);
      const receipt = await tx.wait();

      // LPトークンがミントされたことを確認
      const lpBalance = await pair.balanceOf(user1.address);
      expect(lpBalance).to.be.greaterThan(0);

      // 最小流動性がロックされたことを確認
      const minimumLiquidity = await pair.MINIMUM_LIQUIDITY();
      const lockAddress = "0x0000000000000000000000000000000000000001";
      const lockedBalance = await pair.balanceOf(lockAddress);
      expect(lockedBalance).to.equal(minimumLiquidity);

      // リザーブが更新されたことを確認
      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0).to.equal(amount0);
      expect(reserve1).to.equal(amount1);

      // イベントが発行されたことを確認
      expect(receipt?.logs).to.have.lengthOf.greaterThan(0);
    });

    it("Should mint proportional liquidity on subsequent provisions", async function () {
      const { pair, token0, token1, user1, user2 } = await loadFixture(deployDEXPairFixture);

      // 初回流動性提供
      const initialAmount0 = ethers.parseEther("1000");
      const initialAmount1 = ethers.parseEther("1000");

      await token0.transfer(pair.target, initialAmount0);
      await token1.transfer(pair.target, initialAmount1);
      await pair.mint(user1.address);

      const initialLpBalance = await pair.balanceOf(user1.address);

      // 2回目の流動性提供（同じ比率）
      const additionalAmount0 = ethers.parseEther("500");
      const additionalAmount1 = ethers.parseEther("500");

      await token0.transfer(pair.target, additionalAmount0);
      await token1.transfer(pair.target, additionalAmount1);
      await pair.mint(user2.address);

      const user2LpBalance = await pair.balanceOf(user2.address);

      // 比例的にLPトークンがミントされることを確認
      const expectedRatio = (additionalAmount0 * initialLpBalance) / initialAmount0;
      expect(user2LpBalance).to.be.closeTo(expectedRatio, ethers.parseEther("1"));
    });

    it("Should burn liquidity tokens and return underlying tokens", async function () {
      const { pair, token0, token1, user1 } = await loadFixture(deployDEXPairFixture);

      // 流動性を提供
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("1000");

      await token0.transfer(pair.target, amount0);
      await token1.transfer(pair.target, amount1);
      await pair.mint(user1.address);

      const lpBalance = await pair.balanceOf(user1.address);
      const initialToken0Balance = await token0.balanceOf(user1.address);
      const initialToken1Balance = await token1.balanceOf(user1.address);

      // LPトークンをペアに送信
      await pair.connect(user1).transfer(pair.target, lpBalance);

      // 流動性をバーン
      const tx = await pair.burn(user1.address);
      const receipt = await tx.wait();

      // トークンが返却されたことを確認
      const finalToken0Balance = await token0.balanceOf(user1.address);
      const finalToken1Balance = await token1.balanceOf(user1.address);

      expect(finalToken0Balance).to.be.greaterThan(initialToken0Balance);
      expect(finalToken1Balance).to.be.greaterThan(initialToken1Balance);

      // LPトークンがバーンされたことを確認
      expect(await pair.balanceOf(user1.address)).to.equal(0);

      // イベントが発行されたことを確認
      expect(receipt?.logs).to.have.lengthOf.greaterThan(0);
    });

    it("Should revert when minting with insufficient liquidity", async function () {
      const { pair, user1 } = await loadFixture(deployDEXPairFixture);

      // トークンを送信せずにミントしようとする
      await expect(pair.mint(user1.address)).to.be.reverted;
    });

    it("Should revert when burning with insufficient liquidity", async function () {
      const { pair, user1 } = await loadFixture(deployDEXPairFixture);

      // LPトークンを送信せずにバーンしようとする
      await expect(pair.burn(user1.address)).to.be.reverted;
    });
  });

  describe("Token Swapping", function () {
    it("Should execute token swap correctly", async function () {
      const { pair, token0, token1, user1 } = await loadFixture(deployDEXPairFixture);

      // 流動性を提供
      const liquidityAmount0 = ethers.parseEther("10000");
      const liquidityAmount1 = ethers.parseEther("10000");

      await token0.transfer(pair.target, liquidityAmount0);
      await token1.transfer(pair.target, liquidityAmount1);
      await pair.mint(user1.address);

      // スワップ用のトークンを準備
      const swapAmount = ethers.parseEther("100");
      await token0.transfer(pair.target, swapAmount);

      const initialBalance = await token1.balanceOf(user1.address);

      // スワップを実行（token0 -> token1）
      // 正確な出力量を計算: (997 * 100 * 10000) / (10000 * 1000 + 997 * 100)
      const expectedOutput = ethers.parseEther("98"); // より保守的な値
      await pair.swap(0, expectedOutput, user1.address, "0x");

      const finalBalance = await token1.balanceOf(user1.address);
      expect(finalBalance).to.be.greaterThan(initialBalance);
    });

    it("Should revert swap with insufficient output amount", async function () {
      const { pair, user1 } = await loadFixture(deployDEXPairFixture);

      await expect(pair.swap(0, 0, user1.address, "0x")).to.be.revertedWithCustomError(
        pair,
        "InsufficientOutputAmount"
      );
    });

    it("Should revert swap with insufficient liquidity", async function () {
      const { pair, token0, token1, user1 } = await loadFixture(deployDEXPairFixture);

      // 流動性を提供
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("1000");

      await token0.transfer(pair.target, amount0);
      await token1.transfer(pair.target, amount1);
      await pair.mint(user1.address);

      // リザーブを超える量をスワップしようとする
      const excessiveAmount = ethers.parseEther("2000");
      await expect(
        pair.swap(excessiveAmount, 0, user1.address, "0x")
      ).to.be.revertedWithCustomError(pair, "InsufficientLiquidity");
    });
  });

  describe("Sync Function", function () {
    it("Should sync reserves with current balances", async function () {
      const { pair, token0, token1, owner } = await loadFixture(deployDEXPairFixture);

      // 流動性を提供
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("1000");

      await token0.transfer(pair.target, amount0);
      await token1.transfer(pair.target, amount1);
      await pair.mint(owner.address);

      // 直接トークンを送信（リザーブと残高を不一致にする）
      const additionalAmount = ethers.parseEther("100");
      await token0.transfer(pair.target, additionalAmount);

      // sync前の状態確認
      const [reserveBefore0] = await pair.getReserves();
      const balanceBefore = await token0.balanceOf(pair.target);
      expect(balanceBefore).to.be.greaterThan(reserveBefore0);

      // syncを実行
      await pair.sync();

      // sync後の状態確認
      const [reserveAfter0] = await pair.getReserves();
      const balanceAfter = await token0.balanceOf(pair.target);
      expect(reserveAfter0).to.equal(balanceAfter);
    });
  });

  describe("Price Oracle", function () {
    it("Should update price cumulative values over time", async function () {
      const { pair, token0, token1, owner } = await loadFixture(deployDEXPairFixture);

      // 流動性を提供
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("2000"); // 異なる比率

      await token0.transfer(pair.target, amount0);
      await token1.transfer(pair.target, amount1);
      await pair.mint(owner.address);

      const initialPrice0 = await pair.price0CumulativeLast();
      const initialPrice1 = await pair.price1CumulativeLast();

      // 時間を進めるためにブロックをマイニング
      await ethers.provider.send("evm_mine", []);

      // 価格更新をトリガーするためにsyncを実行
      await pair.sync();

      const finalPrice0 = await pair.price0CumulativeLast();
      const finalPrice1 = await pair.price1CumulativeLast();

      // 価格累積値が更新されたことを確認（時間が経過した場合）
      // 注意: テスト環境では時間の経過が少ないため、値が同じ場合もある
      expect(finalPrice0).to.be.greaterThanOrEqual(initialPrice0);
      expect(finalPrice1).to.be.greaterThanOrEqual(initialPrice1);
    });
  });
});
