# タスク完了時の手順

## 1. コード品質チェック
```bash
# ルートディレクトリから実行
pnpm lint        # リント実行
pnpm lint:fix    # 自動修正
pnpm format      # フォーマット実行
```

## 2. スマートコントラクト関連（変更時）
```bash
# contractディレクトリで実行
cd pkgs/contract

# コンパイル
pnpm compile

# テスト実行
pnpm test

# ガスレポート確認
pnpm gas-report
```

## 3. 型安全性チェック
```bash
# TypeScriptコンパイルチェック
npx tsc --noEmit
```

## 4. Git操作
```bash
# 変更内容確認
git status
git diff

# ステージング
git add .

# コミット
git commit -m "descriptive commit message"

# プッシュ（必要に応じて）
git push
```

## 5. デプロイメント（本番時）
```bash
# テストネットデプロイ
pnpm deploy:full

# コントラクト検証
pnpm verify

# 設定ファイル更新確認
# - outputs/contracts-[network].json の更新確認
```

## 6. ドキュメント更新
- README.mdの更新（機能追加時）
- コントラクトコメントの更新
- 必要に応じてAPIドキュメントの更新

## チェックリスト
- [ ] リント・フォーマットエラーなし
- [ ] テスト全通過
- [ ] TypeScriptコンパイルエラーなし
- [ ] ガス使用量の確認
- [ ] セキュリティチェック（ReentrancyGuard等の適用確認）
- [ ] コミットメッセージが説明的
- [ ] 必要なドキュメント更新完了