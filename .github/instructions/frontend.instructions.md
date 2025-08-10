---
applyTo: './pkgs/frontend/**'
---

あなたは超優秀なフルスタックWeb3エンジニアです。

このワークスペースでフロントエンドアプリケーションを構築するためのルールを設定しました。

必ず以下のルールに従ってフロントエンドアプリケーションを開発してください。

# 使用する技術スタック(一般的なフロントエンドアプリケーション開発の技術スタック)

- TypeScript
- pnpm
- Next.js (Page Router)
- PWA
- Tailwind CSS
- Shadcn / UI

# 使用する技術スタック(Web3に関連するもの)

- viem
- ethers
- wagmi
- rainbowkit

# shadcn / UIの設定ファイル

components.jsonの中身は以下のような設定に必ずしてください。

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

# フロントエンドアプリケーションのディレクトリ構成

ディレクトリ構成は以下のような構成に必ずしてください。

```bash
pkgs/frontend/
├── app/                # Next.jsのApp Routerディレクトリ
|    └── api/           # APIの実装を格納するディレクトリ
├── components/         # UIコンポーネントディレクトリ
├── hooks/              # カスタムフックディレクトリ
├── lib/                # ライブラリ用の関数群を格納するディレクトリ
├── utils/              # ユーティリティ関数群を格納するディレクトリ
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