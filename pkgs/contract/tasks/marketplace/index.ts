import { task } from "hardhat/config";
import { parseEther } from "viem";

/**
 * NFTを出品するタスク
 */
task("marketplace:list", "List an NFT for sale")
  .addParam("contract", "Marketplace contract address")
  .addParam("nftContract", "NFT contract address")
  .addParam("tokenId", "Token ID")
  .addParam("price", "Price in ETH")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    console.log("Listing NFT for sale...");
    console.log("Marketplace:", taskArgs.contract);
    console.log("NFT Contract:", taskArgs.nftContract);
    console.log("Token ID:", taskArgs.tokenId);
    console.log("Price:", taskArgs.price, "ETH");

    const marketplace = await ethers.getContractAt("NFTMarketplace", taskArgs.contract);

    const tx = await marketplace.listNFT(
      taskArgs.nftContract,
      taskArgs.tokenId,
      parseEther(taskArgs.price)
    );

    const receipt = await tx.wait();
    console.log("Transaction hash:", tx.hash);

    // イベントからlistingIDを取得
    const event = receipt?.logs.find((log: any) => log.fragment?.name === "NFTListed");

    if (event) {
      console.log("Listing ID:", event.args[0].toString());
    }

    console.log("NFT listed successfully!");
  });

/**
 * NFTを購入するタスク
 */
task("marketplace:buy", "Buy an NFT")
  .addParam("contract", "Marketplace contract address")
  .addParam("listingId", "Listing ID")
  .addParam("price", "Price in ETH")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    console.log("Buying NFT...");
    console.log("Marketplace:", taskArgs.contract);
    console.log("Listing ID:", taskArgs.listingId);
    console.log("Price:", taskArgs.price, "ETH");

    const marketplace = await ethers.getContractAt("NFTMarketplace", taskArgs.contract);

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
  .addParam("contract", "Marketplace contract address")
  .addParam("listingId", "Listing ID")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    console.log("Cancelling listing...");
    console.log("Marketplace:", taskArgs.contract);
    console.log("Listing ID:", taskArgs.listingId);

    const marketplace = await ethers.getContractAt("NFTMarketplace", taskArgs.contract);

    const tx = await marketplace.cancelListing(taskArgs.listingId);
    await tx.wait();

    console.log("Transaction hash:", tx.hash);
    console.log("Listing cancelled successfully!");
  });

/**
 * オファーを作成するタスク
 */
task("marketplace:offer", "Make an offer on an NFT")
  .addParam("contract", "Marketplace contract address")
  .addParam("nftContract", "NFT contract address")
  .addParam("tokenId", "Token ID")
  .addParam("amount", "Offer amount in ETH")
  .addOptionalParam(
    "expiration",
    "Expiration timestamp",
    String(Math.floor(Date.now() / 1000) + 86400)
  ) // 24時間後
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    console.log("Making offer...");
    console.log("Marketplace:", taskArgs.contract);
    console.log("NFT Contract:", taskArgs.nftContract);
    console.log("Token ID:", taskArgs.tokenId);
    console.log("Amount:", taskArgs.amount, "ETH");
    console.log("Expiration:", new Date(parseInt(taskArgs.expiration) * 1000).toLocaleString());

    const marketplace = await ethers.getContractAt("NFTMarketplace", taskArgs.contract);

    const tx = await marketplace.makeOffer(
      taskArgs.nftContract,
      taskArgs.tokenId,
      parseInt(taskArgs.expiration),
      {
        value: parseEther(taskArgs.amount),
      }
    );

    const receipt = await tx.wait();
    console.log("Transaction hash:", tx.hash);

    // イベントからofferIDを取得
    const event = receipt?.logs.find((log: any) => log.fragment?.name === "OfferMade");

    if (event) {
      console.log("Offer ID:", event.args[0].toString());
    }

    console.log("Offer made successfully!");
  });

/**
 * オファーを受諾するタスク
 */
task("marketplace:accept-offer", "Accept an offer")
  .addParam("contract", "Marketplace contract address")
  .addParam("offerId", "Offer ID")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    console.log("Accepting offer...");
    console.log("Marketplace:", taskArgs.contract);
    console.log("Offer ID:", taskArgs.offerId);

    const marketplace = await ethers.getContractAt("NFTMarketplace", taskArgs.contract);

    const tx = await marketplace.acceptOffer(taskArgs.offerId);
    await tx.wait();

    console.log("Transaction hash:", tx.hash);
    console.log("Offer accepted successfully!");
  });

/**
 * オファーをキャンセルするタスク
 */
task("marketplace:cancel-offer", "Cancel an offer")
  .addParam("contract", "Marketplace contract address")
  .addParam("offerId", "Offer ID")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    console.log("Cancelling offer...");
    console.log("Marketplace:", taskArgs.contract);
    console.log("Offer ID:", taskArgs.offerId);

    const marketplace = await ethers.getContractAt("NFTMarketplace", taskArgs.contract);

    const tx = await marketplace.cancelOffer(taskArgs.offerId);
    await tx.wait();

    console.log("Transaction hash:", tx.hash);
    console.log("Offer cancelled successfully!");
  });

/**
 * 出品情報を取得するタスク
 */
task("marketplace:listing-info", "Get listing information")
  .addParam("contract", "Marketplace contract address")
  .addParam("listingId", "Listing ID")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    console.log("Getting listing information...");
    console.log("Marketplace:", taskArgs.contract);
    console.log("Listing ID:", taskArgs.listingId);

    const marketplace = await ethers.getContractAt("NFTMarketplace", taskArgs.contract);

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
  .addParam("contract", "Marketplace contract address")
  .addParam("offerId", "Offer ID")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    console.log("Getting offer information...");
    console.log("Marketplace:", taskArgs.contract);
    console.log("Offer ID:", taskArgs.offerId);

    const marketplace = await ethers.getContractAt("NFTMarketplace", taskArgs.contract);

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
  .addParam("contract", "Marketplace contract address")
  .addOptionalParam("count", "Number of recent sales to show", "10")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    console.log("Getting sales history...");
    console.log("Marketplace:", taskArgs.contract);

    const marketplace = await ethers.getContractAt("NFTMarketplace", taskArgs.contract);

    try {
      const totalSales = await marketplace.getSalesHistoryCount();
      const maxCount = Math.min(parseInt(taskArgs.count), Number(totalSales));

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
