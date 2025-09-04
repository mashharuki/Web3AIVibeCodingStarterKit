import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../../helpers/contractsJsonHelper";

// Sepolia ネットワーク上のトークンアドレス
const TOKENS = {
  USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  JPYC: "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB",
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
} as const;

/**
 * Router経由で正確な入力量でトークンスワップを実行するタスク
 * 使用例:
 * npx hardhat swapExactTokensViaRouter --token-in USDC --token-out JPYC --amount-in 1000000 --amount-out-min 145000000 --network sepolia
 */
task("swapExactTokensViaRouter", "Router経由で正確な入力量でトークンスワップを実行する")
  .addParam("tokenIn", "入力トークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("tokenOut", "出力トークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("amountIn", "入力するトークンの量（最小単位）")
  .addParam("amountOutMin", "許容する出力トークンの最小量（最小単位）")
  .addOptionalParam("slippageBps", "スリッページ許容(bps: 100=1%)。推奨: 50-300", "500")
  .addOptionalParam("autoMin", "出力最小量を自動計算して適用する (true/false)", "false")
  .addOptionalParam("preview", "送信せずに見積もりのみ表示 (true/false)", "false")
  .addOptionalParam("deadline", "トランザクションの有効期限（秒）", "1800") // デフォルト30分
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { tokenIn, tokenOut, amountIn, amountOutMin, slippageBps, autoMin, preview, deadline } = taskArgs;
    const { network } = hre;

    console.log(`🔄 Router経由で ${tokenIn} → ${tokenOut} スワップを実行中...`);
    console.log(`📡 ネットワーク: ${network.name}`);

    // トークンシンボルの検証
    if (!TOKENS[tokenIn as keyof typeof TOKENS]) {
      throw new Error(`❌ 無効な入力トークン: ${tokenIn}. 利用可能: ${Object.keys(TOKENS).join(", ")}`);
    }
    if (!TOKENS[tokenOut as keyof typeof TOKENS]) {
      throw new Error(`❌ 無効な出力トークン: ${tokenOut}. 利用可能: ${Object.keys(TOKENS).join(", ")}`);
    }
    if (tokenIn === tokenOut) {
      throw new Error("❌ 同じトークン間でスワップすることはできません");
    }

    // 金額の検証
    const amountInBigInt = BigInt(amountIn);
    const amountOutMinBigInt = BigInt(amountOutMin);
    const slippageBpsBigInt = BigInt(slippageBps ?? "500");
    const autoMinEnabled = String(autoMin).toLowerCase() === "true" || String(autoMin) === "1";
    const previewOnly = String(preview).toLowerCase() === "true" || String(preview) === "1";
    
    if (amountInBigInt <= 0n) {
      throw new Error("❌ 入力量は0より大きい値を指定してください");
    }
    if (amountOutMinBigInt < 0n) {
      throw new Error("❌ 最小出力量は0以上の値を指定してください");
    }

    // トークンアドレスを取得
    const tokenInAddress = TOKENS[tokenIn as keyof typeof TOKENS];
    const tokenOutAddress = TOKENS[tokenOut as keyof typeof TOKENS];

    console.log(`📍 ${tokenIn} アドレス: ${tokenInAddress}`);
    console.log(`📍 ${tokenOut} アドレス: ${tokenOutAddress}`);
    console.log(`💰 入力量 ${tokenIn}: ${amountIn}`);
    console.log(`🔒 最小出力量 ${tokenOut}: ${amountOutMin}`);
    console.log(`⚙️  slippage: ${slippageBpsBigInt.toString()} bps${autoMinEnabled ? " (auto-min 有効)" : ""}${previewOnly ? " (preview)" : ""}`);

    try {
      // デプロイ済みコントラクトアドレスを読み込み
      const deployedContracts = loadDeployedContractAddresses(network.name);
      const routerAddress = deployedContracts.contracts.AMMRouter;

      console.log(`🛣️  Router アドレス: ${routerAddress}`);

      // AMMRouter コントラクトに接続
      const AMMRouter = await hre.viem.getContractAt("AMMRouter", routerAddress);

      // ウォレットクライアントを取得
      const [walletClient] = await hre.viem.getWalletClients();
      const userAddress = walletClient.account.address;

      // スワップパスを作成（直接ペア）
      const path = [tokenInAddress, tokenOutAddress];

      // 予想される出力量を計算
      console.log(`\n📊 スワップ情報を計算中...`);
      const amounts = await AMMRouter.read.getAmountsOut([amountInBigInt, path]);
      const expectedAmountOut = amounts[1];

      console.log(`💡 予想される出力量: ${expectedAmountOut.toString()}`);

      // 推奨最小出力量: expected × (1 - slippage)
      const ONE_BPS = 10000n;
      const recommendedAmountOutMin = (expectedAmountOut * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;
      const slippagePctStr = (Number(slippageBpsBigInt) / 100).toString();
      console.log(`🧮 推奨最小出力量 (slippage ${slippageBpsBigInt.toString()}bps ≈ ${slippagePctStr}%): ${recommendedAmountOutMin.toString()}`);

      let finalAmountOutMin = amountOutMinBigInt;
      if (autoMinEnabled) {
        finalAmountOutMin = recommendedAmountOutMin;
        console.log(`🤖 auto-min 適用: amountOutMin = ${finalAmountOutMin.toString()}`);
      } else if (!previewOnly && expectedAmountOut < amountOutMinBigInt) {
        throw new Error(`❌ スリッページが大きすぎます。予想出力量: ${expectedAmountOut.toString()}, 最小許容量: ${amountOutMin}`);
      }

      // トークンコントラクトに接続
      const TokenIn = await hre.viem.getContractAt("IERC20", tokenInAddress);
      const TokenOut = await hre.viem.getContractAt("IERC20", tokenOutAddress);

      // 現在の残高を確認
      const balanceInBefore = await TokenIn.read.balanceOf([userAddress]);
      const balanceOutBefore = await TokenOut.read.balanceOf([userAddress]);

      console.log(`\n💳 スワップ前の残高:`);
      console.log(`   ${tokenIn}: ${balanceInBefore.toString()}`);
      console.log(`   ${tokenOut}: ${balanceOutBefore.toString()}`);

      // 残高チェック（preview時は警告のみ）
      if (balanceInBefore < amountInBigInt) {
        const msg = `❌ ${tokenIn}の残高が不足しています。必要: ${amountIn}, 現在: ${balanceInBefore.toString()}`;
        if (!previewOnly) throw new Error(msg);
        console.warn(`⚠️  preview: ${msg}`);
      }

      // 承認状況（previewではスキップ）
      if (!previewOnly) {
        const allowance = await TokenIn.read.allowance([userAddress, routerAddress]);
        console.log(`\n🔐 現在の承認状況:`);
        console.log(`   ${tokenIn}: ${allowance.toString()}`);
        if (allowance < amountInBigInt) {
          console.log(`⏳ ${tokenIn}の承認を実行中...`);
          const approveHash = await TokenIn.write.approve([routerAddress, amountInBigInt]);
          console.log(`📝 ${tokenIn}承認トランザクション: ${approveHash}`);
          
          const publicClient = await hre.viem.getPublicClient();
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log(`✅ ${tokenIn}の承認完了`);
        }
      } else {
        console.log("\n🔐 preview モード: 承認チェックと送信は行いません");
        console.log("▶️  再現コマンド例 (min 指定)");
        console.log(
          `  pnpm task:swap-exact:router \\\n+  --token-in ${tokenIn} --token-out ${tokenOut} \\\n+  --amount-in ${amountIn} --amount-out-min ${recommendedAmountOutMin.toString()} \\\n+  --slippage-bps ${slippageBpsBigInt.toString()} \\\n+  --network ${network.name}`
        );
        console.log("\n▶️  再現コマンド例 (auto-min 採用)");
        console.log(
          `  pnpm task:swap-exact:router \\\n+  --token-in ${tokenIn} --token-out ${tokenOut} \\\n+  --amount-in ${amountIn} --amount-out-min 1 \\\n+  --slippage-bps ${slippageBpsBigInt.toString()} --auto-min true \\\n+  --network ${network.name}`
        );
        return;
      }

      // デッドラインを計算（現在時刻 + 指定秒数）
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + parseInt(deadline);

      // Router経由でスワップを実行
      console.log(`\n⏳ Router経由でスワップを実行中...`);
      const swapHash = await AMMRouter.write.swapExactTokensForTokens([
        amountInBigInt,
        finalAmountOutMin,
        path,
        userAddress,
        BigInt(deadlineTimestamp)
      ]);

      console.log(`📝 スワップトランザクション: ${swapHash}`);

      // トランザクションの確認を待つ
      const publicClient = await hre.viem.getPublicClient();
      const swapReceipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });

      if (swapReceipt.status === "success") {
        console.log(`✅ Router経由でのスワップ成功!`);
        console.log(`⛽ ガス使用量: ${swapReceipt.gasUsed.toString()}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${swapHash}`);

        // スワップ後の残高を確認
        const balanceInAfter = await TokenIn.read.balanceOf([userAddress]);
        const balanceOutAfter = await TokenOut.read.balanceOf([userAddress]);

        console.log(`\n📊 スワップ後の残高:`);
        console.log(`   ${tokenIn}: ${balanceInAfter.toString()}`);
        console.log(`   ${tokenOut}: ${balanceOutAfter.toString()}`);

        // 実際の交換量を計算
        const actualAmountIn = balanceInBefore - balanceInAfter;
        const actualAmountOut = balanceOutAfter - balanceOutBefore;

        console.log(`\n💸 実際の交換量:`);
        console.log(`   消費した${tokenIn}: ${actualAmountIn.toString()}`);
        console.log(`   取得した${tokenOut}: ${actualAmountOut.toString()}`);

        // 実際の交換レートを計算
        if (actualAmountIn > 0n) {
          const exchangeRate = Number(actualAmountOut) / Number(actualAmountIn);
          console.log(`   交換レート: 1 ${tokenIn} = ${exchangeRate.toFixed(6)} ${tokenOut}`);
        }

        // 実際のスリッページを計算
        if (expectedAmountOut > 0n) {
          const actualSlippage = ((Number(expectedAmountOut) - Number(actualAmountOut)) / Number(expectedAmountOut)) * 100;
          console.log(`   実際のスリッページ: ${actualSlippage.toFixed(4)}%`);
        }

      } else {
        console.log("❌ Router経由でのスワップに失敗しました");
      }

    } catch (error) {
      console.error("❌ エラーが発生しました:", error);
      throw error;
    }
  });

/**
 * Router経由で正確な出力量でトークンスワップを実行するタスク
 * 使用例:
 * npx hardhat swapTokensForExactViaRouter --token-in USDC --token-out JPYC --amount-out 150000000 --amount-in-max 1050000 --network sepolia
 */
task("swapTokensForExactViaRouter", "Router経由で正確な出力量でトークンスワップを実行する")
  .addParam("tokenIn", "入力トークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("tokenOut", "出力トークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("amountOut", "出力するトークンの量（最小単位）")
  .addParam("amountInMax", "許容する入力トークンの最大量（最小単位）")
  .addOptionalParam("slippageBps", "スリッページ許容(bps: 100=1%)。推奨: 50-300", "500")
  .addOptionalParam("autoMax", "入力最大量を自動計算して適用する (true/false)", "false")
  .addOptionalParam("preview", "送信せずに見積もりのみ表示 (true/false)", "false")
  .addOptionalParam("deadline", "トランザクションの有効期限（秒）", "1800") // デフォルト30分
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { tokenIn, tokenOut, amountOut, amountInMax, slippageBps, autoMax, preview, deadline } = taskArgs;
    const { network } = hre;

    console.log(`🔄 Router経由で ${tokenIn} → ${tokenOut} 正確な出力量スワップを実行中...`);
    console.log(`📡 ネットワーク: ${network.name}`);

    // トークンシンボルの検証
    if (!TOKENS[tokenIn as keyof typeof TOKENS]) {
      throw new Error(`❌ 無効な入力トークン: ${tokenIn}. 利用可能: ${Object.keys(TOKENS).join(", ")}`);
    }
    if (!TOKENS[tokenOut as keyof typeof TOKENS]) {
      throw new Error(`❌ 無効な出力トークン: ${tokenOut}. 利用可能: ${Object.keys(TOKENS).join(", ")}`);
    }
    if (tokenIn === tokenOut) {
      throw new Error("❌ 同じトークン間でスワップすることはできません");
    }

    // 金額の検証
    const amountOutBigInt = BigInt(amountOut);
    const amountInMaxBigInt = BigInt(amountInMax);
    const slippageBpsBigInt = BigInt(slippageBps ?? "500");
    const autoMaxEnabled = String(autoMax).toLowerCase() === "true" || String(autoMax) === "1";
    const previewOnly = String(preview).toLowerCase() === "true" || String(preview) === "1";
    
    if (amountOutBigInt <= 0n) {
      throw new Error("❌ 出力量は0より大きい値を指定してください");
    }
    if (amountInMaxBigInt <= 0n) {
      throw new Error("❌ 最大入力量は0より大きい値を指定してください");
    }

    // トークンアドレスを取得
    const tokenInAddress = TOKENS[tokenIn as keyof typeof TOKENS];
    const tokenOutAddress = TOKENS[tokenOut as keyof typeof TOKENS];

    console.log(`📍 ${tokenIn} アドレス: ${tokenInAddress}`);
    console.log(`📍 ${tokenOut} アドレス: ${tokenOutAddress}`);
    console.log(`🎯 希望出力量 ${tokenOut}: ${amountOut}`);
    console.log(`🔒 最大入力量 ${tokenIn}: ${amountInMax}`);
    console.log(`⚙️  slippage: ${slippageBpsBigInt.toString()} bps${autoMaxEnabled ? " (auto-max 有効)" : ""}${previewOnly ? " (preview)" : ""}`);

    try {
      // デプロイ済みコントラクトアドレスを読み込み
      const deployedContracts = loadDeployedContractAddresses(network.name);
      const routerAddress = deployedContracts.contracts.AMMRouter;

      console.log(`🛣️  Router アドレス: ${routerAddress}`);

      // AMMRouter コントラクトに接続
      const AMMRouter = await hre.viem.getContractAt("AMMRouter", routerAddress);

      // ウォレットクライアントを取得
      const [walletClient] = await hre.viem.getWalletClients();
      const userAddress = walletClient.account.address;

      // スワップパスを作成（直接ペア）
      const path = [tokenInAddress, tokenOutAddress];

      // 必要な入力量を計算
      console.log(`\n📊 スワップ情報を計算中...`);
      const amounts = await AMMRouter.read.getAmountsIn([amountOutBigInt, path]);
      const requiredAmountIn = amounts[0];

      console.log(`💡 必要な入力量: ${requiredAmountIn.toString()}`);

      // 推奨最大入力量: required × (1 + slippage)
      const ONE_BPS = 10000n;
      // 丸め上げして安全側に
      const recommendedAmountInMax = (requiredAmountIn * (ONE_BPS + slippageBpsBigInt) + (ONE_BPS - 1n)) / ONE_BPS;
      const slippagePctStr = (Number(slippageBpsBigInt) / 100).toString();
      console.log(`🧮 推奨最大入力量 (slippage ${slippageBpsBigInt.toString()}bps ≈ ${slippagePctStr}%): ${recommendedAmountInMax.toString()}`);

      let finalAmountInMax = amountInMaxBigInt;
      if (autoMaxEnabled) {
        finalAmountInMax = recommendedAmountInMax;
        console.log(`🤖 auto-max 適用: amountInMax = ${finalAmountInMax.toString()}`);
      } else if (!previewOnly && requiredAmountIn > amountInMaxBigInt) {
        throw new Error(`❌ 必要な入力量が最大許容量を超えています。必要: ${requiredAmountIn.toString()}, 最大許容: ${amountInMax}`);
      }

      // トークンコントラクトに接続
      const TokenIn = await hre.viem.getContractAt("IERC20", tokenInAddress);
      const TokenOut = await hre.viem.getContractAt("IERC20", tokenOutAddress);

      // 現在の残高を確認
      const balanceInBefore = await TokenIn.read.balanceOf([userAddress]);
      const balanceOutBefore = await TokenOut.read.balanceOf([userAddress]);

      console.log(`\n💳 スワップ前の残高:`);
      console.log(`   ${tokenIn}: ${balanceInBefore.toString()}`);
      console.log(`   ${tokenOut}: ${balanceOutBefore.toString()}`);

      // 残高チェック（preview時は警告のみ）
      if (balanceInBefore < requiredAmountIn) {
        const msg = `❌ ${tokenIn}の残高が不足しています。必要: ${requiredAmountIn.toString()}, 現在: ${balanceInBefore.toString()}`;
        if (!previewOnly) throw new Error(msg);
        console.warn(`⚠️  preview: ${msg}`);
      }

      // 承認状況（previewではスキップ）
      if (!previewOnly) {
        const allowance = await TokenIn.read.allowance([userAddress, routerAddress]);
        console.log(`\n🔐 現在の承認状況:`);
        console.log(`   ${tokenIn}: ${allowance.toString()}`);
        if (allowance < finalAmountInMax) {
          console.log(`⏳ ${tokenIn}の承認を実行中...`);
          const approveHash = await TokenIn.write.approve([routerAddress, finalAmountInMax]);
          console.log(`📝 ${tokenIn}承認トランザクション: ${approveHash}`);
          
          const publicClient = await hre.viem.getPublicClient();
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log(`✅ ${tokenIn}の承認完了`);
        }
      } else {
        console.log("\n🔐 preview モード: 承認チェックと送信は行いません");
        console.log("▶️  再現コマンド例 (max 指定)");
        console.log(
          `  pnpm task:swap-for-exact:router \\\n+  --token-in ${tokenIn} --token-out ${tokenOut} \\\n+  --amount-out ${amountOut} --amount-in-max ${recommendedAmountInMax.toString()} \\\n+  --slippage-bps ${slippageBpsBigInt.toString()} \\\n+  --network ${network.name}`
        );
        console.log("\n▶️  再現コマンド例 (auto-max 採用)");
        console.log(
          `  pnpm task:swap-for-exact:router \\\n+  --token-in ${tokenIn} --token-out ${tokenOut} \\\n+  --amount-out ${amountOut} --amount-in-max 1 \\\n+  --slippage-bps ${slippageBpsBigInt.toString()} --auto-max true \\\n+  --network ${network.name}`
        );
        return;
      }

      // デッドラインを計算（現在時刻 + 指定秒数）
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + parseInt(deadline);

      // Router経由でスワップを実行
      console.log(`\n⏳ Router経由で正確な出力量スワップを実行中...`);
      const swapHash = await AMMRouter.write.swapTokensForExactTokens([
        amountOutBigInt,
        finalAmountInMax,
        path,
        userAddress,
        BigInt(deadlineTimestamp)
      ]);

      console.log(`📝 スワップトランザクション: ${swapHash}`);

      // トランザクションの確認を待つ
      const publicClient = await hre.viem.getPublicClient();
      const swapReceipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });

      if (swapReceipt.status === "success") {
        console.log(`✅ Router経由での正確な出力量スワップ成功!`);
        console.log(`⛽ ガス使用量: ${swapReceipt.gasUsed.toString()}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${swapHash}`);

        // スワップ後の残高を確認
        const balanceInAfter = await TokenIn.read.balanceOf([userAddress]);
        const balanceOutAfter = await TokenOut.read.balanceOf([userAddress]);

        console.log(`\n📊 スワップ後の残高:`);
        console.log(`   ${tokenIn}: ${balanceInAfter.toString()}`);
        console.log(`   ${tokenOut}: ${balanceOutAfter.toString()}`);

        // 実際の交換量を計算
        const actualAmountIn = balanceInBefore - balanceInAfter;
        const actualAmountOut = balanceOutAfter - balanceOutBefore;

        console.log(`\n💸 実際の交換量:`);
        console.log(`   消費した${tokenIn}: ${actualAmountIn.toString()}`);
        console.log(`   取得した${tokenOut}: ${actualAmountOut.toString()}`);

        // 実際の交換レートを計算
        if (actualAmountIn > 0n) {
          const exchangeRate = Number(actualAmountOut) / Number(actualAmountIn);
          console.log(`   交換レート: 1 ${tokenIn} = ${exchangeRate.toFixed(6)} ${tokenOut}`);
        }

        // 予想との差異を確認
        console.log(`\n📈 予想との比較:`);
        console.log(`   予想入力量: ${requiredAmountIn.toString()}`);
        console.log(`   実際入力量: ${actualAmountIn.toString()}`);
        console.log(`   希望出力量: ${amountOut}`);
        console.log(`   実際出力量: ${actualAmountOut.toString()}`);

      } else {
        console.log("❌ Router経由での正確な出力量スワップに失敗しました");
      }

    } catch (error) {
      console.error("❌ エラーが発生しました:", error);
      throw error;
    }
  });
