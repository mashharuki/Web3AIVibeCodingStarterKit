import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../../helpers/contractsJsonHelper";

// Sepolia ネットワーク上のトークンアドレス
const TOKENS = {
  USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  JPYC: "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB",
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
} as const;

// アドレスからトークンシンボルを取得するヘルパー関数
function getTokenSymbol(address: string): string {
  const lowerAddress = address.toLowerCase();
  for (const [symbol, tokenAddress] of Object.entries(TOKENS)) {
    if (tokenAddress.toLowerCase() === lowerAddress) {
      return symbol;
    }
  }
  return address; // シンボルが見つからない場合はアドレスをそのまま返す
}

/**
 * 指定されたトークンペアの情報を取得するタスク
 * 使用例:
 * npx hardhat getPair --token-a USDC --token-b JPYC --network sepolia
 */
task("getPair", "指定されたトークンペアの情報を取得する")
  .addParam("tokenA", "最初のトークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("tokenB", "2番目のトークンシンボル (USDC, JPYC, PYUSD)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { tokenA, tokenB } = taskArgs;
    const { network } = hre;

    console.log(`🔍 ${tokenA}/${tokenB} ペア情報を取得中...`);
    console.log(`📡 ネットワーク: ${network.name}`);

    // トークンシンボルの検証
    if (!TOKENS[tokenA as keyof typeof TOKENS]) {
      throw new Error(`❌ 無効なトークンA: ${tokenA}. 利用可能: ${Object.keys(TOKENS).join(", ")}`);
    }
    if (!TOKENS[tokenB as keyof typeof TOKENS]) {
      throw new Error(`❌ 無効なトークンB: ${tokenB}. 利用可能: ${Object.keys(TOKENS).join(", ")}`);
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

      // ペアアドレスを取得
      const pairAddress = await AMMFactory.read.getPair([tokenAAddress, tokenBAddress]);

      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        console.log(`❌ ${tokenA}/${tokenB} ペアは存在しません`);
        return;
      }

      console.log(`✅ ペアが見つかりました!`);
      console.log(`🎯 ペアアドレス: ${pairAddress}`);

      // ペアコントラクトに接続して詳細情報を取得
      const AMMPair = await hre.viem.getContractAt("AMMPair", pairAddress);

      // ペアの詳細情報を取得
      const [token0, token1] = await Promise.all([AMMPair.read.token0(), AMMPair.read.token1()]);

      const [reserves, totalSupply] = await Promise.all([
        AMMPair.read.getReserves(),
        AMMPair.read.totalSupply(),
      ]);

      console.log(`\n📊 ペア詳細情報:`);
      console.log(`   Token0: ${getTokenSymbol(token0)} (${token0})`);
      console.log(`   Token1: ${getTokenSymbol(token1)} (${token1})`);
      console.log(`   Reserve0: ${reserves[0].toString()}`);
      console.log(`   Reserve1: ${reserves[1].toString()}`);
      console.log(`   LP Token総供給量: ${totalSupply.toString()}`);
      console.log(`   最終更新ブロック: ${reserves[2].toString()}`);

      // 価格情報を計算（リザーブが0でない場合）
      if (reserves[0] > 0n && reserves[1] > 0n) {
        const price0 = (reserves[1] * 10n ** 18n) / reserves[0];
        const price1 = (reserves[0] * 10n ** 18n) / reserves[1];

        console.log(`\n💰 価格情報:`);
        console.log(
          `   1 ${getTokenSymbol(token0)} = ${(Number(price0) / 1e18).toFixed(6)} ${getTokenSymbol(token1)}`
        );
        console.log(
          `   1 ${getTokenSymbol(token1)} = ${(Number(price1) / 1e18).toFixed(6)} ${getTokenSymbol(token0)}`
        );
      } else {
        console.log(`\n💰 価格情報: 流動性が提供されていません`);
      }

      console.log(`\n🔗 Etherscan: https://sepolia.etherscan.io/address/${pairAddress}`);
    } catch (error) {
      console.error("❌ エラーが発生しました:", error);
      throw error;
    }
  });

/**
 * 全てのペア情報を一覧表示するタスク
 * 使用例:
 * npx hardhat getAllPairs --network sepolia
 */
task("getAllPairs", "全てのペア情報を一覧表示する").setAction(
  async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { network } = hre;

    console.log("🔍 全ペア情報を取得中...");
    console.log(`📡 ネットワーク: ${network.name}`);

    try {
      // デプロイ済みコントラクトアドレスを読み込み
      const deployedContracts = loadDeployedContractAddresses(network.name);
      const factoryAddress = deployedContracts.contracts.AMMFactory;

      console.log(`🏭 Factory アドレス: ${factoryAddress}`);

      // AMMFactory コントラクトに接続
      const AMMFactory = await hre.viem.getContractAt("AMMFactory", factoryAddress);

      // 総ペア数を取得
      const totalPairs = await AMMFactory.read.allPairsLength();
      console.log(`📊 総ペア数: ${totalPairs.toString()}`);

      if (totalPairs === 0n) {
        console.log("❌ ペアが存在しません");
        return;
      }

      console.log(`\n📋 ペア一覧:`);
      console.log("=".repeat(80));

      // 各ペアの情報を取得
      for (let i = 0; i < Number(totalPairs); i++) {
        try {
          const pairAddress = await AMMFactory.read.allPairs([BigInt(i)]);
          console.log(`\n${i + 1}. ペアアドレス: ${pairAddress}`);

          // ペアコントラクトに接続
          const AMMPair = await hre.viem.getContractAt("AMMPair", pairAddress);

          // ペアの詳細情報を取得
          const [token0, token1] = await Promise.all([
            AMMPair.read.token0(),
            AMMPair.read.token1(),
          ]);

          const [reserves, totalSupply] = await Promise.all([
            AMMPair.read.getReserves(),
            AMMPair.read.totalSupply(),
          ]);

          console.log(`   Token0: ${getTokenSymbol(token0)} (${token0})`);
          console.log(`   Token1: ${getTokenSymbol(token1)} (${token1})`);
          console.log(`   Reserve0: ${reserves[0].toString()}`);
          console.log(`   Reserve1: ${reserves[1].toString()}`);
          console.log(`   LP Token総供給量: ${totalSupply.toString()}`);

          // 価格情報を計算（リザーブが0でない場合）
          if (reserves[0] > 0n && reserves[1] > 0n) {
            const price0 = (reserves[1] * 10n ** 18n) / reserves[0];
            const price1 = (reserves[0] * 10n ** 18n) / reserves[1];

            console.log(
              `   価格: 1 ${getTokenSymbol(token0)} = ${(Number(price0) / 1e18).toFixed(6)} ${getTokenSymbol(token1)}`
            );
            console.log(
              `   価格: 1 ${getTokenSymbol(token1)} = ${(Number(price1) / 1e18).toFixed(6)} ${getTokenSymbol(token0)}`
            );
          } else {
            console.log(`   価格: 流動性が提供されていません`);
          }

          console.log(`   Etherscan: https://sepolia.etherscan.io/address/${pairAddress}`);
        } catch (error) {
          console.error(`❌ ペア ${i + 1} の情報取得に失敗:`, error);
        }
      }

      console.log("\n" + "=".repeat(80));
      console.log("✅ 全ペア情報の取得完了");
    } catch (error) {
      console.error("❌ エラーが発生しました:", error);
      throw error;
    }
  }
);

/**
 * 指定されたトークンペア（USDC/JPYC, USDC/PYUSD, JPYC/PYUSD）の情報を一括取得するタスク
 * 使用例:
 * npx hardhat getTargetPairs --network sepolia
 */
task(
  "getTargetPairs",
  "指定されたトークンペア（USDC/JPYC, USDC/PYUSD, JPYC/PYUSD）の情報を一括取得する"
).setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
  const { network } = hre;

  console.log("🔍 指定されたトークンペアの情報を取得中...");
  console.log(`📡 ネットワーク: ${network.name}`);

  // 対象ペアの定義
  const targetPairs = [
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

    console.log(`\n📋 対象ペア情報:`);
    console.log("=".repeat(80));

    for (let i = 0; i < targetPairs.length; i++) {
      const { tokenA, tokenB } = targetPairs[i];
      const tokenAAddress = TOKENS[tokenA as keyof typeof TOKENS];
      const tokenBAddress = TOKENS[tokenB as keyof typeof TOKENS];

      console.log(`\n${i + 1}. ${tokenA}/${tokenB} ペア`);

      try {
        // ペアアドレスを取得
        const pairAddress = await AMMFactory.read.getPair([tokenAAddress, tokenBAddress]);

        if (pairAddress === "0x0000000000000000000000000000000000000000") {
          console.log(`   ❌ ペアは存在しません`);
          continue;
        }

        console.log(`   ✅ ペアアドレス: ${pairAddress}`);

        // ペアコントラクトに接続して詳細情報を取得
        const AMMPair = await hre.viem.getContractAt("AMMPair", pairAddress);

        const [reserves, totalSupply] = await Promise.all([
          AMMPair.read.getReserves(),
          AMMPair.read.totalSupply(),
        ]);

        console.log(`   Reserve ${tokenA}: ${reserves[0].toString()}`);
        console.log(`   Reserve ${tokenB}: ${reserves[1].toString()}`);
        console.log(`   LP Token総供給量: ${totalSupply.toString()}`);

        // 価格情報を計算（リザーブが0でない場合）
        if (reserves[0] > 0n && reserves[1] > 0n) {
          const price0 = (reserves[1] * 10n ** 18n) / reserves[0];
          const price1 = (reserves[0] * 10n ** 18n) / reserves[1];

          console.log(`   価格: 1 ${tokenA} = ${(Number(price0) / 1e18).toFixed(6)} ${tokenB}`);
          console.log(`   価格: 1 ${tokenB} = ${(Number(price1) / 1e18).toFixed(6)} ${tokenA}`);
        } else {
          console.log(`   価格: 流動性が提供されていません`);
        }

        console.log(`   Etherscan: https://sepolia.etherscan.io/address/${pairAddress}`);
      } catch (error) {
        console.error(`   ❌ ${tokenA}/${tokenB} ペアの情報取得に失敗:`, error);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ 対象ペア情報の取得完了");
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    throw error;
  }
});
