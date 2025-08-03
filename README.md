# Web3 AI Vibe Coding Starter Kit - NFT Marketplace

完全なWeb3 NFTマーケットプレイスのモノレポプロジェクト

## プロジェクト概要

このプロジェクトは、ERC-721準拠のNFTとマーケットプレイス機能を提供する完全なWeb3アプリケーションです。

### 主な機能

- **NFT作成・管理**: ERC-721準拠のNFTコレクションの作成とミント
- **マーケットプレイス**: 固定価格での売買とオファー機能
- **ロイヤリティシステム**: EIP-2981準拠のクリエイター報酬
- **手数料管理**: プラットフォーム手数料とミント手数料
- **セキュリティ**: 再入攻撃防止とアクセス制御

## プロジェクト構成

```
.
├── pkgs/
│   ├── contract/          # Hardhat + Solidity + TypeScript
│   └── frontend/          # Next.js + TailwindCSS + Shadcn UI (予定)
├── docs/                  # プロジェクト文書
├── .github/
│   ├── workflows/         # CI/CD設定
│   └── instructions/      # コーディング規則
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/mashharuki/Web3AIVibeCodingStarterKit.git
cd Web3AIVibeCodingStarterKit
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. 環境変数の設定

```bash
cd pkgs/contract
cp .env.example .env
```

`.env`ファイルに以下の値を設定：

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

### 4. スマートコントラクトの動作確認

```bash
cd pkgs/contract

# コンパイル
pnpm build

# テスト実行
pnpm test

# ローカルネットワークでのデプロイ
pnpm deploy:local

# Sepoliaテストネットへのデプロイ
pnpm deploy:full --network sepolia
```

## 動かすためのコマンド一覧

### スマートコントラクト関連

```bash
cd pkgs/contract

# 開発用コマンド
pnpm build                    # コンパイル
pnpm test                     # テスト実行
pnpm test:coverage           # カバレッジ付きテスト

# デプロイコマンド
pnpm deploy:nft --network sepolia           # NFTコントラクトのみデプロイ
pnpm deploy:marketplace --network sepolia   # マーケットプレイスのみデプロイ
pnpm deploy:full --network sepolia         # 全コントラクトデプロイ

# タスクコマンド（例）
# NFTをミント
pnpm nft:mint --to 0x... --token-uri "https://..." --royalty-recipient 0x... --network sepolia

# NFT承認（出品前に必要）
pnpm nft:approve --token-id 1 --network sepolia

# NFTを出品
pnpm marketplace:list --token-id 1 --price 1.0 --network sepolia

# NFTを購入
pnpm marketplace:buy --listing-id 1 --price 1.0 --network sepolia
```

### フロントエンド関連（予定）

```bash
cd pkgs/frontend

# 開発サーバー起動
pnpm dev

# プロダクションビルド
pnpm build

# プロダクションサーバー起動
pnpm start
```

## 使用している技術スタック

### スマートコントラクト

| ライブラリ・フレームワーク | 概要 | バージョン |
|-------------------------|------|----------|
| Solidity | スマートコントラクト言語 | ^0.8.30 |
| Hardhat | 開発・テスト・デプロイフレームワーク | ^2.22.15 |
| OpenZeppelin | セキュアなコントラクトライブラリ | ^5.0.2 |
| TypeScript | 型安全な開発言語 | ^5.4.5 |
| Viem | 軽量なEthereumライブラリ | ^2.21.45 |
| Ethers.js | Ethereumとの相互作用ライブラリ | ^6.13.4 |

### 開発ツール

| ツール | 概要 | バージョン |
|--------|------|----------|
| pnpm | 高速パッケージマネージャー | ^9.0.0 |
| Biome | コードフォーマッター・リンター | ^1.9.4 |
| Alchemy | Ethereumノードプロバイダー | - |
| Etherscan | コントラクト検証サービス | - |

### フロントエンド（予定）

| ライブラリ・フレームワーク | 概要 | バージョン |
|-------------------------|------|----------|
| Next.js | Reactベースのフルスタックフレームワーク | 最新版 |
| TailwindCSS | ユーティリティファーストCSSフレームワーク | 最新版 |
| Shadcn UI | モダンなUIコンポーネントライブラリ | 最新版 |
| Rainbow Kit | Web3ウォレット接続ライブラリ | 最新版 |

## NFTマーケットプレイスの開発を依頼したときのプロンプト

MCPは有効化しておくこと！

```markdown
あなたは超優秀なWeb3エンジニアです。

@workspace /docs/prompt.md にはNFTマーケットプレイスの開発要件をまとめてあります。

ファイルの内容を読み込み、要件を満たす最適なプロダクトを開発してください。

instructionsファイルの内容も必ず読み込んで、指示された条件を守りながら開発してください。

必要に応じてMCPを利用し、最新のドキュメントも参照するようにしてください。
よろしくお願いします。

use context7
use deepwiki
```

## AI Vibe Codingの流れ

1. 開発したいアプリのコンセプトを考える
2. ユーザー側のストーリーを考える(ペルソナ)
3. アプリの設計(必要な画面や機能)を考える
4. カスタムインストラクションファイルを作成する
5. プロンプトを作成する
6. まず一発目大枠をAIに実装させる
7. 自分の手でも試しながらAIと対話して微調整していく
8. テストしてシナリオ通りに動けば完成！