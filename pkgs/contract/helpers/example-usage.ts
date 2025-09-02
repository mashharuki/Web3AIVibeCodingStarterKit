/**
 * contractsJsonHelper.ts の使用例
 * 
 * このファイルは、contractsJsonHelper.ts の各関数の使用方法を示すサンプルです。
 * 実際のデプロイメントスクリプトでこれらの関数を使用する際の参考にしてください。
 */

import {
    getFilePath,
    loadDeployedContractAddresses,
    resetContractAddressesJson,
    writeContractAddress,
    writeValueToGroup,
} from "./contractsJsonHelper";

// 使用例の実行
async function exampleUsage() {
  const network = "sepolia";
  
  console.log("=== contractsJsonHelper.ts 使用例 ===\n");

  // 1. ファイルパスの生成例
  console.log("1. ファイルパス生成:");
  const filePath = getFilePath({ network });
  console.log(`   ネットワーク: ${network}`);
  console.log(`   生成されたパス: ${filePath}\n`);

  // 2. JSONファイルのリセット（初期化）
  console.log("2. JSONファイルの初期化:");
  resetContractAddressesJson({ network });
  console.log(`   ${filePath} を初期化しました\n`);

  // 3. コントラクトアドレスの書き込み例
  console.log("3. コントラクトアドレスの書き込み:");
  
  // AMMFactory コントラクトのアドレスを保存
  writeContractAddress({
    group: "contracts",
    name: "AMMFactory",
    value: "0x1234567890123456789012345678901234567890",
    network,
  });
  console.log("   AMMFactory アドレスを保存しました");

  // AMMRouter コントラクトのアドレスを保存
  writeContractAddress({
    group: "contracts",
    name: "AMMRouter", 
    value: "0x2345678901234567890123456789012345678901",
    network,
  });
  console.log("   AMMRouter アドレスを保存しました");

  // ペアコントラクトのアドレスを保存
  writeContractAddress({
    group: "pairs",
    name: "USDC_JPYC",
    value: "0x3456789012345678901234567890123456789012",
    network,
  });
  console.log("   USDC/JPYC ペアアドレスを保存しました\n");

  // 4. 保存されたアドレスの読み込み例
  console.log("4. 保存されたアドレスの読み込み:");
  const deployedAddresses = loadDeployedContractAddresses(network);
  console.log("   読み込まれたデータ:");
  console.log(JSON.stringify(deployedAddresses, null, 2));
  console.log();

  // 5. グループ全体への値の書き込み例
  console.log("5. グループ全体への値の書き込み:");
  const tokenAddresses = {
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    JPYC: "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB",
    PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"
  };
  
  writeValueToGroup({
    group: "tokens",
    value: tokenAddresses,
    fileName: filePath,
  });
  console.log("   トークンアドレス群を保存しました");

  // 6. 最終的な結果の確認
  console.log("\n6. 最終的な保存データ:");
  const finalData = loadDeployedContractAddresses(network);
  console.log(JSON.stringify(finalData, null, 2));
}

// デプロイメントスクリプトでの使用例
export function deploymentExample() {
  console.log("\n=== デプロイメントスクリプトでの使用例 ===");
  console.log(`
// ignition/AMMFactory.ts での使用例
import { network } from "hardhat";
import { writeContractAddress } from "../helpers/contractsJsonHelper";

const deploy = async () => {
  // ... デプロイメントロジック ...
  
  // デプロイ完了後にアドレスを保存
  writeContractAddress({
    group: "contracts",
    name: "AMMFactory",
    value: factoryAddress,
    network: network.name,
  });
  
  console.log(\`AMMFactory deployed to: \${factoryAddress}\`);
};
  `);
}

// このファイルが直接実行された場合のみ例を実行
if (require.main === module) {
  exampleUsage()
    .then(() => deploymentExample())
    .catch(console.error);
}