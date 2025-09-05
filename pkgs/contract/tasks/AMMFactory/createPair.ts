import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../../helpers/contractsJsonHelper";

// Sepolia ネットワーク上のトークンアドレス
const TOKENS = {
  USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  JPYC: "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB",
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
} as const;

/**
 * 新しいトークンペアを作成するタスク
 * 使用例:
 * npx hardhat createPair --token-a USDC --token-b JPYC --network sepolia
 * npx hardhat createPair --token-a USDC --token-b PYUSD --network sepolia
 * npx hardhat createPair --token-a JPYC --token-b PYUSD --network sepolia
 */
task("createPair", "新しいトークンペアを作成する")
  .addParam("tokenA", "最初のトークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("tokenB", "2番目のトークンシンボル (USDC, JPYC, PYUSD)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { tokenA, tokenB } = taskArgs;
    const { network } = hre;

    console.log(`🚀 ${tokenA}/${tokenB} ペアを作成中...`);
    console.log(`📡 ネットワーク: ${network.name}`);

    // トークンシンボルの検証
    if (!TOKENS[tokenA as keyof typeof TOKENS]) {
      throw new Error(`❌ 無効なトークンA: ${tokenA}. 利用可能: ${Object.keys(TOKENS).join(", ")}`);
    }
    if (!TOKENS[tokenB as keyof typeof TOKENS]) {
      throw new Error(`❌ 無効なトークンB: ${tokenB}. 利用可能: ${Object.keys(TOKENS).join(", ")}`);
    }
    if (tokenA === tokenB) {
      throw new Error("❌ 同じトークンでペアを作成することはできません");
    }

    // トークンアドレスを取得
    const tokenAAddress = TOKENS[tokenA as keyof typeof TOKENS];
    const tokenBAddress = TOKENS[tokenB as keyof typeof TOKENS];

    console.log(`📍 ${tokenA} アドレス: ${tokenAAddress}`);
    console.log(`📍 ${tokenB} アドレス: ${tokenBAddress}`);

    try {
      // デプロイ済みコントラクトアドレスを読み込み
      const deployedContracts = loadDeployedContractAddresses(network.name);
      const factoryAddress = deployedContracts.contracts.AMMFactory;

      console.log(`🏭 Factory アドレス: ${factoryAddress}`);

      // AMMFactory コントラクトに接続
      const AMMFactory = await hre.viem.getContractAt("AMMFactory", factoryAddress);

      // 既存のペアをチェック
      const existingPair = await AMMFactory.read.getPair([tokenAAddress, tokenBAddress]);
      if (existingPair !== "0x0000000000000000000000000000000000000000") {
        console.log(`⚠️  ペアは既に存在します: ${existingPair}`);
        return;
      }

      // ペアを作成
      console.log("⏳ トランザクションを送信中...");
      const hash = await AMMFactory.write.createPair([tokenAAddress, tokenBAddress]);

      console.log(`📝 トランザクションハッシュ: ${hash}`);
      console.log("⏳ トランザクションの確認を待機中...");

      // トランザクションの確認を待つ
      const publicClient = await hre.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        // 作成されたペアアドレスを取得
        const pairAddress = await AMMFactory.read.getPair([tokenAAddress, tokenBAddress]);

        console.log("✅ ペア作成成功!");
        console.log(`🎯 ペアアドレス: ${pairAddress}`);
        console.log(`⛽ ガス使用量: ${receipt.gasUsed.toString()}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${hash}`);

        // ペア数を確認
        const totalPairs = await AMMFactory.read.allPairsLength();
        console.log(`📊 総ペア数: ${totalPairs.toString()}`);
      } else {
        console.log("❌ トランザクションが失敗しました");
      }
    } catch (error) {
      console.error("❌ エラーが発生しました:", error);
      throw error;
    }
  });

/**
 * 指定されたトークンペア（USDC/JPYC, USDC/PYUSD, JPYC/PYUSD）を一括作成するタスク
 * 使用例:
 * npx hardhat createAllPairs --network sepolia
 */
task(
  "createAllPairs",
  "指定されたトークンペア（USDC/JPYC, USDC/PYUSD, JPYC/PYUSD）を一括作成する"
).setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
  const { network } = hre;

  console.log("🚀 指定されたトークンペアを一括作成中...");
  console.log(`📡 ネットワーク: ${network.name}`);

  // 作成するペアの定義
  const pairs = [
    { tokenA: "USDC", tokenB: "JPYC" },
    { tokenA: "USDC", tokenB: "PYUSD" },
    { tokenA: "JPYC", tokenB: "PYUSD" },
  ];

  try {
    // デプロイ済みコントラクトアドレスを読み込み
    const deployedContracts = loadDeployedContractAddresses(network.name);
    const factoryAddress = deployedContracts.contracts.AMMFactory;

    console.log(`🏭 Factory アドレス: ${factoryAddress}`);

    // AMMFactory コントラクトに接続
    const AMMFactory = await hre.viem.getContractAt("AMMFactory", factoryAddress);

    for (const pair of pairs) {
      const { tokenA, tokenB } = pair;
      const tokenAAddress = TOKENS[tokenA as keyof typeof TOKENS];
      const tokenBAddress = TOKENS[tokenB as keyof typeof TOKENS];

      console.log(`\n📝 ${tokenA}/${tokenB} ペアを処理中...`);

      // 既存のペアをチェック
      const existingPair = await AMMFactory.read.getPair([tokenAAddress, tokenBAddress]);
      if (existingPair !== "0x0000000000000000000000000000000000000000") {
        console.log(`⚠️  ${tokenA}/${tokenB} ペアは既に存在します: ${existingPair}`);
        continue;
      }

      // ペアを作成
      console.log(`⏳ ${tokenA}/${tokenB} ペアを作成中...`);
      const hash = await AMMFactory.write.createPair([tokenAAddress, tokenBAddress]);

      console.log(`📝 トランザクションハッシュ: ${hash}`);

      // トランザクションの確認を待つ
      const publicClient = await hre.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        const pairAddress = await AMMFactory.read.getPair([tokenAAddress, tokenBAddress]);
        console.log(`✅ ${tokenA}/${tokenB} ペア作成成功! アドレス: ${pairAddress}`);
      } else {
        console.log(`❌ ${tokenA}/${tokenB} ペアの作成に失敗しました`);
      }

      // 次のペア作成前に少し待機
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 最終的なペア数を確認
    const totalPairs = await AMMFactory.read.allPairsLength();
    console.log(`\n📊 作成完了! 総ペア数: ${totalPairs.toString()}`);
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    throw error;
  }
});
