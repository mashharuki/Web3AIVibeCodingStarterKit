import "dotenv/config";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../../helpers/contractsJsonHelper";

/**
 * 最適な比率での流動性追加タスク
 * 現在のプール比率に基づいて最適な量を計算して追加
 */
task(
  "addLiquidityOptimal",
  "現在のプール比率に基づいて最適な流動性追加を行います"
)
  .addParam("amount", "基準となる量（Ether単位）")
  .addParam("token", "基準にするトークン（A または B）", "A")
  .addParam("slippage", "スリッページ（パーセント）", "5")
  .setAction(
    async (
      taskArgs: { amount: string; token: string; slippage: string },
      hre: HardhatRuntimeEnvironment
    ) => {
      const network = hre.network.name;
      const { amount, token, slippage } = taskArgs;

      console.log(
        `💧 ${network} ネットワークで最適な流動性追加を実行します...\n`
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

        // 現在のリザーブを取得
        const pairAddress = await factory.getPair(
          await tokenA.getAddress(),
          await tokenB.getAddress()
        );
        const pair = (await hre.ethers.getContractAt(
          "DexPair",
          pairAddress
        )) as any;
        const reserves = await pair.getReserves();

        // Token順序を確認
        const token0 = await pair.token0();
        const tokenAAddress = await tokenA.getAddress();

        let reserveA: bigint, reserveB: bigint;
        if (token0.toLowerCase() === tokenAAddress.toLowerCase()) {
          reserveA = reserves[0];
          reserveB = reserves[1];
        } else {
          reserveA = reserves[1];
          reserveB = reserves[0];
        }

        console.log(`📊 Current Pool State:`);
        console.log(`   Reserve A: ${hre.ethers.formatEther(reserveA)} TKA`);
        console.log(`   Reserve B: ${hre.ethers.formatEther(reserveB)} TKB`);
        console.log(
          `   Ratio A/B: ${Number(hre.ethers.formatEther(reserveA)) / Number(hre.ethers.formatEther(reserveB))}`
        );
        console.log();

        const baseAmount = hre.ethers.parseEther(amount);
        let amountADesired: bigint, amountBDesired: bigint;

        if (token.toUpperCase() === "A") {
          // TokenAを基準にTokenBの最適量を計算
          amountADesired = baseAmount;
          amountBDesired = (baseAmount * reserveB) / reserveA;
          console.log(
            `💡 Using ${amount} TKA as base, optimal TKB: ${hre.ethers.formatEther(amountBDesired)}`
          );
        } else {
          // TokenBを基準にTokenAの最適量を計算
          amountBDesired = baseAmount;
          amountADesired = (baseAmount * reserveA) / reserveB;
          console.log(
            `💡 Using ${amount} TKB as base, optimal TKA: ${hre.ethers.formatEther(amountADesired)}`
          );
        }

        // 残高確認
        const balanceA = await tokenA.balanceOf(signer.address);
        const balanceB = await tokenB.balanceOf(signer.address);
        console.log(`💰 User Balances:`);
        console.log(`   TokenA: ${hre.ethers.formatEther(balanceA)} TKA`);
        console.log(`   TokenB: ${hre.ethers.formatEther(balanceB)} TKB`);
        console.log();

        // 残高チェック
        if (balanceA < amountADesired) {
          throw new Error(
            `TokenAの残高が不足しています。必要: ${hre.ethers.formatEther(amountADesired)} TKA, 現在: ${hre.ethers.formatEther(balanceA)} TKA`
          );
        }
        if (balanceB < amountBDesired) {
          throw new Error(
            `TokenBの残高が不足しています。必要: ${hre.ethers.formatEther(amountBDesired)} TKB, 現在: ${hre.ethers.formatEther(balanceB)} TKB`
          );
        }

        // スリッページを考慮した最小量を計算（より緩い設定）
        const slippagePercent = Number.parseInt(slippage);
        const minAmountA =
          (amountADesired * BigInt(100 - slippagePercent)) / BigInt(100);
        const minAmountB =
          (amountBDesired * BigInt(100 - slippagePercent)) / BigInt(100);

        console.log(`📋 Transaction Details:`);
        console.log(
          `🔸 TokenA Desired: ${hre.ethers.formatEther(amountADesired)} TKA`
        );
        console.log(
          `🔹 TokenB Desired: ${hre.ethers.formatEther(amountBDesired)} TKB`
        );
        console.log(`🔸 TokenA Min: ${hre.ethers.formatEther(minAmountA)} TKA`);
        console.log(`🔹 TokenB Min: ${hre.ethers.formatEther(minAmountB)} TKB`);
        console.log(`📊 スリッページ: ${slippage}%`);
        console.log();

        // Approve確認・実行
        console.log("🔓 Checking Router Approvals...");
        const routerAddress = await router.getAddress();

        const allowanceA = await tokenA.allowance(
          signer.address,
          routerAddress
        );
        if (allowanceA < amountADesired) {
          console.log("🔓 TokenA approve実行中...");
          const approveTxA = await tokenA.approve(
            routerAddress,
            amountADesired
          );
          await approveTxA.wait();
          console.log("✅ TokenA approve完了");
        }

        const allowanceB = await tokenB.allowance(
          signer.address,
          routerAddress
        );
        if (allowanceB < amountBDesired) {
          console.log("🔓 TokenB approve実行中...");
          const approveTxB = await tokenB.approve(
            routerAddress,
            amountBDesired
          );
          await approveTxB.wait();
          console.log("✅ TokenB approve完了");
        }

        // 流動性追加実行
        console.log("💧 流動性追加を実行中...");
        const deadline = Math.floor(Date.now() / 1000) + 1800; // 30分後

        const tx = await router.addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          amountADesired,
          amountBDesired,
          minAmountA,
          minAmountB,
          signer.address,
          deadline
        );

        console.log(`⏳ トランザクションを待機中... Hash: ${tx.hash}`);
        const receipt = await tx.wait();

        if (receipt && receipt.status === 1) {
          console.log("✅ 流動性追加が成功しました！");
          console.log(`📋 Transaction Hash: ${receipt.hash}`);
          console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);

          // 結果の詳細を表示
          console.log("\n📊 実行後の状態:");
          const newBalanceA = await tokenA.balanceOf(signer.address);
          const newBalanceB = await tokenB.balanceOf(signer.address);
          console.log(
            `💰 TokenA残高: ${hre.ethers.formatEther(newBalanceA)} TKA`
          );
          console.log(
            `💰 TokenB残高: ${hre.ethers.formatEther(newBalanceB)} TKB`
          );

          const usedA = balanceA - newBalanceA;
          const usedB = balanceB - newBalanceB;
          console.log(
            `📤 使用したTokenA: ${hre.ethers.formatEther(usedA)} TKA`
          );
          console.log(
            `📤 使用したTokenB: ${hre.ethers.formatEther(usedB)} TKB`
          );

          // 新しいリザーブ状態
          const newReserves = await pair.getReserves();
          let newReserveA: bigint, newReserveB: bigint;
          if (token0.toLowerCase() === tokenAAddress.toLowerCase()) {
            newReserveA = newReserves[0];
            newReserveB = newReserves[1];
          } else {
            newReserveA = newReserves[1];
            newReserveB = newReserves[0];
          }

          console.log(`📊 新しいプール状態:`);
          console.log(
            `   Reserve A: ${hre.ethers.formatEther(newReserveA)} TKA`
          );
          console.log(
            `   Reserve B: ${hre.ethers.formatEther(newReserveB)} TKB`
          );
        } else {
          console.log("❌ 流動性追加が失敗しました");
        }
      } catch (error: any) {
        console.error(
          "❌ 流動性追加中にエラーが発生しました:",
          error.message || error
        );
        throw error;
      }
    }
  );
