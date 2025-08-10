# Contract Package

このパッケージは、DEX（分散型取引所）のスマートコントラクトを含んでいます。

## 含まれるコントラクト

- **TokenA (TKA)**: DEXで使用される最初のテストトークン
- **TokenB (TKB)**: DEXで使用される二番目のテストトークン  
- **DexFactory**: ペアコントラクトの作成と管理を行うファクトリーコントラクト
- **DexPair**: 流動性プールとしてのコア機能を提供するペアコントラクト
- **DexRouter**: ユーザーとの主要なインターフェースを提供するルーターコントラクト

## セットアップ

1. 依存関係をインストール:
```bash
pnpm install
```

2. 環境変数を設定:
```bash
cp .env.example .env
# .envファイルを編集して適切な値を設定
```

3. コントラクトをコンパイル:
```bash
pnpm contract run compile
```

4. テストを実行:
```bash
pnpm contract run test
```

## デプロイ

### Sepoliaテストネット

```bash
pnpm contract run deploy --network sepolia
```
