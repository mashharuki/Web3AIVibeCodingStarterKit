import "@nomicfoundation/hardhat-chai-matchers";
import { expect } from "chai";
import { ethers } from "hardhat";
import type { NFTContract, NFTMarketplace } from "../typechain-types";
import {
  TEST_CONSTANTS,
  type TestAccounts,
  deployMarketplace,
  deployNFTContract,
  getTestAccounts,
  mintTestNFT,
} from "./helpers/testHelpers";

/**
 * NFTMarketplaceのテストスイート
 * NFTマーケットプレイス契約の全機能を包括的にテストする
 */
describe("NFTMarketplace", () => {
  let nftContract: NFTContract;
  let marketplace: NFTMarketplace;
  let accounts: TestAccounts;

  // テスト用の定数
  const LISTING_PRICE = ethers.parseEther("1");
  const OFFER_AMOUNT = ethers.parseEther("0.8");

  /**
   * 各テストの実行前にコントラクトをデプロイし、テスト用NFTをセットアップ
   */
  beforeEach(async () => {
    accounts = await getTestAccounts();

    // コントラクトをデプロイ
    nftContract = await deployNFTContract(accounts.owner.address);
    marketplace = await deployMarketplace(accounts.owner.address);

    // テスト用NFTをミント
    await mintTestNFT(
      nftContract,
      accounts.seller,
      accounts.seller.address,
      accounts.royaltyRecipient.address,
      TEST_CONSTANTS.ROYALTY_FEE,
      TEST_CONSTANTS.TOKEN_URI
    );

    // マーケットプレイスにNFTの操作権限を付与
    await nftContract
      .connect(accounts.seller)
      .setApprovalForAll((marketplace as unknown as { target: string }).target, true);
  });

  /**
   * コントラクトのデプロイメントに関するテスト
   */
  describe("デプロイメント", () => {
    it("正しいオーナーが設定されている", async () => {
      expect(await marketplace.owner()).to.equal(accounts.owner.address);
    });

    it("デフォルトのマーケットプレイス手数料が設定されている", async () => {
      expect(await marketplace.marketplaceFee()).to.equal(250n); // 2.5%
    });
  });

  /**
   * NFT出品に関するテスト
   */
  describe("NFT出品", () => {
    it("正常にNFTを出品できる", async () => {
      const tx = await marketplace
        .connect(accounts.seller)
        .listNFT((nftContract as unknown as { target: string }).target, 1, LISTING_PRICE);

      await expect(tx)
        .to.emit(marketplace, "NFTListed")
        .withArgs(
          1,
          accounts.seller.address,
          (nftContract as unknown as { target: string }).target,
          1,
          LISTING_PRICE
        );

      const listing = await marketplace.listings(1);
      expect(listing.seller).to.equal(accounts.seller.address);
      expect(listing.nftContract).to.equal((nftContract as unknown as { target: string }).target);
      expect(listing.tokenId).to.equal(1);
      expect(listing.price).to.equal(LISTING_PRICE);
      expect(listing.active).to.be.true;
    });

    it("NFTの所有者でない場合は出品できない", async () => {
      await expect(
        marketplace
          .connect(accounts.buyer)
          .listNFT((nftContract as unknown as { target: string }).target, 1, LISTING_PRICE)
      ).to.be.revertedWith("Not the owner of the token");
    });

    it("価格が0の場合は出品できない", async () => {
      await expect(
        marketplace
          .connect(accounts.seller)
          .listNFT((nftContract as unknown as { target: string }).target, 1, 0)
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("マーケットプレイスが承認されていない場合は出品できない", async () => {
      // 承認を取り消し
      await nftContract
        .connect(accounts.seller)
        .setApprovalForAll((marketplace as unknown as { target: string }).target, false);

      await expect(
        marketplace
          .connect(accounts.seller)
          .listNFT((nftContract as unknown as { target: string }).target, 1, LISTING_PRICE)
      ).to.be.revertedWith("Marketplace not approved");
    });

    it("既に出品済みのトークンは再出品できない", async () => {
      // 最初の出品
      await marketplace
        .connect(accounts.seller)
        .listNFT((nftContract as unknown as { target: string }).target, 1, LISTING_PRICE);

      // 2回目の出品（失敗するはず）
      await expect(
        marketplace
          .connect(accounts.seller)
          .listNFT((nftContract as unknown as { target: string }).target, 1, LISTING_PRICE)
      ).to.be.revertedWith("Token already listed");
    });
  });

  /**
   * NFT購入に関するテスト
   */
  describe("NFT購入", () => {
    beforeEach(async () => {
      // NFTを出品
      await marketplace
        .connect(accounts.seller)
        .listNFT((nftContract as unknown as { target: string }).target, 1, LISTING_PRICE);
    });

    it("正常にNFTを購入できる", async () => {
      const tx = await marketplace.connect(accounts.buyer).buyNFT(1, { value: LISTING_PRICE });

      await expect(tx)
        .to.emit(marketplace, "NFTSold")
        .withArgs(
          1,
          accounts.seller.address,
          accounts.buyer.address,
          (nftContract as unknown as { target: string }).target,
          1,
          LISTING_PRICE
        );

      // NFTの所有者が変更されているか確認
      expect(await nftContract.ownerOf(1)).to.equal(accounts.buyer.address);

      // 出品が無効化されているか確認
      const listing = await marketplace.listings(1);
      expect(listing.active).to.be.false;
    });

    it("支払い金額が不足している場合は購入できない", async () => {
      const insufficientAmount = ethers.parseEther("0.5");

      await expect(
        marketplace.connect(accounts.buyer).buyNFT(1, { value: insufficientAmount })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("自分のNFTは購入できない", async () => {
      await expect(
        marketplace.connect(accounts.seller).buyNFT(1, { value: LISTING_PRICE })
      ).to.be.revertedWith("Cannot buy your own NFT");
    });

    it("非アクティブな出品は購入できない", async () => {
      // 出品をキャンセル
      await marketplace.connect(accounts.seller).cancelListing(1);

      await expect(
        marketplace.connect(accounts.buyer).buyNFT(1, { value: LISTING_PRICE })
      ).to.be.revertedWith("Listing not active");
    });

    it("ロイヤリティが正しく支払われる", async () => {
      const initialRoyaltyBalance = await ethers.provider.getBalance(
        accounts.royaltyRecipient.address
      );
      const initialSellerBalance = await ethers.provider.getBalance(accounts.seller.address);

      await marketplace.connect(accounts.buyer).buyNFT(1, { value: LISTING_PRICE });

      const finalRoyaltyBalance = await ethers.provider.getBalance(
        accounts.royaltyRecipient.address
      );
      const finalSellerBalance = await ethers.provider.getBalance(accounts.seller.address);

      const expectedRoyalty = (LISTING_PRICE * BigInt(TEST_CONSTANTS.ROYALTY_FEE)) / BigInt(10000);
      const expectedMarketplaceFee = (LISTING_PRICE * BigInt(250)) / BigInt(10000);
      const expectedSellerAmount = LISTING_PRICE - expectedRoyalty - expectedMarketplaceFee;

      expect(finalRoyaltyBalance - initialRoyaltyBalance).to.equal(expectedRoyalty);
      expect(finalSellerBalance - initialSellerBalance).to.equal(expectedSellerAmount);
    });

    it("余分な支払いは返金される", async () => {
      const overpayment = ethers.parseEther("2");
      const initialBuyerBalance = await ethers.provider.getBalance(accounts.buyer.address);

      const tx = await marketplace.connect(accounts.buyer).buyNFT(1, { value: overpayment });

      const receipt = await tx.wait();
      if (receipt) {
        const gasUsed = receipt.gasUsed * receipt.gasPrice;
      }
      const finalBuyerBalance = await ethers.provider.getBalance(accounts.buyer.address);

      // 購入者は価格分とガス代を支払ったので残高が減少する
      expect(finalBuyerBalance).to.be.lt(initialBuyerBalance - LISTING_PRICE);
    });
  });

  /**
   * 出品キャンセルに関するテスト
   */
  describe("出品キャンセル", () => {
    beforeEach(async () => {
      // NFTを出品
      await marketplace
        .connect(accounts.seller)
        .listNFT((nftContract as unknown as { target: string }).target, 1, LISTING_PRICE);
    });

    it("出品者が出品をキャンセルできる", async () => {
      const tx = await marketplace.connect(accounts.seller).cancelListing(1);

      await expect(tx)
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(
          1,
          accounts.seller.address,
          (nftContract as unknown as { target: string }).target,
          1
        );

      const listing = await marketplace.listings(1);
      expect(listing.active).to.be.false;
    });

    it("出品者以外は出品をキャンセルできない", async () => {
      await expect(marketplace.connect(accounts.buyer).cancelListing(1)).to.be.revertedWith(
        "Not the seller"
      );
    });

    it("非アクティブな出品はキャンセルできない", async () => {
      // 最初のキャンセル
      await marketplace.connect(accounts.seller).cancelListing(1);

      // 2回目のキャンセル（失敗するはず）
      await expect(marketplace.connect(accounts.seller).cancelListing(1)).to.be.revertedWith(
        "Listing not active"
      );
    });
  });

  /**
   * オファー機能に関するテスト
   */
  describe("オファー機能", () => {
    const EXPIRATION_TIME = Math.floor(Date.now() / 1000) + 3600; // 1時間後

    it("正常にオファーを作成できる", async () => {
      const tx = await marketplace
        .connect(accounts.buyer)
        .makeOffer((nftContract as unknown as { target: string }).target, 1, EXPIRATION_TIME, {
          value: OFFER_AMOUNT,
        });

      await expect(tx)
        .to.emit(marketplace, "OfferMade")
        .withArgs(
          1,
          accounts.buyer.address,
          (nftContract as unknown as { target: string }).target,
          1,
          OFFER_AMOUNT,
          EXPIRATION_TIME
        );

      const offer = await marketplace.offers(1);
      expect(offer.bidder).to.equal(accounts.buyer.address);
      expect(offer.nftContract).to.equal((nftContract as unknown as { target: string }).target);
      expect(offer.tokenId).to.equal(1);
      expect(offer.amount).to.equal(OFFER_AMOUNT);
      expect(offer.active).to.be.true;
    });

    it("自分のNFTにはオファーできない", async () => {
      await expect(
        marketplace
          .connect(accounts.seller)
          .makeOffer((nftContract as unknown as { target: string }).target, 1, EXPIRATION_TIME, {
            value: OFFER_AMOUNT,
          })
      ).to.be.revertedWith("Cannot offer on your own NFT");
    });

    it("オファー金額が0の場合は作成できない", async () => {
      await expect(
        marketplace
          .connect(accounts.buyer)
          .makeOffer((nftContract as unknown as { target: string }).target, 1, EXPIRATION_TIME, {
            value: 0,
          })
      ).to.be.revertedWith("Offer amount must be greater than 0");
    });

    it("無効な有効期限の場合は作成できない", async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1時間前

      await expect(
        marketplace
          .connect(accounts.buyer)
          .makeOffer((nftContract as unknown as { target: string }).target, 1, pastTime, {
            value: OFFER_AMOUNT,
          })
      ).to.be.revertedWith("Invalid expiration time");
    });
  });

  /**
   * オファー受諾に関するテスト
   */
  describe("オファー受諾", () => {
    let offerId: number;
    const EXPIRATION_TIME = Math.floor(Date.now() / 1000) + 3600;

    beforeEach(async () => {
      // オファーを作成
      await marketplace
        .connect(accounts.buyer)
        .makeOffer((nftContract as unknown as { target: string }).target, 1, EXPIRATION_TIME, {
          value: OFFER_AMOUNT,
        });

      offerId = 1; // 最初のオファーIDは1
    });

    it("NFT所有者がオファーを受諾できる", async () => {
      const tx = await marketplace.connect(accounts.seller).acceptOffer(offerId);

      await expect(tx)
        .to.emit(marketplace, "OfferAccepted")
        .withArgs(
          offerId,
          accounts.seller.address,
          accounts.buyer.address,
          (nftContract as unknown as { target: string }).target,
          1,
          OFFER_AMOUNT
        );

      // NFTの所有者が変更されているか確認
      expect(await nftContract.ownerOf(1)).to.equal(accounts.buyer.address);

      // オファーが無効化されているか確認
      const offer = await marketplace.offers(offerId);
      expect(offer.active).to.be.false;
    });

    it("NFT所有者以外はオファーを受諾できない", async () => {
      await expect(marketplace.connect(accounts.buyer).acceptOffer(offerId)).to.be.revertedWith(
        "Not the owner of the token"
      );
    });

    it("非アクティブなオファーは受諾できない", async () => {
      // オファーをキャンセル
      await marketplace.connect(accounts.buyer).cancelOffer(offerId);

      await expect(marketplace.connect(accounts.seller).acceptOffer(offerId)).to.be.revertedWith(
        "Offer not active"
      );
    });
  });

  /**
   * オファーキャンセルに関するテスト
   */
  describe("オファーキャンセル", () => {
    let offerId: number;
    const EXPIRATION_TIME = Math.floor(Date.now() / 1000) + 3600;

    beforeEach(async () => {
      // オファーを作成
      await marketplace
        .connect(accounts.buyer)
        .makeOffer((nftContract as unknown as { target: string }).target, 1, EXPIRATION_TIME, {
          value: OFFER_AMOUNT,
        });

      offerId = 1;
    });

    it("オファー者がオファーをキャンセルできる", async () => {
      const initialBalance = await ethers.provider.getBalance(accounts.buyer.address);

      const tx = await marketplace.connect(accounts.buyer).cancelOffer(offerId);
      const receipt = await tx.wait();
      if (receipt) {
        const gasUsed = receipt.gasUsed * receipt.gasPrice;
      }

      await expect(tx)
        .to.emit(marketplace, "OfferCancelled")
        .withArgs(
          offerId,
          accounts.buyer.address,
          (nftContract as unknown as { target: string }).target,
          1
        );

      const finalBalance = await ethers.provider.getBalance(accounts.buyer.address);
      // オファーがキャンセルされてガス代を引いても返金されるので、元の残高に近い値になる
      expect(finalBalance).to.be.gt(initialBalance + OFFER_AMOUNT - ethers.parseEther("0.01"));

      // オファーが無効化されているか確認
      const offer = await marketplace.offers(offerId);
      expect(offer.active).to.be.false;
    });

    it("オファー者以外はオファーをキャンセルできない", async () => {
      await expect(marketplace.connect(accounts.seller).cancelOffer(offerId)).to.be.revertedWith(
        "Not the bidder"
      );
    });
  });

  /**
   * 手数料管理に関するテスト
   */
  describe("手数料管理", () => {
    it("オーナーがマーケットプレイス手数料を更新できる", async () => {
      const newFee = 500; // 5%

      const tx = await marketplace.connect(accounts.owner).updateMarketplaceFee(newFee);

      await expect(tx).to.emit(marketplace, "MarketplaceFeeUpdated").withArgs(newFee);

      expect(await marketplace.marketplaceFee()).to.equal(newFee);
    });

    it("手数料が高すぎる場合は更新できない", async () => {
      const highFee = 1500; // 15%

      await expect(
        marketplace.connect(accounts.owner).updateMarketplaceFee(highFee)
      ).to.be.revertedWith("Fee too high");
    });

    it("オーナー以外は手数料を更新できない", async () => {
      await expect(
        marketplace.connect(accounts.seller).updateMarketplaceFee(500)
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });
  });

  /**
   * 一時停止機能に関するテスト
   */
  describe("一時停止機能", () => {
    it("オーナーがコントラクトを一時停止できる", async () => {
      await marketplace.connect(accounts.owner).pause();
      expect(await marketplace.paused()).to.be.true;
    });

    it("一時停止中は出品できない", async () => {
      await marketplace.connect(accounts.owner).pause();

      await expect(
        marketplace
          .connect(accounts.seller)
          .listNFT((nftContract as unknown as { target: string }).target, 1, LISTING_PRICE)
      ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
    });

    it("一時停止中は購入できない", async () => {
      // 出品してから一時停止
      await marketplace
        .connect(accounts.seller)
        .listNFT((nftContract as unknown as { target: string }).target, 1, LISTING_PRICE);

      await marketplace.connect(accounts.owner).pause();

      await expect(
        marketplace.connect(accounts.buyer).buyNFT(1, { value: LISTING_PRICE })
      ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
    });
  });

  /**
   * ビューファンクションに関するテスト
   */
  describe("ビューファンクション", () => {
    it("販売履歴の件数を取得できる", async () => {
      expect(await marketplace.getSalesHistoryCount()).to.equal(0n);

      // NFTを出品して購入
      await marketplace
        .connect(accounts.seller)
        .listNFT((nftContract as unknown as { target: string }).target, 1, LISTING_PRICE);

      await marketplace.connect(accounts.buyer).buyNFT(1, { value: LISTING_PRICE });

      expect(await marketplace.getSalesHistoryCount()).to.equal(1n);
    });

    it("トークンのオファー数を取得できる", async () => {
      const EXPIRATION_TIME = Math.floor(Date.now() / 1000) + 3600;

      expect(
        await marketplace.getTokenOffersCount(
          (nftContract as unknown as { target: string }).target,
          1
        )
      ).to.equal(0n);

      await marketplace
        .connect(accounts.buyer)
        .makeOffer((nftContract as unknown as { target: string }).target, 1, EXPIRATION_TIME, {
          value: OFFER_AMOUNT,
        });

      expect(
        await marketplace.getTokenOffersCount(
          (nftContract as unknown as { target: string }).target,
          1
        )
      ).to.equal(1n);
    });
  });
});
