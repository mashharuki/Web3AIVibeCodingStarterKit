import * as dotenv from "dotenv";
import { network } from "hardhat";
import {
    loadDeployedContractAddresses,
    writeContractAddress,
} from "../helpers/contractsJsonHelper";
const { ethers } = require("hardhat");

dotenv.config();

/**
 * AMM Router コントラクトをデプロイする
 * 
 * このスクリプトは以下の処理を行います：
 * 1. デプロイ済みの AMMFactory アドレスを読み込み
 * 2. AMMRouter コントラクトをデプロイ（Factory アドレスを指定）
 * 3. デプロイ済みアドレスを outputs/contracts-{network}.json に保存
 * 4. デプロイ情報をコンソールに出力
 * 
 * 注意: このスクリプトを実行する前に AMMFactory がデプロイされている必要があります
 * 
 * @returns Promise<void>
 */
const deployAMMRouter = async (): Promise<void> => {
  console.log(
    "##################################### [AMM Router Deploy START] #####################################",
  );

  try {
    // Hardhat の ethers を使用してデプロイ
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
    console.log("Network:", network.name);

    // デプロイ済みコントラクトアドレスを読み込み
    let deployedContracts;
    try {
      deployedContracts = loadDeployedContractAddresses(network.name);
    } catch (error) {
      console.error("❌ Failed to load deployed contract addresses.");
      console.error("Please make sure AMMFactory is deployed first by running:");
      console.error(`npx hardhat run ignition/AMMFactory.ts --network ${network.name}`);
      throw error;
    }

    // AMMFactory のアドレスを取得
    const factoryAddress = deployedContracts.contracts?.AMMFactory || "";
    if (!factoryAddress) {
      throw new Error("AMMFactory address not found. Please deploy AMMFactory first.");
    }

    console.log("Using AMMFactory address:", factoryAddress);

    // WETH アドレス（今回のプロジェクトでは使用しないが、コンストラクタで必要）
    // Sepolia テストネットの WETH アドレスを使用
    const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"; // Sepolia WETH
    
    console.log("Using WETH address:", WETH_ADDRESS);

    // AMMRouter コントラクトをデプロイ
    const AMMRouter = await ethers.getContractFactory("AMMRouter");
    const ammRouter = await AMMRouter.deploy(factoryAddress, WETH_ADDRESS);
    
    // デプロイ完了を待機
    await ammRouter.waitForDeployment();
    const routerAddress = await ammRouter.getAddress();
    
    console.log("AMMRouter deployed to:", routerAddress);
    console.log("Factory address:", factoryAddress);
    console.log("WETH address:", WETH_ADDRESS);

    // デプロイ済みアドレスを JSON ファイルに保存
    writeContractAddress({
      group: "contracts",
      name: "AMMRouter",
      value: routerAddress,
      network: network.name,
    });

    // デプロイ情報を表示
    console.log("✅ AMMRouter deployment completed successfully!");
    console.log("📄 Contract address saved to outputs/contracts-" + network.name + ".json");
    
    // コントラクトの基本情報を確認
    const routerFactory = await ammRouter.factory();
    const routerWETH = await ammRouter.WETH();
    
    console.log("📊 Contract Information:");
    console.log("  - Factory address:", routerFactory);
    console.log("  - WETH address:", routerWETH);
    console.log("  - Factory matches:", routerFactory === factoryAddress);

    // デプロイ完了後の推奨次ステップを表示
    console.log("\n🚀 Next Steps:");
    console.log("1. Create token pairs using Factory contract");
    console.log("2. Add initial liquidity to pairs");
    console.log("3. Test swap functionality");
    console.log("\nUse Hardhat tasks to interact with the deployed contracts:");
    console.log(`npx hardhat createPair --factory ${factoryAddress} --tokena <TOKEN_A> --tokenb <TOKEN_B> --network ${network.name}`);

  } catch (error) {
    console.error("❌ Error during AMMRouter deployment:", error);
    throw error;
  }

  console.log(
    "##################################### [AMM Router Deploy END] #####################################",
  );
};

// スクリプトが直接実行された場合のみデプロイを実行
if (require.main === module) {
  deployAMMRouter()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { deployAMMRouter };
