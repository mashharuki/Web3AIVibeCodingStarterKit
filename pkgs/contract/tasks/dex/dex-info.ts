import "dotenv/config";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../../helpers/contractsJsonHelper";

/**
 * デプロイされたDEXコントラクトの情報を表示するタスク
 *
 * 使用方法:
 * npx hardhat dexInfo --network sepolia
 */
task("dexInfo", "デプロイされたDEXコントラクトの情報を表示します").setAction(
  async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const network = hre.network.name;

    console.log(`📋 ${network} ネットワークのDEX情報を表示します...\n`);

    try {
      // デプロイされたコントラクトアドレスを読み込み
      const contracts = loadDeployedContractAddresses(network);

      if (!contracts || Object.keys(contracts).length === 0) {
        console.error(
          `❌ ${network} ネットワークのコントラクトアドレスファイルが見つかりません`
        );
        return;
      }

      // コントラクトインスタンスを取得
      const tokenA = (await hre.ethers.getContractAt(
        "TokenA",
        contracts.tokens.TokenA
      )) as any;
      const tokenB = (await hre.ethers.getContractAt(
        "TokenB",
        contracts.tokens.TokenB
      )) as any;
      const dexFactory = (await hre.ethers.getContractAt(
        "DexFactory",
        contracts.dex.DexFactory
      )) as any;
      const dexRouter = (await hre.ethers.getContractAt(
        "DexRouter",
        contracts.dex.DexRouter
      )) as any;
      const pair = (await hre.ethers.getContractAt(
        "DexPair",
        contracts.pairs["TokenA-TokenB"]
      )) as any;

      console.log("🏭 === DEXコントラクト情報 ===");
      console.log(`🔹 Network: ${network}`);
      console.log(
        `🔹 Chain ID: ${(await hre.ethers.provider.getNetwork()).chainId}`
      );
      console.log();

      console.log("💰 === Token情報 ===");
      console.log(`🔸 TokenA:`);
      console.log(`   Address: ${await tokenA.getAddress()}`);
      console.log(`   Name: ${await tokenA.name()}`);
      console.log(`   Symbol: ${await tokenA.symbol()}`);
      console.log(`   Decimals: ${await tokenA.decimals()}`);
      console.log(
        `   Total Supply: ${hre.ethers.formatEther(await tokenA.totalSupply())} TKA`
      );
      console.log();

      console.log(`🔸 TokenB:`);
      console.log(`   Address: ${await tokenB.getAddress()}`);
      console.log(`   Name: ${await tokenB.name()}`);
      console.log(`   Symbol: ${await tokenB.symbol()}`);
      console.log(`   Decimals: ${await tokenB.decimals()}`);
      console.log(
        `   Total Supply: ${hre.ethers.formatEther(await tokenB.totalSupply())} TKB`
      );
      console.log();

      console.log("🏭 === DEXコントラクト情報 ===");
      console.log(`🔸 DexFactory:`);
      console.log(`   Address: ${await dexFactory.getAddress()}`);
      console.log(`   Fee To: ${await dexFactory.feeTo()}`);
      console.log(`   Fee To Setter: ${await dexFactory.feeToSetter()}`);
      console.log();

      console.log(`🔸 DexRouter:`);
      console.log(`   Address: ${await dexRouter.getAddress()}`);
      console.log();

      console.log("💫 === ペア情報 ===");
      console.log(`🔸 TokenA-TokenB Pair:`);
      console.log(`   Address: ${await pair.getAddress()}`);
      console.log(`   Token0: ${await pair.token0()}`);
      console.log(`   Token1: ${await pair.token1()}`);

      const reserves = await pair.getReserves();
      console.log(`   Reserve0: ${hre.ethers.formatEther(reserves[0])}`);
      console.log(`   Reserve1: ${hre.ethers.formatEther(reserves[1])}`);
      console.log(
        `   Total Supply: ${hre.ethers.formatEther(await pair.totalSupply())}`
      );
      console.log();

      console.log("🎯 === 次に使用できるタスク ===");
      console.log("• npx hardhat mintTokens --amount 1000 --to YOUR_ADDRESS");
      console.log("• npx hardhat addLiquidity --amount-a 100 --amount-b 100");
      console.log("• npx hardhat swapTokens --amount-in 10 --token-in TokenA");
      console.log("• npx hardhat removeLiquidity --liquidity 10");
    } catch (error) {
      console.error(
        "❌ コントラクト情報の取得中にエラーが発生しました:",
        error
      );
      throw error;
    }
  }
);
