# 推奨コマンド

## 基本コマンド（ルートディレクトリから）

### 開発・ビルド
```bash
# 全パッケージのビルド
pnpm build

# 全パッケージの開発サーバー起動
pnpm dev

# contractパッケージのコマンド実行
pnpm contract [command]
```

### コード品質
```bash
# リント実行
pnpm lint

# リント自動修正
pnpm lint:fix

# フォーマット実行
pnpm format
```

## スマートコントラクト関連（pkgs/contract/）

### コンパイル・テスト
```bash
# コントラクトコンパイル
pnpm compile

# テスト実行
pnpm test

# ガスレポート付きテスト
pnpm gas-report
```

### デプロイメント
```bash
# NFTコントラクトのみデプロイ
pnpm deploy:nft

# マーケットプレイスコントラクトのみデプロイ
pnpm deploy:marketplace

# 全コントラクトデプロイ
pnpm deploy:full

# コントラクト検証
pnpm verify
```

### ユーティリティ
```bash
# コントラクトデータリセット
pnpm reset-contracts

# 全コントラクトデータリセット
pnpm reset-all-contracts

# プロジェクトクリーン
pnpm clean
```

## システムコマンド（macOS）
```bash
# ファイル検索
find . -name "*.sol" -type f

# テキスト検索
grep -r "function" contracts/

# ディレクトリ一覧
ls -la

# Git操作
git status
git add .
git commit -m "message"
```