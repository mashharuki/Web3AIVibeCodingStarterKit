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
 * Router経由で指定されたペアから流動性を除去するタスク
 * 使用例:
 * npx hardhat removeLiquidityViaRouter --token-a USDC --token-b JPYC --liquidity 1000000000000000000 --amount-a-min 950000 --amount-b-min 142500000 --network sepolia
 */
task("removeLiquidityViaRouter", "Router経由で指定されたペアから流動性を除去する")
  .addParam("tokenA", "最初のトークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("tokenB", "2番目のトークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("liquidity", "除去するLPトークンの量（最小単位）")
  .addParam("amountAMin", "tokenAの最小許容量（最小単位）")
  .addParam("amountBMin", "tokenBの最小許容量（最小単位）")
  .addOptionalParam("slippageBps", "スリッページ許容(bps: 100=1%)。推奨: 50-300", "500")
  .addOptionalParam("autoMin", "min値を自動計算して適用する (true/false)", "false")
  .addOptionalParam("preview", "送信せずに見積もりのみ表示 (true/false)", "false")
  .addOptionalParam("deadline", "トランザクションの有効期限（秒）", "1800") // デフォルト30分
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const {
      tokenA,
      tokenB,
      liquidity,
      amountAMin,
      amountBMin,
      deadline,
      slippageBps,
      autoMin,
      preview,
    } = taskArgs;
    const { network } = hre;

    console.log(`🔥 Router経由で ${tokenA}/${tokenB} ペアから流動性を除去中...`);
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

    // 金額の検証
    const liquidityBigInt = BigInt(liquidity);
    const amountAMinBigInt = BigInt(amountAMin);
    const amountBMinBigInt = BigInt(amountBMin);
    const slippageBpsBigInt = BigInt(slippageBps ?? "500");
    const autoMinEnabled = String(autoMin).toLowerCase() === "true" || String(autoMin) === "1";
    const previewOnly = String(preview).toLowerCase() === "true" || String(preview) === "1";

    if (liquidityBigInt <= 0n) {
      throw new Error("❌ 除去するLPトークン量は0より大きい値を指定してください");
    }
    if (amountAMinBigInt < 0n || amountBMinBigInt < 0n) {
      throw new Error("❌ 最小許容量は0以上の値を指定してください");
    }

    // トークンアドレスを取得
    const tokenAAddress = TOKENS[tokenA as keyof typeof TOKENS];
    const tokenBAddress = TOKENS[tokenB as keyof typeof TOKENS];

    console.log(`📍 ${tokenA} アドレス: ${tokenAAddress}`);
    console.log(`📍 ${tokenB} アドレス: ${tokenBAddress}`);
    console.log(`🔥 除去するLPトークン量: ${liquidity}`);
    console.log(`🔒 最小許容量 ${tokenA}: ${amountAMin}`);
    console.log(`🔒 最小許容量 ${tokenB}: ${amountBMin}`);

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

      // ファクトリーアドレスを取得してペアアドレスを確認
      const factoryAddress = await AMMRouter.read.factory();
      const AMMFactory = await hre.viem.getContractAt("AMMFactory", factoryAddress);
      const pairAddress = await AMMFactory.read.getPair([tokenAAddress, tokenBAddress]);

      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error(`❌ ${tokenA}/${tokenB} ペアが存在しません`);
      }

      console.log(`🎯 ペアアドレス: ${pairAddress}`);

      // ペアコントラクトに接続
      const AMMPair = await hre.viem.getContractAt("AMMPair", pairAddress);

      // 現在のLPトークン残高を確認
      const lpBalance = await AMMPair.read.balanceOf([userAddress]);
      const totalSupply = await AMMPair.read.totalSupply();

      console.log(`\n💳 現在のLPトークン残高:`);
      console.log(`   保有LPトークン: ${lpBalance.toString()}`);
      console.log(`   LPトークン総供給量: ${totalSupply.toString()}`);

      // LPトークン残高チェック
      if (lpBalance < liquidityBigInt) {
        throw new Error(
          `❌ LPトークンの残高が不足しています。必要: ${liquidity}, 現在: ${lpBalance.toString()}`
        );
      }

      // 現在のプールシェアを計算
      if (totalSupply > 0n) {
        const currentSharePercentage = (Number(lpBalance) / Number(totalSupply)) * 100;
        const removeSharePercentage = (Number(liquidityBigInt) / Number(totalSupply)) * 100;
        console.log(`   現在のプールシェア: ${currentSharePercentage.toFixed(4)}%`);
        console.log(`   除去予定のシェア: ${removeSharePercentage.toFixed(4)}%`);
      }

      // token0/token1 とリザーブを取得し、tokenA/tokenB に正しくマッピング
      const token0 = await AMMPair.read.token0();
      const token1 = await AMMPair.read.token1();
      const reserves = await AMMPair.read.getReserves();
      const tokenAIsToken0 = tokenAAddress.toLowerCase() === token0.toLowerCase();
      const reserveA = tokenAIsToken0 ? reserves[0] : reserves[1];
      const reserveB = tokenAIsToken0 ? reserves[1] : reserves[0];

      console.log(`\n📊 現在のリザーブ (tokenA/tokenB 並び):`);
      console.log(`   reserveA(${tokenA}): ${reserveA.toString()}`);
      console.log(`   reserveB(${tokenB}): ${reserveB.toString()}`);

      // 予想される返還量を計算（LP持分 × 各リザーブ / 総供給）
      const expectedAmountA = (liquidityBigInt * reserveA) / totalSupply;
      const expectedAmountB = (liquidityBigInt * reserveB) / totalSupply;

      console.log(`\n💰 予想される返還量:`);
      console.log(`   予想 ${tokenA}: ${expectedAmountA.toString()}`);
      console.log(`   予想 ${tokenB}: ${expectedAmountB.toString()}`);

      // 推奨最小許容量（slippageBps を適用）
      const ONE_BPS = 10000n;
      const recommendedAMin = (expectedAmountA * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;
      const recommendedBMin = (expectedAmountB * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;
      const slippagePctStr = (Number(slippageBpsBigInt) / 100).toString();
      console.log(
        `\n🧮 推奨最小許容量 (slippage ${slippageBpsBigInt.toString()}bps ≈ ${slippagePctStr}%):`
      );
      console.log(`   推奨 ${tokenA} Min: ${recommendedAMin.toString()}`);
      console.log(`   推奨 ${tokenB} Min: ${recommendedBMin.toString()}`);

      // preview モードではここまでの情報のみ表示して終了
      if (previewOnly) {
        console.log("\n👀 preview モード: 送信しません。再現コマンド例:");
        console.log(
          `  pnpm task:remove-liquidity:router \\\n+  --token-a ${tokenA} --token-b ${tokenB} \\\n+  --liquidity ${liquidity} \\\n+  --amount-a-min ${recommendedAMin.toString()} \\\n+  --amount-b-min ${recommendedBMin.toString()} \\\n+  --slippage-bps ${slippageBpsBigInt.toString()} \\\n+  --network ${network.name}`
        );
        return;
      }

      // auto-min の適用またはバリデーション
      let finalAmountAMin = amountAMinBigInt;
      let finalAmountBMin = amountBMinBigInt;

      if (autoMinEnabled) {
        finalAmountAMin = recommendedAMin;
        finalAmountBMin = recommendedBMin;
        console.log("\n🤖 auto-min 有効: 推奨 min を適用します");
        console.log(`   適用 AMin: ${finalAmountAMin.toString()}`);
        console.log(`   適用 BMin: ${finalAmountBMin.toString()}`);
      } else {
        if (amountAMinBigInt > expectedAmountA) {
          console.error("\n⛔ 事前検証エラー: amountAMin が高すぎます (返還見込み量を上回る)");
          console.error(
            `   指定 AMin: ${amountAMinBigInt.toString()} / 予想 A: ${expectedAmountA.toString()}`
          );
          console.error(
            `   推奨 AMin: ${recommendedAMin.toString()} (slippage ${slippageBpsBigInt.toString()}bps)`
          );
          console.error("   → 推奨値で再実行するか --auto-min true を指定してください");
          throw new Error("Pre-check failed: amountAMin exceeds expected return");
        }
        if (amountBMinBigInt > expectedAmountB) {
          console.error("\n⛔ 事前検証エラー: amountBMin が高すぎます (返還見込み量を上回る)");
          console.error(
            `   指定 BMin: ${amountBMinBigInt.toString()} / 予想 B: ${expectedAmountB.toString()}`
          );
          console.error(
            `   推奨 BMin: ${recommendedBMin.toString()} (slippage ${slippageBpsBigInt.toString()}bps)`
          );
          console.error("   → 推奨値で再実行するか --auto-min true を指定してください");
          throw new Error("Pre-check failed: amountBMin exceeds expected return");
        }
      }

      // LPトークンの承認状況を確認
      const allowance = await AMMPair.read.allowance([userAddress, routerAddress]);

      console.log(`\n🔐 現在のLPトークン承認状況:`);
      console.log(`   承認済み量: ${allowance.toString()}`);

      // 必要に応じてLPトークンの承認を実行
      if (allowance < liquidityBigInt) {
        console.log(`⏳ LPトークンの承認を実行中...`);
        const approveHash = await AMMPair.write.approve([routerAddress, liquidityBigInt]);
        console.log(`📝 LPトークン承認トランザクション: ${approveHash}`);

        const publicClient = await hre.viem.getPublicClient();
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log(`✅ LPトークンの承認完了`);
      }

      // デッドラインを計算（現在時刻 + 指定秒数）
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + parseInt(deadline);

      // トークンコントラクトに接続（返還量確認用）
      const TokenA = await hre.viem.getContractAt("IERC20", tokenAAddress);
      const TokenB = await hre.viem.getContractAt("IERC20", tokenBAddress);

      // 除去前の残高を記録
      const balanceABefore = await TokenA.read.balanceOf([userAddress]);
      const balanceBBefore = await TokenB.read.balanceOf([userAddress]);

      // Router経由で流動性を除去
      console.log(`\n⏳ Router経由で流動性除去を実行中...`);
      const removeLiquidityHash = await AMMRouter.write.removeLiquidity([
        tokenAAddress,
        tokenBAddress,
        liquidityBigInt,
        finalAmountAMin,
        finalAmountBMin,
        userAddress,
        BigInt(deadlineTimestamp),
      ]);

      console.log(`📝 流動性除去トランザクション: ${removeLiquidityHash}`);

      // トランザクションの確認を待つ
      const publicClient = await hre.viem.getPublicClient();
      const removeLiquidityReceipt = await publicClient.waitForTransactionReceipt({
        hash: removeLiquidityHash,
      });

      if (removeLiquidityReceipt.status === "success") {
        console.log(`✅ Router経由での流動性除去成功!`);
        console.log(`⛽ ガス使用量: ${removeLiquidityReceipt.gasUsed.toString()}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${removeLiquidityHash}`);

        // 除去後の残高を確認
        const balanceAAfter = await TokenA.read.balanceOf([userAddress]);
        const balanceBAfter = await TokenB.read.balanceOf([userAddress]);
        const lpBalanceAfter = await AMMPair.read.balanceOf([userAddress]);

        console.log(`\n📊 除去後の残高:`);
        console.log(`   ${tokenA}: ${balanceAAfter.toString()}`);
        console.log(`   ${tokenB}: ${balanceBAfter.toString()}`);
        console.log(`   LPトークン: ${lpBalanceAfter.toString()}`);

        // 実際に返還された量を計算
        const returnedAmountA = balanceAAfter - balanceABefore;
        const returnedAmountB = balanceBAfter - balanceBBefore;

        console.log(`\n💸 実際に返還された量:`);
        console.log(`   ${tokenA}: ${returnedAmountA.toString()}`);
        console.log(`   ${tokenB}: ${returnedAmountB.toString()}`);

        // 新しいプールシェアを計算
        const newTotalSupply = await AMMPair.read.totalSupply();
        if (newTotalSupply > 0n && lpBalanceAfter > 0n) {
          const newSharePercentage = (Number(lpBalanceAfter) / Number(newTotalSupply)) * 100;
          console.log(`   新しいプールシェア: ${newSharePercentage.toFixed(4)}%`);
        } else if (lpBalanceAfter === 0n) {
          console.log(`   プールシェア: 0% (全ての流動性を除去)`);
        }
      } else {
        console.log("❌ Router経由での流動性除去に失敗しました");
      }
    } catch (error) {
      console.error("❌ エラーが発生しました:", error);
      throw error;
    }
  });
