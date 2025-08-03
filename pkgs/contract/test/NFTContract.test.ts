import "@nomicfoundation/hardhat-chai-matchers";
import { expect } from "chai";
import { ethers } from "hardhat";
import type { NFTContract } from "../typechain-types";
import {
  TEST_CONSTANTS,
  type TestAccounts,
  deployNFTContract,
  getBalance,
  getTestAccounts,
  mintTestNFT,
} from "./helpers/testHelpers";

/**
 * NFTContractのテストスイート
 * ERC-721準拠のNFTコントラクトの機能を包括的にテストする
 */
describe("NFTContract", function () {
  let nftContract: NFTContract;
  let accounts: TestAccounts;

  /**
   * 各テストの実行前に新しいコントラクトインスタンスをデプロイ
   */
  beforeEach(async function () {
    accounts = await getTestAccounts();
    nftContract = await deployNFTContract(accounts.owner.address);
  });

  /**
   * コントラクトのデプロイメントに関するテスト
   */
  describe("デプロイメント", function () {
    it("正しい名前とシンボルが設定されている", async function () {
      expect(await nftContract.name()).to.equal(TEST_CONSTANTS.TOKEN_NAME);
      expect(await nftContract.symbol()).to.equal(TEST_CONSTANTS.TOKEN_SYMBOL);
    });

    it("正しいオーナーが設定されている", async function () {
      expect(await nftContract.owner()).to.equal(accounts.owner.address);
    });

    it("正しいミント手数料が設定されている", async function () {
      expect(await nftContract.mintFee()).to.equal(TEST_CONSTANTS.MINT_FEE);
    });

    it("次のトークンIDが1から始まる", async function () {
      expect(await nftContract.getNextTokenId()).to.equal(1n);
    });
  });

  /**
   * NFTミント機能に関するテスト
   */
  describe("NFTミント", function () {
    it("正常にNFTをミントできる", async function () {
      // NFTをミント
      const tx = await mintTestNFT(
        nftContract,
        accounts.creator,
        accounts.creator.address,
        accounts.royaltyRecipient.address
      );

      // ミントイベントが発生することを確認
      await expect(tx)
        .to.emit(nftContract, "Transfer")
        .withArgs(TEST_CONSTANTS.ZERO_ADDRESS, accounts.creator.address, 1n);

      // トークンの所有者が正しく設定されることを確認
      expect(await nftContract.ownerOf(1n)).to.equal(accounts.creator.address);

      // トークンURIが正しく設定されることを確認
      expect(await nftContract.tokenURI(1n)).to.equal(TEST_CONSTANTS.TOKEN_URI);

      // 作成者情報が正しく記録されることを確認
      expect(await nftContract.creators(1n)).to.equal(accounts.creator.address);

      // 次のトークンIDが増加することを確認
      expect(await nftContract.getNextTokenId()).to.equal(2n);
    });

    it("ミント手数料が不足している場合はリバートする", async function () {
      // 不十分な手数料でミントを試行
      await expect(
        nftContract.connect(accounts.creator).mintNFT(
          accounts.creator.address,
          TEST_CONSTANTS.TOKEN_URI,
          accounts.royaltyRecipient.address,
          TEST_CONSTANTS.ROYALTY_FEE,
          { value: ethers.parseEther("0.005") } // 必要な手数料の半分
        )
      ).to.be.revertedWith("Insufficient mint fee");
    });

    it("無効なアドレスにミントしようとするとリバートする", async function () {
      // ゼロアドレスへのミントを試行
      await expect(
        nftContract
          .connect(accounts.creator)
          .mintNFT(
            TEST_CONSTANTS.ZERO_ADDRESS,
            TEST_CONSTANTS.TOKEN_URI,
            accounts.royaltyRecipient.address,
            TEST_CONSTANTS.ROYALTY_FEE,
            { value: TEST_CONSTANTS.MINT_FEE }
          )
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("ロイヤリティ手数料が高すぎる場合はリバートする", async function () {
      // 50%を超えるロイヤリティでミントを試行
      await expect(
        nftContract
          .connect(accounts.creator)
          .mintNFT(
            accounts.creator.address,
            TEST_CONSTANTS.TOKEN_URI,
            accounts.royaltyRecipient.address,
            TEST_CONSTANTS.HIGH_ROYALTY_FEE,
            { value: TEST_CONSTANTS.MINT_FEE }
          )
      ).to.be.revertedWith("Royalty fee too high");
    });

    it("複数のNFTを連続してミントできる", async function () {
      // 3つのNFTを連続でミント
      for (let i = 0; i < 3; i++) {
        await mintTestNFT(
          nftContract,
          accounts.creator,
          accounts.creator.address,
          accounts.royaltyRecipient.address
        );
      }

      // すべてのトークンが正しく作成されることを確認
      expect(await nftContract.balanceOf(accounts.creator.address)).to.equal(3n);
      expect(await nftContract.getNextTokenId()).to.equal(4n);

      // 各トークンの所有者が正しいことを確認
      for (let i = 1; i <= 3; i++) {
        expect(await nftContract.ownerOf(BigInt(i))).to.equal(accounts.creator.address);
      }
    });
  });

  /**
   * ロイヤリティ管理機能に関するテスト
   */
  describe("ロイヤリティ管理", function () {
    beforeEach(async function () {
      // テスト用NFTをミント
      await mintTestNFT(
        nftContract,
        accounts.creator,
        accounts.creator.address,
        accounts.royaltyRecipient.address
      );
    });

    it("正しいロイヤリティ情報が設定されている", async function () {
      const [recipient, amount] = await nftContract.royaltyInfo(1n, ethers.parseEther("1"));

      expect(recipient).to.equal(accounts.royaltyRecipient.address);
      // 5%のロイヤリティ = 0.05 ETH
      expect(amount).to.equal(ethers.parseEther("0.05"));
    });

    it("作成者がロイヤリティを更新できる", async function () {
      const newRoyaltyFee = 750; // 7.5%

      await expect(
        nftContract
          .connect(accounts.creator)
          .updateTokenRoyalty(1n, accounts.buyer.address, newRoyaltyFee)
      ).not.to.be.reverted;

      // 更新されたロイヤリティ情報を確認
      const [recipient, amount] = await nftContract.royaltyInfo(1n, ethers.parseEther("1"));
      expect(recipient).to.equal(accounts.buyer.address);
      expect(amount).to.equal(ethers.parseEther("0.075")); // 7.5%
    });

    it("オーナーがロイヤリティを更新できる", async function () {
      const newRoyaltyFee = 1000; // 10%

      await expect(
        nftContract
          .connect(accounts.owner)
          .updateTokenRoyalty(1n, accounts.buyer.address, newRoyaltyFee)
      ).not.to.be.reverted;
    });

    it("権限のないユーザーはロイヤリティを更新できない", async function () {
      await expect(
        nftContract
          .connect(accounts.unauthorized)
          .updateTokenRoyalty(1n, accounts.buyer.address, 1000)
      ).to.be.revertedWith("Not authorized");
    });

    it("存在しないトークンのロイヤリティ更新はリバートする", async function () {
      await expect(
        nftContract.connect(accounts.creator).updateTokenRoyalty(999n, accounts.buyer.address, 1000)
      ).to.be.revertedWith("Token does not exist");
    });
  });

  /**
   * 手数料管理機能に関するテスト
   */
  describe("手数料管理", function () {
    it("オーナーがミント手数料を更新できる", async function () {
      const newMintFee = ethers.parseEther("0.02");

      await expect(nftContract.connect(accounts.owner).updateMintFee(newMintFee))
        .to.emit(nftContract, "MintFeeUpdated")
        .withArgs(newMintFee);

      expect(await nftContract.mintFee()).to.equal(newMintFee);
    });

    it("オーナー以外はミント手数料を更新できない", async function () {
      await expect(
        nftContract.connect(accounts.unauthorized).updateMintFee(ethers.parseEther("0.02"))
      ).to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
    });

    it("オーナーが手数料を引き出せる", async function () {
      // 複数のNFTをミントして手数料を蓄積
      for (let i = 0; i < 3; i++) {
        await mintTestNFT(
          nftContract,
          accounts.creator,
          accounts.creator.address,
          accounts.royaltyRecipient.address
        );
      }

      const ownerBalanceBefore = await getBalance(accounts.owner.address);
      const contractBalance = await getBalance(
        (nftContract as unknown as { target: string }).target
      );

      // 手数料を引き出し
      const tx = await nftContract.connect(accounts.owner).withdrawFees();
      const receipt = await tx.wait();
      const gasUsed = receipt ? receipt.gasUsed * receipt.gasPrice : 0n;

      const ownerBalanceAfter = await getBalance(accounts.owner.address);

      // オーナーの残高が手数料分増加していることを確認（ガス代を除く）
      expect(ownerBalanceAfter).to.be.closeTo(
        ownerBalanceBefore + contractBalance - BigInt(gasUsed),
        ethers.parseEther("0.001") // 誤差許容範囲
      );
    });

    it("手数料がない場合は引き出しをリバートする", async function () {
      await expect(nftContract.connect(accounts.owner).withdrawFees()).to.be.revertedWith(
        "No fees to withdraw"
      );
    });
  });

  /**
   * 一時停止機能に関するテスト
   */
  describe("一時停止機能", function () {
    it("オーナーがコントラクトを一時停止できる", async function () {
      await expect(nftContract.connect(accounts.owner).pause())
        .to.emit(nftContract, "Paused")
        .withArgs(accounts.owner.address);

      expect(await nftContract.paused()).to.be.true;
    });

    it("一時停止中はNFTミントができない", async function () {
      // コントラクトを一時停止
      await nftContract.connect(accounts.owner).pause();

      // ミントを試行してリバートすることを確認
      await expect(
        mintTestNFT(
          nftContract,
          accounts.creator,
          accounts.creator.address,
          accounts.royaltyRecipient.address
        )
      ).to.be.revertedWithCustomError(nftContract, "EnforcedPause");
    });

    it("オーナーが一時停止を解除できる", async function () {
      // 一時停止してから解除
      await nftContract.connect(accounts.owner).pause();

      await expect(nftContract.connect(accounts.owner).unpause())
        .to.emit(nftContract, "Unpaused")
        .withArgs(accounts.owner.address);

      expect(await nftContract.paused()).to.be.false;

      // ミントが再び可能になることを確認
      await expect(
        mintTestNFT(
          nftContract,
          accounts.creator,
          accounts.creator.address,
          accounts.royaltyRecipient.address
        )
      ).not.to.be.reverted;
    });
  });

  /**
   * ERC-165インターフェースサポートの確認
   */
  describe("ERC-165サポート", function () {
    it("ERC-721インターフェースをサポートしている", async function () {
      // ERC-721インターフェースID: 0x80ac58cd
      expect(await nftContract.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("ERC-2981インターフェースをサポートしている", async function () {
      // ERC-2981インターフェースID: 0x2a55205a
      expect(await nftContract.supportsInterface("0x2a55205a")).to.be.true;
    });
  });

  /**
   * エラーケースのテスト
   */
  describe("エラーケース", function () {
    it("存在しないトークンのURIを取得しようとするとリバートする", async function () {
      await expect(nftContract.tokenURI(999n)).to.be.revertedWithCustomError(
        nftContract,
        "ERC721NonexistentToken"
      );
    });

    it("存在しないトークンの所有者を取得しようとするとリバートする", async function () {
      await expect(nftContract.ownerOf(999n)).to.be.revertedWithCustomError(
        nftContract,
        "ERC721NonexistentToken"
      );
    });

    it("存在しないトークンの作成者を取得しようとするとリバートする", async function () {
      await expect(nftContract.getCreator(999n)).to.be.revertedWith("Token does not exist");
    });
  });
});
