import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { AMMFactory } from "../typechain-types";

describe("AMMFactory", function () {
  let factory: AMMFactory;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let tokenA: MockERC20;
  let tokenB: MockERC20;
  let tokenC: MockERC20;

  beforeEach(async function () {
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
    tokenC = await MockERC20.deploy("Token C", "TKC");
    
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();
    await tokenC.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right feeToSetter", async function () {
      expect(await factory.feeToSetter()).to.equal(owner.address);
    });

    it("Should have zero pairs initially", async function () {
      expect(Number(await factory.allPairsLength())).to.equal(0);
    });

    it("Should have empty feeTo initially", async function () {
      expect(await factory.feeTo()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Pair Creation", function () {
    it("Should create a new pair successfully", async function () {
      // ペアを作成
      const tx = await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
      const receipt = await tx.wait();

      // ペア数が1になることを確認
      expect(Number(await factory.allPairsLength())).to.equal(1);

      // ペアアドレスが取得できることを確認
      const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      // 逆順でも同じペアアドレスが取得できることを確認
      const reversePairAddress = await factory.getPair(await tokenB.getAddress(), await tokenA.getAddress());
      expect(pairAddress).to.equal(reversePairAddress);

      // allPairs配列からもアクセスできることを確認
      const pairFromArray = await factory.allPairs(0);
      expect(pairFromArray).to.equal(pairAddress);

      // PairCreatedイベントが発行されることを確認
      expect(receipt?.logs).to.have.lengthOf.greaterThan(0);
    });

    it("Should fail when creating pair with identical addresses", async function () {
      await expect(
        factory.createPair(await tokenA.getAddress(), await tokenA.getAddress())
      ).to.be.revertedWith("AMMFactory: IDENTICAL_ADDRESSES");
    });

    it("Should fail when creating pair with zero address", async function () {
      await expect(
        factory.createPair(ethers.ZeroAddress, await tokenB.getAddress())
      ).to.be.revertedWith("AMMFactory: ZERO_ADDRESS");
      
      await expect(
        factory.createPair(await tokenA.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("AMMFactory: ZERO_ADDRESS");
    });

    it("Should fail when creating duplicate pair", async function () {
      // 最初のペアを作成
      await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());

      // 同じペアを再度作成しようとするとエラー
      await expect(
        factory.createPair(await tokenA.getAddress(), await tokenB.getAddress())
      ).to.be.revertedWith("AMMFactory: PAIR_EXISTS");

      // 逆順でも同様にエラー
      await expect(
        factory.createPair(await tokenB.getAddress(), await tokenA.getAddress())
      ).to.be.revertedWith("AMMFactory: PAIR_EXISTS");
    });

    it("Should sort tokens correctly", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      // アドレスの大小関係を確認
      const isTokenALower = tokenAAddr.toLowerCase() < tokenBAddr.toLowerCase();
      const lowerToken = isTokenALower ? tokenAAddr : tokenBAddr;
      const higherToken = isTokenALower ? tokenBAddr : tokenAAddr;

      await factory.createPair(higherToken, lowerToken);
      
      const pairAddress = await factory.getPair(higherToken, lowerToken);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      // ペアコントラクトのtoken0とtoken1を確認
      const pair = await ethers.getContractAt("AMMPair", pairAddress);
      const token0 = await pair.token0();
      const token1 = await pair.token1();

      // token0 < token1 であることを確認
      expect(token0.toLowerCase() < token1.toLowerCase()).to.be.true;
      expect(token0).to.equal(lowerToken);
      expect(token1).to.equal(higherToken);
    });

    it("Should emit PairCreated event with correct parameters", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      // アドレスの大小関係を確認してソート
      const isTokenALower = tokenAAddr.toLowerCase() < tokenBAddr.toLowerCase();
      const token0 = isTokenALower ? tokenAAddr : tokenBAddr;
      const token1 = isTokenALower ? tokenBAddr : tokenAAddr;

      // PairCreatedイベントが発行されることを確認
      const tx = await factory.createPair(tokenAAddr, tokenBAddr);
      const receipt = await tx.wait();
      
      // イベントの詳細を確認
      const pairAddress = await factory.getPair(tokenAAddr, tokenBAddr);
      
      await expect(tx)
        .to.emit(factory, "PairCreated")
        .withArgs(token0, token1, pairAddress, 1);
    });

    it("Should handle pair creation with contract addresses", async function () {
      // 実際のコントラクトアドレスでペア作成をテスト
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      const tx = await factory.createPair(tokenAAddr, tokenBAddr);
      await tx.wait();

      const pairAddress = await factory.getPair(tokenAAddr, tokenBAddr);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      // ペアコントラクトが正しく初期化されていることを確認
      const pair = await ethers.getContractAt("AMMPair", pairAddress);
      const token0 = await pair.token0();
      const token1 = await pair.token1();
      
      expect(token0).to.be.oneOf([tokenAAddr, tokenBAddr]);
      expect(token1).to.be.oneOf([tokenAAddr, tokenBAddr]);
      expect(token0).to.not.equal(token1);
    });
  });

  describe("Fee Management", function () {
    it("Should allow feeToSetter to set feeTo", async function () {
      await factory.setFeeTo(addr1.address);
      expect(await factory.feeTo()).to.equal(addr1.address);
    });

    it("Should fail when non-feeToSetter tries to set feeTo", async function () {
      try {
        await factory.connect(addr1).setFeeTo(addr2.address);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("AMMFactory: FORBIDDEN");
      }
    });

    it("Should allow feeToSetter to change feeToSetter", async function () {
      await factory.setFeeToSetter(addr1.address);
      expect(await factory.feeToSetter()).to.equal(addr1.address);
    });

    it("Should fail when non-feeToSetter tries to change feeToSetter", async function () {
      try {
        await factory.connect(addr1).setFeeToSetter(addr2.address);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("AMMFactory: FORBIDDEN");
      }
    });
  });

  describe("Multiple Pairs", function () {
    it("Should create multiple pairs correctly", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      const tokenCAddr = await tokenC.getAddress();

      // 3つのペアを作成
      await factory.createPair(tokenAAddr, tokenBAddr);
      await factory.createPair(tokenAAddr, tokenCAddr);
      await factory.createPair(tokenBAddr, tokenCAddr);

      // ペア数が3になることを確認
      expect(Number(await factory.allPairsLength())).to.equal(3);

      // 各ペアが正しく取得できることを確認
      const pair1 = await factory.getPair(tokenAAddr, tokenBAddr);
      const pair2 = await factory.getPair(tokenAAddr, tokenCAddr);
      const pair3 = await factory.getPair(tokenBAddr, tokenCAddr);

      expect(pair1).to.not.equal(ethers.ZeroAddress);
      expect(pair2).to.not.equal(ethers.ZeroAddress);
      expect(pair3).to.not.equal(ethers.ZeroAddress);

      // 全て異なるアドレスであることを確認
      expect(pair1).to.not.equal(pair2);
      expect(pair1).to.not.equal(pair3);
      expect(pair2).to.not.equal(pair3);
    });

    it("Should maintain correct pair count and indexing", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      const tokenCAddr = await tokenC.getAddress();

      // 初期状態では0ペア
      expect(Number(await factory.allPairsLength())).to.equal(0);

      // 1つ目のペアを作成
      await factory.createPair(tokenAAddr, tokenBAddr);
      expect(Number(await factory.allPairsLength())).to.equal(1);
      const pair1 = await factory.allPairs(0);
      expect(pair1).to.not.equal(ethers.ZeroAddress);

      // 2つ目のペアを作成
      await factory.createPair(tokenAAddr, tokenCAddr);
      expect(Number(await factory.allPairsLength())).to.equal(2);
      const pair2 = await factory.allPairs(1);
      expect(pair2).to.not.equal(ethers.ZeroAddress);
      expect(pair2).to.not.equal(pair1);

      // 3つ目のペアを作成
      await factory.createPair(tokenBAddr, tokenCAddr);
      expect(Number(await factory.allPairsLength())).to.equal(3);
      const pair3 = await factory.allPairs(2);
      expect(pair3).to.not.equal(ethers.ZeroAddress);
      expect(pair3).to.not.equal(pair1);
      expect(pair3).to.not.equal(pair2);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle maximum number of pairs", async function () {
      // 複数のペアを作成してスケーラビリティをテスト
      const tokens = [];
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      
      // 10個のトークンを作成
      for (let i = 0; i < 10; i++) {
        const token = await MockERC20.deploy(`Token${i}`, `TK${i}`);
        await token.waitForDeployment();
        tokens.push(await token.getAddress());
      }

      // 複数のペアを作成
      let pairCount = 0;
      for (let i = 0; i < tokens.length - 1; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          await factory.createPair(tokens[i], tokens[j]);
          pairCount++;
        }
      }

      expect(Number(await factory.allPairsLength())).to.equal(pairCount);
    });

    it("Should handle getPair for non-existent pairs", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      // 存在しないペアのアドレスは0x0であることを確認
      const nonExistentPair = await factory.getPair(tokenAAddr, tokenBAddr);
      expect(nonExistentPair).to.equal(ethers.ZeroAddress);
    });

    it("Should revert when accessing out-of-bounds pair index", async function () {
      // ペアが存在しない状態でallPairs[0]にアクセス
      await expect(factory.allPairs(0)).to.be.reverted;
      
      // 1つペアを作成
      await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
      
      // 存在しないインデックスにアクセス
      await expect(factory.allPairs(1)).to.be.reverted;
    });

    it("Should maintain state consistency after multiple operations", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      const tokenCAddr = await tokenC.getAddress();

      // 複数のペアを作成
      await factory.createPair(tokenAAddr, tokenBAddr);
      await factory.createPair(tokenAAddr, tokenCAddr);
      
      // 状態の一貫性を確認
      expect(Number(await factory.allPairsLength())).to.equal(2);
      
      const pair1 = await factory.getPair(tokenAAddr, tokenBAddr);
      const pair2 = await factory.getPair(tokenAAddr, tokenCAddr);
      
      expect(await factory.allPairs(0)).to.be.oneOf([pair1, pair2]);
      expect(await factory.allPairs(1)).to.be.oneOf([pair1, pair2]);
      expect(await factory.allPairs(0)).to.not.equal(await factory.allPairs(1));
    });

    it("Should handle CREATE2 deterministic deployment", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      // 同じトークンペアで複数回デプロイを試行（2回目は失敗するはず）
      await factory.createPair(tokenAAddr, tokenBAddr);
      const pairAddress1 = await factory.getPair(tokenAAddr, tokenBAddr);
      
      // 同じペアの再作成は失敗
      await expect(
        factory.createPair(tokenAAddr, tokenBAddr)
      ).to.be.revertedWith("AMMFactory: PAIR_EXISTS");
      
      // アドレスは変わらない
      const pairAddress2 = await factory.getPair(tokenAAddr, tokenBAddr);
      expect(pairAddress1).to.equal(pairAddress2);
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should use reasonable gas for pair creation", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      const tx = await factory.createPair(tokenAAddr, tokenBAddr);
      const receipt = await tx.wait();
      
      // ガス使用量が合理的な範囲内であることを確認（5M gas未満）
      expect(Number(receipt?.gasUsed)).to.be.lessThan(5000000);
    });

    it("Should have consistent gas usage for multiple pairs", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      const tokenCAddr = await tokenC.getAddress();
      
      const tx1 = await factory.createPair(tokenAAddr, tokenBAddr);
      const receipt1 = await tx1.wait();
      
      const tx2 = await factory.createPair(tokenAAddr, tokenCAddr);
      const receipt2 = await tx2.wait();
      
      // ガス使用量の差が10%以内であることを確認
      const gasUsed1 = Number(receipt1?.gasUsed);
      const gasUsed2 = Number(receipt2?.gasUsed);
      const gasDifference = Math.abs(gasUsed1 - gasUsed2);
      const gasAverage = (gasUsed1 + gasUsed2) / 2;
      
      expect(gasDifference / gasAverage).to.be.lessThan(0.1);
    });
  });
});