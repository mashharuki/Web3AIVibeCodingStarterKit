import { task } from "hardhat/config";
import { resetContractAddressesJson, writeContractAddress } from "../../helpers/contractsJsonHelper";
import FullDeploymentModule from "../../ignition/modules/FullDeployment";
import NFTContractModule from "../../ignition/modules/NFTContract";
import NFTMarketplaceModule from "../../ignition/modules/NFTMarketplace";

/**
 * 全てのコントラクトをデプロイするタスク
 */
task("deploy:full", "Deploy all contracts")
  .addOptionalParam("owner", "Owner address")
  .addOptionalParam("tokenName", "NFT token name", "VibeNFT")
  .addOptionalParam("tokenSymbol", "NFT token symbol", "VNFT")
  .addOptionalParam("mintFee", "Mint fee in ETH", "0.01")
  .addFlag("reset", "Reset contract addresses file")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    
    console.log("Deploying contracts to network:", network.name);
    
    // オーナーアドレスを設定（指定されていない場合はデプロイヤーのアドレスを使用）
    const [deployer] = await ethers.getSigners();
    const owner = taskArgs.owner || deployer.address;
    
    console.log("Deployer address:", deployer.address);
    console.log("Owner address:", owner);
    
    // コントラクトアドレスファイルをリセット（フラグが設定されている場合）
    if (taskArgs.reset) {
      console.log("Resetting contract addresses file...");
      resetContractAddressesJson({ network: network.name });
    }
    
    try {
      // パラメータを設定
      const parameters = {
        owner,
        tokenName: taskArgs.tokenName,
        tokenSymbol: taskArgs.tokenSymbol,
        mintFee: hre.ethers.parseEther(taskArgs.mintFee),
      };
      
      console.log("Deployment parameters:", parameters);
      
      // 全てのコントラクトをデプロイ
      const { nftContract, marketplace } = await hre.ignition.deploy(FullDeploymentModule, {
        parameters: { FullDeploymentModule: parameters }
      });
      
      console.log("✅ All contracts deployed successfully!");
      console.log("NFT Contract address:", (nftContract as unknown as { target: string }).target);
      console.log("Marketplace Contract address:", (marketplace as unknown as { target: string }).target);
      
      // コントラクトアドレスを保存
      writeContractAddress({
        group: "contracts",
        name: "NFTContract",
        value: (nftContract as unknown as { target: string }).target,
        network: network.name,
      });
      
      writeContractAddress({
        group: "contracts", 
        name: "NFTMarketplace",
        value: (marketplace as unknown as { target: string }).target,
        network: network.name,
      });
      
      console.log(`📝 Contract addresses saved to outputs/contracts-${network.name}.json`);
      
    } catch (error) {
      console.error("❌ Deployment failed:", error);
      throw error;
    }
  });

/**
 * NFTコントラクトのみをデプロイするタスク
 */
task("deploy:nft", "Deploy NFT contract only")
  .addOptionalParam("owner", "Owner address")
  .addOptionalParam("tokenName", "NFT token name", "VibeNFT")
  .addOptionalParam("tokenSymbol", "NFT token symbol", "VNFT")
  .addOptionalParam("mintFee", "Mint fee in ETH", "0.01")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    
    console.log("Deploying NFT contract to network:", network.name);
    
    // オーナーアドレスを設定
    const [deployer] = await ethers.getSigners();
    const owner = taskArgs.owner || deployer.address;
    
    console.log("Deployer address:", deployer.address);
    console.log("Owner address:", owner);
    
    try {
      // パラメータを設定
      const parameters = {
        owner,
        tokenName: taskArgs.tokenName,
        tokenSymbol: taskArgs.tokenSymbol,
        mintFee: hre.ethers.parseEther(taskArgs.mintFee),
      };
      
      console.log("Deployment parameters:", parameters);
      
      // NFTコントラクトをデプロイ
      const { nftContract } = await hre.ignition.deploy(NFTContractModule, {
        parameters: { NFTContractModule: parameters }
      });
      
      console.log("✅ NFT Contract deployed successfully!");
      // @ts-expect-error address is exist
      console.log("NFT Contract address:", (nftContract.address));
      
      // コントラクトアドレスを保存
      writeContractAddress({
        group: "contracts",
        name: "NFTContract",
        // @ts-expect-error address is exist
        value: (nftContract.address),
        network: network.name,
      });
      
      console.log(`📝 Contract address saved to outputs/contracts-${network.name}.json`);
      
    } catch (error) {
      console.error("❌ NFT Contract deployment failed:", error);
      throw error;
    }
  });

/**
 * マーケットプレイスコントラクトのみをデプロイするタスク
 */
task("deploy:marketplace", "Deploy marketplace contract only")
  .addOptionalParam("owner", "Owner address")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    
    console.log("Deploying Marketplace contract to network:", network.name);
    
    // オーナーアドレスを設定
    const [deployer] = await ethers.getSigners();
    const owner = taskArgs.owner || deployer.address;
    
    console.log("Deployer address:", deployer.address);
    console.log("Owner address:", owner);
    
    try {
      // パラメータを設定
      const parameters = {
        owner,
      };
      
      console.log("Deployment parameters:", parameters);
      
      // マーケットプレイスコントラクトをデプロイ
      const { marketplace } = await hre.ignition.deploy(NFTMarketplaceModule, {
        parameters: { NFTMarketplaceModule: parameters }
      });
      
      console.log("✅ Marketplace Contract deployed successfully!");
      // @ts-expect-error address is exist
      console.log("Marketplace Contract address:", marketplace.address);
      
      // コントラクトアドレスを保存
      writeContractAddress({
        group: "contracts",
        name: "NFTMarketplace",
        // @ts-expect-error address is exist
        value: marketplace.address,
        network: network.name,
      });
      
      console.log(`📝 Contract address saved to outputs/contracts-${network.name}.json`);
      
    } catch (error) {
      console.error("❌ Marketplace Contract deployment failed:", error);
      throw error;
    }
  });
