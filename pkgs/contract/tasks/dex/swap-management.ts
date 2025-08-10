import "dotenv/config";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../../helpers/contractsJsonHelper";

/**
 * トークンをスワップするタスク
 *
 * 使用方法:
 * npx hardhat swapTokens --amount-in 10 --token-in TokenA --network sepolia
 * npx hardhat swapTokens --amount-in 5 --token-in TokenB --slippage 2
 */
task("swapTokens", "TokenA <-> TokenB のスワップを実行します")
  .addParam("amountIn", "入力するトークン量（Ether単位）")
  .addParam("tokenIn", "入力トークン (TokenA または TokenB)")
  .addOptionalParam("slippage", "スリッページ許容度（%）", "1")
  .setAction(
    async (
      taskArgs: { amountIn: string; tokenIn: string; slippage: string },
      hre: HardhatRuntimeEnvironment
    ) => {
      const network = hre.network.name;
      const { amountIn, tokenIn, slippage } = taskArgs;

      console.log(`🔄 ${network} ネットワークでスワップを実行します...\n`);
      console.log(
        `📥 入力: ${amountIn} ${tokenIn === "TokenA" ? "TKA" : "TKB"}`
      );
      console.log(`📊 スリッページ: ${slippage}%\n`);

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

        // トークンの設定
        let inputToken: any;
        let outputToken: any;
        let inputSymbol: string;
        let outputSymbol: string;

        if (tokenIn === "TokenA") {
          inputToken = tokenA;
          outputToken = tokenB;
          inputSymbol = "TKA";
          outputSymbol = "TKB";
        } else if (tokenIn === "TokenB") {
          inputToken = tokenB;
          outputToken = tokenA;
          inputSymbol = "TKB";
          outputSymbol = "TKA";
        } else {
          throw new Error(
            "無効なトークン名です。TokenA または TokenB を指定してください"
          );
        }

        const amountInWei = hre.ethers.parseEther(amountIn);

        console.log("📋 実行前の状態確認...");

        // 残高確認
        const inputBalance = await inputToken.balanceOf(signer.address);
        const outputBalance = await outputToken.balanceOf(signer.address);
        console.log(
          `💰 ${inputSymbol}残高: ${hre.ethers.formatEther(inputBalance)} ${inputSymbol}`
        );
        console.log(
          `💰 ${outputSymbol}残高: ${hre.ethers.formatEther(outputBalance)} ${outputSymbol}`
        );

        // 残高チェック
        if (inputBalance < amountInWei) {
          throw new Error(
            `${inputSymbol}の残高が不足しています。必要: ${amountIn} ${inputSymbol}, 現在: ${hre.ethers.formatEther(inputBalance)} ${inputSymbol}`
          );
        }

        // スワップ予想量を取得
        const path = [
          await inputToken.getAddress(),
          await outputToken.getAddress(),
        ];
        const amountsOut = await router.getAmountsOut(amountInWei, path);
        const expectedAmountOut = amountsOut[1];

        console.log(
          `📊 予想出力量: ${hre.ethers.formatEther(expectedAmountOut)} ${outputSymbol}`
        );

        // スリッページを考慮した最小出力量を計算
        const slippagePercent = Number.parseInt(slippage);
        const minAmountOut =
          (expectedAmountOut * BigInt(100 - slippagePercent)) / BigInt(100);
        console.log(
          `📊 最小出力量: ${hre.ethers.formatEther(minAmountOut)} ${outputSymbol} (スリッページ${slippage}%)`
        );

        // Approve確認・実行
        console.log("🔓 Router承認を確認中...");
        const routerAddress = await router.getAddress();
        const allowance = await inputToken.allowance(
          signer.address,
          routerAddress
        );

        if (allowance < amountInWei) {
          console.log(`🔓 ${inputSymbol}のapprove実行中...`);
          const approveTx = await inputToken.approve(
            routerAddress,
            amountInWei
          );
          await approveTx.wait();
          console.log(`✅ ${inputSymbol} approve完了`);
        }

        // スワップ実行
        console.log("🔄 スワップを実行中...");
        const deadline = Math.floor(Date.now() / 1000) + 1800; // 30分後

        const tx = await router.swapExactTokensForTokens(
          amountInWei,
          minAmountOut,
          path,
          signer.address,
          deadline
        );

        console.log(`📝 Transaction Hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`✅ トランザクション確定 (Block: ${receipt.blockNumber})`);

        // 結果確認
        console.log("\n📊 スワップ後の状態:");
        const newInputBalance = await inputToken.balanceOf(signer.address);
        const newOutputBalance = await outputToken.balanceOf(signer.address);

        const inputDiff = inputBalance - newInputBalance;
        const outputDiff = newOutputBalance - outputBalance;

        console.log(
          `💰 ${inputSymbol}残高: ${hre.ethers.formatEther(newInputBalance)} ${inputSymbol} (-${hre.ethers.formatEther(inputDiff)})`
        );
        console.log(
          `💰 ${outputSymbol}残高: ${hre.ethers.formatEther(newOutputBalance)} ${outputSymbol} (+${hre.ethers.formatEther(outputDiff)})`
        );

        // スワップレート計算
        const rate =
          Number(hre.ethers.formatEther(outputDiff)) /
          Number(hre.ethers.formatEther(inputDiff));
        console.log(
          `📈 スワップレート: 1 ${inputSymbol} = ${rate.toFixed(6)} ${outputSymbol}`
        );

        console.log("\n🎯 次のステップ:");
        console.log(
          `• npx hardhat swapTokens --amount-in 5 --token-in ${outputSymbol === "TKA" ? "TokenA" : "TokenB"} (逆スワップ)`
        );
        console.log("• npx hardhat checkBalances (残高確認)");
        console.log("• npx hardhat dexInfo (ペア情報確認)");
      } catch (error) {
        console.error("❌ スワップ中にエラーが発生しました:", error);
        throw error;
      }
    }
  );

/**
 * スワップの見積もりを取得するタスク
 *
 * 使用方法:
 * npx hardhat getSwapQuote --amount-in 10 --token-in TokenA --network sepolia
 */
task(
  "getSwapQuote",
  "スワップの見積もりを取得します（実際のスワップは実行しません）"
)
  .addParam("amountIn", "入力するトークン量（Ether単位）")
  .addParam("tokenIn", "入力トークン (TokenA または TokenB)")
  .setAction(
    async (
      taskArgs: { amountIn: string; tokenIn: string },
      hre: HardhatRuntimeEnvironment
    ) => {
      const network = hre.network.name;
      const { amountIn, tokenIn } = taskArgs;

      console.log(
        `💡 ${network} ネットワークでスワップ見積もりを取得します...\n`
      );
      console.log(
        `📥 入力: ${amountIn} ${tokenIn === "TokenA" ? "TKA" : "TKB"}\n`
      );

      try {
        // デプロイされたコントラクトアドレスを読み込み
        const contracts = loadDeployedContractAddresses(network);

        if (
          !contracts ||
          !contracts.tokens ||
          !contracts.dex ||
          !contracts.pairs
        ) {
          console.error(
            `❌ ${network} ネットワークのコントラクトアドレスが見つかりません`
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
        const router = (await hre.ethers.getContractAt(
          "DexRouter",
          contracts.dex.DexRouter
        )) as any;
        const pair = (await hre.ethers.getContractAt(
          "DexPair",
          contracts.pairs["TokenA-TokenB"]
        )) as any;

        // トークンの設定
        let inputToken: any;
        let outputToken: any;
        let inputSymbol: string;
        let outputSymbol: string;

        if (tokenIn === "TokenA") {
          inputToken = tokenA;
          outputToken = tokenB;
          inputSymbol = "TKA";
          outputSymbol = "TKB";
        } else if (tokenIn === "TokenB") {
          inputToken = tokenB;
          outputToken = tokenA;
          inputSymbol = "TKB";
          outputSymbol = "TKA";
        } else {
          throw new Error(
            "無効なトークン名です。TokenA または TokenB を指定してください"
          );
        }

        const amountInWei = hre.ethers.parseEther(amountIn);

        // 現在のリザーブ情報を表示
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        const tokenAAddress = await tokenA.getAddress();

        let reserveA: bigint;
        let reserveB: bigint;

        if (token0.toLowerCase() === tokenAAddress.toLowerCase()) {
          reserveA = reserves[0];
          reserveB = reserves[1];
        } else {
          reserveA = reserves[1];
          reserveB = reserves[0];
        }

        console.log("📊 現在のペア状態:");
        console.log(
          `🔸 TokenA リザーブ: ${hre.ethers.formatEther(reserveA)} TKA`
        );
        console.log(
          `🔹 TokenB リザーブ: ${hre.ethers.formatEther(reserveB)} TKB`
        );
        console.log(
          `💱 現在のレート: 1 TKA = ${(Number(hre.ethers.formatEther(reserveB)) / Number(hre.ethers.formatEther(reserveA))).toFixed(6)} TKB`
        );
        console.log(
          `💱 現在のレート: 1 TKB = ${(Number(hre.ethers.formatEther(reserveA)) / Number(hre.ethers.formatEther(reserveB))).toFixed(6)} TKA`
        );
        console.log();

        // スワップ予想量を取得
        const path = [
          await inputToken.getAddress(),
          await outputToken.getAddress(),
        ];
        const amountsOut = await router.getAmountsOut(amountInWei, path);
        const expectedAmountOut = amountsOut[1];

        console.log("💡 スワップ見積もり:");
        console.log(`📥 入力: ${amountIn} ${inputSymbol}`);
        console.log(
          `📤 予想出力: ${hre.ethers.formatEther(expectedAmountOut)} ${outputSymbol}`
        );

        // 実効レート計算
        const effectiveRate =
          Number(hre.ethers.formatEther(expectedAmountOut)) / Number(amountIn);
        console.log(
          `📈 実効レート: 1 ${inputSymbol} = ${effectiveRate.toFixed(6)} ${outputSymbol}`
        );

        // 価格インパクト計算
        const currentRate =
          inputSymbol === "TKA"
            ? Number(hre.ethers.formatEther(reserveB)) /
              Number(hre.ethers.formatEther(reserveA))
            : Number(hre.ethers.formatEther(reserveA)) /
              Number(hre.ethers.formatEther(reserveB));

        const priceImpact = Math.abs(
          ((effectiveRate - currentRate) / currentRate) * 100
        );
        console.log(`⚠️ 価格インパクト: ${priceImpact.toFixed(3)}%`);

        // 異なるスリッページでの最小出力量を表示
        console.log("\n📊 スリッページ別最小出力量:");
        for (const slip of [0.5, 1, 2, 5]) {
          const minOut =
            (expectedAmountOut * BigInt(100 - slip * 100)) / BigInt(10000);
          console.log(
            `   ${slip}%: ${hre.ethers.formatEther(minOut)} ${outputSymbol}`
          );
        }

        console.log("\n🎯 実際にスワップする場合:");
        console.log(
          `npx hardhat swapTokens --amount-in ${amountIn} --token-in ${tokenIn} --slippage 1`
        );
      } catch (error) {
        console.error("❌ 見積もり取得中にエラーが発生しました:", error);
        throw error;
      }
    }
  );
