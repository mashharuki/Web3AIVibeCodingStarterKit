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
 * AMM式に基づいてスワップ後の出力量を計算する
 * @param amountIn 入力量
 * @param reserveIn 入力トークンのリザーブ
 * @param reserveOut 出力トークンのリザーブ
 * @returns 出力量
 */
function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn <= 0n) throw new Error("❌ 入力量は0より大きい値を指定してください");
  if (reserveIn <= 0n || reserveOut <= 0n) throw new Error("❌ 流動性が不足しています");

  // 0.3%の手数料を考慮した計算
  const amountInWithFee = amountIn * 997n; // 1000 - 3 = 997
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;

  return numerator / denominator;
}

/**
 * 指定されたペアでトークンスワップを実行するタスク
 * 使用例:
 * npx hardhat swapTokens --token-in USDC --token-out JPYC --amount-in 1000000 --network sepolia
 */
task("swapTokens", "指定されたペアでトークンスワップを実行する")
  .addParam("tokenIn", "入力トークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("tokenOut", "出力トークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("amountIn", "入力トークンの量（最小単位）")
  .addOptionalParam("slippage", "スリッページ許容度（%、デフォルト: 1）", "1")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { tokenIn, tokenOut, amountIn, slippage } = taskArgs;
    const { network } = hre;

    console.log(`🔄 ${tokenIn} → ${tokenOut} スワップを実行中...`);
    console.log(`📡 ネットワーク: ${network.name}`);

    // トークンシンボルの検証
    if (!TOKENS[tokenIn as keyof typeof TOKENS]) {
      throw new Error(
        `❌ 無効な入力トークン: ${tokenIn}. 利用可能: ${Object.keys(TOKENS).join(", ")}`
      );
    }
    if (!TOKENS[tokenOut as keyof typeof TOKENS]) {
      throw new Error(
        `❌ 無効な出力トークン: ${tokenOut}. 利用可能: ${Object.keys(TOKENS).join(", ")}`
      );
    }
    if (tokenIn === tokenOut) {
      throw new Error("❌ 同じトークン同士でスワップすることはできません");
    }

    // パラメータの検証
    const amountInBigInt = BigInt(amountIn);
    if (amountInBigInt <= 0n) {
      throw new Error("❌ 入力量は0より大きい値を指定してください");
    }

    const slippageNum = parseFloat(slippage);
    if (slippageNum < 0 || slippageNum > 100) {
      throw new Error("❌ スリッページは0-100の範囲で指定してください");
    }

    // トークンアドレスを取得
    const tokenInAddress = TOKENS[tokenIn as keyof typeof TOKENS];
    const tokenOutAddress = TOKENS[tokenOut as keyof typeof TOKENS];

    console.log(`📍 入力トークン ${tokenIn}: ${tokenInAddress}`);
    console.log(`📍 出力トークン ${tokenOut}: ${tokenOutAddress}`);
    console.log(`💰 入力量: ${amountIn}`);
    console.log(`📊 スリッページ許容度: ${slippage}%`);

    try {
      // デプロイ済みコントラクトアドレスを読み込み
      const deployedContracts = loadDeployedContractAddresses(network.name);
      const factoryAddress = deployedContracts.contracts.AMMFactory;

      console.log(`🏭 Factory アドレス: ${factoryAddress}`);

      // AMMFactory コントラクトに接続
      const AMMFactory = await hre.viem.getContractAt("AMMFactory", factoryAddress);

      // ペアアドレスを取得
      const pairAddress = await AMMFactory.read.getPair([tokenInAddress, tokenOutAddress]);
      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error(`❌ ${tokenIn}/${tokenOut} ペアが存在しません`);
      }

      console.log(`🎯 ペアアドレス: ${pairAddress}`);

      // ペアコントラクトに接続
      const AMMPair = await hre.viem.getContractAt("AMMPair", pairAddress);

      // ペアの詳細情報を取得
      const [token0, token1] = await Promise.all([AMMPair.read.token0(), AMMPair.read.token1()]);

      const reserves = await AMMPair.read.getReserves();

      console.log(`\n📊 現在のリザーブ:`);
      console.log(`   Token0 (${getTokenSymbol(token0)}): ${reserves[0].toString()}`);
      console.log(`   Token1 (${getTokenSymbol(token1)}): ${reserves[1].toString()}`);

      // トークンの順序を確認し、適切なリザーブを取得
      let reserveIn: bigint;
      let reserveOut: bigint;
      let amount0Out = 0n;
      let amount1Out = 0n;

      if (tokenInAddress.toLowerCase() === token0.toLowerCase()) {
        // tokenIn が token0 の場合
        reserveIn = reserves[0];
        reserveOut = reserves[1];
        const amountOut = getAmountOut(amountInBigInt, reserveIn, reserveOut);
        amount1Out = amountOut;
      } else {
        // tokenIn が token1 の場合
        reserveIn = reserves[1];
        reserveOut = reserves[0];
        const amountOut = getAmountOut(amountInBigInt, reserveIn, reserveOut);
        amount0Out = amountOut;
      }

      const expectedAmountOut = amount0Out > 0n ? amount0Out : amount1Out;
      console.log(`💰 予想出力量: ${expectedAmountOut.toString()}`);

      // スリッページを考慮した最小出力量を計算
      const minAmountOut =
        (expectedAmountOut * BigInt(Math.floor((100 - slippageNum) * 100))) / 10000n;
      console.log(`💰 最小出力量（スリッページ考慮）: ${minAmountOut.toString()}`);

      // 価格インパクトを計算
      const priceImpact = (Number(amountInBigInt) / Number(reserveIn)) * 100;
      console.log(`📈 価格インパクト: ${priceImpact.toFixed(4)}%`);

      if (priceImpact > 5) {
        console.log(`⚠️  警告: 価格インパクトが大きいです (${priceImpact.toFixed(4)}%)`);
      }

      // ユーザーアドレスを取得
      const [walletClient] = await hre.viem.getWalletClients();
      const userAddress = walletClient.account.address;

      // 入力トークンコントラクトに接続
      const TokenIn = await hre.viem.getContractAt("IERC20", tokenInAddress);
      const TokenOut = await hre.viem.getContractAt("IERC20", tokenOutAddress);

      // 現在の残高を確認
      const balanceIn = await TokenIn.read.balanceOf([userAddress]);
      const balanceOutBefore = await TokenOut.read.balanceOf([userAddress]);

      console.log(`\n💳 現在の残高:`);
      console.log(`   ${tokenIn}: ${balanceIn.toString()}`);
      console.log(`   ${tokenOut}: ${balanceOutBefore.toString()}`);

      // 残高チェック
      if (balanceIn < amountInBigInt) {
        throw new Error(
          `❌ ${tokenIn}の残高が不足しています。必要: ${amountIn}, 現在: ${balanceIn.toString()}`
        );
      }

      // 承認状況を確認
      const allowance = await TokenIn.read.allowance([userAddress, pairAddress]);
      console.log(`🔐 現在の承認状況: ${allowance.toString()}`);

      // 必要に応じて承認を実行
      if (allowance < amountInBigInt) {
        console.log(`⏳ ${tokenIn}の承認を実行中...`);
        const approveHash = await TokenIn.write.approve([pairAddress, amountInBigInt]);
        console.log(`📝 承認トランザクション: ${approveHash}`);

        const publicClient = await hre.viem.getPublicClient();
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log(`✅ 承認完了`);
      }

      // 入力トークンをペアコントラクトに送信
      console.log(`\n⏳ ${tokenIn}をペアコントラクトに送信中...`);
      const transferHash = await TokenIn.write.transfer([pairAddress, amountInBigInt]);
      console.log(`📝 送信トランザクション: ${transferHash}`);

      // トランザクションの確認を待つ
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash: transferHash });
      console.log(`✅ トークン送信完了`);

      // スワップを実行
      console.log(`⏳ スワップを実行中...`);
      const swapHash = await AMMPair.write.swap([
        amount0Out,
        amount1Out,
        userAddress,
        "0x", // コールバックデータなし
      ]);
      console.log(`📝 スワップトランザクション: ${swapHash}`);

      // トランザクションの確認を待つ
      const swapReceipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });

      if (swapReceipt.status === "success") {
        console.log(`✅ スワップ成功!`);
        console.log(`⛽ ガス使用量: ${swapReceipt.gasUsed.toString()}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${swapHash}`);

        // スワップ後の残高を確認
        const balanceOutAfter = await TokenOut.read.balanceOf([userAddress]);
        const actualAmountOut = balanceOutAfter - balanceOutBefore;

        console.log(`\n📊 スワップ結果:`);
        console.log(`   実際の出力量: ${actualAmountOut.toString()}`);
        console.log(`   予想出力量: ${expectedAmountOut.toString()}`);

        // スリッページを計算
        const actualSlippage =
          ((Number(expectedAmountOut) - Number(actualAmountOut)) / Number(expectedAmountOut)) * 100;
        console.log(`   実際のスリッページ: ${actualSlippage.toFixed(4)}%`);

        // 実効価格を計算
        const effectivePrice = Number(amountInBigInt) / Number(actualAmountOut);
        console.log(`   実効価格: 1 ${tokenOut} = ${effectivePrice.toFixed(6)} ${tokenIn}`);

        // スワップ後のリザーブを確認
        const newReserves = await AMMPair.read.getReserves();
        console.log(`\n📊 スワップ後のリザーブ:`);
        console.log(`   Token0 (${getTokenSymbol(token0)}): ${newReserves[0].toString()}`);
        console.log(`   Token1 (${getTokenSymbol(token1)}): ${newReserves[1].toString()}`);

        // 最終的な残高を表示
        const finalBalanceIn = await TokenIn.read.balanceOf([userAddress]);
        const finalBalanceOut = await TokenOut.read.balanceOf([userAddress]);

        console.log(`\n💳 最終的な残高:`);
        console.log(`   ${tokenIn}: ${finalBalanceIn.toString()}`);
        console.log(`   ${tokenOut}: ${finalBalanceOut.toString()}`);
      } else {
        console.log("❌ スワップに失敗しました");
      }
    } catch (error) {
      console.error("❌ エラーが発生しました:", error);
      throw error;
    }
  });

/**
 * スワップの見積もりを取得するタスク（実際のスワップは実行しない）
 * 使用例:
 * npx hardhat getSwapQuote --token-in USDC --token-out JPYC --amount-in 1000000 --network sepolia
 */
task("getSwapQuote", "スワップの見積もりを取得する（実際のスワップは実行しない）")
  .addParam("tokenIn", "入力トークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("tokenOut", "出力トークンシンボル (USDC, JPYC, PYUSD)")
  .addParam("amountIn", "入力トークンの量（最小単位）")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { tokenIn, tokenOut, amountIn } = taskArgs;
    const { network } = hre;

    console.log(`💭 ${tokenIn} → ${tokenOut} スワップの見積もりを取得中...`);
    console.log(`📡 ネットワーク: ${network.name}`);

    // トークンシンボルの検証
    if (!TOKENS[tokenIn as keyof typeof TOKENS]) {
      throw new Error(
        `❌ 無効な入力トークン: ${tokenIn}. 利用可能: ${Object.keys(TOKENS).join(", ")}`
      );
    }
    if (!TOKENS[tokenOut as keyof typeof TOKENS]) {
      throw new Error(
        `❌ 無効な出力トークン: ${tokenOut}. 利用可能: ${Object.keys(TOKENS).join(", ")}`
      );
    }
    if (tokenIn === tokenOut) {
      throw new Error("❌ 同じトークン同士でスワップすることはできません");
    }

    // パラメータの検証
    const amountInBigInt = BigInt(amountIn);
    if (amountInBigInt <= 0n) {
      throw new Error("❌ 入力量は0より大きい値を指定してください");
    }

    // トークンアドレスを取得
    const tokenInAddress = TOKENS[tokenIn as keyof typeof TOKENS];
    const tokenOutAddress = TOKENS[tokenOut as keyof typeof TOKENS];

    console.log(`📍 入力トークン ${tokenIn}: ${tokenInAddress}`);
    console.log(`📍 出力トークン ${tokenOut}: ${tokenOutAddress}`);
    console.log(`💰 入力量: ${amountIn}`);

    try {
      // デプロイ済みコントラクトアドレスを読み込み
      const deployedContracts = loadDeployedContractAddresses(network.name);
      const factoryAddress = deployedContracts.contracts.AMMFactory;

      // AMMFactory コントラクトに接続
      const AMMFactory = await hre.viem.getContractAt("AMMFactory", factoryAddress);

      // ペアアドレスを取得
      const pairAddress = await AMMFactory.read.getPair([tokenInAddress, tokenOutAddress]);
      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error(`❌ ${tokenIn}/${tokenOut} ペアが存在しません`);
      }

      console.log(`🎯 ペアアドレス: ${pairAddress}`);

      // ペアコントラクトに接続
      const AMMPair = await hre.viem.getContractAt("AMMPair", pairAddress);

      // ペアの詳細情報を取得
      const [token0, token1] = await Promise.all([AMMPair.read.token0(), AMMPair.read.token1()]);

      const reserves = await AMMPair.read.getReserves();

      console.log(`\n📊 現在のリザーブ:`);
      console.log(`   Token0 (${getTokenSymbol(token0)}): ${reserves[0].toString()}`);
      console.log(`   Token1 (${getTokenSymbol(token1)}): ${reserves[1].toString()}`);

      // トークンの順序を確認し、適切なリザーブを取得
      let reserveIn: bigint;
      let reserveOut: bigint;

      if (tokenInAddress.toLowerCase() === token0.toLowerCase()) {
        // tokenIn が token0 の場合
        reserveIn = reserves[0];
        reserveOut = reserves[1];
      } else {
        // tokenIn が token1 の場合
        reserveIn = reserves[1];
        reserveOut = reserves[0];
      }

      // 出力量を計算
      const expectedAmountOut = getAmountOut(amountInBigInt, reserveIn, reserveOut);
      console.log(`\n💰 見積もり結果:`);
      console.log(`   予想出力量: ${expectedAmountOut.toString()}`);

      // 価格インパクトを計算
      const priceImpact = (Number(amountInBigInt) / Number(reserveIn)) * 100;
      console.log(`   価格インパクト: ${priceImpact.toFixed(4)}%`);

      // 実効価格を計算
      const effectivePrice = Number(amountInBigInt) / Number(expectedAmountOut);
      console.log(`   実効価格: 1 ${tokenOut} = ${effectivePrice.toFixed(6)} ${tokenIn}`);

      // 現在のプール価格を計算
      const poolPrice = Number(reserveIn) / Number(reserveOut);
      console.log(`   現在のプール価格: 1 ${tokenOut} = ${poolPrice.toFixed(6)} ${tokenIn}`);

      // 手数料を計算
      const feeAmount = (amountInBigInt * 3n) / 1000n; // 0.3%
      console.log(`   取引手数料: ${feeAmount.toString()} ${tokenIn}`);

      // 異なるスリッページでの最小出力量を表示
      console.log(`\n📊 スリッページ別最小出力量:`);
      for (const slippage of [0.1, 0.5, 1.0, 2.0, 5.0]) {
        const minAmountOut =
          (expectedAmountOut * BigInt(Math.floor((100 - slippage) * 100))) / 10000n;
        console.log(`   ${slippage}%: ${minAmountOut.toString()}`);
      }

      if (priceImpact > 5) {
        console.log(`\n⚠️  警告: 価格インパクトが大きいです (${priceImpact.toFixed(4)}%)`);
        console.log(`   大きな取引を行う場合は、複数回に分けることを検討してください。`);
      }
    } catch (error) {
      console.error("❌ エラーが発生しました:", error);
      throw error;
    }
  });
