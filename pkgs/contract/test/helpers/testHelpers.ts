import "@nomicfoundation/hardhat-chai-matchers";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";
import type { NFTContract, NFTMarketplace } from "../../typechain-types";

/**
 * テスト用の定数定義
 */
export const TEST_CONSTANTS = {
  TOKEN_NAME: "Test NFT",
  TOKEN_SYMBOL: "TNFT",
  MINT_FEE: ethers.parseEther("0.01"),
  TOKEN_URI: "https://example.com/token/1",
  ROYALTY_FEE: 500, // 5%
  LISTING_PRICE: ethers.parseEther("1"),
  OFFER_AMOUNT: ethers.parseEther("0.8"),
  HIGH_ROYALTY_FEE: 5100, // 51% (無効な値)
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
  MAX_MARKETPLACE_FEE: 1000, // 10%
  INVALID_MARKETPLACE_FEE: 1100, // 11% (無効な値)
} as const;

/**
 * テスト用のアカウント構造体
 */
export interface TestAccounts {
  owner: SignerWithAddress;
  creator: SignerWithAddress;
  seller: SignerWithAddress;
  buyer: SignerWithAddress;
  royaltyRecipient: SignerWithAddress;
  unauthorized: SignerWithAddress;
}

/**
 * デプロイされたコントラクト構造体
 */
export interface DeployedContracts {
  nftContract: NFTContract;
  marketplace: NFTMarketplace;
}

/**
 * テスト用のアカウントを取得する
 * 
 * @returns テスト用のアカウント群
 */
export async function getTestAccounts(): Promise<TestAccounts> {
  const [owner, creator, seller, buyer, royaltyRecipient, unauthorized] = 
    await ethers.getSigners();
  
  return {
    owner,
    creator,
    seller,
    buyer,
    royaltyRecipient,
    unauthorized,
  };
}

/**
 * NFTコントラクトをデプロイする
 * 
 * @param owner コントラクトのオーナーアドレス
 * @returns デプロイされたNFTコントラクト
 */
export async function deployNFTContract(owner: string): Promise<NFTContract> {
  const NFTContractFactory = await ethers.getContractFactory("NFTContract");
  const nftContract = await NFTContractFactory.deploy(
    TEST_CONSTANTS.TOKEN_NAME,
    TEST_CONSTANTS.TOKEN_SYMBOL,
    TEST_CONSTANTS.MINT_FEE,
    owner
  ) as unknown as NFTContract;
  
  return nftContract;
}

/**
 * NFTマーケットプレイスをデプロイする
 * 
 * @param owner コントラクトのオーナーアドレス
 * @returns デプロイされたマーケットプレイスコントラクト
 */
export async function deployMarketplace(owner: string): Promise<NFTMarketplace> {
  const MarketplaceFactory = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await MarketplaceFactory.deploy(owner) as unknown as NFTMarketplace;
  
  return marketplace;
}

/**
 * NFTコントラクトとマーケットプレイスの両方をデプロイする
 * 
 * @param owner コントラクトのオーナーアドレス
 * @returns デプロイされたコントラクト群
 */
export async function deployAllContracts(owner: string): Promise<DeployedContracts> {
  const nftContract = await deployNFTContract(owner);
  const marketplace = await deployMarketplace(owner);
  
  return { nftContract, marketplace };
}

/**
 * テスト用NFTをミントする
 * 
 * @param nftContract NFTコントラクト
 * @param minter ミントするアカウント
 * @param recipient NFTを受け取るアドレス
 * @param royaltyRecipient ロイヤリティ受取人のアドレス
 * @param royaltyFee ロイヤリティ手数料（basis points）
 * @param tokenUri トークンのURI
 * @returns ミント実行のトランザクション
 */
export async function mintTestNFT(
  nftContract: NFTContract,
  minter: SignerWithAddress,
  recipient: string,
  royaltyRecipient: string,
  royaltyFee: number = TEST_CONSTANTS.ROYALTY_FEE,
  tokenUri: string = TEST_CONSTANTS.TOKEN_URI
) {
  return await nftContract
    .connect(minter)
    .mintNFT(recipient, tokenUri, royaltyRecipient, royaltyFee, {
      value: TEST_CONSTANTS.MINT_FEE,
    });
}

/**
 * NFTをマーケットプレイスに出品する
 * 
 * @param marketplace マーケットプレイスコントラクト
 * @param lister 出品するアカウント
 * @param nftContract NFTコントラクトアドレス
 * @param tokenId トークンID
 * @param price 出品価格
 * @returns 出品実行のトランザクション
 */
export async function listNFTOnMarketplace(
  marketplace: NFTMarketplace,
  lister: SignerWithAddress,
  nftContract: string,
  tokenId: number,
  price: bigint = TEST_CONSTANTS.LISTING_PRICE
) {
  return await marketplace
    .connect(lister)
    .listNFT(nftContract, tokenId, price);
}

/**
 * マーケットプレイスでNFTを購入する
 * 
 * @param marketplace マーケットプレイスコントラクト
 * @param buyer 購入するアカウント
 * @param nftContract NFTコントラクトアドレス
 * @param tokenId トークンID
 * @param paymentAmount 支払い金額
 * @returns 購入実行のトランザクション
 */
export async function buyNFTFromMarketplace(
  marketplace: NFTMarketplace,
  buyer: SignerWithAddress,
  nftContract: string,
  tokenId: number,
  paymentAmount: bigint
) {
  return await marketplace
    .connect(buyer)
    .buyNFT(nftContract, tokenId, { value: paymentAmount });
}

/**
 * NFTにオファーを作成する
 * 
 * @param marketplace マーケットプレイスコントラクト
 * @param offerer オファーするアカウント
 * @param nftContract NFTコントラクトアドレス
 * @param tokenId トークンID
 * @param offerAmount オファー金額
 * @param expiration 有効期限（タイムスタンプ）
 * @returns オファー作成のトランザクション
 */
export async function makeOfferOnNFT(
  marketplace: NFTMarketplace,
  offerer: SignerWithAddress,
  nftContract: string,
  tokenId: number,
  offerAmount: bigint = TEST_CONSTANTS.OFFER_AMOUNT,
  expiration?: number
) {
  // デフォルトの有効期限：現在時刻から1時間後
  const defaultExpiration = Math.floor(Date.now() / 1000) + 3600;
  const expirationTime = expiration || defaultExpiration;
  
  return await marketplace
    .connect(offerer)
    .makeOffer(nftContract, tokenId, expirationTime, { value: offerAmount });
}

/**
 * NFTマーケットプレイス向けのセットアップを行う（NFTミント + 承認設定）
 * 
 * @param contracts デプロイされたコントラクト群
 * @param accounts テストアカウント群
 * @returns ミントされたトークンID
 */
export async function setupNFTForMarketplace(
  contracts: DeployedContracts,
  accounts: TestAccounts
): Promise<number> {
  const { nftContract, marketplace } = contracts;
  const { seller, royaltyRecipient } = accounts;
  
  // NFTをミント
  await mintTestNFT(
    nftContract,
    seller,
    seller.address,
    royaltyRecipient.address,
    TEST_CONSTANTS.ROYALTY_FEE,
    TEST_CONSTANTS.TOKEN_URI
  );
  
  // マーケットプレイスにNFTの操作権限を付与
  await nftContract.connect(seller).setApprovalForAll((marketplace as unknown as { target: string }).target, true);
  
  return 1; // 最初にミントされるトークンIDは1
}

/**
 * 現在のブロックタイムスタンプを取得する
 * 
 * @returns 現在のブロックタイムスタンプ
 */
export async function getCurrentTimestamp(): Promise<number> {
  const latestBlock = await ethers.provider.getBlock("latest");
  if (!latestBlock) {
    throw new Error("Unable to get latest block");
  }
  return latestBlock.timestamp;
}

/**
 * 指定した秒数だけ時間を進める
 * 
 * @param seconds 進める秒数
 */
export async function increaseTime(seconds: number): Promise<void> {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

/**
 * アカウントの残高を取得する
 * 
 * @param address アドレス
 * @returns アカウントの残高
 */
export async function getBalance(address: string): Promise<bigint> {
  return await ethers.provider.getBalance(address);
}
