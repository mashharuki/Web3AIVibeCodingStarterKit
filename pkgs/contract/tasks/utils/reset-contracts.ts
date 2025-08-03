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

      console.log(
        `✅ ${networkName}ネットワークのコントラクトアドレスJSONファイルがリセットされました`
      );
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
task(
  "reset-all-contracts",
  "全ネットワークのコントラクトアドレスJSONファイルをリセットします"
).setAction(async (taskArgs, hre) => {
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
