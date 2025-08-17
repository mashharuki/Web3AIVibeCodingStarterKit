# AMM DEX Frontend

Uniswapライクな自動マーケットメーカー分散型取引所のフロントエンドアプリケーション

## 技術スタック

| ライブラリ/フレームワーク | 概要 | バージョン |
|---|---|---|
| Next.js | Reactフレームワーク（App Router） | ^14.0.4 |
| TypeScript | 型安全なJavaScript | ^5.3.3 |
| Tailwind CSS | ユーティリティファーストCSS | ^3.4.0 |
| Shadcn/UI | モダンUIコンポーネントライブラリ | - |
| wagmi | React Web3フック | ^1.4.13 |
| viem | 軽量Web3ライブラリ | ^1.21.4 |
| RainbowKit | ウォレット接続UI | ^1.3.6 |
| ethers | Ethereumライブラリ | ^6.9.2 |
| next-pwa | PWA対応 | ^5.6.0 |

## セットアップ手順

1. 依存関係のインストール:
```bash
pnpm install
```

2. 環境変数の設定:
```bash
cp .env.example .env.local
```

3. 環境変数を編集:
- `NEXT_PUBLIC_ALCHEMY_API_KEY`: Alchemy APIキー
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect プロジェクトID

## 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# 本番ビルド
pnpm build

# 本番サーバー起動
pnpm start

# 型チェック
pnpm type-check

# リンター実行
pnpm lint

# クリーンアップ
pnpm clean
```

## ディレクトリ構造

```
app/                    # Next.js App Router
├── swap/              # トークンスワップページ
├── pool/              # 流動性プールページ
├── faucet/            # テストトークン取得ページ
├── portfolio/         # ポートフォリオページ
├── history/           # 取引履歴ページ
├── layout.tsx         # ルートレイアウト
├── page.tsx           # ホームページ
└── globals.css        # グローバルスタイル

components/            # Reactコンポーネント
├── ui/               # Shadcn/UI基本コンポーネント
└── ...               # カスタムコンポーネント

lib/                  # ライブラリとユーティリティ
├── utils.ts          # Shadcn/UIユーティリティ
└── ...               # その他のライブラリ

hooks/                # カスタムフック
types/                # TypeScript型定義
utils/                # ユーティリティ関数
```

## 機能概要

このアプリケーションは以下の機能を提供します：

- **トークンスワップ**: ERC-20トークン間の取引
- **流動性提供**: 流動性プールへの資金提供
- **プール管理**: 流動性プールの表示と管理
- **ポートフォリオ**: ユーザーの資産管理
- **取引履歴**: 過去の取引記録
- **Faucet**: 検証用トークンの取得

## PWA機能

このアプリケーションはPWA（Progressive Web App）として動作し、以下の機能を提供します:

- オフライン対応
- ホーム画面への追加
- プッシュ通知（将来実装予定）
- 高速なキャッシュ戦略

## 開発ガイドライン

- TypeScriptの厳密な型チェックを使用
- Shadcn/UIコンポーネントを基本とする
- レスポンシブデザインを必須とする
- Web3機能はwagmi + viemを使用
- 状態管理はReactのuseStateを基本とする