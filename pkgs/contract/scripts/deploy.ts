import { ethers } from "hardhat";
import {
  writeContractAddress,
  resetContractAddressesJson,
} from "../helpers/contractsJsonHelper";

/**
 * 段階的DEXデプロイスクリプト (Ignitionを使わない版)
 *
 */
async function main() {
  console.log("🚀 DEXシステムの段階的デプロイを開始します...\n");

  try {
    const [deployer] = await ethers.getSigners();
    if (!deployer) {
      throw new Error("デプロイアカウントが見つかりません");
    }

    console.log(`📝 デプロイアカウント: ${deployer.address}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 残高: ${ethers.formatEther(balance)} ETH\n`);

    // ネットワーク名を取得
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === "unknown" ? "localhost" : network.name;

    // デプロイ前にJSONファイルをリセット
    console.log(
      `🗑️ ${networkName}のコントラクトアドレスファイルをリセット中...`
    );
    resetContractAddressesJson({ network: networkName });
    console.log("✅ リセット完了\n");

    // Step 1: TokenAをデプロイ
    console.log("📦 Step 1: TokenA をデプロイ中...");
    const TokenAFactory = await ethers.getContractFactory("TokenA");
    const tokenA = await TokenAFactory.deploy(deployer.address);
    await tokenA.waitForDeployment();
    const tokenAAddress = await tokenA.getAddress();
    console.log(`✅ TokenA デプロイ完了: ${tokenAAddress}`);

    // コントラクトアドレスを保存
    writeContractAddress({
      group: "tokens",
      name: "TokenA",
      value: tokenAAddress,
      network: networkName,
    });

    // 少し待機
    console.log("⏰ 次のデプロイまで3秒待機...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 2: TokenBをデプロイ
    console.log("📦 Step 2: TokenB をデプロイ中...");
    const TokenBFactory = await ethers.getContractFactory("TokenB");
    const tokenB = await TokenBFactory.deploy(deployer.address);
    await tokenB.waitForDeployment();
    const tokenBAddress = await tokenB.getAddress();
    console.log(`✅ TokenB デプロイ完了: ${tokenBAddress}`);

    // コントラクトアドレスを保存
    writeContractAddress({
      group: "tokens",
      name: "TokenB",
      value: tokenBAddress,
      network: networkName,
    });

    // 少し待機
    console.log("⏰ 次のデプロイまで3秒待機...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 3: DexFactoryをデプロイ
    console.log("📦 Step 3: DexFactory をデプロイ中...");
    const DexFactoryFactory = await ethers.getContractFactory("DexFactory");
    const dexFactory = await DexFactoryFactory.deploy(deployer.address);
    await dexFactory.waitForDeployment();
    const dexFactoryAddress = await dexFactory.getAddress();
    console.log(`✅ DexFactory デプロイ完了: ${dexFactoryAddress}`);

    // コントラクトアドレスを保存
    writeContractAddress({
      group: "dex",
      name: "DexFactory",
      value: dexFactoryAddress,
      network: networkName,
    });

    // 少し待機
    console.log("⏰ 次のデプロイまで3秒待機...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 4: DexRouterをデプロイ
    console.log("📦 Step 4: DexRouter をデプロイ中...");
    const DexRouterFactory = await ethers.getContractFactory("DexRouter");
    const dexRouter = await DexRouterFactory.deploy(dexFactoryAddress);
    await dexRouter.waitForDeployment();
    const dexRouterAddress = await dexRouter.getAddress();
    console.log(`✅ DexRouter デプロイ完了: ${dexRouterAddress}`);

    // コントラクトアドレスを保存
    writeContractAddress({
      group: "dex",
      name: "DexRouter",
      value: dexRouterAddress,
      network: networkName,
    });

    // 少し待機
    console.log("⏰ ペア作成まで3秒待機...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 5: TokenA-TokenBペアを作成
    console.log("📦 Step 5: TokenA-TokenB ペアを作成中...");
    // DexFactoryの型問題を回避するため、直接メソッドにアクセス
    const dexFactoryContract = dexFactory as unknown as {
      createPair: (
        tokenA: string,
        tokenB: string
      ) => Promise<{ wait: () => Promise<void> }>;
      getPair: (tokenA: string, tokenB: string) => Promise<string>;
    };
    const createPairTx = await dexFactoryContract.createPair(
      tokenAAddress,
      tokenBAddress
    );
    await createPairTx.wait();
    const pairAddress = await dexFactoryContract.getPair(
      tokenAAddress,
      tokenBAddress
    );
    console.log(`✅ ペア作成完了: ${pairAddress}`);

    // ペアアドレスを保存
    writeContractAddress({
      group: "pairs",
      name: "TokenA-TokenB",
      value: pairAddress,
      network: networkName,
    });

    console.log("\n✅ 全てのデプロイが完了しました！\n");
    console.log("📋 デプロイされたコントラクト:");
    console.log(`   TokenA:            ${tokenAAddress}`);
    console.log(`   TokenB:            ${tokenBAddress}`);
    console.log(`   DexFactory:        ${dexFactoryAddress}`);
    console.log(`   DexRouter:         ${dexRouterAddress}`);
    console.log(`   TokenA-TokenB Pair: ${pairAddress}`);

    console.log("\n🎯 次のステップ:");
    console.log("1. フロントエンドでこれらのアドレスを使用");
    console.log("2. テストネットでTokenAとTokenBのfaucetを実行");
    console.log("3. 流動性提供とスワップをテスト");

    console.log(
      `\n📄 コントラクトアドレスは outputs/contracts-${networkName}.json に保存されました`
    );

    // 最終残高を表示
    const finalBalance = await ethers.provider.getBalance(deployer.address);
    const gasUsed = balance - finalBalance;
    console.log(`\n💰 最終残高: ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`⛽ ガス使用量: ${ethers.formatEther(gasUsed)} ETH`);
  } catch (error) {
    console.error("❌ デプロイ中にエラーが発生しました:", error);
    process.exitCode = 1;
  }
}

// スクリプトを実行し、エラーハンドリングを行う
main().catch((error) => {
  console.error("❌ スクリプト実行中にエラーが発生しました:", error);
  process.exitCode = 1;
});
