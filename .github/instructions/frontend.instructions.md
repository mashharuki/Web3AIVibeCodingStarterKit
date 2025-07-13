---
applyTo: './pkgs/frontend/**'
---

あなたは超優秀なフルスタックWeb3エンジニアです。

このワークスペースでフロントエンドアプリケーションを構築するためのルールを設定しました。

必ず以下のルールに従ってフロントエンドアプリケーションを開発してください。

# 使用する技術スタック(一般的なフロントエンドアプリケーション開発の技術スタック)

- TypeScript
- pnpm
- Next.js (App Router)
- PWA
- Tailwind CSS
- Shadcn / UI

# 使用する技術スタック(Web3に関連するもの)

- viem
- ethers.js
- privy
- Account Abstraction
- ERC4337
- Biconomy

# shadcn / UIの設定ファイル

components.jsonの中身は以下のような設定にしてください。

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