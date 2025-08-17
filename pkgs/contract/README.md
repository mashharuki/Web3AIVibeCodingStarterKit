# AMM DEX スマートコントラクト 完全ガイド

このドキュメントは、AMM DEXプロジェクトのスマートコントラクト開発、デプロイ、運用の完全なガイドです。

## 📋 目次

- [プロジェクト概要](#プロジェクト概要)
- [セットアップ](#セットアップ)
- [デプロイメント](#デプロイメント)
- [Hardhatタスク](#hardhatタスク)
- [ヘルパーユーティリティ](#ヘルパーユーティリティ)
- [ワークフロー例](#ワークフロー例)
- [トラブルシューティング](#トラブルシューティング)
- [開発者向け情報](#開発者向け情報)

## プロジェクト概要

UniswapライクなAMM DEXのスマートコントラクト実装です。

### 🏗️ アーキテクチャ

このパッケージには以下のコントラクトが含まれています：

- **DEXFactory**: 新しい流動性ペアの作成と管理
- **DEXPair**: 流動性プールとスワップ機能の実装
- **DEXRouter**: ユーザーフレンドリーなインターフェース
- **TestTokenFaucet**: 検証用トークンの配布
- **TestTokenA/B**: テスト用ERC-20トークン

### 📁 ディレクトリ構成

```
pkgs/contract/
├── contracts/          # Solidityコントラクトソース
│   ├── core/          # コアDEXコントラクト
│   ├── interfaces/    # インターフェース定義
│   ├── libraries/     # ライブラリコントラクト
│   └── test/          # テスト用コントラクト
├── test/              # テストファイル
├── scripts/           # デプロイ・管理スクリプト
├── ignition/          # Hardhat Ignitionデプロイスクリプト
│   ├── modules/       # デプロイメントモジュール
│   ├── deploy-all.ts  # 汎用デプロイスクリプト
│   └── deploy-sepolia.ts # Sepolia専用デプロイ
├── helpers/           # ユーティリティ関数
├── tasks/             # Hardhatタスク（50以上）
├── outputs/           # デプロイ結果（Git除外）
└── README.md          # このドキュメント
```

## セットアップ

### 前提条件

- Node.js v18以上
- pnpm パッケージマネージャー
- Git

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd Web3AIVibeCodingStarterKit/pkgs/contract

# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.example .env.local
```

### 環境変数設定

`.env.local`ファイルを作成し、以下の変数を設定してください：

```bash
# 必須: デプロイ用プライベートキー
PRIVATE_KEY=your_private_key_here

# 必須: Alchemy API キー（Sepolia用）
ALCHEMY_API_KEY=your_alchemy_api_key_here

# オプション: コントラクト検証用
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# オプション: ガスレポート用
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here
GAS_REPORT=true
```

### 基本コマンド

```bash
# コンパイル
pnpm build

# テスト実行
pnpm test

# ガスレポート付きテスト
pnpm test:gas

# コードフォーマット
pnpm format

# リンター実行
pnpm lint
```

## デプロイメント

### 🚀 Hardhat Ignition デプロイシステム

Hardhat Ignitionを使用した宣言的デプロイメントシステムを提供しています。

#### デプロイメントモジュール

| モジュール | 説明 | 依存関係 |
|-----------|------|----------|
| `DEXFactory.ts` | Factoryコントラクトのデプロイ | なし |
| `DEXRouter.ts` | Routerコントラクトのデプロイ | Factory |
| `TestTokenA.ts` | テストトークンAのデプロイ | なし |
| `TestTokenB.ts` | テストトークンBのデプロイ | なし |
| `TestTokenFaucet.ts` | Faucetコントラクトのデプロイ | なし |
| `CoreContracts.ts` | コアDEXコントラクトのみ | Factory + Router |
| `TestTokens.ts` | テストトークンとFaucet | Tokens + Faucet |
| `FullDeployment.ts` | 完全なデプロイと初期化 | 全て |

#### クイックスタート

```bash
# Sepoliaに完全デプロイ
npm run ignition:script:sepolia

# ローカルネットワークに完全デプロイ
npm run ignition:script:all

# コアコントラクトのみデプロイ
npm run ignition:deploy:core -- --network sepolia

# テストトークンのみデプロイ
npm run ignition:deploy:tokens -- --network sepolia
```

#### 詳細なデプロイコマンド

```bash
# Hardhat Ignition CLIを使用
npx hardhat ignition deploy ignition/modules/FullDeployment.ts --network sepolia

# CREATE2を使用した決定論的アドレス
npx hardhat ignition deploy ignition/modules/FullDeployment.ts --network sepolia --strategy create2

# デプロイ検証
npm run ignition:verify -- --network sepolia
```

### 🔧 従来のデプロイスクリプト

```bash
# Sepoliaテストネットにデプロイ
pnpm deploy

# 拡張デプロイ（メタデータ付き）
pnpm deploy:enhanced

# ローカルネットワークにデプロイ
pnpm deploy:local

# コントラクト検証
pnpm verify
```

### 📊 デプロイメント管理

```bash
# デプロイメント概要を表示
npm run deployment:summary

# デプロイメントデータをエクスポート
npm run deployment:export

# バックアップ作成
npm run deployment:backup

# ネットワーク間比較
npm run deployment:compare

# 全コントラクト一覧
npm run deployment:list

# サポートネットワーク表示
npm run deployment:networks
```

## Hardhatタスク

50以上の包括的なHardhatタスクを提供しています。

### 📋 タスクカテゴリ

| カテゴリ | ファイル | タスク数 | 説明 |
|---------|---------|---------|------|
| Factory | `factory.ts` | 5 | DEXFactoryの管理と操作 |
| Router | `router.ts` | 4 | DEXRouterを使用した取引操作 |
| Pair | `pair.ts` | 6 | 個別ペアの詳細情報と操作 |
| Faucet | `faucet.ts` | 8 | TestTokenFaucetの管理 |
| TestTokens | `testTokens.ts` | 6 | テスト用トークンの管理 |
| Deployment | `deployment.ts` | 5 | デプロイメントの検証と管理 |
| Admin | `admin.ts` | 8 | 管理者機能の実行 |

### 🎯 主要タスク一覧

#### Factory Tasks
```bash
# 新しいペアを作成
npx hardhat factory:create-pair --token-a 0x... --token-b 0x... --factory 0x... --network sepolia

# 全ペアを一覧表示
npx hardhat factory:list-pairs --factory 0x... --network sepolia

# Factory情報を表示
npx hardhat factory:info --factory 0x... --network sepolia
```

#### Router Tasks
```bash
# 流動性を追加
npx hardhat router:add-liquidity --token-a 0x... --token-b 0x... --amount-a 1000 --amount-b 2000 --router 0x... --network sepolia

# トークンをスワップ
npx hardhat router:swap --token-in 0x... --token-out 0x... --amount-in 100 --router 0x... --network sepolia

# スワップ見積もりを取得
npx hardhat router:quote --token-in 0x... --token-out 0x... --amount-in 100 --router 0x... --network sepolia
```

#### Pair Tasks
```bash
# ペアの詳細情報を表示
npx hardhat pair:info --pair 0x... --network sepolia

# ユーザーのポジションを確認
npx hardhat pair:user-position --pair 0x... --user 0x... --network sepolia

# スワップ出力を見積もり
npx hardhat pair:estimate-swap --pair 0x... --token-in 0x... --amount-in 100 --network sepolia
```

#### Faucet Tasks
```bash
# Faucetからトークンを請求
npx hardhat faucet:request-tokens --token 0x... --amount 100 --faucet 0x... --network sepolia

# Faucet情報を表示
npx hardhat faucet:info --faucet 0x... --network sepolia

# Faucetに資金を提供
npx hardhat faucet:fund --token 0x... --amount 10000 --faucet 0x... --network sepolia
```

#### Deployment Tasks
```bash
# デプロイメントを検証
npx hardhat deployment:verify --network sepolia

# デプロイメント状態をチェック
npx hardhat deployment:status --network sepolia

# デモ環境を自動セットアップ
npx hardhat deployment:setup-demo --network sepolia
```

#### Admin Tasks
```bash
# システム全体の状態を確認
npx hardhat admin:system-status --network sepolia

# コントラクト所有権を移転
npx hardhat admin:transfer-ownership --contract DEXFactory --new-owner 0x... --network sepolia

# トークンをミント
npx hardhat admin:token-mint --token TestTokenA --to 0x... --amount 1000 --network sepolia
```

### 🔐 権限レベル

| 権限レベル | 説明 | 対象タスク |
|-----------|------|----------|
| **一般** | 誰でも実行可能 | 情報取得、スワップ、流動性操作 |
| **オーナー** | コントラクトオーナーのみ | ミント、Faucet管理、緊急操作 |
| **feeToSetter** | 手数料設定者のみ | 手数料関連設定 |

## ヘルパーユーティリティ

### 📦 contractsJsonHelper

デプロイメント管理のための包括的なユーティリティを提供します。

#### 主要機能

- ✅ **デプロイメント追跡**: コントラクトアドレスと完全なメタデータの保存
- ✅ **環境管理**: 複数ネットワーク対応（hardhat, localhost, sepolia）
- ✅ **バックアップ & 復元**: デプロイメントデータのバックアップと復元
- ✅ **マイグレーション**: 古いデプロイメント形式からの自動移行
- ✅ **検証追跡**: コントラクト検証状態の追跡
- ✅ **エクスポート**: JSON/ENV形式でのデータエクスポート
- ✅ **比較ツール**: ネットワーク間でのデプロイメント比較

#### 基本的な使用方法

```typescript
import {
  writeContractAddress,
  getContractAddress,
  isContractDeployed,
  generateDeploymentSummary,
} from "../helpers/contractsJsonHelper";

// コントラクトアドレスを保存
writeContractAddress({
  group: "contracts",
  name: "DEXFactory",
  value: "0x1234...",
  network: "sepolia",
  deploymentTx: "0xabcd...",
  blockNumber: 12345,
  gasUsed: "150000",
});

// デプロイ状態を確認
if (isContractDeployed("sepolia", "DEXFactory")) {
  const address = getContractAddress("sepolia", "DEXFactory");
  console.log(`DEXFactory deployed at: ${address}`);
}

// デプロイメント概要を生成
console.log(generateDeploymentSummary("sepolia"));
```

#### 拡張デプロイメント

```typescript
import { writeContractDeployment, type ContractInfo } from "../helpers/contractsJsonHelper";

// 完全なメタデータ付きでデプロイメントを記録
const contractInfo: ContractInfo = {
  address: await factory.getAddress(),
  deploymentTx: factory.deploymentTransaction()?.hash || "",
  blockNumber: factory.deploymentTransaction()?.blockNumber || 0,
  gasUsed: factory.deploymentTransaction()?.gasLimit?.toString() || "0",
  constructorArgs: [deployer.address],
  verified: false,
};

writeContractDeployment({
  contractName: "DEXFactory",
  contractInfo,
  network: "sepolia",
  deployer: deployer.address,
});
```

## ワークフロー例

### 🚀 新規プロジェクト開始

```bash
# 1. セットアップ
pnpm install
cp .env.example .env.local
# .env.localを編集

# 2. コンパイルとテスト
pnpm build
pnpm test

# 3. Sepoliaにデプロイ
npm run ignition:script:sepolia

# 4. デプロイメント検証
npx hardhat deployment:verify --network sepolia
npx hardhat deployment:status --network sepolia
```

### 👤 新規ユーザー向けワークフロー

```bash
# Step 1: システム状態を確認
npx hardhat deployment:status --network sepolia

# Step 2: テストトークンを取得
npx hardhat faucet:request-tokens --token 0x1234... --amount 1000 --faucet 0xfauc... --network sepolia
npx hardhat faucet:request-tokens --token 0x5678... --amount 2000 --faucet 0xfauc... --network sepolia

# Step 3: 小額でスワップをテスト
npx hardhat router:quote --token-in 0x1234... --token-out 0x5678... --amount-in 10 --router 0xabcd... --network sepolia
npx hardhat router:swap --token-in 0x1234... --token-out 0x5678... --amount-in 10 --router 0xabcd... --network sepolia

# Step 4: 流動性を提供
npx hardhat pair:calculate-amounts --pair 0x9abc... --token-a 0x1234... --amount-a 100 --network sepolia
npx hardhat router:add-liquidity --token-a 0x1234... --token-b 0x5678... --amount-a 100 --amount-b 200 --router 0xabcd... --network sepolia
```

### 🔧 管理者向けワークフロー

```bash
# Step 1: システム全体の健全性チェック
npx hardhat admin:system-status --network sepolia

# Step 2: デプロイメント検証
npx hardhat deployment:verify --network sepolia

# Step 3: Faucet管理
npx hardhat faucet:info --faucet 0xfauc... --network sepolia
npx hardhat faucet:fund --token 0x1234... --amount 50000 --faucet 0xfauc... --network sepolia

# Step 4: 手数料設定（必要に応じて）
npx hardhat admin:factory-set-fee-to --fee-to 0xfee... --network sepolia

# Step 5: 定期的な監視
npx hardhat factory:info --factory 0xabcd... --network sepolia
npx hardhat pair:info --pair 0x9abc... --network sepolia
```

### 🧪 開発者向けテストワークフロー

```bash
# Step 1: 新しいテストトークンをデプロイ
npx hardhat deploy-test-token-a --owner 0x1234... --supply 1000000 --network sepolia

# Step 2: Faucetにトークンを追加
npx hardhat faucet:add-token --token 0x1234... --limit 1000 --faucet 0xfauc... --network sepolia

# Step 3: Faucetに資金を提供
npx hardhat faucet:fund --token 0x1234... --amount 100000 --faucet 0xfauc... --network sepolia

# Step 4: 新しいペアを作成
npx hardhat factory:create-pair --token-a 0x1234... --token-b 0x5678... --factory 0xabcd... --network sepolia

# Step 5: 初期流動性を追加
npx hardhat router:add-liquidity --token-a 0x1234... --token-b 0x5678... --amount-a 10000 --amount-b 20000 --router 0xabcd... --network sepolia
```

## トラブルシューティング

### よくあるエラーと解決方法

#### 1. デプロイメント関連

**"No deployment file found"**
```bash
# 原因: 指定したネットワークでデプロイが完了していない
# 解決方法:
npx hardhat deployment:verify --network sepolia
npx hardhat deployment:status --network sepolia
```

**"Insufficient funds for intrinsic transaction cost"**
```bash
# 原因: ガス代不足
# 解決方法: Sepolia ETHを取得
# https://sepoliafaucet.com/
```

**"Nonce has already been used"**
```bash
# 原因: ノンスの重複
# 解決方法: MetaMaskアカウントをリセットまたは数分待機
```

#### 2. 権限関連

**"Only owner can perform this action"**
```bash
# 原因: 管理者権限が必要な操作を一般ユーザーが実行
# 解決方法:
npx hardhat admin:system-status --network sepolia
# 出力で所有権を確認し、適切なアカウントで実行
```

#### 3. トークン関連

**"Insufficient balance"**
```bash
# 原因: トークン残高が不足
# 解決方法:
npx hardhat faucet:request-tokens --token 0x1234... --amount 1000 --faucet 0xfauc... --network sepolia
```

**"Cooldown not expired"**
```bash
# 原因: Faucetのクールダウン期間中
# 解決方法:
npx hardhat faucet:info --faucet 0xfauc... --token 0x1234... --network sepolia
# 残り時間を確認して待機
```

#### 4. ペア関連

**"Pair does not exist"**
```bash
# 原因: 指定したトークンペアが存在しない
# 解決方法:
npx hardhat factory:create-pair --token-a 0x1234... --token-b 0x5678... --factory 0xabcd... --network sepolia
```

### デバッグ用コマンド

```bash
# システム全体の状態確認
npx hardhat admin:system-status --network sepolia

# 個別コントラクトの詳細確認
npx hardhat deployment:info --network sepolia
npx hardhat factory:info --factory 0xabcd... --network sepolia
npx hardhat faucet:info --faucet 0xfauc... --network sepolia

# ペアとトークンの状態確認
npx hardhat pair:info --pair 0x9abc... --network sepolia
npx hardhat test-token-info --token 0x1234... --network sepolia

# ユーザーの状態確認
npx hardhat pair:user-position --pair 0x9abc... --user 0xuser... --network sepolia
```

### Ignitionデバッグ

```bash
# 詳細ログを有効化
DEBUG=ignition:* npx hardhat ignition deploy ignition/modules/FullDeployment.ts --network sepolia

# デプロイメント状態を確認
npx hardhat ignition status ignition/modules/FullDeployment.ts --network sepolia
```

## 開発者向け情報

### 🏗️ アーキテクチャ設計

#### コントラクト設計原則

1. **モジュラー設計**: 各コントラクトは単一責任を持つ
2. **アップグレード可能性**: プロキシパターンの使用を検討
3. **ガス最適化**: 効率的なストレージとロジック
4. **セキュリティファースト**: OpenZeppelinライブラリの活用

#### デプロイメント戦略

1. **段階的デプロイ**: コアコントラクト → テストトークン → 初期化
2. **検証可能**: 全コントラクトのEtherscan検証
3. **バックアップ**: デプロイ前の自動バックアップ
4. **ロールバック**: 問題発生時の復旧手順

### 📊 データ構造

#### ContractInfo
```typescript
interface ContractInfo {
  address: string;              // コントラクトアドレス
  deploymentTx: string;         // デプロイトランザクションハッシュ
  blockNumber: number;          // デプロイブロック番号
  gasUsed: string;             // 使用ガス量
  constructorArgs?: any[];      // コンストラクタ引数
  verified?: boolean;           // 検証状態
  verificationTx?: string;      // 検証トランザクションハッシュ
}
```

#### DeploymentData
```typescript
interface DeploymentData {
  network: string;              // ネットワーク名
  chainId: number;             // チェーンID
  contracts: Record<string, ContractInfo>; // デプロイ済みコントラクト
  metadata: DeploymentMetadata; // デプロイメントメタデータ
  lastUpdated: string;         // 最終更新日時
  version: string;             // データ形式バージョン
}
```

### 🔧 開発ツール

#### パッケージスクリプト

| スクリプト | 説明 | 用途 |
|-----------|------|------|
| `pnpm build` | コンパイル | 開発 |
| `pnpm test` | テスト実行 | 開発 |
| `pnpm test:gas` | ガスレポート付きテスト | 最適化 |
| `pnpm deploy` | Sepoliaデプロイ | デプロイ |
| `pnpm verify` | コントラクト検証 | 検証 |
| `pnpm lint` | リンター実行 | 品質管理 |
| `pnpm format` | フォーマット | 品質管理 |

#### 環境設定

```bash
# 開発環境
NODE_ENV=development

# テスト環境
NODE_ENV=test
GAS_REPORT=true

# 本番環境
NODE_ENV=production
ETHERSCAN_API_KEY=required
```

### 📝 コーディング規約

#### Solidity

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title ContractName
 * @dev コントラクトの説明
 */
contract ContractName {
    // 状態変数
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18;
    
    // イベント
    event Transfer(address indexed from, address indexed to, uint256 value);
    
    // モディファイア
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    // 関数
    function functionName(uint256 _param) external onlyOwner returns (bool) {
        // 実装
        return true;
    }
}
```

#### TypeScript

```typescript
// インポート
import { ethers } from "hardhat";
import { expect } from "chai";

// 型定義
interface DeploymentOptions {
  network: string;
  verify?: boolean;
}

// 関数
export async function deployContract(
  contractName: string,
  args: any[],
  options: DeploymentOptions
): Promise<string> {
  // 実装
  return contractAddress;
}
```

### 🧪 テスト戦略

#### テストカテゴリ

1. **ユニットテスト**: 個別関数のテスト
2. **統合テスト**: コントラクト間の相互作用
3. **エンドツーエンドテスト**: 完全なワークフローのテスト
4. **ガステスト**: ガス使用量の最適化確認

#### テスト実行

```bash
# 全テスト実行
pnpm test

# 特定のテストファイル
pnpm test test/DEXFactory.test.ts

# ガスレポート付き
pnpm test:gas

# カバレッジレポート
pnpm test:coverage
```

### 🔒 セキュリティ

#### セキュリティチェックリスト

- [ ] **リエントランシー攻撃**: ReentrancyGuardの使用
- [ ] **整数オーバーフロー**: SafeMathまたはSolidity 0.8+
- [ ] **アクセス制御**: Ownableパターンの適切な実装
- [ ] **フロントランニング**: MEV対策の検討
- [ ] **フラッシュローン攻撃**: 適切な検証ロジック

#### 監査ツール

```bash
# Slitherによる静的解析
slither contracts/

# Mythrilによるセキュリティ分析
myth analyze contracts/DEXFactory.sol

# Echidnaによるファジングテスト
echidna-test contracts/DEXFactory.sol
```

### 📈 パフォーマンス最適化

#### ガス最適化

1. **ストレージ最適化**: パッキング、削除の活用
2. **ループ最適化**: 不要な繰り返し処理の削除
3. **関数最適化**: view/pure関数の適切な使用
4. **イベント活用**: ストレージの代わりにイベントログを使用

#### 監視とメトリクス

```bash
# ガス使用量レポート
pnpm test:gas

# コントラクトサイズ確認
npx hardhat size-contracts

# デプロイコスト計算
npx hardhat deploy --dry-run --network sepolia
```

## 注意事項

### セキュリティ

- 管理者権限が必要なタスクは適切なアカウントで実行してください
- プライベートキーは環境変数で管理し、コードに直接記述しないでください
- メインネットでの実行前は必ずテストネットで動作確認してください
- 大量の資金を扱う前にセキュリティ監査を実施してください

### パフォーマンス

- 大量のトランザクションを実行する場合は、ガス価格とネットワーク状況を確認してください
- バッチ処理が可能な操作は、個別実行よりもバッチ処理を推奨します
- CREATE2を使用する場合は、ソルトの管理に注意してください

### 互換性

- Node.js v18以上が必要です
- Hardhat v2.19以上が必要です
- 各ネットワークの最新のRPC URLを使用してください
- Solidityコンパイラバージョンは0.8.30を使用してください

### 運用

- 定期的なバックアップを実施してください
- デプロイメント前には必ずテストを実行してください
- コントラクトアップグレード時は段階的なロールアウトを検討してください
- 監視とアラートシステムを構築してください

---

このドキュメントは継続的に更新されます。質問や改善提案がある場合は、プロジェクトのIssueまたはPull Requestを作成してください。

## 📞 サポート

問題や質問がある場合：

1. このドキュメントのトラブルシューティングセクションを確認
2. Hardhat Ignitionの公式ドキュメントを参照
3. デプロイメントログで具体的なエラーメッセージを確認
4. ネットワーク設定と環境変数を検証
5. プロジェクトのIssueで質問を投稿