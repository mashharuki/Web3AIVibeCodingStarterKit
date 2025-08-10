import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { DexFactory, DexPair, TokenA, TokenB } from "../typechain-types";

describe("DexFactory", () => {
  let factory: DexFactory;
  let tokenA: TokenA;
  let tokenB: TokenB;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let feeToSetter: HardhatEthersSigner;

  beforeEach(async () => {
    // アカウントを取得
    const signers = await ethers.getSigners();
    if (!signers[0] || !signers[1] || !signers[2]) {
      throw new Error("Not enough signers available");
    }
    owner = signers[0];
    user1 = signers[1];
    feeToSetter = signers[2];

    // TokenAとTokenBをデプロイ
    const TokenAFactory = await ethers.getContractFactory("TokenA");
    const TokenBFactory = await ethers.getContractFactory("TokenB");

    const tokenAContract = await TokenAFactory.deploy(owner.address);
    const tokenBContract = await TokenBFactory.deploy(owner.address);
    tokenA = tokenAContract as unknown as TokenA;
    tokenB = tokenBContract as unknown as TokenB;

    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    // DexFactoryをデプロイ
    const DexFactoryFactory = await ethers.getContractFactory("DexFactory");
    const factoryContract = await DexFactoryFactory.deploy(owner.address);
    factory = factoryContract as unknown as DexFactory;
    await factory.waitForDeployment();
  });

  describe("デプロイメント", () => {
    it("初期状態が正しく設定されている", async () => {
      expect(await factory.feeTo()).to.equal(ethers.ZeroAddress);
      expect(await factory.feeToSetter()).to.equal(owner.address);
      expect(await factory.allPairsLength()).to.equal(0);
    });
  });

  describe("ペア作成", () => {
    it("新しいペアを作成できる", async () => {
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();

      // ペアを作成
      await expect(factory.createPair(tokenAAddress, tokenBAddress)).to.emit(
        factory,
        "PairCreated"
      );

      // ペアコントラクトのアドレスを取得
      const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      expect(await factory.allPairsLength()).to.equal(1);
      expect(await factory.allPairs(0)).to.equal(pairAddress);
    });

    it("同一ペアを重複作成できない", async () => {
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();

      await factory.createPair(tokenAAddress, tokenBAddress);

      await expect(
        factory.createPair(tokenAAddress, tokenBAddress)
      ).to.be.revertedWithCustomError(factory, "PairAlreadyExists");
    });

    it("同一トークンでペアを作成できない", async () => {
      const tokenAAddress = await tokenA.getAddress();

      await expect(
        factory.createPair(tokenAAddress, tokenAAddress)
      ).to.be.revertedWithCustomError(factory, "IdenticalTokens");
    });

    it("ゼロアドレスでペアを作成できない", async () => {
      const tokenAAddress = await tokenA.getAddress();

      await expect(
        factory.createPair(tokenAAddress, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });

    it("トークンの順序が異なっても同じペアアドレスを返す", async () => {
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();

      await factory.createPair(tokenAAddress, tokenBAddress);
      // トークンの順序を逆にしても同じペアアドレスが返ることを確認
      const pair1 = await factory.getPair(tokenAAddress, tokenBAddress);
      const pair2 = await factory.getPair(tokenBAddress, tokenAAddress);

      expect(pair1).to.equal(pair2);
    });
  });

  describe("手数料設定", () => {
    it("feeToSetterが手数料受取人を設定できる", async () => {
      await factory.setFeeTo(feeToSetter.address);
      expect(await factory.feeTo()).to.equal(feeToSetter.address);
    });

    it("非feeToSetterは手数料受取人を設定できない", async () => {
      await expect(
        factory.connect(user1).setFeeTo(feeToSetter.address)
      ).to.be.revertedWithCustomError(factory, "Unauthorized");
    });

    it("feeToSetterがfeeToSetterを変更できる", async () => {
      await factory.setFeeToSetter(user1.address);
      expect(await factory.feeToSetter()).to.equal(user1.address);
    });
  });

  describe("ペア情報取得", () => {
    beforeEach(async () => {
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();
      await factory.createPair(tokenAAddress, tokenBAddress);
    });

    it("作成されたペアが正しく初期化されている", async () => {
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();
      const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);

      const DexPairFactory = await ethers.getContractFactory("DexPair");
      const pairContract = DexPairFactory.attach(pairAddress);
      const pair = pairContract as unknown as DexPair;

      expect(await pair.factory()).to.equal(await factory.getAddress());
      expect(await pair.token0()).to.not.equal(ethers.ZeroAddress);
      expect(await pair.token1()).to.not.equal(ethers.ZeroAddress);
    });
  });
});
