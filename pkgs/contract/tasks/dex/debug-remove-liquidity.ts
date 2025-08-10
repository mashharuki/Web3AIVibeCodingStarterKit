import "dotenv/config";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../../helpers/contractsJsonHelper";

/**
 * 流動性削除のデバッグタスク
 * 詳細なエラー情報とコントラクト状態を表示
 */
task("debugRemoveLiquidity", "流動性削除のデバッグを行います")
  .addParam("liquidity", "削除するLP Token量（Ether単位）")
  .setAction(
    async (taskArgs: { liquidity: string }, hre: HardhatRuntimeEnvironment) => {
      const network = hre.network.name;
      const { liquidity } = taskArgs;

      console.log(
        `🔍 ${network} ネットワークで流動性削除をデバッグします...\n`
      );

      try {
        // デプロイされたコントラクトアドレスを読み込み
        const contracts = loadDeployedContractAddresses(network);

        if (!contracts || !contracts.tokens || !contracts.dex) {
          console.error(
            `❌ ${network} ネットワークのコントラクトアドレスが見つかりません`
          );
          return;
        }

        const [signer] = await hre.ethers.getSigners();
        if (!signer) {
          throw new Error("Signerが見つかりません");
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
        const router = (await hre.ethers.getContractAt(
          "DexRouter",
          contracts.dex.DexRouter
        )) as any;
        const factory = (await hre.ethers.getContractAt(
          "DexFactory",
          contracts.dex.DexFactory
        )) as any;

        const liquidityAmount = hre.ethers.parseEther(liquidity);

        console.log("🔍 === デバッグ情報 ===");
        console.log(`📝 Signer Address: ${signer.address}`);
        console.log(`🔸 TokenA Address: ${await tokenA.getAddress()}`);
        console.log(`🔹 TokenB Address: ${await tokenB.getAddress()}`);
        console.log(`🏭 Router Address: ${await router.getAddress()}`);
        console.log(`🏭 Factory Address: ${await factory.getAddress()}`);
        console.log();

        // ペアアドレスを確認
        const pairAddress = await factory.getPair(
          await tokenA.getAddress(),
          await tokenB.getAddress()
        );
        console.log(`💫 Pair Address: ${pairAddress}`);

        if (pairAddress === "0x0000000000000000000000000000000000000000") {
          console.log("❌ ペアが存在しません！");
          return;
        }

        const pair = (await hre.ethers.getContractAt(
          "DexPair",
          pairAddress
        )) as any;

        // LP Token情報
        const lpBalance = await pair.balanceOf(signer.address);
        const totalSupply = await pair.totalSupply();
        console.log(`🔮 LP Token Information:`);
        console.log(
          `   User LP Balance: ${hre.ethers.formatEther(lpBalance)} LP`
        );
        console.log(
          `   Total LP Supply: ${hre.ethers.formatEther(totalSupply)} LP`
        );
        console.log(`   Removing Amount: ${liquidity} LP`);
        console.log(
          `   LP Percentage: ${((Number(liquidity) / Number(hre.ethers.formatEther(totalSupply))) * 100).toFixed(4)}%`
        );
        console.log();

        // 残高チェック
        if (lpBalance < liquidityAmount) {
          console.log(`❌ LP Token残高が不足しています！`);
          console.log(`   必要: ${liquidity} LP`);
          console.log(`   現在: ${hre.ethers.formatEther(lpBalance)} LP`);
          console.log(
            `   不足: ${hre.ethers.formatEther(liquidityAmount - lpBalance)} LP`
          );
          return;
        }

        // 現在のリザーブ状態
        const reserves = await pair.getReserves();
        console.log(`📊 Current Pool Reserves:`);
        console.log(`   Reserve0: ${hre.ethers.formatEther(reserves[0])}`);
        console.log(`   Reserve1: ${hre.ethers.formatEther(reserves[1])}`);
        console.log();

        // Token順序を確認
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        console.log(`🔄 Token Order:`);
        console.log(`   Token0: ${token0}`);
        console.log(`   Token1: ${token1}`);
        console.log(`   TokenA: ${await tokenA.getAddress()}`);
        console.log(`   TokenB: ${await tokenB.getAddress()}`);
        console.log();

        // 削除時に受け取る量を計算
        const amountA = (liquidityAmount * reserves[0]) / totalSupply;
        const amountB = (liquidityAmount * reserves[1]) / totalSupply;

        // Token順序に基づいて正しい量を表示
        const tokenAAddress = await tokenA.getAddress();
        let expectedTokenA: bigint, expectedTokenB: bigint;

        if (token0.toLowerCase() === tokenAAddress.toLowerCase()) {
          expectedTokenA = amountA;
          expectedTokenB = amountB;
        } else {
          expectedTokenA = amountB;
          expectedTokenB = amountA;
        }

        console.log(`📤 Expected Token Amounts:`);
        console.log(
          `   TokenA (TKA): ${hre.ethers.formatEther(expectedTokenA)}`
        );
        console.log(
          `   TokenB (TKB): ${hre.ethers.formatEther(expectedTokenB)}`
        );
        console.log();

        // Allowance確認
        const routerAddress = await router.getAddress();
        const allowance = await pair.allowance(signer.address, routerAddress);
        console.log(`🔓 Router Allowance:`);
        console.log(`   LP Token: ${hre.ethers.formatEther(allowance)} LP`);
        console.log(
          `   Sufficient: ${allowance >= liquidityAmount ? "✅ Yes" : "❌ No"}`
        );
        console.log();

        // LP Token詳細情報
        console.log(`📋 LP Token Contract Details:`);
        console.log(`   Name: ${await pair.name()}`);
        console.log(`   Symbol: ${await pair.symbol()}`);
        console.log(`   Decimals: ${await pair.decimals()}`);
        console.log();

        // 実際の流動性削除をシミュレート（dryrun）
        console.log("🧪 Transaction Simulation...");

        try {
          // 最小量を計算（1%スリッページ）
          const minAmountA = (expectedTokenA * BigInt(99)) / BigInt(100);
          const minAmountB = (expectedTokenB * BigInt(99)) / BigInt(100);
          const deadline = Math.floor(Date.now() / 1000) + 1800;

          console.log(`📋 Transaction Parameters:`);
          console.log(`   TokenA: ${await tokenA.getAddress()}`);
          console.log(`   TokenB: ${await tokenB.getAddress()}`);
          console.log(
            `   Liquidity: ${hre.ethers.formatEther(liquidityAmount)} LP`
          );
          console.log(
            `   Min TokenA: ${hre.ethers.formatEther(minAmountA)} TKA`
          );
          console.log(
            `   Min TokenB: ${hre.ethers.formatEther(minAmountB)} TKB`
          );
          console.log(`   To: ${signer.address}`);
          console.log(
            `   Deadline: ${deadline} (${new Date(deadline * 1000).toISOString()})`
          );
          console.log();

          // staticCallでシミュレーション
          const result = await router.removeLiquidity.staticCall(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            liquidityAmount,
            minAmountA,
            minAmountB,
            signer.address,
            deadline
          );

          console.log(`✅ Simulation Success:`);
          console.log(
            `   Will receive TokenA: ${hre.ethers.formatEther(result[0])} TKA`
          );
          console.log(
            `   Will receive TokenB: ${hre.ethers.formatEther(result[1])} TKB`
          );
        } catch (simError: any) {
          console.log(`❌ Simulation Failed:`);
          console.log(`   Error: ${simError.message}`);

          // より詳細なエラー解析
          if (simError.message.includes("INSUFFICIENT_LIQUIDITY")) {
            console.log("🔍 Analysis: 流動性が不足しています");
          } else if (simError.message.includes("INSUFFICIENT_A_AMOUNT")) {
            console.log("🔍 Analysis: TokenAの最小受取量を下回っています");
          } else if (simError.message.includes("INSUFFICIENT_B_AMOUNT")) {
            console.log("🔍 Analysis: TokenBの最小受取量を下回っています");
          } else if (simError.message.includes("EXPIRED")) {
            console.log("🔍 Analysis: デッドラインが期限切れです");
          } else if (simError.message.includes("TRANSFER_FAILED")) {
            console.log("🔍 Analysis: LP Tokenの転送に失敗しました");
          } else if (simError.message.includes("INSUFFICIENT_ALLOWANCE")) {
            console.log(
              "🔍 Analysis: Router への LP Token 承認が不足しています"
            );
          } else {
            console.log(
              "🔍 Analysis: 不明なエラーです。コントラクトログを確認してください"
            );

            // より詳細なデバッグ情報
            console.log(`\n🔍 Additional Debug Information:`);
            console.log(
              `   LP Balance >= Liquidity: ${lpBalance >= liquidityAmount}`
            );
            console.log(
              `   Allowance >= Liquidity: ${allowance >= liquidityAmount}`
            );
            console.log(`   Total Supply > 0: ${totalSupply > 0}`);
            console.log(`   Reserve0 > 0: ${reserves[0] > 0}`);
            console.log(`   Reserve1 > 0: ${reserves[1] > 0}`);
          }
        }
      } catch (error) {
        console.error("❌ デバッグ中にエラーが発生しました:", error);
        throw error;
      }
    }
  );
