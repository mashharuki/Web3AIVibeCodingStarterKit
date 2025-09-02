# Contract Helpers

このディレクトリには、スマートコントラクトの開発とデプロイメントを支援するユーティリティ関数が含まれています。

## contractsJsonHelper.ts

デプロイ済みコントラクトアドレスの管理を行うためのヘルパー関数群です。

### 主な機能

- **コントラクトアドレスの保存**: デプロイ後のコントラクトアドレスをJSON形式で保存
- **ネットワーク別管理**: ネットワークごとに個別のJSONファイルで管理
- **バックアップ機能**: 既存ファイルの自動バックアップ
- **グループ管理**: コントラクト、ペア、トークンなどのカテゴリ別管理

### 利用可能な関数

#### `getFilePath(options)`
ファイルパスを生成します。

```typescript
const filePath = getFilePath({ 
  network: "sepolia",
  basePath: "outputs", // オプション
  suffix: "backup"     // オプション
});
// 結果: "outputs/contracts-sepolia-backup.json"
```

#### `resetContractAddressesJson(options)`
JSONファイルを初期化します。既存ファイルがある場合は自動的にバックアップされます。

```typescript
resetContractAddressesJson({ network: "sepolia" });
```

#### `writeContractAddress(options)`
コントラクトアドレスをJSONファイルに書き込みます。

```typescript
writeContractAddress({
  group: "contracts",
  name: "AMMFactory",
  value: "0x1234567890123456789012345678901234567890",
  network: "sepolia"
});
```

#### `loadDeployedContractAddresses(network)`
保存されたコントラクトアドレスを読み込みます。

```typescript
const addresses = loadDeployedContractAddresses("sepolia");
console.log(addresses.contracts.AMMFactory);
```

#### `writeValueToGroup(options)`
グループ全体に値を書き込みます。

```typescript
writeValueToGroup({
  group: "tokens",
  value: {
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    JPYC: "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB"
  },
  fileName: "outputs/contracts-sepolia.json"
});
```

### デプロイメントスクリプトでの使用例

```typescript
// ignition/AMMFactory.ts
import { network } from "hardhat";
import { writeContractAddress } from "../helpers/contractsJsonHelper";

const deploy = async () => {
  // コントラクトのデプロイ
  const factory = await ethers.deployContract("AMMFactory");
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  
  // アドレスを保存
  writeContractAddress({
    group: "contracts",
    name: "AMMFactory",
    value: factoryAddress,
    network: network.name,
  });
  
  console.log(`AMMFactory deployed to: ${factoryAddress}`);
  return factory;
};
```

### 出力ファイル形式

```json
{
  "contracts": {
    "AMMFactory": "\"0x1234567890123456789012345678901234567890\"",
    "AMMRouter": "\"0x2345678901234567890123456789012345678901\""
  },
  "pairs": {
    "USDC_JPYC": "\"0x3456789012345678901234567890123456789012\""
  },
  "tokens": {
    "USDC": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "JPYC": "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB",
    "PYUSD": "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"
  }
}
```

### テスト

ヘルパー関数のテストは `test/contractsJsonHelper.test.ts` で実行できます：

```bash
npx hardhat test test/contractsJsonHelper.test.ts
```

### 使用例の実行

実際の動作を確認するには、サンプルスクリプトを実行してください：

```bash
npx ts-node helpers/example-usage.ts
```

## 注意事項

- JSONファイルは `outputs/` ディレクトリに保存されます
- 既存ファイルがある場合、リセット時に `tmp/` ディレクトリにバックアップされます
- ネットワーク名は Hardhat の `network.name` を使用してください
- コントラクトアドレスは文字列として保存されます