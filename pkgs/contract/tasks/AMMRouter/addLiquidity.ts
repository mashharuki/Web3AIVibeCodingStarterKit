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
 * Router経由で指定されたペアに流動性を追加するタスク
 * 使用例:
 * npx hardhat addLiquidityViaRouter --token-a USDC --token-b JPYC --amount-a-desired 1000000 --amount-b-desired 150000000 --amount-a-min 950000 --amount-b-min 142500000 --network sepolia
 */
task("addLiquidityViaRouter", "Router経由で指定されたペアに流動性を追加する")
  .addParam("tokenA", "最初のトークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("tokenB", "2番目のトークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("amountADesired", "tokenAの希望追加量（最小単位）")
  .addParam("amountBDesired", "tokenBの希望追加量（最小単位）")
  .addParam("amountAMin", "tokenAの最小許容量（最小単位）")
  .addParam("amountBMin", "tokenBの最小許容量（最小単位）")
  .addOptionalParam("slippageBps", "スリッページ許容(bps: 100=1%)。推奨: 50-300", "500")
  .addOptionalParam("preview", "送信せずに見積もりのみ表示 (true/false)", "false")
  .addOptionalParam("autoMin", "min値を自動計算して適用する (true/false)", "false")
  .addOptionalParam("deadline", "トランザクションの有効期限（秒）", "1800") // デフォルト30分
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const {
      tokenA,
      tokenB,
      amountADesired,
      amountBDesired,
      amountAMin,
      amountBMin,
      deadline,
      slippageBps,
      preview,
      autoMin,
    } = taskArgs;
    const { network } = hre;

    console.log(`🚀 Router経由で ${tokenA}/${tokenB} ペアに流動性を追加中...`);
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
    const amountADesiredBigInt = BigInt(amountADesired);
    const amountBDesiredBigInt = BigInt(amountBDesired);
    const amountAMinBigInt = BigInt(amountAMin);
    const amountBMinBigInt = BigInt(amountBMin);
    const slippageBpsBigInt = BigInt(slippageBps);
    const autoMinEnabled = String(autoMin).toLowerCase() === "true" || String(autoMin) === "1";
    const previewOnly = String(preview).toLowerCase() === "true" || String(preview) === "1";

    if (amountADesiredBigInt <= 0n || amountBDesiredBigInt <= 0n) {
      throw new Error("❌ 希望追加量は0より大きい値を指定してください");
    }
    if (amountAMinBigInt <= 0n || amountBMinBigInt <= 0n) {
      throw new Error("❌ 最小許容量は0より大きい値を指定してください");
    }
    if (amountAMinBigInt > amountADesiredBigInt || amountBMinBigInt > amountBDesiredBigInt) {
      throw new Error("❌ 最小許容量は希望量以下である必要があります");
    }

    // トークンアドレスを取得
    const tokenAAddress = TOKENS[tokenA as keyof typeof TOKENS];
    const tokenBAddress = TOKENS[tokenB as keyof typeof TOKENS];

    console.log(`📍 ${tokenA} アドレス: ${tokenAAddress}`);
    console.log(`📍 ${tokenB} アドレス: ${tokenBAddress}`);
    console.log(`💰 希望追加量 ${tokenA}: ${amountADesired}`);
    console.log(`💰 希望追加量 ${tokenB}: ${amountBDesired}`);
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

      // トークンコントラクトに接続
      const TokenA = await hre.viem.getContractAt("IERC20", tokenAAddress);
      const TokenB = await hre.viem.getContractAt("IERC20", tokenBAddress);

      // 現在の残高を確認
      const balanceA = await TokenA.read.balanceOf([userAddress]);
      const balanceB = await TokenB.read.balanceOf([userAddress]);

      console.log(`\n💳 現在の残高:`);
      console.log(`   ${tokenA}: ${balanceA.toString()}`);
      console.log(`   ${tokenB}: ${balanceB.toString()}`);

      // 残高チェック
      if (balanceA < amountADesiredBigInt) {
        const msg = `❌ ${tokenA}の残高が不足しています。必要: ${amountADesired}, 現在: ${balanceA.toString()}`;
        if (!previewOnly) throw new Error(msg);
        console.warn(`⚠️  preview: ${msg}`);
      }
      if (balanceB < amountBDesiredBigInt) {
        const msg = `❌ ${tokenB}の残高が不足しています。必要: ${amountBDesired}, 現在: ${balanceB.toString()}`;
        if (!previewOnly) throw new Error(msg);
        console.warn(`⚠️  preview: ${msg}`);
      }

      // 承認状況（previewではスキップ）
      let allowanceA = 0n;
      let allowanceB = 0n;
      if (!previewOnly) {
        allowanceA = await TokenA.read.allowance([userAddress, routerAddress]);
        allowanceB = await TokenB.read.allowance([userAddress, routerAddress]);

        console.log(`\n🔐 現在の承認状況:`);
        console.log(`   ${tokenA}: ${allowanceA.toString()}`);
        console.log(`   ${tokenB}: ${allowanceB.toString()}`);

        // 必要に応じて承認を実行
        if (allowanceA < amountADesiredBigInt) {
          console.log(`⏳ ${tokenA}の承認を実行中...`);
          const approveHashA = await TokenA.write.approve([routerAddress, amountADesiredBigInt]);
          console.log(`📝 ${tokenA}承認トランザクション: ${approveHashA}`);

          const publicClient = await hre.viem.getPublicClient();
          await publicClient.waitForTransactionReceipt({ hash: approveHashA });
          console.log(`✅ ${tokenA}の承認完了`);
        }

        if (allowanceB < amountBDesiredBigInt) {
          console.log(`⏳ ${tokenB}の承認を実行中...`);
          const approveHashB = await TokenB.write.approve([routerAddress, amountBDesiredBigInt]);
          console.log(`📝 ${tokenB}承認トランザクション: ${approveHashB}`);

          const publicClient = await hre.viem.getPublicClient();
          await publicClient.waitForTransactionReceipt({ hash: approveHashB });
          console.log(`✅ ${tokenB}の承認完了`);
        }
      } else {
        console.log("\n🔐 preview モード: 承認チェックと送信は行いません");
      }

      // 事前検証: 既存プールのリザーブと希望量から、実際に使用される最適量を算出
      // 最小許容量が最適量を上回っている場合、コントラクトでリバートするため先に検知してガイドを表示
      let finalAmountAMin = amountAMinBigInt;
      let finalAmountBMin = amountBMinBigInt;
      let previewAmountAUsed = amountADesiredBigInt;
      let previewAmountBUsed = amountBDesiredBigInt;
      let previewBranch: "BOptimal" | "AOptimal" | "Initial" = "Initial";

      try {
        const factoryAddress = await AMMRouter.read.factory();
        const AMMFactory = await hre.viem.getContractAt("AMMFactory", factoryAddress);
        const pairAddress = await AMMFactory.read.getPair([tokenAAddress, tokenBAddress]);

        if (pairAddress !== "0x0000000000000000000000000000000000000000") {
          const AMMPair = await hre.viem.getContractAt("AMMPair", pairAddress);
          const reserves = await AMMPair.read.getReserves();
          let reserveA = reserves[0];
          let reserveB = reserves[1];

          // tokenA, tokenB のアドレス順に合わせる
          if (tokenAAddress.toLowerCase() > tokenBAddress.toLowerCase()) {
            reserveA = reserves[1];
            reserveB = reserves[0];
          }

          console.log("\n📊 現在のプールリザーブ (tokenA/tokenB 並び):");
          console.log(`   reserveA(${tokenA}): ${reserveA.toString()}`);
          console.log(`   reserveB(${tokenB}): ${reserveB.toString()}`);

          if (reserveA > 0n && reserveB > 0n) {
            const ONE_BPS = 10000n;

            // tokenA を基準にした最適 tokenB 量
            const amountBOptimal = await AMMRouter.read.quote([
              amountADesiredBigInt,
              reserveA,
              reserveB,
            ]);

            // tokenB を基準にした最適 tokenA 量
            const amountAOptimal = await AMMRouter.read.quote([
              amountBDesiredBigInt,
              reserveB,
              reserveA,
            ]);

            console.log("\n🧮 最適量の試算:");
            console.log(
              `   amountBOptimal (A=${amountADesired} のとき): ${amountBOptimal.toString()}`
            );
            console.log(
              `   amountAOptimal (B=${amountBDesired} のとき): ${amountAOptimal.toString()}`
            );

            // どちらの枝に入るかを事前に評価
            if (amountBOptimal <= amountBDesiredBigInt) {
              previewBranch = "BOptimal";
              previewAmountAUsed = amountADesiredBigInt;
              previewAmountBUsed = amountBOptimal;
              const recommendedBMin = (amountBOptimal * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;
              const slippagePctStr = (Number(slippageBps) / 100).toString();
              const recommendedAMin =
                (amountADesiredBigInt * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;
              if (autoMinEnabled) {
                // 分岐: A は希望量、B は最適量
                finalAmountAMin = recommendedAMin;
                finalAmountBMin = recommendedBMin;
                console.log("\n🤖 auto-min 有効: 分岐Bを検出 (BOptimal 使用)");
                console.log(
                  `   適用 AMin: ${finalAmountAMin.toString()}  (A希望=${amountADesired})`
                );
                console.log(
                  `   適用 BMin: ${finalAmountBMin.toString()}  (BOptimal=${amountBOptimal.toString()})`
                );
              } else if (!previewOnly && amountBMinBigInt > amountBOptimal) {
                console.error(
                  "\n⛔ 事前検証エラー: amountBMin が大きすぎます (AMMRouter: INSUFFICIENT_B_AMOUNT になります)"
                );
                console.error(`   指定 amountBMin: ${amountBMinBigInt.toString()}`);
                console.error(`   最適 B 使用量:  ${amountBOptimal.toString()}`);
                console.error(
                  `   推奨 amountBMin (slippage ${slippageBps}bps ≈ ${slippagePctStr}%): ${recommendedBMin.toString()}`
                );
                console.error("   → 次の値で再実行してください: ");
                console.error(
                  `      --amount-a-desired ${amountADesired} --amount-b-desired ${amountBDesired} --amount-a-min ${amountAMin} --amount-b-min ${recommendedBMin.toString()}`
                );
                throw new Error(
                  "Pre-check failed: amountBMin is greater than amountBOptimal for current pool price"
                );
              }
            } else {
              previewBranch = "AOptimal";
              previewAmountAUsed = amountAOptimal;
              previewAmountBUsed = amountBDesiredBigInt;
              const recommendedAMin = (amountAOptimal * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;
              const slippagePctStr = (Number(slippageBps) / 100).toString();
              if (autoMinEnabled) {
                // 分岐: A は最適量、B は希望量
                const recommendedBMin =
                  (amountBDesiredBigInt * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;
                finalAmountAMin = recommendedAMin;
                finalAmountBMin = recommendedBMin;
                console.log("\n🤖 auto-min 有効: 分岐Aを検出 (AOptimal 使用)");
                console.log(
                  `   適用 AMin: ${finalAmountAMin.toString()}  (AOptimal=${amountAOptimal.toString()})`
                );
                console.log(
                  `   適用 BMin: ${finalAmountBMin.toString()}  (B希望=${amountBDesired})`
                );
              } else if (!previewOnly && amountAMinBigInt > amountAOptimal) {
                console.error(
                  "\n⛔ 事前検証エラー: amountAMin が大きすぎます (AMMRouter: INSUFFICIENT_A_AMOUNT になります)"
                );
                console.error(`   指定 amountAMin: ${amountAMinBigInt.toString()}`);
                console.error(`   最適 A 使用量:  ${amountAOptimal.toString()}`);
                console.error(
                  `   推奨 amountAMin (slippage ${slippageBps}bps ≈ ${slippagePctStr}%): ${recommendedAMin.toString()}`
                );
                console.error("   → 次の値で再実行してください: ");
                console.error(
                  `      --amount-a-desired ${amountADesired} --amount-b-desired ${amountBDesired} --amount-a-min ${recommendedAMin.toString()} --amount-b-min ${amountBMin}`
                );
                throw new Error(
                  "Pre-check failed: amountAMin is greater than amountAOptimal for current pool price"
                );
              }
            }
          } else {
            // 初回流動性またはゼロリザーブ
            previewBranch = "Initial";
            previewAmountAUsed = amountADesiredBigInt;
            previewAmountBUsed = amountBDesiredBigInt;
            if (autoMinEnabled) {
              const ONE_BPS = 10000n;
              finalAmountAMin = (amountADesiredBigInt * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;
              finalAmountBMin = (amountBDesiredBigInt * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;
              console.log("\n🤖 auto-min 有効: 初回/ゼロリザーブ。希望量を基準に min を設定");
              console.log(`   適用 AMin: ${finalAmountAMin.toString()}  (A希望=${amountADesired})`);
              console.log(`   適用 BMin: ${finalAmountBMin.toString()}  (B希望=${amountBDesired})`);
            }
          }
        }
      } catch (preCheckError) {
        // auto-min 無効時は中断、auto-min 有効時は続行（min は希望量ベースにフォールバック）
        if (!autoMinEnabled && !previewOnly) throw preCheckError;
        const ONE_BPS = 10000n;
        finalAmountAMin = (amountADesiredBigInt * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;
        finalAmountBMin = (amountBDesiredBigInt * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;
        console.log(
          "\n⚠️  リザーブ事前取得に失敗。auto-min/preview により希望量ベースで min を算出"
        );
        console.log(`   適用 AMin: ${finalAmountAMin.toString()}`);
        console.log(`   適用 BMin: ${finalAmountBMin.toString()}`);
      }

      // preview モード: ここまでの計算結果を表示して終了
      if (previewOnly) {
        const ONE_BPS = 10000n;
        const recAMin = (previewAmountAUsed * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;
        const recBMin = (previewAmountBUsed * (ONE_BPS - slippageBpsBigInt)) / ONE_BPS;

        console.log("\n👀 addLiquidity preview 結果:");
        console.log(`   分岐: ${previewBranch}`);
        console.log(`   使用予定 amountA: ${previewAmountAUsed.toString()}`);
        console.log(`   使用予定 amountB: ${previewAmountBUsed.toString()}`);
        console.log(
          `   推奨 amountAMin: ${recAMin.toString()}  (slippage ${slippageBpsBigInt.toString()}bps)`
        );
        console.log(
          `   推奨 amountBMin: ${recBMin.toString()}  (slippage ${slippageBpsBigInt.toString()}bps)`
        );
        console.log("\n▶️  再現コマンド例 (min 指定)");
        console.log(
          `  pnpm task:add-liquidity:router \\\n+  --token-a ${tokenA} --token-b ${tokenB} \\\n+  --amount-a-desired ${amountADesired} --amount-b-desired ${amountBDesired} \\\n+  --amount-a-min ${recAMin.toString()} --amount-b-min ${recBMin.toString()} \\\n+  --slippage-bps ${slippageBpsBigInt.toString()} \\\n+  --network ${network.name}`
        );
        console.log("\n▶️  再現コマンド例 (auto-min 採用)");
        console.log(
          `  pnpm task:add-liquidity:router \\\n+  --token-a ${tokenA} --token-b ${tokenB} \\\n+  --amount-a-desired ${amountADesired} --amount-b-desired ${amountBDesired} \\\n+  --amount-a-min 1 --amount-b-min 1 \\\n+  --slippage-bps ${slippageBpsBigInt.toString()} --auto-min true \\\n+  --network ${network.name}`
        );
        return;
      }

      // デッドラインを計算（現在時刻 + 指定秒数）
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + parseInt(deadline);

      // Router経由で流動性を追加
      console.log(`\n⏳ Router経由で流動性追加を実行中...`);
      const addLiquidityHash = await AMMRouter.write.addLiquidity([
        tokenAAddress,
        tokenBAddress,
        amountADesiredBigInt,
        amountBDesiredBigInt,
        finalAmountAMin,
        finalAmountBMin,
        userAddress,
        BigInt(deadlineTimestamp),
      ]);

      console.log(`📝 流動性追加トランザクション: ${addLiquidityHash}`);

      // トランザクションの確認を待つ
      const publicClient = await hre.viem.getPublicClient();
      const addLiquidityReceipt = await publicClient.waitForTransactionReceipt({
        hash: addLiquidityHash,
      });

      if (addLiquidityReceipt.status === "success") {
        console.log(`✅ Router経由での流動性追加成功!`);
        console.log(`⛽ ガス使用量: ${addLiquidityReceipt.gasUsed.toString()}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${addLiquidityHash}`);

        // 追加後の残高を確認
        const newBalanceA = await TokenA.read.balanceOf([userAddress]);
        const newBalanceB = await TokenB.read.balanceOf([userAddress]);

        console.log(`\n📊 追加後の残高:`);
        console.log(`   ${tokenA}: ${newBalanceA.toString()}`);
        console.log(`   ${tokenB}: ${newBalanceB.toString()}`);

        // 実際に使用された量を計算
        const usedAmountA = balanceA - newBalanceA;
        const usedAmountB = balanceB - newBalanceB;

        console.log(`\n💸 実際に使用された量:`);
        console.log(`   ${tokenA}: ${usedAmountA.toString()}`);
        console.log(`   ${tokenB}: ${usedAmountB.toString()}`);

        // ペアアドレスを取得してLPトークン残高を確認
        const factoryAddress = await AMMRouter.read.factory();
        const AMMFactory = await hre.viem.getContractAt("AMMFactory", factoryAddress);
        const pairAddress = await AMMFactory.read.getPair([tokenAAddress, tokenBAddress]);

        if (pairAddress !== "0x0000000000000000000000000000000000000000") {
          const AMMPair = await hre.viem.getContractAt("AMMPair", pairAddress);
          const lpBalance = await AMMPair.read.balanceOf([userAddress]);
          const totalSupply = await AMMPair.read.totalSupply();

          console.log(`\n🎯 LPトークン情報:`);
          console.log(`   ペアアドレス: ${pairAddress}`);
          console.log(`   取得したLPトークン: ${lpBalance.toString()}`);
          console.log(`   LPトークン総供給量: ${totalSupply.toString()}`);

          // プールシェアを計算
          if (totalSupply > 0n) {
            const sharePercentage = (Number(lpBalance) / Number(totalSupply)) * 100;
            console.log(`   プールシェア: ${sharePercentage.toFixed(4)}%`);
          }
        }
      } else {
        console.log("❌ Router経由での流動性追加に失敗しました");
      }
    } catch (error) {
      console.error("❌ エラーが発生しました:", error);
      throw error;
    }
  });
