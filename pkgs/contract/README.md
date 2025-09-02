# AMM DEX Smart Contracts

このパッケージには、AMM（Automated Market Maker）DEXのスマートコントラクトが含まれています。

## 概要

UniswapライクなAMM DEXを学習目的で開発したスマートコントラクトです。
Ethereum Sepoliaテストネットワーク上で動作し、以下の3つのERC20トークン間でのスワップと流動性提供機能を提供します。

### 対象トークン（Sepolia Network）
- USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
- JPYC: 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB  
- PYUSD: 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9

## 主要コントラクト

- **AMMFactory**: 新しい取引ペアの作成と管理
- **AMMPair**: 個別の取引ペアの流動性とスワップ機能
- **AMMRouter**: ユーザーフレンドリーなインターフェース

## セットアップ

```bash
# 依存関係のインストール
pnpm install

# コンパイル
pnpm compile

# テスト実行
pnpm test

# デプロイ（Sepolia）
pnpm deploy:all --network sepolia

# Verify
pnpm contract task:verify:factory --network sepolia
pnpm contract task:verify:router --network sepolia
```

## 開発コマンド

```bash
# Solhintによるコード品質チェック
pnpm lint

# ガスレポート付きテスト
pnpm test:gas

# コントラクトサイズチェック
pnpm size
```

## ディレクトリ構成

```
├── contracts/           # Solidityファイル群
├── helpers/            # ユーティリティ関数
├── ignition/           # デプロイメントスクリプト
├── outputs/            # デプロイメント出力
├── tasks/              # Hardhatタスク
├── test/               # テストファイル
├── hardhat.config.ts   # Hardhat設定
└── package.json        # パッケージ設定
```

## タスク実行（Hardhat Tasks）

package.json に Hardhat タスクを呼び出すスクリプトを追加しています。引数は `--` の後ろに続けて渡します。ネットワークは `--network sepolia` を付けて実行してください。

注意: 金額はトークンの最小単位で指定してください（USDC/PYUSDは6桁、JPYCは18桁）。

### スクリプト一覧（抜粋）

```bash
# ペア作成・取得
pnpm task:create-pair --token-a USDC --token-b JPYC --network sepolia
pnpm task:create-all-pairs --network sepolia
pnpm task:get-pair　--token-a USDC --token-b JPYC --network sepolia
pnpm task:get-all-pairs --network sepolia
pnpm task:get-target-pairs --network sepolia

# 流動性（Pair 直呼び）
pnpm task:add-liquidity:pair --token-a USDC --token-b JPYC --amount-a 1000000 --amount-b 150000000 --network sepolia

pnpm task:add-liquidity:pair --token-a USDC --token-b PYUSD --amount-a 100000 --amount-b 150000 --network sepolia

pnpm task:add-liquidity:pair --token-a PYUSD --token-b JPYC --amount-a 1000000 --amount-b 150000000 --network sepolia

pnpm task:remove-liquidity:pair --token-a USDC --token-b JPYC --liquidity 1000000 --network sepolia

pnpm task:remove-all-liquidity:pair --token-a USDC --token-b JPYC --network sepolia

# 流動性（Router 経由）
pnpm task:add-liquidity:router \
  --token-a USDC --token-b JPYC \
  --amount-a-desired 1000000 --amount-b-desired 150000000 \
  --amount-a-min 950000 --amount-b-min 142500000 \
  --network sepolia

pnpm task:remove-liquidity:router \
  --token-a USDC --token-b JPYC \
  --liquidity 1000000000000000000 \
  --amount-a-min 900000 --amount-b-min 135000000 \
  --network sepolia

# スワップ（Router 経由）
pnpm task:swap-exact:router \
  --token-in USDC --token-out JPYC \
  --amount-in 1000 --amount-out-min 14500 \
  --network sepolia

pnpm task:swap-for-exact:router \
  --token-in USDC --token-out JPYC \
  --amount-out 15000 --amount-in-max 10500 \
  --network sepolia

# スワップ（Pair 直呼び）/ 見積もり
pnpm task:swap:pair --token-in USDC --token-out JPYC --amount-in 1000000 --slippage 0.5 --network sepolia

pnpm task:quote:pair --token-in USDC --token-out JPYC --amount-in 100000  --network sepolia
```

### DEX 操作フロー例（タスクベース）

1. コントラクトをデプロイ（順序制御済み）
   ```bash
   pnpm deploy:all -- --network sepolia
   ```

2. 対象トークンのペアを一括作成
   ```bash
   pnpm task:create-all-pairs -- --network sepolia
   ```

3. プール一覧の確認（ペア数・アドレス）
   ```bash
   pnpm task:get-all-pairs -- --network sepolia
   ```

4. 初期流動性を追加（Router 経由推奨）
   ```bash
   # USDC(6桁) と JPYC(18桁) の最小単位で指定
   pnpm task:add-liquidity:router -- \
     --token-a USDC --token-b JPYC \
     --amount-a-desired 1000000 \
     --amount-b-desired 150000000 \
     --amount-a-min 950000 \
     --amount-b-min 142500000 \
     --network sepolia
   ```

5. スワップ実行（Exact In）
   ```bash
   # 事前に見積もりを取得して amount-out-min を決めると安全
   pnpm task:swap-exact:router -- \
     --token-in USDC --token-out JPYC \
     --amount-in 1000000 --amount-out-min 145000000 \
     --network sepolia
   ```

6. 流動性を除去（必要に応じて）
   ```bash
   pnpm task:remove-liquidity:router -- \
     --token-a USDC --token-b JPYC \
     --liquidity 1000000000000000000 \
     --amount-a-min 900000 --amount-b-min 135000000 \
     --network sepolia
   ```

ヒント:
- ハードハットのタスク引数は camelCase か kebab-case どちらでも指定できます。
- `--network sepolia` を忘れずに付けてください（`.env` 設定とウォレット秘密鍵が必要です）。
- トークンの小数桁に注意してください（USDC/PYUSD: 6、JPYC: 18）。
