import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
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
 * 指定されたペアから流動性を除去するタスク
 * 使用例:
 * npx hardhat removeLiquidityFromPair --token-a USDC --token-b JPYC --liquidity 1000000000000000000 --network sepolia
 * npx hardhat removeLiquidityFromPair --token-a USDC --token-b JPYC --percentage 50 --network sepolia
 */
task("removeLiquidityFromPair", "指定されたペアから流動性を除去する")
  .addParam("tokenA", "最初のトークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("tokenB", "2番目のトークンシンボル (USDC, JPYC, PYUSD)")
  .addOptionalParam("liquidity", "除去するLPトークンの量（最小単位）")
  .addOptionalParam("percentage", "除去する流動性の割合（1-100）")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { tokenA, tokenB, liquidity, percentage } = taskArgs;
    const { network } = hre;

    console.log(`💧 ${tokenA}/${tokenB} ペアから流動性を除去中...`);
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

    // パラメータの検証
    if (!liquidity && !percentage) {
      throw new Error("❌ --liquidity または --percentage のいずれかを指定してください");
    }
    if (liquidity && percentage) {
      throw new Error("❌ --liquidity と --percentage は同時に指定できません");
    }

    if (percentage) {
      const percentageNum = parseInt(percentage);
      if (percentageNum < 1 || percentageNum > 100) {
        throw new Error("❌ 割合は1-100の範囲で指定してください");
      }
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
        throw new Error(`❌ ${tokenA}/${tokenB} ペアが存在しません`);
      }

      console.log(`🎯 ペアアドレス: ${pairAddress}`);

      // ペアコントラクトに接続
      const AMMPair = await hre.viem.getContractAt("AMMPair", pairAddress);

      // ユーザーアドレスを取得
      const [walletClient] = await hre.viem.getWalletClients();
      const userAddress = walletClient.account.address;

      // 現在のLPトークン残高を確認
      const lpBalance = await AMMPair.read.balanceOf([userAddress]);
      const totalSupply = await AMMPair.read.totalSupply();

      console.log(`\n💳 現在のLPトークン残高: ${lpBalance.toString()}`);
      console.log(`📊 LPトークン総供給量: ${totalSupply.toString()}`);

      if (lpBalance === 0n) {
        throw new Error("❌ LPトークンの残高がありません");
      }

      // 除去するLPトークン量を計算
      let liquidityToRemove: bigint;
      if (percentage) {
        const percentageNum = parseInt(percentage);
        liquidityToRemove = (lpBalance * BigInt(percentageNum)) / 100n;
        console.log(`💰 除去する流動性: ${liquidityToRemove.toString()} (${percentageNum}%)`);
      } else {
        liquidityToRemove = BigInt(liquidity);
        console.log(`💰 除去する流動性: ${liquidityToRemove.toString()}`);
      }

      if (liquidityToRemove <= 0n) {
        throw new Error("❌ 除去する流動性は0より大きい値を指定してください");
      }
      if (liquidityToRemove > lpBalance) {
        throw new Error(`❌ 指定された流動性が残高を超えています。残高: ${lpBalance.toString()}`);
      }

      // 現在のリザーブを確認
      const reserves = await AMMPair.read.getReserves();
      const [token0, token1] = await Promise.all([
        AMMPair.read.token0(),
        AMMPair.read.token1(),
      ]);

      console.log(`\n📊 現在のリザーブ:`);
      console.log(`   Token0 (${getTokenSymbol(token0)}): ${reserves[0].toString()}`);
      console.log(`   Token1 (${getTokenSymbol(token1)}): ${reserves[1].toString()}`);

      // 受け取り予定のトークン量を計算
      const amount0Expected = (liquidityToRemove * reserves[0]) / totalSupply;
      const amount1Expected = (liquidityToRemove * reserves[1]) / totalSupply;

      console.log(`\n💰 受け取り予定のトークン量:`);
      console.log(`   ${getTokenSymbol(token0)}: ${amount0Expected.toString()}`);
      console.log(`   ${getTokenSymbol(token1)}: ${amount1Expected.toString()}`);

      // LPトークンをペアコントラクトに送信
      console.log(`\n⏳ LPトークンをペアコントラクトに送信中...`);
      const transferHash = await AMMPair.write.transfer([pairAddress, liquidityToRemove]);
      console.log(`📝 LPトークン送信トランザクション: ${transferHash}`);

      // トランザクションの確認を待つ
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash: transferHash });
      console.log(`✅ LPトークン送信完了`);

      // 流動性を除去（burn関数を呼び出し）
      console.log(`⏳ 流動性除去を実行中...`);
      const burnHash = await AMMPair.write.burn([userAddress]);
      console.log(`📝 流動性除去トランザクション: ${burnHash}`);

      // トランザクションの確認を待つ
      const burnReceipt = await publicClient.waitForTransactionReceipt({ hash: burnHash });

      if (burnReceipt.status === "success") {
        console.log(`✅ 流動性除去成功!`);
        console.log(`⛽ ガス使用量: ${burnReceipt.gasUsed.toString()}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${burnHash}`);

        // 除去後の状況を確認
        const newReserves = await AMMPair.read.getReserves();
        const newLpBalance = await AMMPair.read.balanceOf([userAddress]);
        const newTotalSupply = await AMMPair.read.totalSupply();

        console.log(`\n📊 除去後の状況:`);
        console.log(`   新しいReserve0: ${newReserves[0].toString()}`);
        console.log(`   新しいReserve1: ${newReserves[1].toString()}`);
        console.log(`   残りのLPトークン: ${newLpBalance.toString()}`);
        console.log(`   LPトークン総供給量: ${newTotalSupply.toString()}`);

        // 残りのプールシェアを計算
        if (newTotalSupply > 0n && newLpBalance > 0n) {
          const sharePercentage = (Number(newLpBalance) / Number(newTotalSupply)) * 100;
          console.log(`   残りのプールシェア: ${sharePercentage.toFixed(4)}%`);
        } else if (newLpBalance === 0n) {
          console.log(`   残りのプールシェア: 0%`);
        }

        // ユーザーのトークン残高を確認
        const TokenA = await hre.viem.getContractAt("IERC20", tokenAAddress);
        const TokenB = await hre.viem.getContractAt("IERC20", tokenBAddress);

        const finalBalanceA = await TokenA.read.balanceOf([userAddress]);
        const finalBalanceB = await TokenB.read.balanceOf([userAddress]);

        console.log(`\n💳 最終的なトークン残高:`);
        console.log(`   ${tokenA}: ${finalBalanceA.toString()}`);
        console.log(`   ${tokenB}: ${finalBalanceB.toString()}`);

      } else {
        console.log("❌ 流動性除去に失敗しました");
      }

    } catch (error) {
      console.error("❌ エラーが発生しました:", error);
      throw error;
    }
  });

/**
 * 指定されたペアから全ての流動性を除去するタスク
 * 使用例:
 * npx hardhat removeAllLiquidity --token-a USDC --token-b JPYC --network sepolia
 */
task("removeAllLiquidity", "指定されたペアから全ての流動性を除去する")
  .addParam("tokenA", "最初のトークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("tokenB", "2番目のトークンシンボル (USDC, JPYC, PYUSD)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { tokenA, tokenB } = taskArgs;
    const { network } = hre;

    console.log(`💧 ${tokenA}/${tokenB} ペアから全ての流動性を除去中...`);
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

      // ペアアドレスを取得
      const pairAddress = await AMMFactory.read.getPair([tokenAAddress, tokenBAddress]);
      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error(`❌ ${tokenA}/${tokenB} ペアが存在しません`);
      }

      console.log(`🎯 ペアアドレス: ${pairAddress}`);

      // ペアコントラクトに接続
      const AMMPair = await hre.viem.getContractAt("AMMPair", pairAddress);

      // ユーザーアドレスを取得
      const [walletClient] = await hre.viem.getWalletClients();
      const userAddress = walletClient.account.address;

      // 現在のLPトークン残高を確認
      const lpBalance = await AMMPair.read.balanceOf([userAddress]);

      console.log(`\n💳 現在のLPトークン残高: ${lpBalance.toString()}`);

      if (lpBalance === 0n) {
        console.log("❌ LPトークンの残高がありません");
        return;
      }

      console.log(`💰 除去する流動性: ${lpBalance.toString()} (100%)`);

      // removeLiquidityFromPairタスクを呼び出し
      await hre.run("removeLiquidityFromPair", {
        tokenA,
        tokenB,
        liquidity: lpBalance.toString(),
      });

    } catch (error) {
      console.error("❌ エラーが発生しました:", error);
      throw error;
    }
  });
