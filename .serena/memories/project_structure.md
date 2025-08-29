# プロジェクト構造詳細

## ルートディレクトリ構成

```
Web3AIVibeCodingStarterKit/
├── .kiro/                    # Kiro IDE設定
│   ├── settings/            # IDE設定
│   ├── specs/               # 機能仕様書
│   │   └── amm-dex/        # AMM DEX仕様
│   └── steering/            # ステアリングルール
├── .github/                 # GitHub設定
│   └── instructions/        # GitHub Copilot指示
├── docs/                    # ドキュメント
│   ├── design/             # 設計ドキュメント
│   └── prompt/             # AIプロンプト
├── pkgs/                   # モノレポパッケージ
│   ├── contract/           # スマートコントラクト
│   └── frontend/           # フロントエンドアプリ
├── .prettierrc             # Prettier設定
├── .prettierignore         # Prettier除外設定
├── .gitignore              # Git除外設定
├── package.json            # ルートパッケージ設定
├── pnpm-workspace.yaml     # pnpmワークスペース設定
├── pnpm-lock.yaml          # 依存関係ロック
├── README.md               # プロジェクト概要
└── LICENSE                 # MITライセンス
```

## スマートコントラクト構造（pkgs/contract/）

```
pkgs/contract/
├── contracts/              # Solidityソースコード
│   ├── core/              # コアコントラクト
│   │   ├── AMMFactory.sol # ペア作成・管理
│   │   ├── AMMPair.sol    # 流動性プール実装
│   │   └── AMMRouter.sol  # ユーザー向けインターフェース
│   ├── interfaces/        # インターフェース定義
│   │   ├── IAMMFactory.sol
│   │   ├── IAMMPair.sol
│   │   ├── IAMMRouter.sol
│   │   └── IWETH.sol
│   ├── libraries/         # ライブラリ
│   │   └── AMMLibrary.sol # 価格計算ユーティリティ
│   └── utils/             # ユーティリティ
│       └── WETH9.sol      # Wrapped Ether実装
├── test/                  # テストファイル
│   ├── unit/              # ユニットテスト
│   │   └── AMMCore.test.ts
│   └── integration/       # 統合テスト
├── scripts/               # スクリプト
│   ├── deploy/            # デプロイスクリプト
│   │   └── 01-deploy-contracts.ts
│   └── verify/            # 検証スクリプト
├── artifacts/             # コンパイル済み（Git除外）
├── cache/                 # キャッシュ（Git除外）
├── typechain-types/       # TypeScript型定義（自動生成）
├── hardhat.config.ts      # Hardhat設定
├── package.json           # パッケージ設定
├── tsconfig.json          # TypeScript設定
├── .solhint.json          # Solhintリンター設定
├── .env.example           # 環境変数テンプレート
└── README.md              # コントラクト説明書
```

## フロントエンド構造（pkgs/frontend/）

```
pkgs/frontend/
├── src/                   # ソースコード
│   ├── app/               # Next.js App Router
│   │   ├── layout.tsx     # ルートレイアウト
│   │   ├── page.tsx       # ホームページ
│   │   └── globals.css    # グローバルスタイル
│   ├── components/        # Reactコンポーネント
│   │   ├── ui/            # 基本UIコンポーネント
│   │   └── layout/        # レイアウトコンポーネント
│   ├── hooks/             # カスタムフック
│   ├── lib/               # ライブラリとユーティリティ
│   ├── types/             # TypeScript型定義
│   └── test/              # テスト設定
├── e2e/                   # E2Eテスト
├── next.config.js         # Next.js設定
├── tailwind.config.js     # Tailwind CSS設定
├── postcss.config.js      # PostCSS設定
├── playwright.config.ts   # Playwright設定
├── vitest.config.ts       # Vitest設定
├── .eslintrc.json         # ESLint設定
├── package.json           # パッケージ設定
├── tsconfig.json          # TypeScript設定
├── .env.example           # 環境変数テンプレート
└── README.md              # フロントエンド説明書
```

## 設定ファイル詳細

### Kiro IDE設定（.kiro/）

- **settings/**: IDE固有の設定
- **specs/**: 機能仕様書（requirements.md, design.md, tasks.md）
- **steering/**: AI開発ガイドライン（product.md, tech.md, structure.md）

### GitHub設定（.github/）

- **instructions/**: GitHub Copilot用カスタム指示
- **copilot-instructions.md**: 全体的なCopilot指示

### ドキュメント（docs/）

- **design/**: 設計ドキュメントとAPI仕様
- **prompt/**: AI開発用プロンプト集

## 実装済みコントラクト詳細

### AMMFactory.sol

- ペア作成機能（CREATE2パターン）
- ペア管理とアドレス取得
- 手数料設定機能
- イベント発行による透明性確保

### AMMPair.sol

- ERC20ベースのLPトークン機能
- mint/burn関数による流動性管理
- swap関数によるトークン交換（x\*y=k）
- 価格累積値計算（オラクル機能）
- リエントランシー攻撃対策

### AMMRouter.sol

- swapExactTokensForTokens関数
- addLiquidity/removeLiquidity関数
- 価格計算とスリッページ保護
- デッドライン機能による時間制限
- ETH/WETH変換サポート

### AMMLibrary.sol

- トークンアドレスソート
- 残高取得ユーティリティ
- 価格計算関数（getAmountOut/In）
- パス全体の価格計算
- 流動性追加時の最適数量計算

## 開発ワークフロー

### 1. 要件フェーズ

- `.kiro/specs/*/requirements.md`で仕様書作成
- EARS形式での要件定義

### 2. 設計フェーズ

- `.kiro/specs/*/design.md`で設計書作成
- アーキテクチャとコンポーネント設計

### 3. 実装フェーズ

- `.kiro/specs/*/tasks.md`でタスク管理
- 段階的な実装とテスト

### 4. テスト・デプロイフェーズ

- ユニットテスト・統合テスト
- ローカル→テストネット→本番の順でデプロイ
