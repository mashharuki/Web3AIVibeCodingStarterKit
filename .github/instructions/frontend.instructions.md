---
applyTo: './pkgs/frontend/**'
---

あなたは超優秀なフルスタックWeb3エンジニアです。

このワークスペースでフロントエンドアプリケーションを構築するためのルールを設定しました。

必ず以下のルールに従ってフロントエンドアプリケーションを開発してください。

# 使用する技術スタック(一般的なフロントエンドアプリケーション開発の技術スタック)

- TypeScript
- pnpm
- Next.js (App Router / `app/` ディレクトリ構成)
- PWA
- Tailwind CSS
- Shadcn / UI

# 使用する技術スタック(Web3に関連するもの)

- viem
- ethers
- privy
- Account Abstraction
- Biconomy

# shadcn / UIの設定ファイル

`components.json` は以下の設定を厳守してください：

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/app/components",
    "utils": "@/app/lib/utils",
    "ui": "@/app/components/ui",
    "lib": "@/app/lib",
    "hooks": "@/app/hooks"
  },
  "iconLibrary": "lucide"
}
```

# ディレクトリ構成ルール

以下の構成を必ず守ってください：

```bash
pkgs/frontend/
├── app/                # Next.jsのApp Routerディレクトリ
|    └── api/           # APIの実装を格納するディレクトリ
├── components/         # UIコンポーネントディレクトリ
├── hooks/              # カスタムフックディレクトリ
├── lib/                # ユーティリティ関数やその他のライブラリ用の関数群を格納するディレクトリ
├── styles/             # グローバルスタイルやテーマを格納するディレクトリ
├── public/             # 静的ファイル群を格納するディレクトリ
├── components.json     # shadcn / UIの設定ファイル
├── package.json        # パッケージ設定ファイル
├── tsconfig.json       # TypeScript設定ファイル
├── tailwind.config.js  # Tailwind CSS設定ファイル
├── postcss.config.js   # PostCSS設定ファイル
├── next.config.js      # Next.js設定ファイル
├── next-env.d.ts       # Next.jsの型定義ファイル
├── .env.local          # 環境変数設定ファイル
├── .env.example        # 環境変数のサンプルファイル
└── .gitignore          # Gitの無視設定ファイル
```

# 実装について

- lib/配下には共通的なユーティリティ関数（fetchラッパー、フォーマッター、定数定義など）を格納してください。
- hooks/配下には再利用可能なカスタムフックを設計単位で整理してください。命名は`use`から始めること。
- public/ には以下のような静的ファイルを配置します：
  - OG画像
  - サイトのファビコン
  - マニフェストファイル（PWA用）

# Biconomy と Privyインテグレーション例

以下のGitHubリポジトリを参考にしてください。

GitHub mashharuki/serverless_zk_nft_app
https://github.com/mashharuki/serverless_zk_nft_app/tree/main/pkgs/frontend

# Next.js と Privyインテグレーション例

以下のリポジトリを参考にしてください。
https://github.com/privy-io/create-next-app

# Tailwind のカスタマイズガイドへのリンク

https://tailwindcss.com/docs/theme
https://ui.shadcn.com/docs/theming