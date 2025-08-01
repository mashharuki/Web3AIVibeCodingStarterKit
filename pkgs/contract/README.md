# NFTマーケットプレイス - スマートコントラクト

このプロジェクトは、ERC-721準拠のNFTとマーケットプレイス機能を提供するスマートコントラクトです。

## 主な機能

### NFTコントラクト (NFTContract.sol)
- ERC-721準拠のNFT作成・管理
- EIP-2981準拠のロイヤリティ機能
- ミント手数料システム
- 一時停止・再開機能
- オーナー権限管理

### マーケットプレイス (NFTMarketplace.sol)
- 固定価格でのNFT売買
- オファー・受諾システム
- 販売履歴の記録
- ロイヤリティ自動分配
- マーケットプレイス手数料管理

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.example`を`.env`にコピーして、必要な値を設定してください。

```bash
cp .env.example .env
```

### 3. コンパイル

```bash
pnpm build
```

### 4. テスト実行

```bash
pnpm test
```

## デプロイメント

### Sepoliaテストネットへのデプロイ

```bash
# NFTコントラクトのみデプロイ
pnpm run deploy:nft --network sepolia

# マーケットプレイスのみデプロイ
pnpm run deploy:marketplace --network sepolia

# 両方を一度にデプロイ
pnpm run deploy:all --network sepolia
```

## タスクの使用方法

### NFTコントラクト関連

```bash
# NFTをミント
npx hardhat nft:mint --contract 0x... --to 0x... --token-uri "https://..." --royalty-recipient 0x... --network sepolia

# NFT情報を取得
npx hardhat nft:info --contract 0x... --token-id 1 --network sepolia

# ミント手数料を更新
npx hardhat nft:update-mint-fee --contract 0x... --new-fee 0.02 --network sepolia

# ロイヤリティを更新
npx hardhat nft:update-royalty --contract 0x... --token-id 1 --recipient 0x... --fee-numerator 750 --network sepolia

# 手数料を引き出し
npx hardhat nft:withdraw-fees --contract 0x... --network sepolia
```

### マーケットプレイス関連

```bash
# NFTを出品
npx hardhat marketplace:list --contract 0x... --nft-contract 0x... --token-id 1 --price 1.0 --network sepolia

# NFTを購入
npx hardhat marketplace:buy --contract 0x... --listing-id 1 --price 1.0 --network sepolia

# 出品をキャンセル
npx hardhat marketplace:cancel --contract 0x... --listing-id 1 --network sepolia

# オファーを作成
npx hardhat marketplace:offer --contract 0x... --nft-contract 0x... --token-id 1 --amount 0.8 --network sepolia

# オファーを受諾
npx hardhat marketplace:accept-offer --contract 0x... --offer-id 1 --network sepolia

# オファーをキャンセル
npx hardhat marketplace:cancel-offer --contract 0x... --offer-id 1 --network sepolia

# 出品情報を取得
npx hardhat marketplace:listing-info --contract 0x... --listing-id 1 --network sepolia

# オファー情報を取得
npx hardhat marketplace:offer-info --contract 0x... --offer-id 1 --network sepolia

# 販売履歴を取得
npx hardhat marketplace:sales-history --contract 0x... --network sepolia
```

### ユーティリティタスク

```bash
# 特定ネットワークのコントラクトアドレスJSONファイルをリセット
npx hardhat reset-contracts --net sepolia

# 全ネットワークのコントラクトアドレスJSONファイルをリセット
npx hardhat reset-all-contracts
```

## コントラクト仕様

### NFTContract

#### 主要な機能
- `mintNFT()`: NFTのミント
- `updateMintFee()`: ミント手数料の更新
- `updateTokenRoyalty()`: ロイヤリティの更新
- `withdrawFees()`: 手数料の引き出し
- `pause()/unpause()`: 一時停止・再開

#### イベント
- `NFTMinted`: NFTがミントされた時
- `MintFeeUpdated`: ミント手数料が更新された時
- `RoyaltySet`: ロイヤリティが設定された時

### NFTMarketplace

#### 主要な機能
- `listNFT()`: NFTの出品
- `buyNFT()`: NFTの購入
- `cancelListing()`: 出品のキャンセル
- `makeOffer()`: オファーの作成
- `acceptOffer()`: オファーの受諾
- `cancelOffer()`: オファーのキャンセル

#### イベント
- `NFTListed`: NFTが出品された時
- `NFTSold`: NFTが販売された時
- `ListingCancelled`: 出品がキャンセルされた時
- `OfferMade`: オファーが作成された時
- `OfferAccepted`: オファーが受諾された時
- `OfferCancelled`: オファーがキャンセルされた時

## セキュリティ

- ReentrancyGuard による再入攻撃の防止
- Pausable による緊急停止機能
- Ownable による権限管理
- 適切な入力値検証
- ガス効率の最適化

## ライセンス

MIT
