import * as dotenv from "dotenv";
import { network } from "hardhat";
import { writeContractAddress } from "../helpers/contractsJsonHelper";
const { ethers } = require("hardhat");

dotenv.config();

/**
 * AMM Factory コントラクトをデプロイする
 *
 * このスクリプトは以下の処理を行います：
 * 1. AMMFactory コントラクトをデプロイ
 * 2. デプロイ済みアドレスを outputs/contracts-{network}.json に保存
 * 3. デプロイ情報をコンソールに出力
 *
 * @returns Promise<void>
 */
const deployAMMFactory = async (): Promise<void> => {
  console.log(
    "##################################### [AMM Factory Deploy START] #####################################"
  );

  try {
    // Hardhat の ethers を使用してデプロイ
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log(
      "Account balance:",
      (await deployer.provider.getBalance(deployer.address)).toString()
    );
    console.log("Network:", network.name);

    // AMMFactory コントラクトをデプロイ
    // feeToSetter として deployer のアドレスを設定
    const AMMFactory = await ethers.getContractFactory("AMMFactory");
    const ammFactory = await AMMFactory.deploy(deployer.address);

    // デプロイ完了を待機
    await ammFactory.waitForDeployment();
    const factoryAddress = await ammFactory.getAddress();

    console.log("AMMFactory deployed to:", factoryAddress);
    console.log("Fee to setter:", deployer.address);

    // デプロイ済みアドレスを JSON ファイルに保存
    writeContractAddress({
      group: "contracts",
      name: "AMMFactory",
      value: factoryAddress,
      network: network.name,
    });

    // デプロイ情報を表示
    console.log("✅ AMMFactory deployment completed successfully!");
    console.log("📄 Contract address saved to outputs/contracts-" + network.name + ".json");

    // コントラクトの基本情報を確認
    const feeToSetter = await ammFactory.feeToSetter();
    const allPairsLength = await ammFactory.allPairsLength();

    console.log("📊 Contract Information:");
    console.log("  - Fee to setter:", feeToSetter);
    console.log("  - Initial pairs count:", allPairsLength.toString());
  } catch (error) {
    console.error("❌ Error during AMMFactory deployment:", error);
    throw error;
  }

  console.log(
    "##################################### [AMM Factory Deploy END] #####################################"
  );
};

// スクリプトが直接実行された場合のみデプロイを実行
if (require.main === module) {
  deployAMMFactory()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { deployAMMFactory };
