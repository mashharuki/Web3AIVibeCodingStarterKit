import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEXFactory", function () {
  // テスト用のフィクスチャを定義
  async function deployDEXFactoryFixture() {
    // アカウントを取得
    const [owner, feeToSetter, feeTo, user1, user2] = await ethers.getSigners();

    // DEXFactoryをデプロイ
    const DEXFactory = await ethers.getContractFactory("DEXFactory");
    const factory = await DEXFactory.deploy(feeToSetter.address);

    // テスト用のERC20トークンをデプロイ
    const TestToken = await ethers.getContractFactory("TestToken");
    const tokenA = await TestToken.deploy("Token A", "TKNA", ethers.parseEther("1000000"));
    const tokenB = await TestToken.deploy("Token B", "TKNB", ethers.parseEther("1000000"));

    return {
      factory,
      tokenA,
      tokenB,
      owner,
      feeToSetter,
      feeTo,
      user1,
      user2,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct feeToSetter", async function () {
      const { factory, feeToSetter } = await loadFixture(deployDEXFactoryFixture);

      expect(await factory.feeToSetter()).to.equal(feeToSetter.address);
    });

    it("Should have zero pairs initially", async function () {
      const { factory } = await loadFixture(deployDEXFactoryFixture);

      expect(await factory.allPairsLength()).to.equal(0);
    });

    it("Should revert if feeToSetter is zero address", async function () {
      const DEXFactory = await ethers.getContractFactory("DEXFactory");

      await expect(DEXFactory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        DEXFactory,
        "ZeroAddress"
      );
    });
  });

  describe("Pair Creation", function () {
    it("Should create a new pair successfully", async function () {
      const { factory, tokenA, tokenB } = await loadFixture(deployDEXFactoryFixture);

      const tx = await factory.createPair(tokenA.target, tokenB.target);
      const receipt = await tx.wait();

      // ペアが作成されたことを確認
      expect(await factory.allPairsLength()).to.equal(1);

      // ペアアドレスを取得
      const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      // 双方向マッピングを確認
      expect(await factory.getPair(tokenB.target, tokenA.target)).to.equal(pairAddress);

      // イベントが発行されたことを確認
      expect(receipt?.logs).to.have.lengthOf.greaterThan(0);
    });

    it("Should revert when creating pair with identical tokens", async function () {
      const { factory, tokenA } = await loadFixture(deployDEXFactoryFixture);

      await expect(factory.createPair(tokenA.target, tokenA.target)).to.be.revertedWithCustomError(
        factory,
        "IdenticalAddresses"
      );
    });

    it("Should revert when creating pair with zero address", async function () {
      const { factory, tokenA } = await loadFixture(deployDEXFactoryFixture);

      await expect(
        factory.createPair(tokenA.target, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");

      await expect(
        factory.createPair(ethers.ZeroAddress, tokenA.target)
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });

    it("Should revert when pair already exists", async function () {
      const { factory, tokenA, tokenB } = await loadFixture(deployDEXFactoryFixture);

      // 最初のペア作成
      await factory.createPair(tokenA.target, tokenB.target);

      // 同じペアを再度作成しようとする
      await expect(factory.createPair(tokenA.target, tokenB.target)).to.be.revertedWithCustomError(
        factory,
        "PairExists"
      );

      // 順序を逆にしても同じエラー
      await expect(factory.createPair(tokenB.target, tokenA.target)).to.be.revertedWithCustomError(
        factory,
        "PairExists"
      );
    });

    it("Should sort tokens correctly", async function () {
      const { factory, tokenA, tokenB } = await loadFixture(deployDEXFactoryFixture);

      // トークンアドレスの大小関係を確認
      const isTokenASmaller = tokenA.target.toLowerCase() < tokenB.target.toLowerCase();
      const expectedToken0 = isTokenASmaller ? tokenA.target : tokenB.target;
      const expectedToken1 = isTokenASmaller ? tokenB.target : tokenA.target;

      await factory.createPair(tokenA.target, tokenB.target);
      const pairAddress = await factory.getPair(tokenA.target, tokenB.target);

      // ペアコントラクトのtoken0とtoken1を確認
      const pair = await ethers.getContractAt("DEXPair", pairAddress);
      expect(await pair.token0()).to.equal(expectedToken0);
      expect(await pair.token1()).to.equal(expectedToken1);
    });
  });

  describe("Fee Management", function () {
    it("Should set feeTo correctly", async function () {
      const { factory, feeToSetter, feeTo } = await loadFixture(deployDEXFactoryFixture);

      await factory.connect(feeToSetter).setFeeTo(feeTo.address);
      expect(await factory.feeTo()).to.equal(feeTo.address);
    });

    it("Should revert setFeeTo if not called by feeToSetter", async function () {
      const { factory, feeTo, user1 } = await loadFixture(deployDEXFactoryFixture);

      await expect(factory.connect(user1).setFeeTo(feeTo.address)).to.be.revertedWithCustomError(
        factory,
        "Forbidden"
      );
    });

    it("Should set feeToSetter correctly", async function () {
      const { factory, feeToSetter, user1 } = await loadFixture(deployDEXFactoryFixture);

      await factory.connect(feeToSetter).setFeeToSetter(user1.address);
      expect(await factory.feeToSetter()).to.equal(user1.address);
    });

    it("Should revert setFeeToSetter if not called by current feeToSetter", async function () {
      const { factory, user1, user2 } = await loadFixture(deployDEXFactoryFixture);

      await expect(
        factory.connect(user1).setFeeToSetter(user2.address)
      ).to.be.revertedWithCustomError(factory, "Forbidden");
    });

    it("Should revert setFeeToSetter if new address is zero", async function () {
      const { factory, feeToSetter } = await loadFixture(deployDEXFactoryFixture);

      await expect(
        factory.connect(feeToSetter).setFeeToSetter(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });
  });

  describe("Utility Functions", function () {
    it("Should return correct pair existence status", async function () {
      const { factory, tokenA, tokenB } = await loadFixture(deployDEXFactoryFixture);

      // ペア作成前
      expect(await factory.pairExists(tokenA.target, tokenB.target)).to.be.false;

      // ペア作成
      await factory.createPair(tokenA.target, tokenB.target);

      // ペア作成後
      expect(await factory.pairExists(tokenA.target, tokenB.target)).to.be.true;
      expect(await factory.pairExists(tokenB.target, tokenA.target)).to.be.true;
    });

    it("Should return all pairs correctly", async function () {
      const { factory, tokenA, tokenB } = await loadFixture(deployDEXFactoryFixture);

      // 追加のトークンを作成
      const TestToken = await ethers.getContractFactory("TestToken");
      const tokenC = await TestToken.deploy("Token C", "TKNC", ethers.parseEther("1000000"));

      // 複数のペアを作成
      await factory.createPair(tokenA.target, tokenB.target);
      await factory.createPair(tokenA.target, tokenC.target);

      const allPairs = await factory.getAllPairs();
      expect(allPairs).to.have.lengthOf(2);
    });

    it("Should calculate pair address correctly", async function () {
      const { factory, tokenA, tokenB } = await loadFixture(deployDEXFactoryFixture);

      // 事前計算されたアドレス
      const predictedAddress = await factory.pairFor(tokenA.target, tokenB.target);

      // 実際にペアを作成
      await factory.createPair(tokenA.target, tokenB.target);
      const actualAddress = await factory.getPair(tokenA.target, tokenB.target);

      expect(predictedAddress).to.equal(actualAddress);
    });
  });
});

// テスト用のシンプルなERC20トークンコントラクト
// 注意: これは実際のTestTokenコントラクトが作成されるまでの一時的な実装です
