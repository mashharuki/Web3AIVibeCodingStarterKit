# AMM DEX モノレポプロジェクト

UniswapライクなAMM（Automated Market Maker）DEXのモノレポプロジェクトです。Ethereum Sepoliaテストネット上で動作し、Web3初心者から上級者まで利用できるユーザーフレンドリーなインターフェースを提供します。

## プロジェクト構成

```
├── pkgs/
│   ├── contract/          # スマートコントラクト開発
│   └── frontend/          # フロントエンドアプリケーション
├── docs/                  # ドキュメント
├── .kiro/                 # Kiro設定とスペック
└── README.md
```

## 技術スタック

| カテゴリ | 技術 | バージョン | 概要 |
|---------|------|-----------|------|
| **パッケージマネージャー** | pnpm | ^8.15.1 | 高速で効率的なパッケージ管理 |
| **フォーマッター・リンター** | Biome | ^1.8.3 | 高速なフォーマッターとリンター |
| **言語** | TypeScript | ^5.3.3 | 型安全なJavaScript開発 |

### スマートコントラクト (pkgs/contract)

| 技術 | バージョン | 概要 |
|------|-----------|------|
| Hardhat | ^2.19.4 | 開発・テスト・デプロイフレームワーク |
| Solidity | 0.8.30 | スマートコントラクト実装言語 |
| OpenZeppelin | ^5.0.1 | セキュアなコントラクトライブラリ |
| viem | ^1.21.4 | 軽量Web3ライブラリ |
| solhint | ^4.1.1 | Solidityコードリンター |

### フロントエンド (pkgs/frontend)

| 技術 | バージョン | 概要 |
|------|-----------|------|
| Next.js | ^14.0.4 | Reactフレームワーク |
| React | ^18.2.0 | UIライブラリ |
| wagmi | ^1.4.13 | React Web3フック |
| RainbowKit | ^1.3.6 | ウォレット接続UI |
| TailwindCSS | ^3.4.0 | ユーティリティファーストCSS |
| viem | ^1.21.4 | 軽量Web3ライブラリ |

## セットアップ手順

### 前提条件

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 1. 依存関係のインストール

```bash
# ルートディレクトリで実行
pnpm install
```

### 2. 環境変数の設定

```bash
# コントラクト用環境変数
cp pkgs/contract/.env.example pkgs/contract/.env.local

# フロントエンド用環境変数  
cp pkgs/frontend/.env.example pkgs/frontend/.env.local
```

必要な環境変数:
- `PRIVATE_KEY`: デプロイ用秘密鍵
- `ALCHEMY_API_KEY`: Alchemy RPC API キー
- `ETHERSCAN_API_KEY`: Etherscan API キー（検証用）
- `COINMARKETCAP_API_KEY`: ガスレポート用API キー

### 3. スマートコントラクトのコンパイル

```bash
cd pkgs/contract
pnpm build
```

### 4. フロントエンドの起動

```bash
cd pkgs/frontend  
pnpm dev
```

## 主要コマンド

### ルートレベル

```bash
# 全パッケージのビルド
pnpm build

# 全パッケージの開発サーバー起動
pnpm dev

# 全パッケージのテスト実行
pnpm test

# コードフォーマット
pnpm format

# コード品質チェック
pnpm check

# 全パッケージのクリーンアップ
pnpm clean
```

### スマートコントラクト (pkgs/contract)

```bash
# コンパイル
pnpm build

# テスト実行
pnpm test

# Sepoliaにデプロイ
pnpm deploy

# コントラクト検証
pnpm verify

# Solidityリント
pnpm lint
```

### フロントエンド (pkgs/frontend)

```bash
# 開発サーバー起動
pnpm dev

# 本番ビルド
pnpm build

# 本番サーバー起動
pnpm start

# ESLintチェック
pnpm lint

# 型チェック
pnpm type-check
```

## 主要機能

### AMM DEX機能
- **トークンスワップ**: ERC-20トークン間の自動取引
- **流動性提供**: 流動性プールへの資金提供とLP トークン発行
- **流動性管理**: プール情報の表示と管理
- **価格表示**: リアルタイム価格情報とチャート
- **取引履歴**: ユーザーの取引履歴管理
- **Faucet機能**: 検証用トークンの配布

### 対象ネットワーク
- **Ethereum Sepolia** (チェーンID: 11155111)
- RPC URL: `https://eth-sepolia.g.alchemy.com/v2/YOUR-PROJECT-ID`
- ブロックエクスプローラー: `https://sepolia.etherscan.io/`

## 開発ワークフロー

1. **要件フェーズ**: `.kiro/specs/`で仕様書作成
2. **コントラクトフェーズ**: `pkgs/contract/`で実装とテスト
3. **フロントエンドフェーズ**: `pkgs/frontend/`でUI/UX構築
4. **統合フェーズ**: コントラクトとフロントエンドの接続
5. **テストフェーズ**: エンドツーエンド検証

## AI VibeCoding開発手順

1. **要件定義**: Kiroを使用して要件定義書と設計書を作成
2. **タスクリスト**: 要件定義書を元にタスクリストを作成
3. **段階的実装**: 
   - プロジェクト全体のセットアップ ✅
   - スマートコントラクトの実装
   - フロントエンドの実装
   - 統合テスト

## 参考情報

```bash
.claude    # Claude Code設定例
.gemini    # Gemini CLI設定例  
.github    # GitHub Copilot設定例
```

## ライセンス

MIT License