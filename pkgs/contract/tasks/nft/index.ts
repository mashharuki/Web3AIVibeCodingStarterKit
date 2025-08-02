import { task } from "hardhat/config";
import { parseEther } from "viem";
import { getContractAddress } from "../../helpers/contractsJsonHelper";

/**
 * NFTをミントするタスク
 */
task("nft:mint", "Mint a new NFT")
  .addOptionalParam("contract", "NFT contract address (if not provided, will load from outputs)")
  .addParam("to", "Recipient address")
  .addParam("tokenUri", "Token URI")
  .addParam("royaltyRecipient", "Royalty recipient address")
  .addOptionalParam("royaltyFee", "Royalty fee (basis points)", "500")
  .addOptionalParam("mintFee", "Mint fee in ETH", "0.01")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();

    // コントラクトアドレスの取得
    let contractAddress = taskArgs.contract;
    if (!contractAddress) {
      contractAddress = getContractAddress(hre.network.name, "NFTContract");
      if (!contractAddress) {
        throw new Error(
          `NFTContract address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Minting NFT...");
    console.log("Contract:", contractAddress);
    console.log("To:", taskArgs.to);
    console.log("Token URI:", taskArgs.tokenUri);
    console.log("Royalty Recipient:", taskArgs.royaltyRecipient);
    console.log("Royalty Fee:", taskArgs.royaltyFee);

    const nftContract = await ethers.getContractAt("NFTContract", contractAddress);

    const tx = await nftContract.mintNFT(
      taskArgs.to,
      taskArgs.tokenUri,
      taskArgs.royaltyRecipient,
      Number.parseInt(taskArgs.royaltyFee),
      {
        value: parseEther(taskArgs.mintFee),
      }
    );

    const receipt = await tx.wait();
    console.log("Transaction hash:", tx.hash);
    console.log("Gas used:", receipt?.gasUsed.toString());

    // イベントからトークンIDを取得
    const event = receipt?.logs.find((log: unknown) => {
      const logWithFragment = log as { fragment?: { name: string } };
      return logWithFragment.fragment?.name === "NFTMinted";
    });

    if (event) {
      console.log("Minted Token ID:", event.args[0].toString());
    }

    console.log("NFT minted successfully!");
  });

/**
 * NFTの情報を取得するタスク
 */
task("nft:info", "Get NFT information")
  .addOptionalParam("contract", "NFT contract address (if not provided, will load from outputs)")
  .addParam("tokenId", "Token ID")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    // コントラクトアドレスの取得
    let contractAddress = taskArgs.contract;
    if (!contractAddress) {
      contractAddress = getContractAddress(hre.network.name, "NFTContract");
      if (!contractAddress) {
        throw new Error(
          `NFTContract address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Getting NFT information...");
    console.log("Contract:", contractAddress);
    console.log("Token ID:", taskArgs.tokenId);

    const nftContract = await ethers.getContractAt("NFTContract", contractAddress);

    try {
      const owner = await nftContract.ownerOf(taskArgs.tokenId);
      const creator = await nftContract.getCreator(taskArgs.tokenId);
      const tokenURI = await nftContract.tokenURI(taskArgs.tokenId);
      const [royaltyRecipient, royaltyAmount] = await nftContract.royaltyInfo(
        taskArgs.tokenId,
        parseEther("1") // 1 ETH での計算
      );

      console.log("Owner:", owner);
      console.log("Creator:", creator);
      console.log("Token URI:", tokenURI);
      console.log("Royalty Recipient:", royaltyRecipient);
      console.log("Royalty Amount (for 1 ETH):", ethers.formatEther(royaltyAmount));
    } catch (error) {
      console.error("Error getting NFT info:", error);
    }
  });

/**
 * ミント手数料を更新するタスク
 */
task("nft:update-mint-fee", "Update mint fee")
  .addOptionalParam("contract", "NFT contract address (if not provided, will load from outputs)")
  .addParam("newFee", "New mint fee in ETH")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();

    // コントラクトアドレスの取得
    let contractAddress = taskArgs.contract;
    if (!contractAddress) {
      contractAddress = getContractAddress(hre.network.name, "NFTContract");
      if (!contractAddress) {
        throw new Error(
          `NFTContract address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Updating mint fee...");
    console.log("Contract:", contractAddress);
    console.log("New Fee:", taskArgs.newFee, "ETH");

    const nftContract = await ethers.getContractAt("NFTContract", contractAddress);

    const tx = await nftContract.updateMintFee(parseEther(taskArgs.newFee));
    await tx.wait();

    console.log("Transaction hash:", tx.hash);
    console.log("Mint fee updated successfully!");
  });

/**
 * ロイヤリティを更新するタスク
 */
task("nft:update-royalty", "Update token royalty")
  .addOptionalParam("contract", "NFT contract address (if not provided, will load from outputs)")
  .addParam("tokenId", "Token ID")
  .addParam("recipient", "New royalty recipient")
  .addParam("feeNumerator", "New royalty fee numerator (basis points)")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    // コントラクトアドレスの取得
    let contractAddress = taskArgs.contract;
    if (!contractAddress) {
      contractAddress = getContractAddress(hre.network.name, "NFTContract");
      if (!contractAddress) {
        throw new Error(
          `NFTContract address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Updating token royalty...");
    console.log("Contract:", contractAddress);
    console.log("Token ID:", taskArgs.tokenId);
    console.log("New Recipient:", taskArgs.recipient);
    console.log("New Fee Numerator:", taskArgs.feeNumerator);

    const nftContract = await ethers.getContractAt("NFTContract", contractAddress);

    const tx = await nftContract.updateTokenRoyalty(
      taskArgs.tokenId,
      taskArgs.recipient,
      Number.parseInt(taskArgs.feeNumerator)
    );
    await tx.wait();

    console.log("Transaction hash:", tx.hash);
    console.log("Token royalty updated successfully!");
  });

/**
 * 手数料を引き出すタスク
 */
task("nft:withdraw-fees", "Withdraw accumulated fees")
  .addOptionalParam("contract", "NFT contract address (if not provided, will load from outputs)")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    // コントラクトアドレスの取得
    let contractAddress = taskArgs.contract;
    if (!contractAddress) {
      contractAddress = getContractAddress(hre.network.name, "NFTContract");
      if (!contractAddress) {
        throw new Error(
          `NFTContract address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Withdrawing fees...");
    console.log("Contract:", contractAddress);

    const nftContract = await ethers.getContractAt("NFTContract", contractAddress);

    const balanceBefore = await ethers.provider.getBalance(contractAddress);
    console.log("Contract balance before:", ethers.formatEther(balanceBefore), "ETH");

    const tx = await nftContract.withdrawFees();
    await tx.wait();

    console.log("Transaction hash:", tx.hash);
    console.log("Fees withdrawn successfully!");
  });
