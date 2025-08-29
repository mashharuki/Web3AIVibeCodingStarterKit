# タスク完了時の実行手順

## 必須チェック項目

### 1. コードフォーマット

```bash
# ルートディレクトリで実行
pnpm format
```

- Prettierによる自動フォーマット
- Solidityファイルも含めて全ファイル対象
- コミット前に必ず実行

### 2. リント検査

```bash
# 全パッケージのリント実行
pnpm lint
```

- ESLint（フロントエンド）
- Solhint（スマートコントラクト）
- 全エラーを0件にする

### 3. テスト実行

```bash
# 全テストの実行
pnpm test
```

- ユニットテスト
- 統合テスト
- 全テストが通過することを確認

### 4. ビルド確認

```bash
# 全パッケージのビルド
pnpm build
```

- TypeScriptコンパイル
- Solidityコンパイル
- Next.jsビルド
- エラーなしでビルド完了を確認

## パッケージ別詳細チェック

### スマートコントラクト（pkgs/contract/）

```bash
cd pkgs/contract

# 1. Solidityリント
pnpm lint

# 2. コンパイル
pnpm build

# 3. テスト実行
pnpm test

# 4. テストカバレッジ確認（推奨）
pnpm test:coverage

# 5. ローカルデプロイテスト（必要に応じて）
pnpm deploy:local
```

### フロントエンド（pkgs/frontend/）

```bash
cd pkgs/frontend

# 1. ESLintチェック
pnpm lint

# 2. 型チェック
pnpm type-check

# 3. テスト実行
pnpm test

# 4. ビルド
pnpm build

# 5. E2Eテスト（必要に応じて）
pnpm test:e2e
```

## Git操作

### コミット前チェック

```bash
# 1. 変更ファイルの確認
git status

# 2. 差分の確認
git diff

# 3. 全チェック項目の実行
pnpm format && pnpm lint && pnpm test && pnpm build

# 4. ステージング
git add .

# 5. コミット
git commit -m "feat: 実装内容の簡潔な説明"
```

### コミットメッセージ規約

```
<type>(<scope>): <subject>

<body>

<footer>
```

**タイプ定義:**

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: コードスタイル修正
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: その他の変更

## 品質確認項目

### コード品質

- [ ] ESLint/Solhintエラー: 0件
- [ ] TypeScriptエラー: 0件
- [ ] テスト通過率: 100%
- [ ] ビルド成功
- [ ] コードフォーマット適用済み

### 機能品質

- [ ] 要件を満たしている
- [ ] エラーハンドリングが適切
- [ ] セキュリティ考慮済み
- [ ] ガス最適化済み（コントラクト）
- [ ] アクセシビリティ対応（フロントエンド）

### ドキュメント

- [ ] コメントが適切に記述されている
- [ ] README更新（必要に応じて）
- [ ] 型定義が正確
- [ ] APIドキュメント更新（必要に応じて）

## トラブルシューティング

### よくある問題と解決方法

#### Node.jsバージョン警告

```bash
# Node.js 18以上を使用
nvm use 18
# または
nvm install 18 && nvm use 18
```

#### pnpmキャッシュ問題

```bash
# キャッシュクリア
pnpm store prune
rm -rf node_modules
pnpm install
```

#### Hardhatコンパイルエラー

```bash
# キャッシュクリア
cd pkgs/contract
pnpm clean
pnpm build
```

#### 型エラー

```bash
# TypeScript型生成
cd pkgs/contract
pnpm build  # TypeChainで型生成

cd pkgs/frontend
pnpm type-check  # 型チェック実行
```
