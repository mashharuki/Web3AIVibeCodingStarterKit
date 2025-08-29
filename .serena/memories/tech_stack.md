# 技術スタック

## 全体アーキテクチャ

- **パッケージマネージャー**: pnpm（モノレポ管理）
- **ランタイム**: Node.js 18.0.0以上
- **フォーマッター**: Prettier（Solidity対応設定済み）
- **プロジェクト構造**: モノレポ（pnpm workspace）

## スマートコントラクト

- **言語**: Solidity ^0.8.20
- **開発フレームワーク**: Hardhat
- **ライブラリ**:
  - OpenZeppelin v5.0.0（セキュアなコントラクトライブラリ）
  - TypeChain（TypeScript型生成）
- **テストフレームワーク**: Mocha/Chai
- **リンター**: Solhint
- **セキュリティ**: ReentrancyGuard, SafeTransfer実装

## フロントエンド

- **フレームワーク**: Next.js 14（App Router使用）
- **言語**: TypeScript（厳密な型チェック）
- **スタイリング**:
  - TailwindCSS（ユーティリティファーストCSS）
  - Shadcn/UI（UIコンポーネント）
- **Web3ライブラリ**:
  - viem（Ethereum操作）
  - wagmi（React hooks for Ethereum）
  - RainbowKit（ウォレット接続UI）
- **状態管理**: useState（軽量アプローチ）
- **テストフレームワーク**:
  - Vitest（ユニットテスト）
  - Playwright（E2Eテスト）
- **リンター**: ESLint + Next.js設定

## 開発ツール・インフラ

- **CI/CD**: GitHub Actions
- **バージョン管理**: Git
- **IDE設定**: VSCode設定ファイル完備
- **AI開発支援**:
  - Kiro IDE統合
  - Gemini（要件定義とレビュー用）
  - Claude（実装用）
  - MCP（Model Context Protocol）統合

## コントラクトアーキテクチャ

実装済みのコントラクト構成：

- **AMMFactory**: ペア作成・管理（CREATE2パターン）
- **AMMPair**: 流動性プール実装（ERC20ベースLPトークン）
- **AMMRouter**: ユーザー向けインターフェース（スワップ・流動性管理）
- **AMMLibrary**: 価格計算ユーティリティ
- **WETH9**: Wrapped Ether実装（テスト用）

## セキュリティ対策

- **リエントランシー攻撃対策**: ReentrancyGuard使用
- **安全な転送**: SafeTransfer実装
- **入力検証**: 全関数で適切なrequire文
- **ガス最適化**: 効率的なストレージパターン
- **アクセス制御**: 適切な権限管理
