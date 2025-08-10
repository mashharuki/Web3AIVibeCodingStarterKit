import "dotenv/config";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { resetContractAddressesJson } from "../../helpers/contractsJsonHelper";

/**
 * コントラクトアドレスJSONファイルをリセットするHardhatタスク
 *
 * 使用方法:
 * npx hardhat resetContractAddressesJson
 * npx hardhat resetContractAddressesJson --network sepolia
 *
 * 指定されたネットワークのコントラクトアドレスファイルを
 * バックアップしてからリセットします。
 * バックアップファイルは tmp/ ディレクトリに保存されます。
 */
task(
  "resetContractAddressesJson",
  "コントラクトアドレスJSONファイルをリセットします"
).setAction(async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  console.log(
    `🗑️ ${network} ネットワークのコントラクトアドレスファイルをリセットします...\n`
  );

  try {
    // コントラクトアドレスJSONファイルをリセット
    resetContractAddressesJson({ network });

    console.log(
      `✅ ${network} のコントラクトアドレスファイルをリセットしました`
    );
    console.log(`📄 ファイル: outputs/contracts-${network}.json`);
    console.log(`💾 バックアップ: tmp/contracts-${network}-[timestamp].json\n`);

    console.log("🎯 次のステップ:");
    console.log("1. 新しいデプロイスクリプトを実行");
    console.log("2. フロントエンドで新しいアドレスを使用");
  } catch (error) {
    console.error("❌ リセット中にエラーが発生しました:", error);
    throw error;
  }
});
