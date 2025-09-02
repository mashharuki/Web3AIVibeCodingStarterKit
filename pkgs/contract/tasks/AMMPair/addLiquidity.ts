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
 * 指定されたペアに流動性を追加するタスク
 * 使用例:
 * npx hardhat addLiquidityToPair --token-a USDC --token-b JPYC --amount-a 1000000 --amount-b 150000000 --network sepolia
 */
task("addLiquidityToPair", "指定されたペアに流動性を追加する")
  .addParam("tokenA", "最初のトークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("tokenB", "2番目のトークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("amountA", "tokenAの追加量（最小単位）")
  .addParam("amountB", "tokenBの追加量（最小単位）")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { tokenA, tokenB, amountA, amountB } = taskArgs;
    const { network } = hre;

    console.log(`💧 ${tokenA}/${tokenB} ペアに流動性を追加中...`);
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
    const amountABigInt = BigInt(amountA);
    const amountBBigInt = BigInt(amountB);
    if (amountABigInt <= 0n || amountBBigInt <= 0n) {
      throw new Error("❌ 追加量は0より大きい値を指定してください");
    }

    // トークンアドレスを取得
    const tokenAAddress = TOKENS[tokenA as keyof typeof TOKENS];
    const tokenBAddress = TOKENS[tokenB as keyof typeof TOKENS];

    console.log(`📍 ${tokenA} アドレス: ${tokenAAddress}`);
    console.log(`📍 ${tokenB} アドレス: ${tokenBAddress}`);
    console.log(`💰 追加量 ${tokenA}: ${amountA}`);
    console.log(`💰 追加量 ${tokenB}: ${amountB}`);

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
        throw new Error(`❌ ${tokenA}/${tokenB} ペアが存在しません。先にペアを作成してください。`);
      }

      console.log(`🎯 ペアアドレス: ${pairAddress}`);

      // ペアコントラクトに接続
      const AMMPair = await hre.viem.getContractAt("AMMPair", pairAddress);

      // 現在のリザーブを確認
      const reserves = await AMMPair.read.getReserves();
      console.log(`\n📊 現在のリザーブ:`);
      console.log(`   Reserve0: ${reserves[0].toString()}`);
      console.log(`   Reserve1: ${reserves[1].toString()}`);

      // トークンコントラクトに接続
      const TokenA = await hre.viem.getContractAt("IERC20", tokenAAddress);
      const TokenB = await hre.viem.getContractAt("IERC20", tokenBAddress);

      // 現在の残高を確認
      const [walletClient] = await hre.viem.getWalletClients();
      const userAddress = walletClient.account.address;

      const balanceA = await TokenA.read.balanceOf([userAddress]);
      const balanceB = await TokenB.read.balanceOf([userAddress]);

      console.log(`\n💳 現在の残高:`);
      console.log(`   ${tokenA}: ${balanceA.toString()}`);
      console.log(`   ${tokenB}: ${balanceB.toString()}`);

      // 残高チェック
      if (balanceA < amountABigInt) {
        throw new Error(`❌ ${tokenA}の残高が不足しています。必要: ${amountA}, 現在: ${balanceA.toString()}`);
      }
      if (balanceB < amountBBigInt) {
        throw new Error(`❌ ${tokenB}の残高が不足しています。必要: ${amountB}, 現在: ${balanceB.toString()}`);
      }

      // 承認状況を確認
      const allowanceA = await TokenA.read.allowance([userAddress, pairAddress]);
      const allowanceB = await TokenB.read.allowance([userAddress, pairAddress]);

      console.log(`\n🔐 現在の承認状況:`);
      console.log(`   ${tokenA}: ${allowanceA.toString()}`);
      console.log(`   ${tokenB}: ${allowanceB.toString()}`);

      // 必要に応じて承認を実行
      if (allowanceA < amountABigInt) {
        console.log(`⏳ ${tokenA}の承認を実行中...`);
        const approveHashA = await TokenA.write.approve([pairAddress, amountABigInt]);
        console.log(`📝 ${tokenA}承認トランザクション: ${approveHashA}`);
        
        const publicClient = await hre.viem.getPublicClient();
        await publicClient.waitForTransactionReceipt({ hash: approveHashA });
        console.log(`✅ ${tokenA}の承認完了`);
      }

      if (allowanceB < amountBBigInt) {
        console.log(`⏳ ${tokenB}の承認を実行中...`);
        const approveHashB = await TokenB.write.approve([pairAddress, amountBBigInt]);
        console.log(`📝 ${tokenB}承認トランザクション: ${approveHashB}`);
        
        const publicClient = await hre.viem.getPublicClient();
        await publicClient.waitForTransactionReceipt({ hash: approveHashB });
        console.log(`✅ ${tokenB}の承認完了`);
      }

      // トークンをペアコントラクトに送信
      console.log(`\n⏳ トークンをペアコントラクトに送信中...`);
      
      const transferHashA = await TokenA.write.transfer([pairAddress, amountABigInt]);
      console.log(`📝 ${tokenA}送信トランザクション: ${transferHashA}`);
      
      const transferHashB = await TokenB.write.transfer([pairAddress, amountBBigInt]);
      console.log(`📝 ${tokenB}送信トランザクション: ${transferHashB}`);

      // トランザクションの確認を待つ
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash: transferHashA });
      await publicClient.waitForTransactionReceipt({ hash: transferHashB });
      
      console.log(`✅ トークン送信完了`);

      // 流動性を追加（mint関数を呼び出し）
      console.log(`⏳ 流動性追加を実行中...`);
      const mintHash = await AMMPair.write.mint([userAddress]);
      console.log(`📝 流動性追加トランザクション: ${mintHash}`);

      // トランザクションの確認を待つ
      const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });

      if (mintReceipt.status === "success") {
        console.log(`✅ 流動性追加成功!`);
        console.log(`⛽ ガス使用量: ${mintReceipt.gasUsed.toString()}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${mintHash}`);

        // 追加後のリザーブとLPトークン残高を確認
        const newReserves = await AMMPair.read.getReserves();
        const lpBalance = await AMMPair.read.balanceOf([userAddress]);
        const totalSupply = await AMMPair.read.totalSupply();

        console.log(`\n📊 追加後の状況:`);
        console.log(`   新しいReserve0: ${newReserves[0].toString()}`);
        console.log(`   新しいReserve1: ${newReserves[1].toString()}`);
        console.log(`   取得したLPトークン: ${lpBalance.toString()}`);
        console.log(`   LPトークン総供給量: ${totalSupply.toString()}`);

        // プールシェアを計算
        if (totalSupply > 0n) {
          const sharePercentage = (Number(lpBalance) / Number(totalSupply)) * 100;
          console.log(`   プールシェア: ${sharePercentage.toFixed(4)}%`);
        }

      } else {
        console.log("❌ 流動性追加に失敗しました");
      }

    } catch (error) {
      console.error("❌ エラーが発生しました:", error);
      throw error;
    }
  });
