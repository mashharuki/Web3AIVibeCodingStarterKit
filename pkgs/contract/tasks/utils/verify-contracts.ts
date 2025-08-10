import "dotenv/config";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../../helpers/contractsJsonHelper";

/**
 * デプロイ済みコントラクトをEtherscanでverifyするHardhatタスク
 * 
 * 使用方法:
 * npx hardhat verifyContracts --network sepolia
 * 
 * デプロイされたコントラクトアドレスファイルから情報を読み込み、
 * 各コントラクトをEtherscanでverifyします。
 */
task("verifyContracts", "デプロイ済みコントラクトをEtherscanでverifyします")
  .addOptionalParam("deployer", "デプロイヤーアドレス（TokenAとTokenBのコンストラクタ引数）")
  .setAction(async (taskArgs: { deployer?: string }, hre: HardhatRuntimeEnvironment) => {
    const network = hre.network.name;
    
    console.log(`🔍 ${network} ネットワークのコントラクトをverifyします...\n`);

    try {
      // デプロイされたコントラクトアドレスを読み込み
      const contracts = loadDeployedContractAddresses(network);
      
      if (!contracts || Object.keys(contracts).length === 0) {
        console.error(`❌ ${network} ネットワークのコントラクトアドレスファイルが見つかりません`);
        console.log(`📄 ファイル: outputs/contracts-${network}.json`);
        return;
      }

      // デプロイヤーアドレスを取得（引数で指定されていない場合は最初のSignerから取得）
      let deployerAddress = taskArgs.deployer;
      if (!deployerAddress) {
        const [deployer] = await hre.ethers.getSigners();
        if (!deployer) {
          throw new Error("デプロイヤーアドレスが取得できません");
        }
        deployerAddress = deployer.address;
        console.log(`📝 デプロイヤーアドレス（推測）: ${deployerAddress}`);
      } else {
        console.log(`📝 デプロイヤーアドレス（指定）: ${deployerAddress}`);
      }

      console.log("\n🚀 Verify開始...\n");

      // TokenA をverify
      if (contracts.tokens?.TokenA) {
        console.log("🔍 TokenA をverify中...");
        try {
          await hre.run("verify:verify", {
            address: contracts.tokens.TokenA,
            constructorArguments: [deployerAddress],
            contract: "contracts/TokenA.sol:TokenA"
          });
          console.log("✅ TokenA verify完了");
        } catch (error) {
          console.log("⚠️ TokenA verify失敗:", error);
        }
      }

      // TokenB をverify  
      if (contracts.tokens?.TokenB) {
        console.log("🔍 TokenB をverify中...");
        try {
          await hre.run("verify:verify", {
            address: contracts.tokens.TokenB,
            constructorArguments: [deployerAddress],
            contract: "contracts/TokenB.sol:TokenB"
          });
          console.log("✅ TokenB verify完了");
        } catch (error) {
          console.log("⚠️ TokenB verify失敗:", error);
        }
      }

      // DexFactory をverify
      if (contracts.dex?.DexFactory) {
        console.log("🔍 DexFactory をverify中...");
        try {
          await hre.run("verify:verify", {
            address: contracts.dex.DexFactory,
            constructorArguments: [deployerAddress],
            contract: "contracts/DexFactory.sol:DexFactory"
          });
          console.log("✅ DexFactory verify完了");
        } catch (error) {
          console.log("⚠️ DexFactory verify失敗:", error);
        }
      }

      // DexRouter をverify
      if (contracts.dex?.DexRouter && contracts.dex?.DexFactory) {
        console.log("🔍 DexRouter をverify中...");
        try {
          await hre.run("verify:verify", {
            address: contracts.dex.DexRouter,
            constructorArguments: [contracts.dex.DexFactory],
            contract: "contracts/DexRouter.sol:DexRouter"
          });
          console.log("✅ DexRouter verify完了");
        } catch (error) {
          console.log("⚠️ DexRouter verify失敗:", error);
        }
      }

      console.log("\n✅ Verify処理が完了しました！");
    } catch (error) {
      console.error("❌ Verify中にエラーが発生しました:", error);
      throw error;
    }
  });
