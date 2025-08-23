# AMM DEX フロントエンド

UniswapライクなAMM DEXのフロントエンドアプリケーションです。

## 概要

このアプリケーションは以下の機能を提供します：

- **ウォレット接続**: MetaMaskなどのWeb3ウォレット対応
- **トークンスワップ**: ERC-20トークン間の交換
- **流動性提供**: 流動性プールへの資金提供
- **ポートフォリオ管理**: 資産残高とポジション表示
- **取引履歴**: 過去の取引記録の確認

## 技術スタック

- **Next.js**: Reactフレームワーク（App Router）
- **TypeScript**: 型安全な開発環境
- **TailwindCSS**: ユーティリティファーストCSS
- **Shadcn/UI**: モダンUIコンポーネント
- **wagmi**: React Web3フック
- **viem**: 軽量Web3ライブラリ
- **RainbowKit**: ウォレット接続UI

## セットアップ

```bash
# 依存関係のインストール
pnpm install

# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# 本番サーバー起動
pnpm start
```

## 環境変数

`.env.local`ファイルを作成し、以下の変数を設定してください：

```
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

## ディレクトリ構造

```
app/               # Next.js App Router
components/        # Reactコンポーネント
hooks/             # カスタムフック
lib/               # ライブラリ関数
utils/             # ユーティリティ関数
styles/            # スタイルファイル
public/            # 静的ファイル
```