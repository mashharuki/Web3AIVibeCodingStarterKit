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

`.env`ファイルの設定項目：

```bash
# 必須設定
PRIVATE_KEY="your-private-key-here"              # デプロイ用の秘密鍵
ALCHEMY_API_KEY="your-alchemy-api-key-here"      # AlchemyのAPIキー

# オプション設定
OWNER_ADDRESS="your-owner-address-here"          # デフォルトのオーナーアドレス
ETHERSCAN_API_KEY="your-etherscan-api-key-here"  # コントラクト検証用
COINMARKETCAP_API_KEY="your-api-key-here"        # ガスレポート用
GAS_REPORT=true                                  # ガスレポートの有効化
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

### 自動コントラクトアドレス管理付きデプロイ（推奨）

本プロジェクトでは、デプロイ後に自動的にコントラクトアドレスを保存する機能を提供しています。

#### 基本的なデプロイ

```bash
# NFTコントラクトのみデプロイ
pnpm deploy:nft --network sepolia

# マーケットプレイスのみデプロイ
pnpm deploy:marketplace --network sepolia

# 全てのコントラクトをデプロイ
pnpm deploy:full --network sepolia
```

#### カスタムパラメータでのデプロイ

```bash
# カスタムパラメータでNFTコントラクトをデプロイ
npx hardhat deploy:nft \
  --token-name "MyCustomNFT" \
  --token-symbol "MNFT" \
  --mint-fee "0.005" \
  --owner "0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072" \
  --network sepolia

# 特定のオーナーでマーケットプレイスをデプロイ
npx hardhat deploy:marketplace \
  --owner "0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072" \
  --network sepolia
```

#### コントラクトアドレスの自動管理

デプロイ後、コントラクトアドレスは`outputs/contracts-{network}.json`に自動保存されます：

```json
{
  "contracts": {
    "NFTContract": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "NFTMarketplace": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  }
}
```

### パラメーター仕様

#### NFTコントラクト
- `tokenName` (string): NFTコレクションの名前（デフォルト: "VibeNFT"）
- `tokenSymbol` (string): NFTのシンボル（デフォルト: "VNFT"）
- `mintFee` (string): ミント手数料（wei単位、デフォルト: "10000000000000000" = 0.01 ETH）
- `owner` (address): コントラクトオーナーのアドレス（デフォルト: デプロイヤーアドレス）

#### マーケットプレイス
- `owner` (address): コントラクトオーナーのアドレス（デフォルト: デプロイヤーアドレス）

## タスクの使用方法

**注意**: v2.0.0以降、すべてのタスクでコントラクトアドレスがオプションになりました。アドレスを指定しない場合、`outputs/contracts-{network}.json`から自動的に取得されます。

### NFTコントラクト関連

#### 自動アドレス取得使用時（推奨）

```bash
# NFTをミント（コントラクトアドレスは自動取得）
npx hardhat nft:mint --to 0x... --token-uri "https://..." --royalty-recipient 0x... --network sepolia

# NFT情報を取得
npx hardhat nft:info --token-id 1 --network sepolia

# マーケットプレイス承認関連（NFT出品前に必要）
npx hardhat nft:check-approval --token-id 1 --network sepolia
npx hardhat nft:approve --token-id 1 --network sepolia
npx hardhat nft:approve-all --network sepolia

# ミント手数料を更新
npx hardhat nft:update-mint-fee --new-fee 0.02 --network sepolia

# ロイヤリティを更新
npx hardhat nft:update-royalty --token-id 1 --recipient 0x... --fee-numerator 750 --network sepolia

# 手数料を引き出し
npx hardhat nft:withdraw-fees --network sepolia
```

#### 手動でコントラクトアドレスを指定する場合

```bash
# NFTをミント（コントラクトアドレスを指定）
npx hardhat nft:mint --contract 0x... --to 0x... --token-uri "https://..." --royalty-recipient 0x... --network sepolia

# NFT情報を取得
npx hardhat nft:info --contract 0x... --token-id 1 --network sepolia

# マーケットプレイス承認関連（NFT出品前に必要）
npx hardhat nft:check-approval --contract 0x... --marketplace 0x... --token-id 1 --network sepolia
npx hardhat nft:approve --contract 0x... --marketplace 0x... --token-id 1 --network sepolia
npx hardhat nft:approve-all --contract 0x... --marketplace 0x... --network sepolia

# ミント手数料を更新
npx hardhat nft:update-mint-fee --contract 0x... --new-fee 0.02 --network sepolia

# ロイヤリティを更新
npx hardhat nft:update-royalty --contract 0x... --token-id 1 --recipient 0x... --fee-numerator 750 --network sepolia

# 手数料を引き出し
npx hardhat nft:withdraw-fees --contract 0x... --network sepolia
```

### マーケットプレイス関連

#### 自動アドレス取得使用時（推奨）

```bash
# NFTを出品（コントラクトアドレスは自動取得）
npx hardhat marketplace:list --token-id 1 --price 1.0 --network sepolia

# NFTを購入
npx hardhat marketplace:buy --listing-id 1 --price 1.0 --network sepolia

# 出品をキャンセル
npx hardhat marketplace:cancel --listing-id 1 --network sepolia

# オファーを作成
npx hardhat marketplace:offer --token-id 1 --amount 0.8 --network sepolia

# オファーを受諾
npx hardhat marketplace:accept-offer --offer-id 1 --network sepolia

# オファーをキャンセル
npx hardhat marketplace:cancel-offer --offer-id 1 --network sepolia

# 出品情報を取得
npx hardhat marketplace:listing-info --listing-id 1 --network sepolia

# オファー情報を取得
npx hardhat marketplace:offer-info --offer-id 1 --network sepolia

# 販売履歴を取得
npx hardhat marketplace:sales-history --network sepolia
```

#### 手動でコントラクトアドレスを指定する場合

```bash
# NFTを出品（コントラクトアドレスを指定）
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

# 販売履歴を取得（件数指定可能）
npx hardhat marketplace:sales-history --contract 0x... --count 20 --network sepolia
```

### コントラクトアドレス自動取得の仕組み

タスク実行時にコントラクトアドレスが指定されていない場合、以下の流れで自動取得されます：

1. `outputs/contracts-{network}.json`ファイルを確認
2. 該当するコントラクト名（`NFTContract`または`NFTMarketplace`）のアドレスを取得
3. アドレスが見つからない場合は、エラーメッセージと共に処理を停止

例：
```json
// outputs/contracts-sepolia.json
{
  "contracts": {
    "NFTContract": "0x953ae606af2B695EEdF012c0358eB65233CFc4c1",
    "NFTMarketplace": "0x452D352bc79B7c1eF23AF28D4CF841267b55DE1B"
  }
}
```

## 推奨ワークフロー

### NFTを出品するまでの流れ

```bash
# 1. NFTをミント
npx hardhat nft:mint \
  --to 0xYourAddress \
  --token-uri "ipfs://QmYourTokenURI" \
  --royalty-recipient 0xYourAddress \
  --network sepolia

# 2. 承認状態を確認
npx hardhat nft:check-approval --token-id 1 --network sepolia

# 3. マーケットプレイスにNFTの操作権限を承認
npx hardhat nft:approve --token-id 1 --network sepolia

# 4. NFTを出品
npx hardhat marketplace:list --token-id 1 --price 1.0 --network sepolia
```

### NFTを購入するまでの流れ

```bash
# 1. 出品情報を確認
npx hardhat marketplace:listing-info --listing-id 1 --network sepolia

# 2. NFTを購入
npx hardhat marketplace:buy --listing-id 1 --price 1.0 --network sepolia
```

### オファーを作成・受諾するまでの流れ

```bash
# 1. オファーを作成
npx hardhat marketplace:offer \
  --token-id 1 \
  --amount 0.8 \
  --network sepolia

# 2. オファー情報を確認
npx hardhat marketplace:offer-info --offer-id 1 --network sepolia

# 3. オファーを受諾（NFTオーナーが実行）
npx hardhat marketplace:accept-offer --offer-id 1 --network sepolia
```

### 重要な注意事項

#### NFT承認について
- **必須**: NFTを出品する前に、マーケットプレイスに対してNFTの操作権限を承認する必要があります
- **個別承認**: `nft:approve` - 特定のNFTのみを承認（セキュリティ重視）
- **一括承認**: `nft:approve-all` - 所有する全NFTを承認（利便性重視）

#### セキュリティのベストプラクティス
1. 可能な限り個別承認（`nft:approve`）を使用する
2. 承認状態を定期的に確認する（`nft:check-approval`）
3. 不要になった承認は取り消す

## コントラクト仕様

### NFTContract

#### 主要な機能
- `mintNFT()`: NFTのミント
- `approve()`: 特定のNFTの操作権限を承認
- `setApprovalForAll()`: 全NFTの操作権限を承認
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
