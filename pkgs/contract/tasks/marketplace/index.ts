import { task } from "hardhat/config";
import { parseEther } from "viem";
import { getContractAddress } from "../../helpers/contractsJsonHelper";

/**
 * NFTを出品するタスク
 */
task("marketplace:list", "List an NFT for sale")
  .addOptionalParam("contract", "Marketplace contract address (if not provided, will load from outputs)")
  .addOptionalParam("nftContract", "NFT contract address (if not provided, will load from outputs)")
  .addParam("tokenId", "Token ID")
  .addParam("price", "Price in ETH")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    // マーケットプレイスコントラクトアドレスの取得
    let marketplaceAddress = taskArgs.contract;
    if (!marketplaceAddress) {
      marketplaceAddress = getContractAddress(hre.network.name, "NFTMarketplace");
      if (!marketplaceAddress) {
        throw new Error(
          `NFTMarketplace address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    // NFTコントラクトアドレスの取得
    let nftContractAddress = taskArgs.nftContract;
    if (!nftContractAddress) {
      nftContractAddress = getContractAddress(hre.network.name, "NFTContract");
      if (!nftContractAddress) {
        throw new Error(
          `NFTContract address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Listing NFT for sale...");
    console.log("Marketplace:", marketplaceAddress);
    console.log("NFT Contract:", nftContractAddress);
    console.log("Token ID:", taskArgs.tokenId);
    console.log("Price:", taskArgs.price, "ETH");

    const marketplace = await ethers.getContractAt("NFTMarketplace", marketplaceAddress);

    const tx = await marketplace.listNFT(
      nftContractAddress,
      taskArgs.tokenId,
      parseEther(taskArgs.price)
    );

    const receipt = await tx.wait();
    console.log("Transaction hash:", tx.hash);

    // イベントからlistingIDを取得
    const event = receipt?.logs.find((log: unknown) => {
      const logWithFragment = log as { fragment?: { name: string } };
      return logWithFragment.fragment?.name === "NFTListed";
    });

    if (event) {
      console.log("Listing ID:", event.args[0].toString());
    }

    console.log("NFT listed successfully!");
  });

/**
 * NFTを購入するタスク
 */
task("marketplace:buy", "Buy an NFT")
  .addOptionalParam("contract", "Marketplace contract address (if not provided, will load from outputs)")
  .addParam("listingId", "Listing ID")
  .addParam("price", "Price in ETH")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    // マーケットプレイスコントラクトアドレスの取得
    let marketplaceAddress = taskArgs.contract;
    if (!marketplaceAddress) {
      marketplaceAddress = getContractAddress(hre.network.name, "NFTMarketplace");
      if (!marketplaceAddress) {
        throw new Error(
          `NFTMarketplace address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Buying NFT...");
    console.log("Marketplace:", marketplaceAddress);
    console.log("Listing ID:", taskArgs.listingId);
    console.log("Price:", taskArgs.price, "ETH");

    const marketplace = await ethers.getContractAt("NFTMarketplace", marketplaceAddress);

    const tx = await marketplace.buyNFT(taskArgs.listingId, {
      value: parseEther(taskArgs.price),
    });

    await tx.wait();
    console.log("Transaction hash:", tx.hash);
    console.log("NFT purchased successfully!");
  });

/**
 * 出品をキャンセルするタスク
 */
task("marketplace:cancel", "Cancel an NFT listing")
  .addOptionalParam("contract", "Marketplace contract address (if not provided, will load from outputs)")
  .addParam("listingId", "Listing ID")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    // マーケットプレイスコントラクトアドレスの取得
    let marketplaceAddress = taskArgs.contract;
    if (!marketplaceAddress) {
      marketplaceAddress = getContractAddress(hre.network.name, "NFTMarketplace");
      if (!marketplaceAddress) {
        throw new Error(
          `NFTMarketplace address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Cancelling listing...");
    console.log("Marketplace:", marketplaceAddress);
    console.log("Listing ID:", taskArgs.listingId);

    const marketplace = await ethers.getContractAt("NFTMarketplace", marketplaceAddress);

    const tx = await marketplace.cancelListing(taskArgs.listingId);
    await tx.wait();

    console.log("Transaction hash:", tx.hash);
    console.log("Listing cancelled successfully!");
  });

/**
 * オファーを作成するタスク
 */
task("marketplace:offer", "Make an offer on an NFT")
  .addOptionalParam("contract", "Marketplace contract address (if not provided, will load from outputs)")
  .addOptionalParam("nftContract", "NFT contract address (if not provided, will load from outputs)")
  .addParam("tokenId", "Token ID")
  .addParam("amount", "Offer amount in ETH")
  .addOptionalParam(
    "expiration",
    "Expiration timestamp",
    String(Math.floor(Date.now() / 1000) + 86400)
  ) // 24時間後
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    // マーケットプレイスコントラクトアドレスの取得
    let marketplaceAddress = taskArgs.contract;
    if (!marketplaceAddress) {
      marketplaceAddress = getContractAddress(hre.network.name, "NFTMarketplace");
      if (!marketplaceAddress) {
        throw new Error(
          `NFTMarketplace address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    // NFTコントラクトアドレスの取得
    let nftContractAddress = taskArgs.nftContract;
    if (!nftContractAddress) {
      nftContractAddress = getContractAddress(hre.network.name, "NFTContract");
      if (!nftContractAddress) {
        throw new Error(
          `NFTContract address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Making offer...");
    console.log("Marketplace:", marketplaceAddress);
    console.log("NFT Contract:", nftContractAddress);
    console.log("Token ID:", taskArgs.tokenId);
    console.log("Amount:", taskArgs.amount, "ETH");
    console.log("Expiration:", new Date(Number.parseInt(taskArgs.expiration) * 1000).toLocaleString());

    const marketplace = await ethers.getContractAt("NFTMarketplace", marketplaceAddress);

    const tx = await marketplace.makeOffer(
      nftContractAddress,
      taskArgs.tokenId,
      Number.parseInt(taskArgs.expiration),
      {
        value: parseEther(taskArgs.amount),
      }
    );

    const receipt = await tx.wait();
    console.log("Transaction hash:", tx.hash);

    // イベントからofferIDを取得
    const event = receipt?.logs.find((log: unknown) => {
      const logWithFragment = log as { fragment?: { name: string } };
      return logWithFragment.fragment?.name === "OfferMade";
    });

    if (event) {
      console.log("Offer ID:", event.args[0].toString());
    }

    console.log("Offer made successfully!");
  });

/**
 * オファーを受諾するタスク
 */
task("marketplace:accept-offer", "Accept an offer")
  .addOptionalParam("contract", "Marketplace contract address (if not provided, will load from outputs)")
  .addParam("offerId", "Offer ID")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    // マーケットプレイスコントラクトアドレスの取得
    let marketplaceAddress = taskArgs.contract;
    if (!marketplaceAddress) {
      marketplaceAddress = getContractAddress(hre.network.name, "NFTMarketplace");
      if (!marketplaceAddress) {
        throw new Error(
          `NFTMarketplace address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Accepting offer...");
    console.log("Marketplace:", marketplaceAddress);
    console.log("Offer ID:", taskArgs.offerId);

    const marketplace = await ethers.getContractAt("NFTMarketplace", marketplaceAddress);

    const tx = await marketplace.acceptOffer(taskArgs.offerId);
    await tx.wait();

    console.log("Transaction hash:", tx.hash);
    console.log("Offer accepted successfully!");
  });

/**
 * オファーをキャンセルするタスク
 */
task("marketplace:cancel-offer", "Cancel an offer")
  .addOptionalParam("contract", "Marketplace contract address (if not provided, will load from outputs)")
  .addParam("offerId", "Offer ID")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    // マーケットプレイスコントラクトアドレスの取得
    let marketplaceAddress = taskArgs.contract;
    if (!marketplaceAddress) {
      marketplaceAddress = getContractAddress(hre.network.name, "NFTMarketplace");
      if (!marketplaceAddress) {
        throw new Error(
          `NFTMarketplace address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Cancelling offer...");
    console.log("Marketplace:", marketplaceAddress);
    console.log("Offer ID:", taskArgs.offerId);

    const marketplace = await ethers.getContractAt("NFTMarketplace", marketplaceAddress);

    const tx = await marketplace.cancelOffer(taskArgs.offerId);
    await tx.wait();

    console.log("Transaction hash:", tx.hash);
    console.log("Offer cancelled successfully!");
  });

/**
 * 出品情報を取得するタスク
 */
task("marketplace:listing-info", "Get listing information")
  .addOptionalParam("contract", "Marketplace contract address (if not provided, will load from outputs)")
  .addParam("listingId", "Listing ID")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    // マーケットプレイスコントラクトアドレスの取得
    let marketplaceAddress = taskArgs.contract;
    if (!marketplaceAddress) {
      marketplaceAddress = getContractAddress(hre.network.name, "NFTMarketplace");
      if (!marketplaceAddress) {
        throw new Error(
          `NFTMarketplace address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Getting listing information...");
    console.log("Marketplace:", marketplaceAddress);
    console.log("Listing ID:", taskArgs.listingId);

    const marketplace = await ethers.getContractAt("NFTMarketplace", marketplaceAddress);

    try {
      const listing = await marketplace.listings(taskArgs.listingId);

      console.log("Seller:", listing.seller);
      console.log("NFT Contract:", listing.nftContract);
      console.log("Token ID:", listing.tokenId.toString());
      console.log("Price:", ethers.formatEther(listing.price), "ETH");
      console.log("Active:", listing.active);
      console.log("Listing Time:", new Date(Number(listing.listingTime) * 1000).toLocaleString());
    } catch (error) {
      console.error("Error getting listing info:", error);
    }
  });

/**
 * オファー情報を取得するタスク
 */
task("marketplace:offer-info", "Get offer information")
  .addOptionalParam("contract", "Marketplace contract address (if not provided, will load from outputs)")
  .addParam("offerId", "Offer ID")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    // マーケットプレイスコントラクトアドレスの取得
    let marketplaceAddress = taskArgs.contract;
    if (!marketplaceAddress) {
      marketplaceAddress = getContractAddress(hre.network.name, "NFTMarketplace");
      if (!marketplaceAddress) {
        throw new Error(
          `NFTMarketplace address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Getting offer information...");
    console.log("Marketplace:", marketplaceAddress);
    console.log("Offer ID:", taskArgs.offerId);

    const marketplace = await ethers.getContractAt("NFTMarketplace", marketplaceAddress);

    try {
      const offer = await marketplace.offers(taskArgs.offerId);

      console.log("Bidder:", offer.bidder);
      console.log("NFT Contract:", offer.nftContract);
      console.log("Token ID:", offer.tokenId.toString());
      console.log("Amount:", ethers.formatEther(offer.amount), "ETH");
      console.log("Expiration:", new Date(Number(offer.expiration) * 1000).toLocaleString());
      console.log("Active:", offer.active);
    } catch (error) {
      console.error("Error getting offer info:", error);
    }
  });

/**
 * 販売履歴を取得するタスク
 */
task("marketplace:sales-history", "Get sales history")
  .addOptionalParam("contract", "Marketplace contract address (if not provided, will load from outputs)")
  .addOptionalParam("count", "Number of recent sales to show", "10")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    // マーケットプレイスコントラクトアドレスの取得
    let marketplaceAddress = taskArgs.contract;
    if (!marketplaceAddress) {
      marketplaceAddress = getContractAddress(hre.network.name, "NFTMarketplace");
      if (!marketplaceAddress) {
        throw new Error(
          `NFTMarketplace address not found for network ${hre.network.name}. Please deploy the contract first or provide the address manually.`
        );
      }
    }

    console.log("Getting sales history...");
    console.log("Marketplace:", marketplaceAddress);

    const marketplace = await ethers.getContractAt("NFTMarketplace", marketplaceAddress);

    try {
      const totalSales = await marketplace.getSalesHistoryCount();
      const maxCount = Math.min(Number.parseInt(taskArgs.count), Number(totalSales));

      console.log("Total sales:", totalSales.toString());
      console.log("Showing recent", maxCount, "sales:");

      for (let i = Number(totalSales) - maxCount; i < Number(totalSales); i++) {
        const sale = await marketplace.salesHistory(i);
        console.log(`\nSale ${i + 1}:`);
        console.log("  Seller:", sale.seller);
        console.log("  Buyer:", sale.buyer);
        console.log("  NFT Contract:", sale.nftContract);
        console.log("  Token ID:", sale.tokenId.toString());
        console.log("  Price:", ethers.formatEther(sale.price), "ETH");
        console.log("  Timestamp:", new Date(Number(sale.timestamp) * 1000).toLocaleString());
      }
    } catch (error) {
      console.error("Error getting sales history:", error);
    }
  });
