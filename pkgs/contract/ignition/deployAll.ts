import * as dotenv from "dotenv";
import { network } from "hardhat";
import {
  loadDeployedContractAddresses,
  resetContractAddressesJson,
} from "../helpers/contractsJsonHelper";
import { deployAMMFactory } from "./AMMFactory";
import { deployAMMRouter } from "./AMMRouter";
const { ethers } = require("hardhat");

dotenv.config();

/**
 * 全ての AMM コントラクトを正しい順序でデプロイする
 *
 * デプロイ順序:
 * 1. AMMFactory - ペア作成とファクトリー機能
 * 2. AMMRouter - ユーザーフレンドリーなインターフェース
 *
 * このスクリプトは以下の処理を行います：
 * 1. 既存のデプロイメント情報をバックアップ
 * 2. 順序に従ってコントラクトをデプロイ
 * 3. 各デプロイメント後に検証を実行
 * 4. 最終的なデプロイメント情報を表示
 *
 * @returns Promise<void>
 */
const deployAllContracts = async (): Promise<void> => {
  console.log(
    "##################################### [FULL AMM DEPLOYMENT START] #####################################"
  );

  try {
    const [deployer] = await ethers.getSigners();

    console.log("🚀 Starting full AMM deployment...");
    console.log("Deployer account:", deployer.address);
    console.log("Network:", network.name);
    console.log(
      "Account balance:",
      (await deployer.provider.getBalance(deployer.address)).toString()
    );

    // 既存のデプロイメント情報をリセット（バックアップ付き）
    console.log("\n📋 Resetting deployment configuration...");
    resetContractAddressesJson({ network: network.name });

    // ステップ 1: AMMFactory をデプロイ
    console.log("\n📦 Step 1: Deploying AMMFactory...");
    await deployAMMFactory();

    // ステップ 2: AMMRouter をデプロイ
    console.log("\n📦 Step 2: Deploying AMMRouter...");
    await deployAMMRouter();

    // デプロイメント完了後の検証
    console.log("\n🔍 Verifying deployment...");
    const deployedContracts = loadDeployedContractAddresses(network.name);

    const factoryAddress = deployedContracts.contracts?.AMMFactory || "";
    const routerAddress = deployedContracts.contracts?.AMMRouter || "";

    if (!factoryAddress || !routerAddress) {
      throw new Error("Deployment verification failed: Missing contract addresses");
    }

    // コントラクトインスタンスを取得して基本機能を確認
    const AMMFactory = await ethers.getContractFactory("AMMFactory");
    const AMMRouter = await ethers.getContractFactory("AMMRouter");

    const factory = AMMFactory.attach(factoryAddress);
    const router = AMMRouter.attach(routerAddress);

    // Factory の基本情報を確認
    const feeToSetter = await factory.feeToSetter();
    const allPairsLength = await factory.allPairsLength();

    // Router の基本情報を確認
    const routerFactory = await router.factory();
    const routerWETH = await router.WETH();

    console.log("✅ Deployment verification completed!");

    // 最終的なデプロイメント情報を表示
    console.log("\n📊 Deployment Summary:");
    console.log("==========================================");
    console.log(`Network: ${network.name}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log("");
    console.log("📋 Deployed Contracts:");
    console.log(`  🏭 AMMFactory: ${factoryAddress}`);
    console.log(`  🔀 AMMRouter:  ${routerAddress}`);
    console.log("");
    console.log("🔧 Contract Configuration:");
    console.log(`  Factory Fee To Setter: ${feeToSetter}`);
    console.log(`  Factory Pairs Count: ${allPairsLength}`);
    console.log(`  Router Factory: ${routerFactory}`);
    console.log(`  Router WETH: ${routerWETH}`);
    console.log(`  Factory Address Match: ${routerFactory === factoryAddress}`);
    console.log("");

    // 対象トークンアドレス（Sepolia）を表示
    console.log("🪙 Target Tokens (Sepolia Network):");
    console.log("  USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238");
    console.log("  JPYC: 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB");
    console.log("  PYUSD: 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9");
    console.log("");

    // 次のステップを表示
    console.log("🚀 Next Steps:");
    console.log("1. Create token pairs for the target tokens:");
    console.log(
      `   npx hardhat createPair --factory ${factoryAddress} --tokena 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 --tokenb 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB --network ${network.name}`
    );
    console.log(
      `   npx hardhat createPair --factory ${factoryAddress} --tokena 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 --tokenb 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9 --network ${network.name}`
    );
    console.log(
      `   npx hardhat createPair --factory ${factoryAddress} --tokena 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB --tokenb 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9 --network ${network.name}`
    );
    console.log("");
    console.log("2. Add initial liquidity to the pairs");
    console.log("3. Test swap functionality");
    console.log("");
    console.log("📄 All contract addresses saved to: outputs/contracts-" + network.name + ".json");
  } catch (error) {
    console.error("❌ Error during full deployment:", error);
    throw error;
  }

  console.log(
    "##################################### [FULL AMM DEPLOYMENT END] #####################################"
  );
};

// スクリプトが直接実行された場合のみデプロイを実行
if (require.main === module) {
  deployAllContracts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { deployAllContracts };
