# 技術スタック

## 開発環境
- **Node.js**: >=18.0.0
- **パッケージマネージャー**: pnpm >=8.0.0
- **モノレポ構成**: pnpm workspaces

## スマートコントラクト
- **Solidity**: ^0.8.30
- **開発フレームワーク**: Hardhat
- **ライブラリ**: OpenZeppelin Contracts
- **テスト**: Mocha + Chai
- **型生成**: TypeChain
- **セキュリティ**: ReentrancyGuard, Pausable
- **デプロイメント**: Hardhat Ignition
- **ネットワーク**: Ethereum (Sepolia testnet, Mainnet)
- **RPC**: Alchemy

## コード品質・フォーマット
- **リンター・フォーマッター**: Biome
- **Solidityリンター**: solhint
- **Solidityフォーマッター**: prettier + prettier-plugin-solidity

## 開発ツール
- **TypeScript**: 型安全な開発
- **dotenv**: 環境変数管理
- **hardhat-gas-reporter**: ガス使用量レポート
- **etherscan**: コントラクト検証

## MCP統合
- **Context7**: ドキュメント参照
- **DeepWiki**: GitHubリポジトリ情報
- **Serena**: プロジェクト分析・開発支援