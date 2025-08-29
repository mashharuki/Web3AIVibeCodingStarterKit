# GEMINI.md - Web3 AI VibeCoding Starter Kit

このファイルは、AIアシスタント（特にGemini）がこのプロジェクトで効率的に開発を支援するためのガイドラインです。

## 1. プロジェクト概要

このプロジェクトはSerena MCPによってアクティベートされ、AIによる開発支援が最適化されています。

**Web3 AI VibeCoding Starter Kit**は、AI支援開発ワークフローを用いて、高品質なWeb3アプリケーション（NFTマーケットプレイス、AMM DEXなど）を効率的に構築するためのスターターキットです。

開発は**段階的なAI駆動開発**を基本哲学とし、スマートコントラクトとフロントエンドのフェーズを明確に分離します。各段階で徹底的なテストと検証を行うことを最優先とします。

## 2. 技術スタック

開発には以下の技術スタックを使用します。

| カテゴリ                 | 技術/ツール                                                | 備考                                 |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------ |
| **全体**                 | pnpm, Node.js, Biome, TypeScript                           | パッケージ管理、実行環境、コード整形 |
| **スマートコントラクト** | Solidity, Hardhat, OpenZeppelin, viem, ethers              | 開発、テスト、ライブラリ             |
| **フロントエンド**       | Next.js (Page Router), React, Tailwind CSS, Shadcn/UI, PWA | フレームワーク、UI                   |
| **Web3 (フロント)**      | wagmi, RainbowKit, viem, ethers                            | ウォレット接続、コントラクト操作     |
| **インフラ**             | Alchemy, Vercel, IPFS                                      | RPC、ホスティング、分散ストレージ    |
| **CI/CD**                | GitHub Actions                                             | 自動テスト、デプロイ                 |

## 3. プロジェクト構造

このプロジェクトは **pnpm** を利用した **monorepo** 構成です。

- `pkgs/contract/`: スマートコントラクト関連のコードを格納します。
- `pkgs/frontend/`: フロントエンドアプリケーションのコードを格納します。
- `docs/`: 設計書やプロンプトなどのドキュメントを格納します。
- `.kiro/`, `.github/`: AIアシスタントの挙動を制御するための設定ファイル群です。

## 4. 開発ワークフロー

開発は以下の順序で進めます。AIアシスタントとして、各ステップを確実に実行してください。

1.  **要件定義**: `docs/design` に基づいて機能要件を理解します。
2.  **スマートコントラクト開発**: `pkgs/contract` 内で、Solidityによる実装、テスト、デプロイスクリプトの作成を行います。
3.  **フロントエンド開発**: `pkgs/frontend` 内で、Next.jsを使用してUIとロジックを実装します。
4.  **統合**: スマートコントラクトとフロントエンドを接続し、E2Eテストを実施します。

## 5. コーディング規約とルール

### 一般的なルール

- **言語**: コメントやドキュメントは日本語で記述します。
- **型定義**: 関数の引数・戻り値には必ず型を明記します。
- **命名規則**:
  - 定数: `UPPER_SNAKE_CASE`
  - メソッド: 動詞から始める
  - ファイル: `kebab-case`
  - コンポーネント: `PascalCase`
- **コードスタイル**: **Biome** を使用してフォーマットします。設定は `biome.json` を参照してください。
- **コミット規約**: Conventional Commits に従います。
  - 例: `feat(frontend): add user profile page`

### スマートコントラクト (`pkgs/contract`)

- **フレームワーク**: Hardhatを使用します。設定は `hardhat.config.ts` を参照してください。
- **セキュリティ**: OpenZeppelinライブラリを積極的に利用し、[Smart Contract Best Practices](https://github.com/ConsenSysDiligence/smart-contract-best-practices) に従います。
- **テスト**: `test` ディレクトリに網羅的なユニットテストを作成します。
- **デプロイ**: `ignition` ディレクトリにデプロイスクリプトを作成し、`helpers/contractsJsonHelper.ts` を使用してアドレスを管理します。

### フロントエンド (`pkgs/frontend`)

- **フレームワーク**: Next.js (Page Router) を使用します。
- **UI**: **Tailwind CSS** と **Shadcn/UI** を使用します。`components.json` の設定に従ってください。
- **ディレクトリ構成**: `frontend.instructions.md` に記載された構成を厳守してください。
- **Web3接続**: `wagmi` と `RainbowKit` を中心に実装します。

## 6. AIアシスタントへの指示

- **あなたの役割**: あなたは超優秀なフルスタックWeb3エンジニアとして、このプロジェクトに貢献します。
- **指示の優先順位**: この `GEMINI.md` ファイルの指示が最も優先されます。次に `.github/instructions/` や `.kiro/steering/` 内のファイルを参考にしてください。
- **自己完結**: 各タスクは、関連ファイルを読み込み、自己完結的に解決策を提示・実装してください。
- **確認**: 大きな変更や不明瞭な点がある場合は、実装前にユーザーに確認を取ってください。
