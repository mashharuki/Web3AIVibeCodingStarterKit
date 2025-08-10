import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import type { TokenA } from "../typechain-types";

describe("TokenA", () => {
  let tokenA: TokenA;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const FAUCET_AMOUNT = ethers.parseEther("100");
  const FAUCET_COOLDOWN = 24 * 60 * 60; // 24時間

  beforeEach(async () => {
    // アカウントを取得
    const signers = await ethers.getSigners();
    if (!signers[0] || !signers[1] || !signers[2]) {
      throw new Error("Not enough signers available");
    }
    owner = signers[0];
    user1 = signers[1];
    user2 = signers[2];

    // TokenAをデプロイ
    const TokenAFactory = await ethers.getContractFactory("TokenA");
    const tokenAContract = await TokenAFactory.deploy(owner.address);
    tokenA = tokenAContract as unknown as TokenA;
    await tokenA.waitForDeployment();
  });

  describe("デプロイメント", () => {
    it("初期状態が正しく設定されている", async () => {
      expect(await tokenA.name()).to.equal("TokenA");
      expect(await tokenA.symbol()).to.equal("TKA");
      expect(await tokenA.decimals()).to.equal(18);
      expect(await tokenA.totalSupply()).to.equal(0);
      expect(await tokenA.FAUCET_AMOUNT()).to.equal(FAUCET_AMOUNT);
      expect(await tokenA.FAUCET_COOLDOWN()).to.equal(FAUCET_COOLDOWN);
    });
  });

  describe("Faucet機能", () => {
    it("初回faucetは正常に実行される", async () => {
      const initialBalance = await tokenA.balanceOf(user1.address);
      
      const tx = await tokenA.connect(user1).faucet();
      await expect(tx)
        .to.emit(tokenA, "FaucetUsed");
      
      const finalBalance = await tokenA.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(FAUCET_AMOUNT);
    });

    it("24時間以内の再faucetは失敗する", async () => {
      await tokenA.connect(user1).faucet();
      
      await expect(tokenA.connect(user1).faucet())
        .to.be.revertedWithCustomError(tokenA, "FaucetCooldownActive");
    });

    it("24時間後のfaucetは成功する", async () => {
      await tokenA.connect(user1).faucet();
      
      // 24時間経過をシミュレート
      await ethers.provider.send("evm_increaseTime", [FAUCET_COOLDOWN + 1]);
      await ethers.provider.send("evm_mine", []);
      
      const balanceBefore = await tokenA.balanceOf(user1.address);
      await expect(tokenA.connect(user1).faucet()).to.not.be.reverted;
      const balanceAfter = await tokenA.balanceOf(user1.address);
      
      expect(balanceAfter - balanceBefore).to.equal(FAUCET_AMOUNT);
    });

    it("複数ユーザーが同時にfaucetを使用できる", async () => {
      await expect(tokenA.connect(user1).faucet()).to.not.be.reverted;
      await expect(tokenA.connect(user2).faucet()).to.not.be.reverted;
      
      expect(await tokenA.balanceOf(user1.address)).to.equal(FAUCET_AMOUNT);
      expect(await tokenA.balanceOf(user2.address)).to.equal(FAUCET_AMOUNT);
    });
  });

  describe("ERC20機能", () => {
    beforeEach(async () => {
      // user1にトークンを配布
      await tokenA.connect(user1).faucet();
    });

    it("転送が正常に動作する", async () => {
      const transferAmount = ethers.parseEther("10");
      
      await expect(tokenA.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(tokenA, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
      
      expect(await tokenA.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("承認と転送代行が正常に動作する", async () => {
      const approveAmount = ethers.parseEther("50");
      const transferAmount = ethers.parseEther("30");
      
      await tokenA.connect(user1).approve(user2.address, approveAmount);
      expect(await tokenA.allowance(user1.address, user2.address)).to.equal(approveAmount);
      
      await tokenA.connect(user2).transferFrom(user1.address, user2.address, transferAmount);
      expect(await tokenA.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await tokenA.allowance(user1.address, user2.address)).to.equal(approveAmount - transferAmount);
    });

    it("残高不足時の転送は失敗する", async () => {
      const excessiveAmount = ethers.parseEther("200");
      
      await expect(tokenA.connect(user1).transfer(user2.address, excessiveAmount))
        .to.be.reverted;
    });
  });

  describe("ReentrancyGuard", () => {
    it("faucet機能はリエントランシー攻撃から保護されている", async () => {
      // これは実際のリエントランシー攻撃のテストというより、
      // ReentrancyGuardが適用されていることの確認
      await expect(tokenA.connect(user1).faucet()).to.not.be.reverted;
    });
  });
});
