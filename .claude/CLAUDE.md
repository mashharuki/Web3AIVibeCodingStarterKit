# Web3 AI Vibe Coding Starter Kit - Claude Code Configuration

このプロジェクトはWeb3アプリケーション開発のためのスターターキットです。NFTマーケットプレイスやAMM DEXなどのWeb3アプリを段階的に開発することができます。

## プロジェクト構造

```
Web3AIVibeCodingStarterKit/
├── pkgs/
│   ├── contract/     # スマートコントラクト（Solidity）
│   └── frontend/     # フロントエンド（React/Next.js）
├── docs/
│   ├── design/       # 設計書
│   ├── prompt/       # プロンプトテンプレート
│   └── slide/        # プレゼンテーション資料
└── .vscode/
    └── mcp.json      # MCP設定
```

## 開発フロー

1. **要件定義**: Kiroを使用して要件定義書と設計書を作成
2. **タスクリスト作成**: 実装タスクを細分化
3. **段階的実装**:
   - プロジェクトセットアップ
   - スマートコントラクト実装・テスト
   - フロントエンド実装
   - デザイン調整
   - E2Eテスト

## 技術スタック

### Smart Contract
- **Framework**: Hardhat または Foundry
- **Language**: Solidity
- **Standards**: ERC-721, ERC-1155
- **Network**: Ethereum Sepolia（開発用）

### Frontend
- **Framework**: React/Next.js（推奨）
- **Web3 Library**: ethers.js または viem
- **Wallet Integration**: MetaMask, Email Auth
- **Storage**: IPFS（メタデータ）

## MCPサーバー設定

以下のMCPサーバーが利用可能です：

- **context7**: 最新コード・ドキュメント参照
- **deepwiki**: 詳細なWiki機能
- **sequential-thinking**: 順序立てた思考プロセス

## コーディング規則

### スマートコントラクト
- セキュリティベストプラクティスに従う
- OpenZeppelinライブラリを活用
- 適切なアクセス制御とガス最適化
- 包括的なテストカバレッジ

### フロントエンド
- TypeScriptを使用
- レスポンシブデザイン対応
- Web3ユーザビリティを考慮
- エラーハンドリングの徹底

## 開発時の注意点

- **段階的開発**: 一度に全てを実装せず、機能ごとに分割
- **テスト駆動**: 各段階でテストを実行して品質を確保
- **ガス効率**: トランザクションコストを常に意識
- **セキュリティ**: スマートコントラクトの脆弱性に注意

## テスト・ビルドコマンド

```bash
# スマートコントラクト
cd pkgs/contract
npm test
npm run compile

# フロントエンド
cd pkgs/frontend  
npm test
npm run build
npm run lint
npm run typecheck
```

## デプロイメント

### Sepolia Testnet設定
- Chain ID: 11155111
- RPC URL: https://eth-sepolia.g.alchemy.com/v2/YOUR-PROJECT-ID
- Block Explorer: https://sepolia.etherscan.io/

## 参考リソース

- **OpenSea**: UI/UX設計の参考
- **Uniswap**: AMM実装の参考
- **UNCHAIN**: 学習コンテンツとベストプラクティス

## AI開発推奨事項

- **複数モデル活用**: Gemini（要件定義）、Claude（実装）
- **MCP活用**: プロジェクト把握と最新情報取得
- **段階的アプローチ**: 小さな単位での反復開発
- **品質重視**: 各段階でのテスト・検証を怠らない