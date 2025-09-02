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
  .addOptionalParam("deadline", "トランザクションの有効期限（秒）", "1800") // デフォルト30分
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, deadline } = taskArgs;
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
        throw new Error(`❌ ${tokenA}の残高が不足しています。必要: ${amountADesired}, 現在: ${balanceA.toString()}`);
      }
      if (balanceB < amountBDesiredBigInt) {
        throw new Error(`❌ ${tokenB}の残高が不足しています。必要: ${amountBDesired}, 現在: ${balanceB.toString()}`);
      }

      // 承認状況を確認
      const allowanceA = await TokenA.read.allowance([userAddress, routerAddress]);
      const allowanceB = await TokenB.read.allowance([userAddress, routerAddress]);

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

      // デッドラインを計算（現在時刻 + 指定秒数）
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + parseInt(deadline);

      // Router経由で流動性を追加
      console.log(`\n⏳ Router経由で流動性追加を実行中...`);
      const addLiquidityHash = await AMMRouter.write.addLiquidity([
        tokenAAddress,
        tokenBAddress,
        amountADesiredBigInt,
        amountBDesiredBigInt,
        amountAMinBigInt,
        amountBMinBigInt,
        userAddress,
        BigInt(deadlineTimestamp)
      ]);

      console.log(`📝 流動性追加トランザクション: ${addLiquidityHash}`);

      // トランザクションの確認を待つ
      const publicClient = await hre.viem.getPublicClient();
      const addLiquidityReceipt = await publicClient.waitForTransactionReceipt({ hash: addLiquidityHash });

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
