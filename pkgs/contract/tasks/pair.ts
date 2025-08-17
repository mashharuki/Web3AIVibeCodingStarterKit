import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { formatEther, parseEther } from "viem";

// Helper function to get pair contract
async function getPairContract(hre: HardhatRuntimeEnvironment, pairAddress: string) {
  return await hre.ethers.getContractAt("DEXPair", pairAddress);
}

// Helper function to get token contract
async function getTokenContract(hre: HardhatRuntimeEnvironment, tokenAddress: string) {
  return await hre.ethers.getContractAt("IERC20", tokenAddress);
}

task("pair:info", "Get detailed pair information")
  .addParam("pair", "Pair contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { pair: pairAddress } = taskArgs;
    
    try {
      const pair = await getPairContract(hre, pairAddress);
      
      // Get basic pair info
      const token0Address = await pair.token0();
      const token1Address = await pair.token1();
      const reserves = await pair.getReserves();
      const totalSupply = await pair.totalSupply();
      const factory = await pair.factory();
      
      // Get token info
      const token0 = await getTokenContract(hre, token0Address);
      const token1 = await getTokenContract(hre, token1Address);
      
      const token0Name = await token0.name();
      const token0Symbol = await token0.symbol();
      const token1Name = await token1.name();
      const token1Symbol = await token1.symbol();
      
      console.log("=== Pair Information ===");
      console.log(`Pair Address: ${pairAddress}`);
      console.log(`Factory: ${factory}`);
      console.log(`Total LP Supply: ${formatEther(totalSupply)} LP`);
      
      console.log("\n=== Token Information ===");
      console.log(`Token0: ${token0Name} (${token0Symbol})`);
      console.log(`  Address: ${token0Address}`);
      console.log(`  Reserve: ${formatEther(reserves[0])} ${token0Symbol}`);
      
      console.log(`Token1: ${token1Name} (${token1Symbol})`);
      console.log(`  Address: ${token1Address}`);
      console.log(`  Reserve: ${formatEther(reserves[1])} ${token1Symbol}`);
      
      // Calculate price
      if (reserves[0] > 0n && reserves[1] > 0n) {
        const price0 = Number(formatEther(reserves[1])) / Number(formatEther(reserves[0]));
        const price1 = Number(formatEther(reserves[0])) / Number(formatEther(reserves[1]));
        
        console.log("\n=== Price Information ===");
        console.log(`1 ${token0Symbol} = ${price0.toFixed(6)} ${token1Symbol}`);
        console.log(`1 ${token1Symbol} = ${price1.toFixed(6)} ${token0Symbol}`);
      }
      
      // Calculate TVL (assuming both tokens have similar value for simplicity)
      const tvl = Number(formatEther(reserves[0])) + Number(formatEther(reserves[1]));
      console.log(`\nEstimated TVL: ${tvl.toFixed(2)} tokens`);
      
    } catch (error) {
      console.error("❌ Error getting pair info:", error);
    }
  });

task("pair:reserves", "Get current reserves for a pair")
  .addParam("pair", "Pair contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { pair: pairAddress } = taskArgs;
    
    try {
      const pair = await getPairContract(hre, pairAddress);
      const reserves = await pair.getReserves();
      const token0Address = await pair.token0();
      const token1Address = await pair.token1();
      
      const token0 = await getTokenContract(hre, token0Address);
      const token1 = await getTokenContract(hre, token1Address);
      const token0Symbol = await token0.symbol();
      const token1Symbol = await token1.symbol();
      
      console.log("=== Current Reserves ===");
      console.log(`${token0Symbol}: ${formatEther(reserves[0])}`);
      console.log(`${token1Symbol}: ${formatEther(reserves[1])}`);
      console.log(`Last Update: Block ${reserves[2]}`);
      
    } catch (error) {
      console.error("❌ Error getting reserves:", error);
    }
  });

task("pair:user-position", "Get user's liquidity position in a pair")
  .addParam("pair", "Pair contract address")
  .addOptionalParam("user", "User address (defaults to first signer)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { pair: pairAddress, user } = taskArgs;
    
    try {
      const [signer] = await hre.ethers.getSigners();
      const userAddress = user || signer.address;
      
      const pair = await getPairContract(hre, pairAddress);
      
      // Get user's LP token balance
      const lpBalance = await pair.balanceOf(userAddress);
      const totalSupply = await pair.totalSupply();
      const reserves = await pair.getReserves();
      
      if (lpBalance === 0n) {
        console.log(`User ${userAddress} has no liquidity position in this pair`);
        return;
      }
      
      // Calculate user's share of the pool
      const sharePercentage = (Number(lpBalance) / Number(totalSupply)) * 100;
      
      // Calculate user's underlying token amounts
      const userToken0 = (lpBalance * reserves[0]) / totalSupply;
      const userToken1 = (lpBalance * reserves[1]) / totalSupply;
      
      // Get token info
      const token0Address = await pair.token0();
      const token1Address = await pair.token1();
      const token0 = await getTokenContract(hre, token0Address);
      const token1 = await getTokenContract(hre, token1Address);
      const token0Symbol = await token0.symbol();
      const token1Symbol = await token1.symbol();
      
      console.log("=== User Liquidity Position ===");
      console.log(`User: ${userAddress}`);
      console.log(`LP Tokens: ${formatEther(lpBalance)}`);
      console.log(`Pool Share: ${sharePercentage.toFixed(4)}%`);
      
      console.log("\n=== Underlying Assets ===");
      console.log(`${token0Symbol}: ${formatEther(userToken0.toString())}`);
      console.log(`${token1Symbol}: ${formatEther(userToken1.toString())}`);
      
    } catch (error) {
      console.error("❌ Error getting user position:", error);
    }
  });

task("pair:sync", "Sync pair reserves with actual token balances")
  .addParam("pair", "Pair contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { pair: pairAddress } = taskArgs;
    
    try {
      const pair = await getPairContract(hre, pairAddress);
      
      console.log("Syncing pair reserves...");
      
      const tx = await pair.sync();
      await tx.wait();
      
      console.log("✅ Pair synced successfully!");
      console.log(`Transaction hash: ${tx.hash}`);
      
      // Show updated reserves
      const reserves = await pair.getReserves();
      const token0Address = await pair.token0();
      const token1Address = await pair.token1();
      
      const token0 = await getTokenContract(hre, token0Address);
      const token1 = await getTokenContract(hre, token1Address);
      const token0Symbol = await token0.symbol();
      const token1Symbol = await token1.symbol();
      
      console.log("\n=== Updated Reserves ===");
      console.log(`${token0Symbol}: ${formatEther(reserves[0])}`);
      console.log(`${token1Symbol}: ${formatEther(reserves[1])}`);
      
    } catch (error) {
      console.error("❌ Error syncing pair:", error);
    }
  });

task("pair:skim", "Skim excess tokens from pair to specified address")
  .addParam("pair", "Pair contract address")
  .addParam("to", "Address to receive excess tokens")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { pair: pairAddress, to } = taskArgs;
    
    try {
      const pair = await getPairContract(hre, pairAddress);
      
      console.log(`Skimming excess tokens to ${to}...`);
      
      const tx = await pair.skim(to);
      await tx.wait();
      
      console.log("✅ Skim completed successfully!");
      console.log(`Transaction hash: ${tx.hash}`);
      
    } catch (error) {
      console.error("❌ Error skimming tokens:", error);
    }
  });

task("pair:calculate-amounts", "Calculate optimal amounts for liquidity provision")
  .addParam("pair", "Pair contract address")
  .addParam("tokenA", "Address of token A")
  .addParam("amountA", "Desired amount of token A")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { pair: pairAddress, tokenA, amountA } = taskArgs;
    
    try {
      const pair = await getPairContract(hre, pairAddress);
      const reserves = await pair.getReserves();
      const token0Address = await pair.token0();
      const token1Address = await pair.token1();
      
      const amountAWei = parseEther(amountA);
      let reserveA: bigint, reserveB: bigint, tokenB: string;
      
      // Determine which token is A and which is B
      if (tokenA.toLowerCase() === token0Address.toLowerCase()) {
        reserveA = reserves[0];
        reserveB = reserves[1];
        tokenB = token1Address;
      } else if (tokenA.toLowerCase() === token1Address.toLowerCase()) {
        reserveA = reserves[1];
        reserveB = reserves[0];
        tokenB = token0Address;
      } else {
        throw new Error("Token A is not part of this pair");
      }
      
      if (reserveA === 0n || reserveB === 0n) {
        console.log("This is the first liquidity provision - you can set any ratio");
        return;
      }
      
      // Calculate optimal amount B
      const amountB = (amountAWei * reserveB) / reserveA;
      
      // Get token symbols
      const tokenAContract = await getTokenContract(hre, tokenA);
      const tokenBContract = await getTokenContract(hre, tokenB);
      const symbolA = await tokenAContract.symbol();
      const symbolB = await tokenBContract.symbol();
      
      console.log("=== Optimal Liquidity Amounts ===");
      console.log(`${symbolA}: ${amountA}`);
      console.log(`${symbolB}: ${formatEther(amountB)}`);
      
      console.log("\n=== Current Pool Ratio ===");
      console.log(`1 ${symbolA} = ${formatEther((reserveB * parseEther("1")) / reserveA)} ${symbolB}`);
      
    } catch (error) {
      console.error("❌ Error calculating amounts:", error);
    }
  });

task("pair:estimate-swap", "Estimate swap output for given input")
  .addParam("pair", "Pair contract address")
  .addParam("tokenIn", "Address of input token")
  .addParam("amountIn", "Amount of input token")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { pair: pairAddress, tokenIn, amountIn } = taskArgs;
    
    try {
      const pair = await getPairContract(hre, pairAddress);
      const reserves = await pair.getReserves();
      const token0Address = await pair.token0();
      const token1Address = await pair.token1();
      
      const amountInWei = parseEther(amountIn);
      let reserveIn: bigint, reserveOut: bigint, tokenOut: string;
      
      // Determine input and output reserves
      if (tokenIn.toLowerCase() === token0Address.toLowerCase()) {
        reserveIn = reserves[0];
        reserveOut = reserves[1];
        tokenOut = token1Address;
      } else if (tokenIn.toLowerCase() === token1Address.toLowerCase()) {
        reserveIn = reserves[1];
        reserveOut = reserves[0];
        tokenOut = token0Address;
      } else {
        throw new Error("Token is not part of this pair");
      }
      
      // Calculate output amount using x*y=k formula with 0.3% fee
      const amountInWithFee = amountInWei * 997n; // 0.3% fee
      const numerator = amountInWithFee * reserveOut;
      const denominator = (reserveIn * 1000n) + amountInWithFee;
      const amountOut = numerator / denominator;
      
      // Get token symbols
      const tokenInContract = await getTokenContract(hre, tokenIn);
      const tokenOutContract = await getTokenContract(hre, tokenOut);
      const symbolIn = await tokenInContract.symbol();
      const symbolOut = await tokenOutContract.symbol();
      
      // Calculate price impact
      const currentPrice = Number(formatEther(reserveOut)) / Number(formatEther(reserveIn));
      const swapPrice = Number(formatEther(amountOut)) / Number(amountIn);
      const priceImpact = ((currentPrice - swapPrice) / currentPrice) * 100;
      
      console.log("=== Swap Estimation ===");
      console.log(`Input: ${amountIn} ${symbolIn}`);
      console.log(`Output: ${formatEther(amountOut)} ${symbolOut}`);
      console.log(`Price Impact: ${priceImpact.toFixed(4)}%`);
      console.log(`Exchange Rate: 1 ${symbolIn} = ${swapPrice.toFixed(6)} ${symbolOut}`);
      
    } catch (error) {
      console.error("❌ Error estimating swap:", error);
    }
  });