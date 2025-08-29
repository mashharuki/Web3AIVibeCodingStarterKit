# AMM DEX Smart Contracts

AMM（自動マーケットメーカー）型DEXのスマートコントラクト実装です。

## 概要

このパッケージには以下のコントラクトが含まれています：

- **AMMFactory**: ペア作成・管理
- **AMMPair**: 流動性プール実装
- **AMMRouter**: スワップ・流動性管理

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
# .envファイルを編集して必要な値を設定
```

### 3. コンパイル

```bash
pnpm build
```

## 開発

### テスト実行

```bash
# 全テスト実行
pnpm test

# カバレッジ付きテスト
pnpm test:coverage
```

### デプロイ

```bash
# Sepoliaネットワークにデプロイ
pnpm deploy --network sepolia
```

## 使用技術

| ライブラリ   | 概要                                 | バージョン |
| ------------ | ------------------------------------ | ---------- |
| Hardhat      | 開発・テスト・デプロイフレームワーク | ^2.19.0    |
| OpenZeppelin | セキュアなコントラクトライブラリ     | ^5.0.0     |
| TypeChain    | TypeScript型生成                     | ^8.3.0     |
| ethers.js    | Ethereumライブラリ                   | ^6.4.0     |

## ディレクトリ構造

```
contracts/
├── core/           # コアコントラクト
├── interfaces/     # インターフェース定義
└── libraries/      # ライブラリコントラクト
test/
├── unit/          # ユニットテスト
└── integration/   # 統合テスト
scripts/
├── deploy/        # デプロイスクリプト
└── verify/        # 検証スクリプト
```
