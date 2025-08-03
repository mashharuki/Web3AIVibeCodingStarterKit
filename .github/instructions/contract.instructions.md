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
- prettier
- prettier-plugin-solidity

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
  sourcify: {
    enabled: true
  }
};

export default config;
```

## package.jsonの設定

`scripts` セクションに以下のスクリプトを必ず追加してください。

また、scriptには `network` は含めないように実装してください。

```json
"scripts": {
  "clean": "npx hardhat clean",
  "compile": "npx hardhat compile",
  "test": "npx hardhat test",
  "gas-report": "REPORT_GAS=true npx hardhat test",
  "lint": "solhint contracts/**/*.sol --fix && npx prettier --write contracts/**/*.sol",
  "reset-contracts": "npx hardhat reset-contracts --net",
  "reset-all-contracts": "npx hardhat reset-all-contracts"
},
```

# デプロイ用のヘルパー関数

`helpers` フォルダにデプロイ用のヘルパー関数を実装した`contractsJsonHelper.ts`ファイルを作成してください。

中身は以下のようにしてください。

```typescript
import jsonfile from "jsonfile";
import fs from "node:fs";

const BASE_PATH = "outputs";
const BASE_NAME = "contracts";
const EXTENSTION = "json";

/**
 * ファイルパスを取得する
 *
 * @param network ネットワーク名
 * @param basePath ベースパス
 * @param suffix サフィックス
 * @returns ファイルパス
 */
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
  return suffix ? `${commonFilePath}-${suffix}.${EXTENSTION}` : `${commonFilePath}.${EXTENSTION}`;
};

/**
 * コントラクトアドレスJSONファイルをリセットする
 *
 * @param network ネットワーク名
 */
const resetContractAddressesJson = ({ network }: { network: string }): void => {
  const fileName = getFilePath({ network: network });
  if (fs.existsSync(fileName)) {
    const folderName = "tmp";
    fs.mkdirSync(folderName, { recursive: true });
    // タイムゾーンを考慮した現在の日時を取得
    const date = new Date();
    date.setTime(date.getTime() + 9 * 60 * 60 * 1000);
    const strDate = date
      .toISOString()
      .replace(/(-|T|:)/g, "")
      .substring(0, 14);
    // 現在のファイルをリネーム
    fs.renameSync(
      fileName,
      getFilePath({
        network: network,
        basePath: "./tmp",
        suffix: strDate,
      })
    );
  }
  fs.writeFileSync(fileName, JSON.stringify({}, null, 2));
};

/**
 * デプロイ済みコントラクトアドレスを読み込む
 *
 * @param network ネットワーク名
 * @returns デプロイ済みコントラクトアドレス
 */
const loadDeployedContractAddresses = (network: string) => {
  const filePath = getFilePath({ network: network });
  if (!fs.existsSync(filePath)) {
    return {};
  }
  return jsonfile.readFileSync(filePath);
};

/**
 * 特定のコントラクトアドレスを取得する
 *
 * @param network ネットワーク名
 * @param contractName コントラクト名
 * @returns コントラクトアドレス（存在しない場合はnull）
 */
const getContractAddress = (network: string, contractName: string): string | null => {
  try {
    const addresses = loadDeployedContractAddresses(network);
    return addresses?.contracts?.[contractName] || null;
  } catch (error) {
    console.log(`Error loading contract address for ${contractName} on ${network}:`, error);
    return null;
  }
};

/**
 * デプロイメントパラメーターを取得する
 *
 * @param network ネットワーク名
 * @param contractName コントラクト名
 * @returns デプロイメントパラメーター（存在しない場合はnull）
 */
const getDeploymentParams = (network: string, contractName: string): Record<string, unknown> | null => {
  try {
    const data = loadDeployedContractAddresses(network);
    const paramsStr = data?.deploymentParams?.[contractName];
    return paramsStr ? JSON.parse(paramsStr) : null;
  } catch (error) {
    console.log(`Error loading deployment params for ${contractName} on ${network}:`, error);
    return null;
  }
};

/**
 * JSONを更新する内部関数
 *
 * @param group グループ名
 * @param name 名前
 * @param value 値
 * @param obj オブジェクト
 */
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
    obj[group][name] = value as string;
  }
};

/**
 * コントラクトアドレスを書き込む
 *
 * @param group グループ名
 * @param name 名前
 * @param value 値
 * @param network ネットワーク名
 */
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
    
    // ディレクトリが存在しない場合は作成
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    fs.mkdirSync(dir, { recursive: true });
    
    // ファイルが存在しない場合は空のオブジェクトで初期化
    let base: Record<string, Record<string, string>> = {};
    if (fs.existsSync(filePath)) {
      base = jsonfile.readFileSync(filePath);
    }
    
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

/**
 * グループに値を書き込む
 *
 * @param group グループ名
 * @param value 値
 * @param fileName ファイル名
 */
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
    getContractAddress,
    getDeploymentParams,
    getFilePath,
    loadDeployedContractAddresses,
    resetContractAddressesJson,
    writeContractAddress,
    writeValueToGroup
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

  // デプロイメントパラメーターを保存
  writeContractAddress({
    group: "deploymentParams",
    name: "コントラクトの名前",
    value: JSON.stringify({
      tokenName: parameters.tokenName,
      tokenSymbol: parameters.tokenSymbol,
      mintFee: parameters.mintFee.toString(),
      owner: parameters.owner,
    }),
    network: network.name,
  });

  console.log(
    "##################################### [Deploy END] #####################################",
  );

  return;
};

deploy();
```

デプロイしたスマートコントラクトをVerifyするタスクを作成するようにしてください。

デプロイ時のパラメータは、ヘルパー関数の`getDeploymentParams`を使用して取得できます。

例えば以下のように実装します。

```ts
/**
 * NFTコントラクトをverifyするタスク
 */
task("verify:nft", "Verify NFT contract")
  .addOptionalParam("contract", "NFT contract address (if not provided, will load from outputs)")
  .setAction(async (taskArgs, hre) => {
    // NFTコントラクトアドレスの取得
    let contractAddress: string = taskArgs.contract;
    if (!contractAddress) {
      contractAddress = getContractAddress(hre.network.name, "NFTContract") as string;
      if (!contractAddress) {
        throw new Error(
          `NFTContract address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    // デプロイメントパラメーターの取得
    const deploymentParams = getDeploymentParams(hre.network.name, "NFTContract");
    if (!deploymentParams) {
      throw new Error(
        `Deployment parameters not found for NFTContract on network ${hre.network.name}. Please redeploy the contract.`
      );
    }

    console.log("Verifying NFT contract...");
    console.log("Contract address:", contractAddress);
    console.log("Network:", hre.network.name);
    console.log("Constructor arguments:", [
      deploymentParams.tokenName,
      deploymentParams.tokenSymbol,
      deploymentParams.mintFee,
      deploymentParams.owner,
    ]);

    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          deploymentParams.tokenName,
          deploymentParams.tokenSymbol,
          deploymentParams.mintFee,
          deploymentParams.owner,
        ],
      });
      console.log("NFT contract verified successfully!");
    } catch (error) {
      console.error("Verification failed:", error);
    }
  });
```

また、デプロイ前に `resetContractAddressesJson` を呼び出して、デプロイ先のネットワークのアドレスJSONファイルをリセットするタスクファイルを実装してください。

タスクファイルの内容は以下となります。

```typescript
import { task } from "hardhat/config";
import { resetContractAddressesJson } from "../../helpers/contractsJsonHelper";

/**
 * コントラクトアドレスJSONファイルをリセットするタスク
 */
task("reset-contracts", "コントラクトアドレスJSONファイルをリセットします")
  .addParam("net", "リセット対象のネットワーク名")
  .setAction(async (taskArgs, hre) => {
    const { net: networkName } = taskArgs;

    console.log("📄 コントラクトアドレスJSONファイルをリセットします...");
    console.log(`🌐 対象ネットワーク: ${networkName}`);

    try {
      // コントラクトアドレスJSONファイルをリセット
      resetContractAddressesJson({ network: networkName });
      
      console.log(`✅ ${networkName}ネットワークのコントラクトアドレスJSONファイルがリセットされました`);
      console.log(`📁 ファイル場所: outputs/contracts-${networkName}.json`);
      
      // バックアップファイルの作成について通知
      console.log("💾 既存のファイルは tmp/ ディレクトリにバックアップされました");
      
    } catch (error) {
      console.error("❌ リセット処理中にエラーが発生しました:", error);
      process.exit(1);
    }
  });

/**
 * 全ネットワークのコントラクトアドレスJSONファイルをリセットするタスク
 */
task("reset-all-contracts", "全ネットワークのコントラクトアドレスJSONファイルをリセットします")
  .setAction(async (taskArgs, hre) => {
    const networks = ["localhost", "sepolia", "mainnet"];

    console.log("📄 全ネットワークのコントラクトアドレスJSONファイルをリセットします...");

    try {
      for (const networkName of networks) {
        console.log(`🌐 処理中: ${networkName}`);
        resetContractAddressesJson({ network: networkName });
        console.log(`✅ ${networkName} - 完了`);
      }
      
      console.log("🎉 全ネットワークのリセットが完了しました");
      console.log("💾 既存のファイルは tmp/ ディレクトリにバックアップされました");
      
    } catch (error) {
      console.error("❌ リセット処理中にエラーが発生しました:", error);
      process.exit(1);
    }
  });

```

スマートコントラクトの機能を呼び出すタスクファイルの実装時にはコントラクトのアドレスはコマンドオプションで指定せず、ヘルパー関数の `getContractAddress` を使用して自動的に取得するようにしてください。

例えば以下のように実装してください。

```ts
// NFTコントラクトアドレスの取得
let nftContractAddress = taskArgs.contract;
if (!nftContractAddress) {
  nftContractAddress = getContractAddress(hre.network.name, "NFTContract");
  if (!nftContractAddress) {
    throw new Error(
      `NFTContract address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
    );
  }
}
```

# .solhint.json の設定

`.solhint.json` ファイルを作成し、以下の内容で設定してください。

```json
{
  "extends": "solhint:recommended",
  "plugins": ["prettier"],
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

複数のコントラクトのテストで共通して使用するユーティリティ関数は、`helpers` フォルダを作成し、そこに実装してください。

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

