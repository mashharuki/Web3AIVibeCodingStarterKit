# AMM DEX Frontend

AMM（自動マーケットメーカー）型DEXのフロントエンドアプリケーションです。

## 概要

Next.js 14 App Routerを使用したモダンなWeb3フロントエンドアプリケーションです。

### 主要機能

- トークンスワップインターフェース
- 流動性プール管理
- ウォレット接続（MetaMask対応）
- リアルタイム価格表示
- レスポンシブデザイン

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env.local
# .env.localファイルを編集して必要な値を設定
```

### 3. 開発サーバー起動

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## 開発

### テスト実行

```bash
# ユニットテスト
pnpm test

# テストUI
pnpm test:ui

# カバレッジ付きテスト
pnpm test:coverage

# E2Eテスト
pnpm test:e2e
```

### ビルド

```bash
# 本番ビルド
pnpm build

# 本番サーバー起動
pnpm start
```

### コード品質

```bash
# ESLint実行
pnpm lint

# ESLint自動修正
pnpm lint:fix

# TypeScript型チェック
pnpm type-check
```

## 使用技術

| ライブラリ  | 概要                        | バージョン |
| ----------- | --------------------------- | ---------- |
| Next.js     | Reactフレームワーク         | 14.0.4     |
| React       | UIライブラリ                | ^18.2.0    |
| TypeScript  | 型安全な開発                | ^5.0.0     |
| TailwindCSS | CSSフレームワーク           | ^3.3.0     |
| wagmi       | React Hooks for Ethereum    | ^1.4.0     |
| viem        | TypeScript Ethereum library | ^1.19.0    |
| RainbowKit  | ウォレット接続UI            | ^1.3.0     |
| Zustand     | 状態管理                    | ^4.4.0     |
| Vitest      | テストフレームワーク        | ^1.0.0     |
| Playwright  | E2Eテスト                   | ^1.40.0    |

## ディレクトリ構造

```
src/
├── app/                # Next.js App Router
│   ├── layout.tsx      # ルートレイアウト
│   ├── page.tsx        # ホームページ
│   └── globals.css     # グローバルスタイル
├── components/         # Reactコンポーネント
│   ├── ui/            # 基本UIコンポーネント
│   └── layout/        # レイアウトコンポーネント
├── hooks/             # カスタムフック
├── lib/               # ライブラリとユーティリティ
├── types/             # TypeScript型定義
└── test/              # テスト設定
```

## 環境変数

必要な環境変数は `.env.example` を参照してください。

### 重要な設定

- `NEXT_PUBLIC_CHAIN_ID`: Ethereum Sepolia (11155111)
- `NEXT_PUBLIC_RPC_URL`: AlchemyのRPC URL
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect Project ID
