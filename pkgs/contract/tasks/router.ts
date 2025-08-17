import { task } from "hardhat/config";
import { formatEther, parseEther } from "viem";

task("router:add-liquidity", "Add liquidity to a token pair")
  .addParam("tokenA", "Address of token A")
  .addParam("tokenB", "Address of token B")
  .addParam("amountA", "Amount of token A to add")
  .addParam("amountB", "Amount of token B to add")
  .addOptionalParam("router", "Router contract address")
  .setAction(async (taskArgs, hre) => {
    const { tokenA, tokenB, amountA, amountB, router: routerAddress } = taskArgs;
    
    const [signer] = await hre.ethers.getSigners();
    console.log("Using account:", signer.address);

    // Get router contract
    const router = await hre.ethers.getContractAt("DEXRouter", routerAddress);
    
    // Get token contracts
    const tokenAContract = await hre.ethers.getContractAt("IERC20", tokenA);
    const tokenBContract = await hre.ethers.getContractAt("IERC20", tokenB);
    
    const amountAWei = parseEther(amountA);
    const amountBWei = parseEther(amountB);
    
    // Check balances
    const balanceA = await tokenAContract.balanceOf(signer.address);
    const balanceB = await tokenBContract.balanceOf(signer.address);
    
    console.log(`Token A balance: ${formatEther(balanceA)}`);
    console.log(`Token B balance: ${formatEther(balanceB)}`);
    
    if (balanceA < amountAWei || balanceB < amountBWei) {
      throw new Error("Insufficient token balance");
    }
    
    // Approve tokens
    console.log("Approving tokens...");
    await tokenAContract.approve(router.target, amountAWei);
    await tokenBContract.approve(router.target, amountBWei);
    
    // Add liquidity
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    console.log("Adding liquidity...");
    const tx = await router.addLiquidity(
      tokenA,
      tokenB,
      amountAWei,
      amountBWei,
      amountAWei * 95n / 100n, // 5% slippage tolerance
      amountBWei * 95n / 100n,
      signer.address,
      deadline
    );
    
    const receipt = await tx.wait();
    console.log("Transaction hash:", receipt?.hash);
    console.log("Liquidity added successfully!");
  });

task("router:swap", "Swap tokens using the router")
  .addParam("tokenIn", "Address of input token")
  .addParam("tokenOut", "Address of output token")
  .addParam("amountIn", "Amount of input token")
  .addOptionalParam("router", "Router contract address")
  .setAction(async (taskArgs, hre) => {
    const { tokenIn, tokenOut, amountIn, router: routerAddress } = taskArgs;
    
    const [signer] = await hre.ethers.getSigners();
    console.log("Using account:", signer.address);

    // Get router contract
    const router = await hre.ethers.getContractAt("DEXRouter", routerAddress);
    
    // Get token contract
    const tokenInContract = await hre.ethers.getContractAt("IERC20", tokenIn);
    
    const amountInWei = parseEther(amountIn);
    const path = [tokenIn, tokenOut];
    
    // Check balance
    const balance = await tokenInContract.balanceOf(signer.address);
    console.log(`Input token balance: ${formatEther(balance)}`);
    
    if (balance < amountInWei) {
      throw new Error("Insufficient token balance");
    }
    
    // Get expected output amount
    const amountsOut = await router.getAmountsOut(amountInWei, path);
    const expectedOut = amountsOut[1];
    
    console.log(`Expected output: ${formatEther(expectedOut)}`);
    
    // Approve input token
    console.log("Approving input token...");
    await tokenInContract.approve(router.target, amountInWei);
    
    // Execute swap
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const minAmountOut = expectedOut * 95n / 100n; // 5% slippage tolerance
    
    console.log("Executing swap...");
    const tx = await router.swapExactTokensForTokens(
      amountInWei,
      minAmountOut,
      path,
      signer.address,
      deadline
    );
    
    const receipt = await tx.wait();
    console.log("Transaction hash:", receipt?.hash);
    console.log("Swap completed successfully!");
  });

task("router:remove-liquidity", "Remove liquidity from a token pair")
  .addParam("tokenA", "Address of token A")
  .addParam("tokenB", "Address of token B")
  .addParam("liquidity", "Amount of LP tokens to burn")
  .addOptionalParam("router", "Router contract address")
  .setAction(async (taskArgs, hre) => {
    const { tokenA, tokenB, liquidity, router: routerAddress } = taskArgs;
    
    const [signer] = await hre.ethers.getSigners();
    console.log("Using account:", signer.address);

    // Get router and factory contracts
    const router = await hre.ethers.getContractAt("DEXRouter", routerAddress);
    const factory = await hre.ethers.getContractAt("DEXFactory", await router.factory());
    
    // Get pair address
    const pairAddress = await factory.getPair(tokenA, tokenB);
    if (pairAddress === hre.ethers.ZeroAddress) {
      throw new Error("Pair does not exist");
    }
    
    const pair = await hre.ethers.getContractAt("DEXPair", pairAddress);
    const liquidityWei = parseEther(liquidity);
    
    // Check LP token balance
    const lpBalance = await pair.balanceOf(signer.address);
    console.log(`LP token balance: ${formatEther(lpBalance)}`);
    
    if (lpBalance < liquidityWei) {
      throw new Error("Insufficient LP token balance");
    }
    
    // Approve LP tokens
    console.log("Approving LP tokens...");
    await pair.approve(router.target, liquidityWei);
    
    // Remove liquidity
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    console.log("Removing liquidity...");
    const tx = await router.removeLiquidity(
      tokenA,
      tokenB,
      liquidityWei,
      0, // No minimum amounts for this example
      0,
      signer.address,
      deadline
    );
    
    const receipt = await tx.wait();
    console.log("Transaction hash:", receipt?.hash);
    console.log("Liquidity removed successfully!");
  });

task("router:quote", "Get quote for token swap")
  .addParam("tokenIn", "Address of input token")
  .addParam("tokenOut", "Address of output token")
  .addParam("amountIn", "Amount of input token")
  .addOptionalParam("router", "Router contract address")
  .setAction(async (taskArgs, hre) => {
    const { tokenIn, tokenOut, amountIn, router: routerAddress } = taskArgs;
    
    // Get router contract
    const router = await hre.ethers.getContractAt("DEXRouter", routerAddress);
    
    const amountInWei = parseEther(amountIn);
    const path = [tokenIn, tokenOut];
    
    try {
      // Get expected output amount
      const amountsOut = await router.getAmountsOut(amountInWei, path);
      const expectedOut = amountsOut[1];
      
      console.log(`Input: ${amountIn} tokens`);
      console.log(`Expected output: ${formatEther(expectedOut)} tokens`);
      
      // Calculate price impact
      const factory = await hre.ethers.getContractAt("DEXFactory", await router.factory());
      const pairAddress = await factory.getPair(tokenIn, tokenOut);
      
      if (pairAddress !== hre.ethers.ZeroAddress) {
        const pair = await hre.ethers.getContractAt("DEXPair", pairAddress);
        const reserves = await pair.getReserves();
        
        // Determine which token is token0
        const token0 = await pair.token0();
        const [reserveIn, reserveOut] = tokenIn.toLowerCase() === token0.toLowerCase() 
          ? [reserves[0], reserves[1]] 
          : [reserves[1], reserves[0]];
        
        const currentPrice = Number(reserveOut) / Number(reserveIn);
        const swapPrice = Number(formatEther(expectedOut)) / Number(amountIn);
        const priceImpact = ((currentPrice - swapPrice) / currentPrice) * 100;
        
        console.log(`Current price: ${currentPrice.toFixed(6)}`);
        console.log(`Swap price: ${swapPrice.toFixed(6)}`);
        console.log(`Price impact: ${priceImpact.toFixed(2)}%`);
      }
    } catch (error) {
      console.error("Error getting quote:", error);
    }
  });