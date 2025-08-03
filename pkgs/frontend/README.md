# NFT Marketplace Frontend

モダンで魅力的なNFTマーケットプレイスのフロントエンドアプリケーションです。

## 技術スタック

- **Next.js 14** - App Routerを使用したモダンなReactフレームワーク
- **TypeScript** - 型安全性を持ったJavaScript
- **Tailwind CSS + Shadcn/ui** - ユーティリティファーストなCSSフレームワークとコンポーネントライブラリ
- **Privy** - Web3認証とウォレット管理
- **Biconomy** - アカウント抽象化によるガスレス取引
- **Viem** - モダンなEthereumライブラリ
- **React Hook Form + Zod** - フォーム管理とバリデーション

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.example`ファイルを`.env.local`にコピーし、必要な値を設定します：

```bash
cp .env.example .env.local
```

必要な環境変数：

- `NEXT_PUBLIC_APP_ID` - Privy App ID
- `NEXT_PUBLIC_BICONOMY_BUNDLER_API_KEY` - BiconomyのBundler API Key
- `NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY` - BiconomyのPaymaster API Key

### 3. Privy App IDの設定

[Privy Console](https://console.privy.io)でアプリケーションを作成し、App IDを取得して設定します。

### 4. Biconomy API キーの設定

[Biconomy Dashboard](https://dashboard.biconomy.io)でアカウントを作成し、以下のAPI Keyを取得してください：

1. **Bundler API Key**: Sepolia用のBundler API
2. **Paymaster API Key**: Sepolia用のPaymaster API

これらのAPIキーを`.env.local`ファイルに設定することで、ガスレス取引（Account Abstraction）が利用可能になります。

## 開発

### 開発サーバーの起動

```bash
pnpm dev
```

アプリケーションは http://localhost:3000 で起動します。

### ビルド

```bash
pnpm build
```

### 本番サーバーの起動

```bash
pnpm start
```

## プロジェクト構造

```
pkgs/frontend/
├── app/                    # Next.js App Router
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # ホームページ
├── components/             # Reactコンポーネント
│   ├── ui/                # shadcn/uiコンポーネント
│   ├── providers.tsx      # コンテキストプロバイダー
│   └── nft-card.tsx       # NFTカードコンポーネント
├── lib/                   # ユーティリティ関数
│   └── utils.ts           # 共通ユーティリティ
├── public/                # 静的アセット
├── next.config.mjs        # Next.js設定
├── tailwind.config.js     # Tailwind CSS設定
├── tsconfig.json          # TypeScript設定
└── package.json           # 依存関係とスクリプト
```

## 主要機能

### 実装済み

- ✅ 基本的なプロジェクト構造
- ✅ Next.js 14 + TypeScript設定
- ✅ Tailwind CSS + Shadcn/ui統合
- ✅ Privy認証プロバイダー（App ID設定時のみ有効）
- ✅ レスポンシブなヒーローセクション
- ✅ モダンなデザインシステム

### 実装予定

- 🔄 NFT一覧表示
- 🔄 NFT詳細ページ
- 🔄 コレクションページ
- 🔄 マイページ
- 🔄 ウォレット接続
- 🔄 スマートコントラクトとの統合
- 🔄 NFT作成・販売機能
- 🔄 検索・フィルタリング機能

## 設定ファイル

### Tailwind CSS
カスタムカラーパレットとアニメーションが設定されています：
- NFT専用カラー（primary: #8B5CF6, secondary: #06B6D4）
- カスタムアニメーション（fade-in, scale-up等）
- レスポンシブブレークポイント

### TypeScript
パスエイリアスが設定されています：
- `@/*` → プロジェクトルート
- `@/components/*` → components/
- `@/lib/*` → lib/

## トラブルシューティング

### Privy App IDエラー
環境変数`NEXT_PUBLIC_APP_ID`が設定されていない場合、Privyプロバイダーは無効になり、基本的なUIのみが表示されます。

### ビルドエラー
Next.js設定で環境変数の警告が表示される場合がありますが、実際の実行には影響しません。

## 貢献

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/新機能`)
3. 変更をコミット (`git commit -am '新機能を追加'`)
4. ブランチにプッシュ (`git push origin feature/新機能`)
5. プルリクエストを作成

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
