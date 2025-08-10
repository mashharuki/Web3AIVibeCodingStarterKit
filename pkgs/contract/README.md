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

## タスク系

- DEXの情報を取得するタスク

  ```bash
  pnpm contract run dexInfo --network sepolia
  ```

- テスト用のトークンのfaucet method

  ```bash
  pnpm contract run mintToken --token TokenA --amount 1000 --network sepolia

  pnpm contract run mintToken --token TokenB --amount 1000 --network sepolia
  ```

- 各トークンの残高状況(LPも含む)

  ```bash
  pnpm contract run checkBalances --network sepolia
  ```

- 流動性の提供

  ```bash
  pnpm contract run addLiquidity --amount-a 50 --amount-b 50 --network sepolia
  ```

- 最適流動性の提供タスク(2回目以降はこちらの利用を推奨)

  ```bash
  pnpm contract run addLiquidityOptimal --amount 100 --token B --network sepolia
  ```

- 流動性の取り出し

  ```bash
  pnpm contract run removeLiquidity --liquidity 20 --network sepolia
  ```

- Swap前のクォート

  ```bash
  pnpm contract run quote --amount-in 5 --token-in TokenA --network sepolia
  ```

- 実際にトークンのスワップを行う

  ```bash
  pnpm contract run swap --amount-in 5 --token-in TokenA --slippage 1 --network sepolia
  ```

## デバッグタスク

- 流動性削除のデバッグ

  ```bash
  pnpm contract run debugRemoveLiquidity --liquidity 20 --network sepolia
  ```
