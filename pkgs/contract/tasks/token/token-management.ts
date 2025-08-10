import "dotenv/config";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../../helpers/contractsJsonHelper";

/**
 * TokenAまたはTokenBをmintするタスク
 *
 * 使用方法:
 * npx hardhat mintTokens --token TokenA --amount 1000 --to 0x123...
 * npx hardhat mintTokens --token TokenB --amount 500 --network sepolia
 */
task("mintTokens", "TokenAまたはTokenBをmintします")
  .addParam("token", "mintするトークン (TokenA または TokenB)")
  .addParam("amount", "mintする量（Ether単位）")
  .addOptionalParam("to", "mint先のアドレス（省略時は実行者のアドレス）")
  .setAction(
    async (
      taskArgs: { token: string; amount: string; to?: string },
      hre: HardhatRuntimeEnvironment
    ) => {
      const network = hre.network.name;
      const { token, amount, to } = taskArgs;

      console.log(
        `🪙 ${network} ネットワークで ${token} を ${amount} mint します...\n`
      );

      try {
        // デプロイされたコントラクトアドレスを読み込み
        const contracts = loadDeployedContractAddresses(network);

        if (!contracts || !contracts.tokens) {
          console.error(
            `❌ ${network} ネットワークのトークンアドレスが見つかりません`
          );
          return;
        }

        // mint先アドレスを取得
        let mintToAddress = to;
        if (!mintToAddress) {
          const [signer] = await hre.ethers.getSigners();
          if (!signer) {
            throw new Error("Signerが見つかりません");
          }
          mintToAddress = signer.address;
        }

        // トークンコントラクトを取得
        let tokenContract: any;
        let tokenAddress: string;
        let tokenSymbol: string;

        if (token === "TokenA") {
          if (!contracts.tokens.TokenA) {
            throw new Error("TokenAのアドレスが見つかりません");
          }
          tokenAddress = contracts.tokens.TokenA;
          tokenContract = (await hre.ethers.getContractAt(
            "TokenA",
            tokenAddress
          )) as any;
          tokenSymbol = "TKA";
        } else if (token === "TokenB") {
          if (!contracts.tokens.TokenB) {
            throw new Error("TokenBのアドレスが見つかりません");
          }
          tokenAddress = contracts.tokens.TokenB;
          tokenContract = (await hre.ethers.getContractAt(
            "TokenB",
            tokenAddress
          )) as any;
          tokenSymbol = "TKB";
        } else {
          throw new Error(
            "無効なトークン名です。TokenA または TokenB を指定してください"
          );
        }

        // mint前の残高を確認
        const balanceBefore = await tokenContract.balanceOf(mintToAddress);
        console.log(
          `📊 mint前の残高: ${hre.ethers.formatEther(balanceBefore)} ${tokenSymbol}`
        );

        // mint実行
        const mintAmount = hre.ethers.parseEther(amount);
        console.log(`🚀 ${token} を ${amount} ${tokenSymbol} mint中...`);

        const tx = await tokenContract.mint(mintToAddress, mintAmount);
        console.log(`📝 Transaction Hash: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`✅ トランザクション確定 (Block: ${receipt.blockNumber})`);

        // mint後の残高を確認
        const balanceAfter = await tokenContract.balanceOf(mintToAddress);
        console.log(
          `📊 mint後の残高: ${hre.ethers.formatEther(balanceAfter)} ${tokenSymbol}`
        );
        console.log(
          `📈 増加量: ${hre.ethers.formatEther(balanceAfter - balanceBefore)} ${tokenSymbol}`
        );

        console.log("\n🎯 次のステップ:");
        console.log(
          "• npx hardhat checkBalances --address YOUR_ADDRESS (残高確認)"
        );
        console.log(
          "• npx hardhat addLiquidity --amount-a 100 --amount-b 100 (流動性追加)"
        );
      } catch (error) {
        console.error("❌ mint中にエラーが発生しました:", error);
        throw error;
      }
    }
  );

/**
 * 指定したアドレスのToken残高を確認するタスク
 *
 * 使用方法:
 * npx hardhat checkBalances --address 0x123...
 * npx hardhat checkBalances (省略時は実行者のアドレス)
 */
task("checkBalances", "指定したアドレスのToken残高を確認します")
  .addOptionalParam(
    "address",
    "残高を確認するアドレス（省略時は実行者のアドレス）"
  )
  .setAction(
    async (taskArgs: { address?: string }, hre: HardhatRuntimeEnvironment) => {
      const network = hre.network.name;
      const { address } = taskArgs;

      console.log(`💰 ${network} ネットワークでToken残高を確認します...\n`);

      try {
        // デプロイされたコントラクトアドレスを読み込み
        const contracts = loadDeployedContractAddresses(network);

        if (!contracts || !contracts.tokens) {
          console.error(
            `❌ ${network} ネットワークのトークンアドレスが見つかりません`
          );
          return;
        }

        // 確認対象アドレスを取得
        let checkAddress = address;
        if (!checkAddress) {
          const [signer] = await hre.ethers.getSigners();
          if (!signer) {
            throw new Error("Signerが見つかりません");
          }
          checkAddress = signer.address;
        }

        console.log(`🔍 アドレス: ${checkAddress}`);
        console.log();

        // ETH残高を確認
        const ethBalance = await hre.ethers.provider.getBalance(checkAddress);
        console.log(`💎 ETH残高: ${hre.ethers.formatEther(ethBalance)} ETH`);

        // TokenA残高を確認
        if (contracts.tokens.TokenA) {
          const tokenA = (await hre.ethers.getContractAt(
            "TokenA",
            contracts.tokens.TokenA
          )) as any;
          const balanceA = await tokenA.balanceOf(checkAddress);
          console.log(`🔸 TokenA残高: ${hre.ethers.formatEther(balanceA)} TKA`);
        }

        // TokenB残高を確認
        if (contracts.tokens.TokenB) {
          const tokenB = (await hre.ethers.getContractAt(
            "TokenB",
            contracts.tokens.TokenB
          )) as any;
          const balanceB = await tokenB.balanceOf(checkAddress);
          console.log(`🔹 TokenB残高: ${hre.ethers.formatEther(balanceB)} TKB`);
        }

        // LP Token残高を確認
        if (contracts.pairs && contracts.pairs["TokenA-TokenB"]) {
          const pair = (await hre.ethers.getContractAt(
            "DexPair",
            contracts.pairs["TokenA-TokenB"]
          )) as any;
          const lpBalance = await pair.balanceOf(checkAddress);
          console.log(
            `🔮 LP Token残高: ${hre.ethers.formatEther(lpBalance)} LP`
          );
        }

        console.log("\n🎯 次に使用できるコマンド:");
        console.log("• npx hardhat mintTokens --token TokenA --amount 1000");
        console.log("• npx hardhat addLiquidity --amount-a 100 --amount-b 100");
      } catch (error) {
        console.error("❌ 残高確認中にエラーが発生しました:", error);
        throw error;
      }
    }
  );
