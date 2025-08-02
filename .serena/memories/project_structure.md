# プロジェクト構造

## ルートディレクトリ
```
.
├── pkgs/                   # パッケージディレクトリ（モノレポ）
├── docs/                   # ドキュメント
├── .github/                # GitHub設定・CI・instructions
├── .vscode/                # VSCode設定（MCP設定含む）
├── .serena/                # Serena MCP設定
├── package.json            # ルートパッケージ設定
├── pnpm-workspace.yaml     # pnpm workspaces設定
├── biome.json              # Biome設定
├── README.md
├── LICENSE
└── .gitignore
```

## パッケージ構成
- `pkgs/contract/`: スマートコントラクトパッケージ

### contract/ ディレクトリ構造
```
pkgs/contract/
├── contracts/              # Solidityファイル
│   ├── NFTContract.sol     # ERC-721 NFTコントラクト
│   └── NFTMarketplace.sol  # マーケットプレイスコントラクト
├── test/                   # テストファイル (*.test.ts)
├── ignition/               # デプロイメントスクリプト
├── tasks/                  # Hardhatタスク
├── helpers/                # ユーティリティ関数
├── outputs/                # デプロイメント出力
├── artifacts/              # コンパイル済みコントラクト
├── typechain-types/        # TypeScript型定義
├── hardhat.config.ts       # Hardhat設定
├── package.json
└── tsconfig.json
```

## 主要ファイル
- **NFTContract.sol**: ERC-721準拠、ロイヤリティ対応NFTコントラクト
- **NFTMarketplace.sol**: 固定価格販売・オファー機能を持つマーケットプレイス
- **hardhat.config.ts**: Hardhat設定（ネットワーク、コンパイラ等）
- **biome.json**: リンター・フォーマッター設定