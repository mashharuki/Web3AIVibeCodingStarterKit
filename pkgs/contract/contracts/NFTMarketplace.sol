// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title NFTMarketplace
 * @dev NFTマーケットプレイスコントラクト（固定価格販売・オファー・履歴管理）
 */
contract NFTMarketplace is Ownable, ReentrancyGuard, Pausable, IERC721Receiver {
  // マーケットプレイス手数料（基準点：10000）
  uint256 public marketplaceFee = 250; // 2.5%

  // 出品情報の構造体
  struct Listing {
    address seller; // 出品者
    address nftContract; // NFTコントラクトアドレス
    uint256 tokenId; // トークンID
    uint256 price; // 価格（wei単位）
    bool active; // 出品状態
    uint256 listingTime; // 出品時刻
  }

  // オファー情報の構造体
  struct Offer {
    address bidder; // オファー者
    address nftContract; // NFTコントラクトアドレス
    uint256 tokenId; // トークンID
    uint256 amount; // オファー金額（wei単位）
    uint256 expiration; // 有効期限
    bool active; // オファー状態
  }

  // 販売履歴の構造体
  struct SaleHistory {
    address seller; // 販売者
    address buyer; // 購入者
    address nftContract; // NFTコントラクトアドレス
    uint256 tokenId; // トークンID
    uint256 price; // 販売価格
    uint256 timestamp; // 販売時刻
  }

  // 出品ID => 出品情報
  mapping(uint256 => Listing) public listings;

  // オファーID => オファー情報
  mapping(uint256 => Offer) public offers;

  // 販売履歴
  SaleHistory[] public salesHistory;

  // NFTコントラクト + トークンID => 出品ID
  mapping(address => mapping(uint256 => uint256)) public tokenToListingId;

  // 出品者のアクティブな出品リスト
  mapping(address => uint256[]) public sellerListings;

  // NFTコントラクト + トークンID => オファーID配列
  mapping(address => mapping(uint256 => uint256[])) public tokenOffers;

  // オファー者のアクティブなオファーリスト
  mapping(address => uint256[]) public bidderOffers;

  // カウンター
  uint256 private _nextListingId = 1;
  uint256 private _nextOfferId = 1;

  // イベント定義
  event NFTListed(
    uint256 indexed listingId,
    address indexed seller,
    address indexed nftContract,
    uint256 tokenId,
    uint256 price
  );

  event NFTSold(
    uint256 indexed listingId,
    address indexed seller,
    address indexed buyer,
    address nftContract,
    uint256 tokenId,
    uint256 price
  );

  event ListingCancelled(
    uint256 indexed listingId,
    address indexed seller,
    address indexed nftContract,
    uint256 tokenId
  );

  event OfferMade(
    uint256 indexed offerId,
    address indexed bidder,
    address indexed nftContract,
    uint256 tokenId,
    uint256 amount,
    uint256 expiration
  );

  event OfferAccepted(
    uint256 indexed offerId,
    address indexed seller,
    address indexed bidder,
    address nftContract,
    uint256 tokenId,
    uint256 amount
  );

  event OfferCancelled(uint256 indexed offerId, address indexed bidder, address indexed nftContract, uint256 tokenId);

  event MarketplaceFeeUpdated(uint256 newFee);

  /**
   * @dev コンストラクタ
   * @param _owner コントラクトオーナー
   */
  constructor(address _owner) Ownable(_owner) {}

  /**
   * @dev NFTを出品する
   * @param _nftContract NFTコントラクトアドレス
   * @param _tokenId トークンID
   * @param _price 販売価格
   */
  function listNFT(
    address _nftContract,
    uint256 _tokenId,
    uint256 _price
  ) external whenNotPaused nonReentrant returns (uint256) {
    require(_nftContract != address(0), "Invalid NFT contract");
    require(_price > 0, "Price must be greater than 0");
    require(IERC721(_nftContract).ownerOf(_tokenId) == msg.sender, "Not the owner of the token");
    require(
      IERC721(_nftContract).isApprovedForAll(msg.sender, address(this)) ||
        IERC721(_nftContract).getApproved(_tokenId) == address(this),
      "Marketplace not approved"
    );
    require(
      tokenToListingId[_nftContract][_tokenId] == 0 || !listings[tokenToListingId[_nftContract][_tokenId]].active,
      "Token already listed"
    );

    uint256 listingId = _nextListingId++;

    listings[listingId] = Listing({
      seller: msg.sender,
      nftContract: _nftContract,
      tokenId: _tokenId,
      price: _price,
      active: true,
      listingTime: block.timestamp
    });

    tokenToListingId[_nftContract][_tokenId] = listingId;
    sellerListings[msg.sender].push(listingId);

    emit NFTListed(listingId, msg.sender, _nftContract, _tokenId, _price);

    return listingId;
  }

  /**
   * @dev NFTを購入する
   * @param _listingId 出品ID
   */
  function buyNFT(uint256 _listingId) external payable whenNotPaused nonReentrant {
    Listing storage listing = listings[_listingId];
    require(listing.active, "Listing not active");
    require(msg.value >= listing.price, "Insufficient payment");
    require(msg.sender != listing.seller, "Cannot buy your own NFT");

    // 出品状態を無効化
    listing.active = false;
    tokenToListingId[listing.nftContract][listing.tokenId] = 0;

    // 支払い処理
    uint256 totalPrice = listing.price;
    uint256 marketplaceFeeAmount = (totalPrice * marketplaceFee) / 10000;
    uint256 royaltyAmount = 0;
    address royaltyRecipient = address(0);

    // ロイヤリティの計算
    if (IERC165(listing.nftContract).supportsInterface(type(IERC2981).interfaceId)) {
      (royaltyRecipient, royaltyAmount) = IERC2981(listing.nftContract).royaltyInfo(listing.tokenId, totalPrice);
    }

    uint256 sellerAmount = totalPrice - marketplaceFeeAmount - royaltyAmount;

    // 支払い実行
    if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
      (bool royaltySuccess, ) = payable(royaltyRecipient).call{value: royaltyAmount}("");
      require(royaltySuccess, "Royalty payment failed");
    }

    (bool sellerSuccess, ) = payable(listing.seller).call{value: sellerAmount}("");
    require(sellerSuccess, "Seller payment failed");

    // NFTを転送
    IERC721(listing.nftContract).safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

    // 販売履歴を記録
    salesHistory.push(
      SaleHistory({
        seller: listing.seller,
        buyer: msg.sender,
        nftContract: listing.nftContract,
        tokenId: listing.tokenId,
        price: totalPrice,
        timestamp: block.timestamp
      })
    );

    emit NFTSold(_listingId, listing.seller, msg.sender, listing.nftContract, listing.tokenId, totalPrice);

    // 余分な支払いがあれば返金
    if (msg.value > totalPrice) {
      (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
      require(refundSuccess, "Refund failed");
    }
  }

  /**
   * @dev 出品をキャンセルする
   * @param _listingId 出品ID
   */
  function cancelListing(uint256 _listingId) external nonReentrant {
    Listing storage listing = listings[_listingId];
    require(listing.active, "Listing not active");
    require(listing.seller == msg.sender, "Not the seller");

    listing.active = false;
    tokenToListingId[listing.nftContract][listing.tokenId] = 0;

    emit ListingCancelled(_listingId, listing.seller, listing.nftContract, listing.tokenId);
  }

  /**
   * @dev オファーを作成する
   * @param _nftContract NFTコントラクトアドレス
   * @param _tokenId トークンID
   * @param _expiration 有効期限（タイムスタンプ）
   */
  function makeOffer(
    address _nftContract,
    uint256 _tokenId,
    uint256 _expiration
  ) external payable whenNotPaused nonReentrant returns (uint256) {
    require(_nftContract != address(0), "Invalid NFT contract");
    require(msg.value > 0, "Offer amount must be greater than 0");
    require(_expiration > block.timestamp, "Invalid expiration time");
    require(IERC721(_nftContract).ownerOf(_tokenId) != msg.sender, "Cannot offer on your own NFT");

    uint256 offerId = _nextOfferId++;

    offers[offerId] = Offer({
      bidder: msg.sender,
      nftContract: _nftContract,
      tokenId: _tokenId,
      amount: msg.value,
      expiration: _expiration,
      active: true
    });

    tokenOffers[_nftContract][_tokenId].push(offerId);
    bidderOffers[msg.sender].push(offerId);

    emit OfferMade(offerId, msg.sender, _nftContract, _tokenId, msg.value, _expiration);

    return offerId;
  }

  /**
   * @dev オファーを受け入れる
   * @param _offerId オファーID
   */
  function acceptOffer(uint256 _offerId) external whenNotPaused nonReentrant {
    Offer storage offer = offers[_offerId];
    require(offer.active, "Offer not active");
    require(offer.expiration > block.timestamp, "Offer expired");
    require(IERC721(offer.nftContract).ownerOf(offer.tokenId) == msg.sender, "Not the owner of the token");
    require(
      IERC721(offer.nftContract).isApprovedForAll(msg.sender, address(this)) ||
        IERC721(offer.nftContract).getApproved(offer.tokenId) == address(this),
      "Marketplace not approved"
    );

    // オファー状態を無効化
    offer.active = false;

    // アクティブな出品があれば無効化
    uint256 listingId = tokenToListingId[offer.nftContract][offer.tokenId];
    if (listingId != 0 && listings[listingId].active) {
      listings[listingId].active = false;
      tokenToListingId[offer.nftContract][offer.tokenId] = 0;
    }

    // 支払い処理
    uint256 totalAmount = offer.amount;
    uint256 marketplaceFeeAmount = (totalAmount * marketplaceFee) / 10000;
    uint256 royaltyAmount = 0;
    address royaltyRecipient = address(0);

    // ロイヤリティの計算
    if (IERC165(offer.nftContract).supportsInterface(type(IERC2981).interfaceId)) {
      (royaltyRecipient, royaltyAmount) = IERC2981(offer.nftContract).royaltyInfo(offer.tokenId, totalAmount);
    }

    uint256 sellerAmount = totalAmount - marketplaceFeeAmount - royaltyAmount;

    // 支払い実行
    if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
      (bool royaltySuccess, ) = payable(royaltyRecipient).call{value: royaltyAmount}("");
      require(royaltySuccess, "Royalty payment failed");
    }

    (bool sellerSuccess, ) = payable(msg.sender).call{value: sellerAmount}("");
    require(sellerSuccess, "Seller payment failed");

    // NFTを転送
    IERC721(offer.nftContract).safeTransferFrom(msg.sender, offer.bidder, offer.tokenId);

    // 販売履歴を記録
    salesHistory.push(
      SaleHistory({
        seller: msg.sender,
        buyer: offer.bidder,
        nftContract: offer.nftContract,
        tokenId: offer.tokenId,
        price: totalAmount,
        timestamp: block.timestamp
      })
    );

    emit OfferAccepted(_offerId, msg.sender, offer.bidder, offer.nftContract, offer.tokenId, totalAmount);
  }

  /**
   * @dev オファーをキャンセルする
   * @param _offerId オファーID
   */
  function cancelOffer(uint256 _offerId) external nonReentrant {
    Offer storage offer = offers[_offerId];
    require(offer.active, "Offer not active");
    require(offer.bidder == msg.sender, "Not the bidder");

    offer.active = false;

    // オファー金額を返金
    (bool success, ) = payable(msg.sender).call{value: offer.amount}("");
    require(success, "Refund failed");

    emit OfferCancelled(_offerId, offer.bidder, offer.nftContract, offer.tokenId);
  }

  /**
   * @dev マーケットプレイス手数料を更新する（オーナーのみ）
   * @param _newFee 新しい手数料（基準点：10000）
   */
  function updateMarketplaceFee(uint256 _newFee) external onlyOwner {
    require(_newFee <= 1000, "Fee too high"); // 最大10%
    marketplaceFee = _newFee;
    emit MarketplaceFeeUpdated(_newFee);
  }

  /**
   * @dev 蓄積された手数料を引き出す（オーナーのみ）
   */
  function withdrawFees() external onlyOwner nonReentrant {
    uint256 balance = address(this).balance;
    require(balance > 0, "No fees to withdraw");

    (bool success, ) = payable(owner()).call{value: balance}("");
    require(success, "Withdrawal failed");
  }

  /**
   * @dev コントラクトを一時停止する（オーナーのみ）
   */
  function pause() external onlyOwner {
    _pause();
  }

  /**
   * @dev コントラクトの一時停止を解除する（オーナーのみ）
   */
  function unpause() external onlyOwner {
    _unpause();
  }

  /**
   * @dev 販売履歴の件数を取得する
   * @return 販売履歴の件数
   */
  function getSalesHistoryCount() external view returns (uint256) {
    return salesHistory.length;
  }

  /**
   * @dev 特定のトークンのオファー数を取得する
   * @param _nftContract NFTコントラクトアドレス
   * @param _tokenId トークンID
   * @return オファー数
   */
  function getTokenOffersCount(address _nftContract, uint256 _tokenId) external view returns (uint256) {
    return tokenOffers[_nftContract][_tokenId].length;
  }

  /**
   * @dev 出品者の出品数を取得する
   * @param _seller 出品者アドレス
   * @return 出品数
   */
  function getSellerListingsCount(address _seller) external view returns (uint256) {
    return sellerListings[_seller].length;
  }

  /**
   * @dev オファー者のオファー数を取得する
   * @param _bidder オファー者アドレス
   * @return オファー数
   */
  function getBidderOffersCount(address _bidder) external view returns (uint256) {
    return bidderOffers[_bidder].length;
  }

  /**
   * @dev ERC721トークンの受信処理
   */
  function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
    return IERC721Receiver.onERC721Received.selector;
  }
}
