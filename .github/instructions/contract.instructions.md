---
applyTo: './pkgs/contract/**'
---

あなたは超優秀なフルスタックWeb3エンジニアです。

このワークスペースでスマートコントラクトを構築するためのルールを設定しました。

必ず以下のルールに従ってスマートコントラクトを開発してください。

# 使用する技術スタック

- Solidity
- TypeScript
- pnpm
- Hardhat
- hardhat-gas-reporter
- solhint
- viem
- OpenZeppelin 
- AlchemyのRPC エンドポイント

# フォルダ構成

`contract` フォルダ構成は以下のようにしてください。

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

また、`test`フォルダに生成するファイルの拡張子は `.test.ts` としてください。

# hardhat.config.tsの設定

`hardhat.config.ts` の中身は以下のようにしてください。

```typescript
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-viem";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import "./tasks";

dotenv.config();

const {
  PRIVATE_KEY,
  ALCHEMY_API_KEY,
  COINMARKETCAP_API_KEY,
  ETHERSCAN_API_KEY,
  GAS_REPORT,
} = process.env;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.30",
        settings: {
          viaIR: true,
          optimizer: {
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY ?? "",
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    token: "ETH",
    coinmarketcap: COINMARKETCAP_API_KEY,
    gasPriceApi:
      "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
  },
};

export default config;
```

# デプロイ用のヘルパー関数

`helpers` フォルダにデプロイ用のヘルパー関数を実装した`contractsJsonHelper.ts`ファイルを作成してください。

中身は以下のようにしてください。

```typescript
import fs from "node:fs";
import jsonfile from "jsonfile";

const BASE_PATH = "outputs";
const BASE_NAME = "contracts";
const EXTENSTION = "json";

const getFilePath = ({
  network,
  basePath,
  suffix,
}: {
  network: string;
  basePath?: string;
  suffix?: string;
}): string => {
  const _basePath = basePath ? basePath : BASE_PATH;
  const commonFilePath = `${_basePath}/${BASE_NAME}-${network}`;
  return suffix
    ? `${commonFilePath}-${suffix}.${EXTENSTION}`
    : `${commonFilePath}.${EXTENSTION}`;
};

const resetContractAddressesJson = ({ network }: { network: string }): void => {
  const fileName = getFilePath({ network: network });
  if (fs.existsSync(fileName)) {
    const folderName = "tmp";
    fs.mkdirSync(folderName, { recursive: true });
    // get current datetime in this timezone
    const date = new Date();
    date.setTime(date.getTime() + 9 * 60 * 60 * 1000);
    const strDate = date
      .toISOString()
      .replace(/(-|T|:)/g, "")
      .substring(0, 14);
    // rename current file
    fs.renameSync(
      fileName,
      getFilePath({
        network: network,
        basePath: "./tmp",
        suffix: strDate,
      }),
    );
  }
  fs.writeFileSync(fileName, JSON.stringify({}, null, 2));
};

const loadDeployedContractAddresses = (network: string) => {
  const filePath = getFilePath({ network: network });
  return jsonfile.readFileSync(filePath);
};

const _updateJson = ({
  group,
  name,
  value,
  obj,
}: {
  group: string;
  name: string | null;
  value: Record<string, string> | string;
  obj: Record<string, Record<string, string>>;
}) => {
  if (obj[group] === undefined) obj[group] = {};
  if (name === null) {
    obj[group] = value as Record<string, string>;
  } else {
    if (obj[group][name] === undefined) obj[group][name] = "";
    obj[group][name] = JSON.stringify(value);
  }
};

const writeContractAddress = ({
  group,
  name,
  value,
  network,
}: {
  group: string;
  name: string | null;
  value: string;
  network: string;
}) => {
  try {
    const filePath = getFilePath({ network: network });
    const base = jsonfile.readFileSync(filePath);
    _updateJson({
      group: group,
      name: name,
      value: value,
      obj: base,
    });
    const output = JSON.stringify(base, null, 2);
    fs.writeFileSync(filePath, output);
  } catch (e) {
    console.log(e);
  }
};

const writeValueToGroup = ({
  group,
  value,
  fileName,
}: {
  group: string;
  value: Record<string, string> | string;
  fileName: string;
}) => {
  try {
    const base = jsonfile.readFileSync(fileName);
    _updateJson({ group: group, name: null, value: value, obj: base });
    const output = JSON.stringify(base, null, 2);
    fs.writeFileSync(fileName, output);
  } catch (e) {
    console.log(e);
  }
};

export {
  getFilePath,
  loadDeployedContractAddresses,
  resetContractAddressesJson,
  writeContractAddress,
  writeValueToGroup,
};
```

デプロイ用のファイルには、このヘルパー関数の`writeContractAddress`インポートして使用するようにしてください。

イメージとしては以下のようになります。

```typescript
import * as dotenv from "dotenv";
import { network } from "hardhat";
import {
  loadDeployedContractAddresses,
  writeContractAddress,
} from "../../helpers/deploy/contractsJsonHelper";

dotenv.config();

/**
 * Deploy contract
 * @returns
 */
const deploy = async () => {
  console.log(
    "##################################### [Deploy START] #####################################",
  );

  // デプロイに関するロジック

  writeContractAddress({
    group: "contracts",
    name: "コントラクトの名前",
    value: <コントラクトのアドレスを格納した変数>,
    network: network.name,
  });

  console.log(
    "##################################### [Deploy END] #####################################",
  );

  return;
};

deploy();
```

# .solhint.json の設定

`.solhint.json` ファイルを作成し、以下の内容で設定してください。

```json
{
  "extends": "solhint:recommended",
  "plugins": [],
  "rules": {
    "avoid-suicide": "error",
    "avoid-sha3": "warn"
  }
}
```

また、 `.solhintignore` ファイルを作成し、以下の内容で設定してください。

```txt
node_modules/
```

# テストコード

作成したスマートコントラクトのテストコードは、`test` フォルダに `.test.ts` 拡張子で作成してください。

そしてスマートコントラクトのテストコードは、網羅性を考慮し全てのテストパターンを試すようにユニットテストコードを生成してください。

また、テストコードにはわかりやすいコメントを必ず記載してください。

# デプロイ用のスクリプト

スマートコントラクトをデプロイするためのスクリプトは、`ignition` フォルダに作成してください。

スクリプトファイルはスマートコントラクトごとに必ず作成してください。

スクリプトファイルにはわかりやすいコメントを必ず記載してください。

# タスク

デプロイ後にスマートコントラクトの機能を呼び出せるようにスマートコントラクトごとに `tasks` フォルダ配下に`<スマートコントラクト名>`のフォルダを作成し、そこにタスクファイルを作成するようにしてください。

主要な関数は全てタスク化してください。

# セキュリティとガス最適化

スマートコントラクトの開発時には、セキュリティとガス最適化を必ず考慮して実装してください。

セキュリティのベストプラクティスについては、以下のGitHubリポジトリを参考にしてください。
https://github.com/ConsenSysDiligence/smart-contract-best-practices

Solidityの言語の仕様については以下のリポジトリを参照してください。
https://github.com/ethereum/solidity

