import "dotenv/config";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../../helpers/contractsJsonHelper";

/**
 * 修正版の流動性削除タスク
 * Token順序を正しく処理
 */
task("removeLiquidityFixed", "修正版の流動性削除を行います")
  .addParam("liquidity", "削除するLP Token量（Ether単位）")
  .addParam("slippage", "スリッページ（パーセント）", "1")
  .setAction(async (taskArgs: { liquidity: string; slippage: string }, hre: HardhatRuntimeEnvironment) => {
    const network = hre.network.name;
    const { liquidity, slippage } = taskArgs;
    
    console.log(`🔥 ${network} ネットワークで修正版流動性削除を実行します...\n`);

    try {
      // デプロイされたコントラクトアドレスを読み込み
      const contracts = loadDeployedContractAddresses(network);
      
      if (!contracts || !contracts.tokens || !contracts.dex) {
        console.error(`❌ ${network} ネットワークのコントラクトアドレスが見つかりません`);
        return;
      }

      const [signer] = await hre.ethers.getSigners();
      if (!signer) {
        throw new Error("Signerが見つかりません");
      }

      // コントラクトインスタンスを取得
      const tokenA = await hre.ethers.getContractAt("TokenA", contracts.tokens.TokenA) as any;
      const tokenB = await hre.ethers.getContractAt("TokenB", contracts.tokens.TokenB) as any;
      const router = await hre.ethers.getContractAt("DexRouter", contracts.dex.DexRouter) as any;
      const factory = await hre.ethers.getContractAt("DexFactory", contracts.dex.DexFactory) as any;

      // ペアアドレスを取得
      const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
      const pair = await hre.ethers.getContractAt("DexPair", pairAddress) as any;

      const liquidityAmount = hre.ethers.parseEther(liquidity);

      console.log(`🔮 LP Token: ${liquidity} LP`);
      console.log(`📊 スリッページ: ${slippage}%\n`);

      console.log("📋 実行前の状態確認...");
      
      // LP Token残高確認
      const lpBalance = await pair.balanceOf(signer.address);
      console.log(`🔮 LP Token残高: ${hre.ethers.formatEther(lpBalance)} LP`);

      if (lpBalance < liquidityAmount) {
        throw new Error(`LP Tokenの残高が不足しています。必要: ${liquidity} LP, 現在: ${hre.ethers.formatEther(lpBalance)} LP`);
      }

      // 現在のリザーブと総供給量を取得
      const reserves = await pair.getReserves();
      const totalSupply = await pair.totalSupply();
      
      // Token順序を正しく確認
      const token0 = await pair.token0();
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();

      // Token順序に基づいて正しいリザーブを特定
      let reserveA: bigint, reserveB: bigint;
      if (token0.toLowerCase() === tokenAAddress.toLowerCase()) {
        // TokenA = token0, TokenB = token1
        reserveA = reserves[0];
        reserveB = reserves[1];
      } else {
        // TokenA = token1, TokenB = token0
        reserveA = reserves[1];
        reserveB = reserves[0];
      }

      // 受け取れる量を正確に計算
      const amountA = liquidityAmount * reserveA / totalSupply;
      const amountB = liquidityAmount * reserveB / totalSupply;

      console.log(`📊 予想受取量:`);
      console.log(`   TokenA: ${hre.ethers.formatEther(amountA)} TKA`);
      console.log(`   TokenB: ${hre.ethers.formatEther(amountB)} TKB`);

      // スリッページを考慮した最小量を計算
      const slippagePercent = Number.parseInt(slippage);
      const minAmountA = amountA * BigInt(100 - slippagePercent) / BigInt(100);
      const minAmountB = amountB * BigInt(100 - slippagePercent) / BigInt(100);

      console.log(`📊 最小受取量（スリッページ ${slippage}%）:`);
      console.log(`   TokenA: ${hre.ethers.formatEther(minAmountA)} TKA`);
      console.log(`   TokenB: ${hre.ethers.formatEther(minAmountB)} TKB`);

      // Router承認
      console.log("🔓 Router承認を確認中...");
      const routerAddress = await router.getAddress();
      const allowance = await pair.allowance(signer.address, routerAddress);
      
      if (allowance < liquidityAmount) {
        console.log("🔓 LP Tokenのapprove実行中...");
        const approveTx = await pair.approve(routerAddress, liquidityAmount);
        await approveTx.wait();
        console.log("✅ LP Token approve完了");
      }

      // 削除前の残高
      const balanceA = await tokenA.balanceOf(signer.address);
      const balanceB = await tokenB.balanceOf(signer.address);

      // 流動性削除実行
      console.log("🔥 流動性削除を実行中...");
      const deadline = Math.floor(Date.now() / 1000) + 1800; // 30分後
      
      console.log(`📋 Transaction Parameters:`);
      console.log(`   TokenA: ${tokenAAddress}`);
      console.log(`   TokenB: ${tokenBAddress}`);
      console.log(`   Liquidity: ${hre.ethers.formatEther(liquidityAmount)} LP`);
      console.log(`   Min TokenA: ${hre.ethers.formatEther(minAmountA)} TKA`);
      console.log(`   Min TokenB: ${hre.ethers.formatEther(minAmountB)} TKB`);
      console.log(`   Deadline: ${deadline}`);
      
      const tx = await router.removeLiquidity(
        tokenAAddress,
        tokenBAddress,
        liquidityAmount,
        minAmountA,
        minAmountB,
        signer.address,
        deadline
      );

      console.log(`⏳ トランザクションを待機中... Hash: ${tx.hash}`);
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        console.log("✅ 流動性削除が成功しました！");
        console.log(`📋 Transaction Hash: ${receipt.hash}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
        
        // 結果確認
        console.log("\n📊 実行後の状態:");
        const newBalanceA = await tokenA.balanceOf(signer.address);
        const newBalanceB = await tokenB.balanceOf(signer.address);
        const newLpBalance = await pair.balanceOf(signer.address);
        
        const receivedA = newBalanceA - balanceA;
        const receivedB = newBalanceB - balanceB;
        const burnedLP = lpBalance - newLpBalance;
        
        console.log(`💰 TokenA残高: ${hre.ethers.formatEther(newBalanceA)} TKA`);
        console.log(`💰 TokenB残高: ${hre.ethers.formatEther(newBalanceB)} TKB`);
        console.log(`🔮 LP Token残高: ${hre.ethers.formatEther(newLpBalance)} LP`);
        console.log(`📤 受け取ったTokenA: ${hre.ethers.formatEther(receivedA)} TKA`);
        console.log(`📤 受け取ったTokenB: ${hre.ethers.formatEther(receivedB)} TKB`);
        console.log(`🔥 削除したLP: ${hre.ethers.formatEther(burnedLP)} LP`);
        
        // 新しいプール状態
        const newReserves = await pair.getReserves();
        const newTotalSupply = await pair.totalSupply();
        
        let newReserveA: bigint, newReserveB: bigint;
        if (token0.toLowerCase() === tokenAAddress.toLowerCase()) {
          newReserveA = newReserves[0];
          newReserveB = newReserves[1];
        } else {
          newReserveA = newReserves[1];
          newReserveB = newReserves[0];
        }
        
        console.log(`📊 新しいプール状態:`);
        console.log(`   Reserve A: ${hre.ethers.formatEther(newReserveA)} TKA`);
        console.log(`   Reserve B: ${hre.ethers.formatEther(newReserveB)} TKB`);
        console.log(`   Total LP Supply: ${hre.ethers.formatEther(newTotalSupply)} LP`);
      } else {
        console.log("❌ 流動性削除が失敗しました");
      }

    } catch (error: any) {
      console.error("❌ 流動性削除中にエラーが発生しました:", error.message || error);
      throw error;
    }
  });
