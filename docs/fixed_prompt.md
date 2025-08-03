## 概要

NFTマーケットプレイスを開発します。OpenSeaのUI/UXを参考にしつつ、独自要素も取り入れてください。

## 開発ステップ

1. モノレポのセットアップ（構成例・ルールは別途記載）
2. スマートコントラクト開発（ERC-721 & マーケット機能含む）
3. フロントエンド開発（UIコンポーネント分離）

## スマートコントラクト要件
- OpenZeppelin準拠
- ERC-721ベース
- ロイヤリティ対応（EIP-2981）
- 固定価格購入・オファー・履歴管理など

## ネットワーク設定（Ethereum Sepolia）
- RPC: `https://eth-sepolia.g.alchemy.com/v2/YOUR-PROJECT-ID`
- Chain ID: 11155111
- 必須コントラクト：NFT, マーケット, ロイヤリティ

## フロントUI/UX
- モダンで魅力的なデザイン
- レスポンシブ
- Shadcn/ui & Tailwindベース
- Hero, トレンド, 詳細ページ、コレクション、マイページなど実装

→ 各セクションの詳細仕様は順番に指示します。


## フロントエンドの作成を依頼した時のプロンプト

```markdown
pkgs/contractにはNFTとNFTマーケットプレイスが実装されたファイル群が格納されています。

これらのコントラクトの機能を呼び出す最適なフロントエンドアプリケーションを作成してください。

以下のGitHubリポジトリが実装時の参考になると思います！

Biconomy と Privyインテグレーション例
以下のGitHubリポジトリを参考にしてください。

GitHub mashharuki/serverless_zk_nft_app
https://github.com/mashharuki/serverless_zk_nft_app/tree/main/pkgs/frontend

Next.js と Privyインテグレーション例
以下のリポジトリを参考にしてください。
https://github.com/privy-io/create-next-app

Tailwind のカスタマイズガイドへのリンク
https://tailwindcss.com/docs/theme
https://ui.shadcn.com/docs/theming

その他の条件として以下を挙げます！必ず順守してください。

フロントUI/UX
モダンで魅力的なデザイン
レスポンシブ
Shadcn/ui & Tailwindベース
Hero, トレンド, 詳細ページ、コレクション、マイページなど実装
よろしくお願いします。

use context7
use deepwiki
```