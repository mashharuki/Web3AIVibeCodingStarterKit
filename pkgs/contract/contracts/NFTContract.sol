// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTContract
 * @dev ERC-721準拠のNFTコントラクト（ロイヤリティ対応）
 */
contract NFTContract is ERC721, ERC721URIStorage, ERC721Pausable, Ownable, ERC2981, ReentrancyGuard {
  // トークンIDカウンター
  uint256 private _nextTokenId = 1;

  // ミント手数料（wei単位）
  uint256 public mintFee;

  // NFT作成者を記録するマッピング
  mapping(uint256 => address) public creators;

  // イベント定義
  event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI);
  event MintFeeUpdated(uint256 newFee);
  event RoyaltySet(uint256 indexed tokenId, address indexed recipient, uint96 feeNumerator);

  /**
   * @dev コンストラクタ
   * @param _name トークン名
   * @param _symbol トークンシンボル
   * @param _mintFee ミント手数料
   * @param _owner コントラクトオーナー
   */
  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _mintFee,
    address _owner
  ) ERC721(_name, _symbol) Ownable(_owner) {
    mintFee = _mintFee;
  }

  /**
   * @dev NFTをミントする
   * @param _to ミント先アドレス
   * @param _tokenURI トークンURI
   * @param _royaltyRecipient ロイヤリティ受取人
   * @param _royaltyFeeNumerator ロイヤリティ手数料（基準点：10000）
   */
  function mintNFT(
    address _to,
    string memory _tokenURI,
    address _royaltyRecipient,
    uint96 _royaltyFeeNumerator
  ) external payable nonReentrant returns (uint256) {
    require(msg.value >= mintFee, "Insufficient mint fee");
    require(_to != address(0), "Invalid recipient address");
    require(_royaltyFeeNumerator <= 1000, "Royalty fee too high"); // 最大10%

    uint256 tokenId = _nextTokenId++;

    // NFTをミント
    _safeMint(_to, tokenId);
    _setTokenURI(tokenId, _tokenURI);

    // 作成者を記録
    creators[tokenId] = msg.sender;

    // ロイヤリティを設定
    _setTokenRoyalty(tokenId, _royaltyRecipient, _royaltyFeeNumerator);

    emit NFTMinted(tokenId, msg.sender, _tokenURI);
    emit RoyaltySet(tokenId, _royaltyRecipient, _royaltyFeeNumerator);

    return tokenId;
  }

  /**
   * @dev ミント手数料を更新する（オーナーのみ）
   * @param _newFee 新しいミント手数料
   */
  function updateMintFee(uint256 _newFee) external onlyOwner {
    mintFee = _newFee;
    emit MintFeeUpdated(_newFee);
  }

  /**
   * @dev 特定のトークンのロイヤリティを更新する（作成者またはオーナーのみ）
   * @param _tokenId トークンID
   * @param _recipient ロイヤリティ受取人
   * @param _feeNumerator ロイヤリティ手数料
   */
  function updateTokenRoyalty(uint256 _tokenId, address _recipient, uint96 _feeNumerator) external {
    require(_exists(_tokenId), "Token does not exist");
    require(msg.sender == creators[_tokenId] || msg.sender == owner(), "Not authorized");
    require(_feeNumerator <= 1000, "Royalty fee too high");

    _setTokenRoyalty(_tokenId, _recipient, _feeNumerator);
    emit RoyaltySet(_tokenId, _recipient, _feeNumerator);
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
   * @dev 次のトークンIDを取得する
   * @return 次のトークンID
   */
  function getNextTokenId() external view returns (uint256) {
    return _nextTokenId;
  }

  /**
   * @dev トークンの作成者を取得する
   * @param _tokenId トークンID
   * @return 作成者のアドレス
   */
  function getCreator(uint256 _tokenId) external view returns (address) {
    require(_exists(_tokenId), "Token does not exist");
    return creators[_tokenId];
  }

  // オーバーライド関数
  function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
    return super.tokenURI(tokenId);
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view override(ERC721, ERC721URIStorage, ERC2981) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  function _update(
    address to,
    uint256 tokenId,
    address auth
  ) internal override(ERC721, ERC721Pausable) returns (address) {
    return super._update(to, tokenId, auth);
  }

  /**
   * @dev トークンが存在するかチェックする
   * @param tokenId トークンID
   * @return トークンの存在状況
   */
  function _exists(uint256 tokenId) internal view returns (bool) {
    return _ownerOf(tokenId) != address(0);
  }
}
