import "dotenv/config";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../../helpers/contractsJsonHelper";

/**
 * 流動性を追加するタスク
 * 
 * 使用方法:
 * npx hardhat addLiquidity --amount-a 100 --amount-b 100 --network sepolia
 */
task("addLiquidity", "TokenA-TokenBペアに流動性を追加します")
  .addParam("amountA", "TokenAの追加量（Ether単位）", undefined, undefined, false)
  .addParam("amountB", "TokenBの追加量（Ether単位）", undefined, undefined, false)
  .addOptionalParam("slippage", "スリッページ許容度（%）", "1")
  .setAction(async (taskArgs: { amountA: string; amountB: string; slippage: string }, hre: HardhatRuntimeEnvironment) => {
    const network = hre.network.name;
    const { amountA, amountB, slippage } = taskArgs;
    
    console.log(`💧 ${network} ネットワークで流動性を追加します...\n`);
    console.log(`🔸 TokenA: ${amountA} TKA`);
    console.log(`🔹 TokenB: ${amountB} TKB`);
    console.log(`📊 スリッページ: ${slippage}%\n`);

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

      const amountADesired = hre.ethers.parseEther(amountA);
      const amountBDesired = hre.ethers.parseEther(amountB);
      
      // スリッページを考慮した最小量を計算
      const slippagePercent = Number.parseInt(slippage);
      const minAmountA = amountADesired * BigInt(100 - slippagePercent) / BigInt(100);
      const minAmountB = amountBDesired * BigInt(100 - slippagePercent) / BigInt(100);

      console.log("📋 実行前の状態確認...");
      
      // 残高確認
      const balanceA = await tokenA.balanceOf(signer.address);
      const balanceB = await tokenB.balanceOf(signer.address);
      console.log(`💰 TokenA残高: ${hre.ethers.formatEther(balanceA)} TKA`);
      console.log(`💰 TokenB残高: ${hre.ethers.formatEther(balanceB)} TKB`);

      // 残高チェック
      if (balanceA < amountADesired) {
        throw new Error(`TokenAの残高が不足しています。必要: ${amountA} TKA, 現在: ${hre.ethers.formatEther(balanceA)} TKA`);
      }
      if (balanceB < amountBDesired) {
        throw new Error(`TokenBの残高が不足しています。必要: ${amountB} TKB, 現在: ${hre.ethers.formatEther(balanceB)} TKB`);
      }

      // Approve確認・実行
      console.log("🔓 Router承認を確認中...");
      const routerAddress = await router.getAddress();
      
      const allowanceA = await tokenA.allowance(signer.address, routerAddress);
      if (allowanceA < amountADesired) {
        console.log("🔓 TokenAのapprove実行中...");
        const approveTxA = await tokenA.approve(routerAddress, amountADesired);
        await approveTxA.wait();
        console.log("✅ TokenA approve完了");
      }

      const allowanceB = await tokenB.allowance(signer.address, routerAddress);
      if (allowanceB < amountBDesired) {
        console.log("🔓 TokenBのapprove実行中...");
        const approveTxB = await tokenB.approve(routerAddress, amountBDesired);
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

      console.log(`📝 Transaction Hash: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ トランザクション確定 (Block: ${receipt.blockNumber})`);

      // 結果確認
      console.log("\n📊 流動性追加後の状態:");
      const newBalanceA = await tokenA.balanceOf(signer.address);
      const newBalanceB = await tokenB.balanceOf(signer.address);
      console.log(`💰 TokenA残高: ${hre.ethers.formatEther(newBalanceA)} TKA (-${hre.ethers.formatEther(balanceA - newBalanceA)})`);
      console.log(`💰 TokenB残高: ${hre.ethers.formatEther(newBalanceB)} TKB (-${hre.ethers.formatEther(balanceB - newBalanceB)})`);

      // LP Token残高確認
      if (contracts.pairs && contracts.pairs["TokenA-TokenB"]) {
        const pair = await hre.ethers.getContractAt("DexPair", contracts.pairs["TokenA-TokenB"]) as any;
        const lpBalance = await pair.balanceOf(signer.address);
        console.log(`🔮 LP Token残高: ${hre.ethers.formatEther(lpBalance)} LP`);
      }

      console.log("\n🎯 次のステップ:");
      console.log("• npx hardhat swapTokens --amount-in 10 --token-in TokenA");
      console.log("• npx hardhat removeLiquidity --liquidity 10");

    } catch (error) {
      console.error("❌ 流動性追加中にエラーが発生しました:", error);
      throw error;
    }
  });

/**
 * 流動性を削除するタスク
 * 
 * 使用方法:
 * npx hardhat removeLiquidity --liquidity 10 --network sepolia
 */
task("removeLiquidity", "TokenA-TokenBペアから流動性を削除します")
  .addParam("liquidity", "削除するLP Token量（Ether単位）")
  .addOptionalParam("slippage", "スリッページ許容度（%）", "1")
  .setAction(async (taskArgs: { liquidity: string; slippage: string }, hre: HardhatRuntimeEnvironment) => {
    const network = hre.network.name;
    const { liquidity, slippage } = taskArgs;
    
    console.log(`🔥 ${network} ネットワークで流動性を削除します...\n`);
    console.log(`🔮 LP Token: ${liquidity} LP`);
    console.log(`📊 スリッページ: ${slippage}%\n`);

    try {
      // デプロイされたコントラクトアドレスを読み込み
      const contracts = loadDeployedContractAddresses(network);
      
      if (!contracts || !contracts.tokens || !contracts.dex || !contracts.pairs) {
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
      const pair = await hre.ethers.getContractAt("DexPair", contracts.pairs["TokenA-TokenB"]) as any;

      const liquidityAmount = hre.ethers.parseEther(liquidity);

      console.log("📋 実行前の状態確認...");
      
      // LP Token残高確認
      const lpBalance = await pair.balanceOf(signer.address);
      console.log(`🔮 LP Token残高: ${hre.ethers.formatEther(lpBalance)} LP`);

      if (lpBalance < liquidityAmount) {
        throw new Error(`LP Tokenの残高が不足しています。必要: ${liquidity} LP, 現在: ${hre.ethers.formatEther(lpBalance)} LP`);
      }

      // 現在のリザーブと総供給量から受け取れる量を予測
      const reserves = await pair.getReserves();
      const totalSupply = await pair.totalSupply();
      const amountA = liquidityAmount * reserves[0] / totalSupply;
      const amountB = liquidityAmount * reserves[1] / totalSupply;

      console.log(`📊 予想受取量:`);
      console.log(`   TokenA: ${hre.ethers.formatEther(amountA)} TKA`);
      console.log(`   TokenB: ${hre.ethers.formatEther(amountB)} TKB`);

      // スリッページを考慮した最小量を計算
      const slippagePercent = Number.parseInt(slippage);
      const minAmountA = amountA * BigInt(100 - slippagePercent) / BigInt(100);
      const minAmountB = amountB * BigInt(100 - slippagePercent) / BigInt(100);

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
      
      const tx = await router.removeLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidityAmount,
        minAmountA,
        minAmountB,
        signer.address,
        deadline
      );

      console.log(`📝 Transaction Hash: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ トランザクション確定 (Block: ${receipt.blockNumber})`);

      // 結果確認
      console.log("\n📊 流動性削除後の状態:");
      const newBalanceA = await tokenA.balanceOf(signer.address);
      const newBalanceB = await tokenB.balanceOf(signer.address);
      const newLpBalance = await pair.balanceOf(signer.address);
      
      console.log(`💰 TokenA残高: ${hre.ethers.formatEther(newBalanceA)} TKA (+${hre.ethers.formatEther(newBalanceA - balanceA)})`);
      console.log(`💰 TokenB残高: ${hre.ethers.formatEther(newBalanceB)} TKB (+${hre.ethers.formatEther(newBalanceB - balanceB)})`);
      console.log(`🔮 LP Token残高: ${hre.ethers.formatEther(newLpBalance)} LP (-${hre.ethers.formatEther(lpBalance - newLpBalance)})`);

      console.log("\n🎯 次のステップ:");
      console.log("• npx hardhat addLiquidity --amount-a 100 --amount-b 100");
      console.log("• npx hardhat checkBalances");

    } catch (error) {
      console.error("❌ 流動性削除中にエラーが発生しました:", error);
      throw error;
    }
  });
