# 推奨コマンド一覧

## セットアップコマンド

### 初期セットアップ

```bash
# 依存関係のインストール
pnpm install

# 環境変数の設定
cp pkgs/contract/.env.example pkgs/contract/.env
cp pkgs/frontend/.env.example pkgs/frontend/.env.local
```

## 開発コマンド

### ルートレベル（全パッケージ対象）

```bash
# 全パッケージのビルド
pnpm build

# 全パッケージのテスト実行
pnpm test

# 全パッケージのリント
pnpm lint

# コードフォーマット（Prettier）
pnpm format
```

### スマートコントラクト開発（pkgs/contract/）

```bash
cd pkgs/contract

# コンパイル
pnpm build

# テスト実行
pnpm test

# テストカバレッジ
pnpm test:coverage

# ローカルネットワークにデプロイ
pnpm deploy:local

# Sepoliaテストネットにデプロイ
pnpm deploy:sepolia

# コントラクト検証
pnpm verify:sepolia

# Solidityリント
pnpm lint

# コードフォーマット
pnpm format

# キャッシュクリア
pnpm clean
```

### フロントエンド開発（pkgs/frontend/）

```bash
cd pkgs/frontend

# 開発サーバー起動
pnpm dev

# プロダクションビルド
pnpm build

# ビルド結果の起動
pnpm start

# テスト実行
pnpm test

# E2Eテスト実行
pnpm test:e2e

# ESLintチェック
pnpm lint

# 型チェック
pnpm type-check
```

## 品質チェックコマンド

### タスク完了時に実行すべきコマンド

```bash
# 1. フォーマット
pnpm format

# 2. リント
pnpm lint

# 3. テスト
pnpm test

# 4. ビルド確認
pnpm build
```

## システムコマンド（macOS）

### 基本的なファイル操作

```bash
# ファイル一覧表示
ls -la

# ディレクトリ移動
cd <directory>

# ファイル内容表示
cat <file>

# ファイル検索
find . -name "*.sol"

# 文字列検索
grep -r "pattern" .

# ファイルコピー
cp source.txt destination.txt

# ディレクトリコピー
cp -r source destination

# ディレクトリ作成
mkdir -p dir

# ファイル削除
rm file.txt

# ディレクトリ削除
rm -rf dir
```

### Git操作

```bash
# 状態確認
git status

# 変更をステージング
git add .

# コミット
git commit -m "message"

# プッシュ
git push

# ブランチ作成・切り替え
git checkout -b feature/new-feature

# ログ確認
git log --oneline
```

## デバッグ・トラブルシューティング

### よく使用するデバッグコマンド

```bash
# Node.jsバージョン確認
node --version

# pnpmバージョン確認
pnpm --version

# パッケージの依存関係確認
pnpm list

# キャッシュクリア
pnpm store prune

# Hardhatネットワーク起動
npx hardhat node

# Hardhatコンソール
npx hardhat console --network localhost
```
