# プロジェクト構造

## ルートディレクトリ構成

```
├── .kiro/                    # Kiro設定とステアリングルール
├── .github/                  # GitHub設定とワークフロー
│   └── copilot-instructions.md  # GitHubCopilotカスタムインストラクション
├── docs/                     # ドキュメントと仕様書
│   ├── design/              # 設計ドキュメントと要件
│   ├── prompt/              # AIプロンプトと開発ガイド
│   └── slide/               # プレゼンテーション資料
├── pkgs/                    # モノレポパッケージ
│   ├── contract/            # スマートコントラクト開発
│   └── frontend/            # フロントエンドアプリケーション
├── .gitignore               # Git除外設定
├── package.json             # ルートパッケージ設定
├── pnpm-lock.yaml           # pnpm依存関係ロック
├── pnpm-workspace.yaml      # pnpmワークスペース設定
├── biome.json               # Biomeフォーマッター・リンター設定
├── README.md                # プロジェクト概要とセットアップガイド
└── LICENSE                  # プロジェクトライセンス
```

## パッケージ構造規約

### `/pkgs/contract/` 詳細構成

```bash
├── README.md
├── contracts         # solファイル群を格納するフォルダ
├── hardhat.config.ts # Hardhatの設定ファイル
├── helpers           # ユーティリティ関数を格納するフォルダ  
├── ignition          # スマートコントラクトのデプロイメントスクリプトを格納するフォルダ
├── outputs           # デプロイメントの出力を格納するフォルダ  
├── package.json    
├── tasks             # Hardhatのタスクファイル群を格納するフォルダ   
├── test              # テストコード群を格納するフォルダ
├── .solhint.json     # solhintの設定ファイル
├── .solhintignore
└── tsconfig.json
```

### `/pkgs/frotnend/` 詳細構成

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

### パッケージ固有の規約

#### Contract パッケージ

- **Hardhat**: 開発・テスト・デプロイフレームワーク
- **TypeChain**: TypeScript 型生成
- **OpenZeppelin**: セキュアなコントラクトライブラリ使用
- **Mocha/Chai**: テストフレームワーク

#### Frontend パッケージ

- **Next.js**: App Router を使用
- **TypeScript**: 厳密な型チェック
- **Tailwind CSS**: ユーティリティファースト CSS
- **ethers.js**: Web3 ライブラリ
- **React Hook Form**: フォーム管理
- **Zustand**: 状態管理（軽量）

## ドキュメント構造

### `/docs/design/`

- 要件仕様書
- アーキテクチャ決定
- API ドキュメント
- ユーザーフロー図

### `/docs/prompt/`

- AI 開発プロンプト
- 実装ガイドライン
- AI 支援用機能仕様

## 開発ワークフロー

1. **要件フェーズ**: `docs/design/`で仕様書作成
2. **コントラクトフェーズ**: `pkgs/contract/`で実装とテスト
3. **フロントエンドフェーズ**: `pkgs/frontend/`で UI/UX 構築
4. **統合フェーズ**: コントラクトとフロントエンドの接続
5. **テストフェーズ**: エンドツーエンド検証

## 開発ツール設定

### パッケージマネージャー

- **pnpm**: 高速で効率的なパッケージ管理
- `pnpm-workspace.yaml`: モノレポワークスペース設定

### フォーマッター・リンター

- **Biome**: 高速なフォーマッターとリンター
- `biome.json`: 設定ファイル

### Git 設定

- `.gitignore`: 必須除外項目
  - `**/node_modules`
  - `**/.DS_Store`

## ファイル命名規約

- ディレクトリとファイルには**kebab-case**を使用
- スマートコントラクト: **PascalCase**（例：`NFTMarketplace.sol`）
- コンポーネント: React コンポーネントは**PascalCase**
- ユーティリティ: JavaScript/TypeScript ファイルは**camelCase**
- ドキュメント: markdown ファイルは**snake_case**
- 定数: **UPPER_SNAKE_CASE**

## コーディング規約

### TypeScript/JavaScript

- 関数の引数・戻り値には型を明記する
- メソッド名は動詞から始める
- 数値を扱う変数名には単位がわかるような接尾辞をつける
- 冗長な実装は避け、同じロジックは関数として切り出して再利用する

### コメント規約

- コメントは日本語で記述
- 変数コメント:
  ```ts
  // 変数の概要を記述する
  const variableName: Type = value;
  ```
- メソッドコメント:
  ```ts
  /**
   * メソッドの概要を記述する
   *
   * @param param1 パラメータ1の説明
   * @param param2 パラメータ2の説明
   * @returns 戻り値の説明
   */
  function methodName(param1: Type1, param2: Type2): ReturnType {
    // メソッドの処理内容を記述する
  }
  ```

## README 要件

README ファイルには以下の内容を含める：

- プロジェクトの概要
- セットアップ手順（API キーなどの環境変数設定を含む）
- 動かすためのコマンド一覧
- 使用技術スタック（ライブラリ名、概要、バージョンをテーブル形式で記述）

## コード構成原則

- **関心の分離**: コントラクトとフロントエンドロジックの明確な境界
- **モジュラーアーキテクチャ**: 再利用可能なコンポーネントとユーティリティ
- **段階的拡張**: コア機能を最初に構築し、その後機能を追加
- **テスト駆動開発**: 実装と並行してテストを作成
- **DRY 原則**: 同じロジックの重複を避け、関数として切り出して再利用
