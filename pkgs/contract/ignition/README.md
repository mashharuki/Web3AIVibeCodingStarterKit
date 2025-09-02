# AMM Contract Deployment Scripts

このディレクトリには、AMM（Automated Market Maker）コントラクトのデプロイメントスクリプトが含まれています。

## 概要

AMM DEXは以下のコントラクトで構成されています：

1. **AMMFactory** - 新しい取引ペアの作成と管理
2. **AMMRouter** - ユーザーフレンドリーなインターフェース

## デプロイメントスクリプト

### 個別デプロイメント

#### 1. AMMFactory のデプロイ

```bash
npx hardhat run ignition/AMMFactory.ts --network sepolia
```

- AMMFactory コントラクトをデプロイします
- デプロイヤーのアドレスが `feeToSetter` として設定されます
- デプロイ済みアドレスが `outputs/contracts-sepolia.json` に保存されます

#### 2. AMMRouter のデプロイ

```bash
npx hardhat run ignition/AMMRouter.ts --network sepolia
```

- AMMRouter コントラクトをデプロイします
- **注意**: AMMFactory が事前にデプロイされている必要があります
- Sepolia WETH アドレス（0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14）が使用されます

### 一括デプロイメント

#### 全コントラクトの一括デプロイ

```bash
npx hardhat run ignition/deployAll.ts --network sepolia
```

- 正しい順序で全てのコントラクトをデプロイします
- 既存のデプロイメント情報をバックアップしてリセットします
- デプロイ後に基本的な検証を実行します

## デプロイメント順序

コントラクトは以下の順序でデプロイする必要があります：

1. **AMMFactory** - 他のコントラクトが依存するため最初にデプロイ
2. **AMMRouter** - Factory のアドレスが必要

## 設定ファイル

デプロイ済みコントラクトのアドレスは以下のファイルに保存されます：

```
outputs/contracts-{network}.json
```

例（Sepolia ネットワーク）：
```json
{
  "contracts": {
    "AMMFactory": "\"0x...\""
    "AMMRouter": "\"0x...\""
  }
}
```

## 対象トークン（Sepolia Network）

このAMM DEXは以下のトークンをサポートします：

- **USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **JPYC**: `0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB`
- **PYUSD**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`

## デプロイ後の次ステップ

### 1. トークンペアの作成

```bash
# USDC/JPYC ペア
npx hardhat createPair --factory <FACTORY_ADDRESS> --tokena 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 --tokenb 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB --network sepolia

# USDC/PYUSD ペア
npx hardhat createPair --factory <FACTORY_ADDRESS> --tokena 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 --tokenb 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9 --network sepolia

# JPYC/PYUSD ペア
npx hardhat createPair --factory <FACTORY_ADDRESS> --tokena 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB --tokenb 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9 --network sepolia
```

### 2. 初期流動性の追加

Router コントラクトを使用して各ペアに初期流動性を追加します。

### 3. スワップ機能のテスト

Router コントラクトを使用してトークンスワップをテストします。

## 環境変数

デプロイメントには以下の環境変数が必要です：

```bash
PRIVATE_KEY=your_private_key_here
ALCHEMY_API_KEY=your_alchemy_api_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here  # コントラクト検証用（オプション）
```

## トラブルシューティング

### よくある問題

1. **"AMMFactory address not found" エラー**
   - AMMFactory が先にデプロイされていることを確認してください
   - `outputs/contracts-sepolia.json` ファイルが存在し、正しいアドレスが含まれていることを確認してください

2. **ガス不足エラー**
   - デプロイヤーアカウントに十分な Sepolia ETH があることを確認してください
   - Sepolia Faucet から ETH を取得してください

3. **ネットワーク接続エラー**
   - Alchemy API キーが正しく設定されていることを確認してください
   - インターネット接続を確認してください

### デバッグ情報

各デプロイメントスクリプトは詳細なログを出力します：

- デプロイヤーアカウント情報
- ネットワーク情報
- コントラクトアドレス
- 基本的な設定確認
- 次のステップの提案

## セキュリティ注意事項

- プライベートキーは絶対に公開しないでください
- テストネットでのみ使用してください
- 本番環境では追加のセキュリティ監査が必要です