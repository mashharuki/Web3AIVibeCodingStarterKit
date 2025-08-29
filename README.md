# AMM DEX - Automated Market Maker Decentralized Exchange

Ethereum Sepolia テストネットワーク上で動作するAMM（自動マーケットメーカー）型分散型取引所（DEX）です。

## 概要

このプロジェクトは、Uniswap V2のコア機能を参考に、流動性プール管理とトークンスワップ機能を提供するDEXです。

### 対象トークン

- **USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **JPYC**: `0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB`
- **PYUSD**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`

### 主要機能

- **トークンスワップ**: 自動価格計算によるトークン交換
- **流動性プール管理**: 流動性の追加・削除
- **リアルタイム価格表示**: 市場価格の即座な更新
- **ウォレット統合**: MetaMask接続とアカウント管理

## プロジェクト構造

```
├── pkgs/
│   ├── contract/          # スマートコントラクト
│   └── frontend/          # フロントエンドアプリケーション
├── docs/                  # ドキュメント
├── .kiro/                 # Kiro設定
└── README.md              # このファイル
```

## セットアップ

### 前提条件

- Node.js 18.0.0以上
- pnpm 8.0.0以上

### 1. 依存関係のインストール

```bash
# ルートディレクトリで実行
pnpm install
```

### 2. 環境変数の設定

```bash
# コントラクト用
cp pkgs/contract/.env.example pkgs/contract/.env

# フロントエンド用
cp pkgs/frontend/.env.example pkgs/frontend/.env.local
```

### 3. 開発環境の起動

```bash
# コントラクトのコンパイル
cd pkgs/contract
pnpm build

# フロントエンドの開発サーバー起動
cd pkgs/frontend
pnpm dev
```

## 開発ワークフロー

### 1. スマートコントラクト開発

```bash
cd pkgs/contract

# コンパイル
pnpm build

# テスト実行
pnpm test

# Sepoliaにデプロイ
pnpm deploy:sepolia
```

### 2. フロントエンド開発

```bash
cd pkgs/frontend

# 開発サーバー起動
pnpm dev

# テスト実行
pnpm test

# ビルド
pnpm build
```

## 使用技術スタック

### スマートコントラクト

- **Solidity**: ^0.8.19
- **Hardhat**: 開発・テスト・デプロイフレームワーク
- **OpenZeppelin**: セキュアなコントラクトライブラリ
- **TypeChain**: TypeScript型生成

### フロントエンド

- **Next.js 14**: App Router使用
- **TypeScript**: 型安全な開発
- **TailwindCSS**: ユーティリティファーストCSS
- **wagmi + viem**: Web3ライブラリ
- **RainbowKit**: ウォレット接続UI

### 開発ツール

- **pnpm**: パッケージマネージャー
- **Prettier**: コードフォーマッター
- **ESLint**: コード品質チェック
- **Vitest**: テストフレームワーク
- **Playwright**: E2Eテスト

## ネットワーク設定

- **チェーンID**: 11155111 (Ethereum Sepolia)
- **RPC URL**: `https://eth-sepolia.g.alchemy.com/v2/YOUR-PROJECT-ID`
- **ブロックエクスプローラー**: `https://sepolia.etherscan.io/`

## コマンド一覧

### ルートレベル

```bash
# 全パッケージのビルド
pnpm build

# 全パッケージのテスト
pnpm test

# 全パッケージのリント
pnpm lint

# コードフォーマット
pnpm format
```

### パッケージ別

詳細なコマンドは各パッケージのREADMEを参照してください：

- [Contract README](./pkgs/contract/README.md)
- [Frontend README](./pkgs/frontend/README.md)

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](./LICENSE)ファイルを参照してください。

## 貢献

プロジェクトへの貢献を歓迎します。プルリクエストを送信する前に、以下を確認してください：

1. コードが適切にフォーマットされている
2. テストが通過している
3. 新機能にはテストが含まれている
4. ドキュメントが更新されている
