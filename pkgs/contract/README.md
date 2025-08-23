# AMM DEX スマートコントラクト

UniswapライクなAMM（Automated Market Maker）DEXのスマートコントラクト実装です。

## 概要

このパッケージには以下のコントラクトが含まれています：

- **DEXFactory**: 新しい流動性ペアの作成と管理
- **DEXPair**: 流動性プールとトークンスワップ機能
- **DEXRouter**: ユーザーフレンドリーなインターフェース
- **TestTokenFaucet**: 検証用トークンの配布機能
- **TestToken**: 検証用ERC-20トークン

## 技術スタック

- **Solidity**: ^0.8.30
- **Hardhat**: 開発・テスト・デプロイフレームワーク
- **OpenZeppelin**: セキュアなコントラクトライブラリ
- **TypeScript**: 型安全な開発環境

## セットアップ

```bash
# 依存関係のインストール
pnpm install

# コンパイル
pnpm build

# テスト実行
pnpm test

# ガスレポート
pnpm gas-report
```

## デプロイ

```bash
# Sepoliaテストネットにデプロイ
pnpm deploy

# コントラクト検証
pnpm verify
```

## 環境変数

`.env`ファイルを作成し、以下の変数を設定してください：

```
PRIVATE_KEY=your_private_key
ALCHEMY_API_KEY=your_alchemy_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
```

## ディレクトリ構造

```
contracts/          # Solidityコントラクト
test/              # テストファイル
ignition/          # デプロイスクリプト
tasks/             # Hardhatタスク
helpers/           # ヘルパー関数
outputs/           # デプロイ結果
```