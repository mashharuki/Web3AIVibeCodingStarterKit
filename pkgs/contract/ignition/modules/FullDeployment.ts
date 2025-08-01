import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import NFTContractModule from "./NFTContract";
import NFTMarketplaceModule from "./NFTMarketplace";

/**
 * 全体のデプロイメントモジュール
 * NFTコントラクトとマーケットプレイスの両方をデプロイする
 */
const FullDeploymentModule = buildModule("FullDeploymentModule", (m) => {
  // NFTコントラクトをデプロイ
  const { nftContract } = m.useModule(NFTContractModule);

  // NFTマーケットプレイスをデプロイ
  const { marketplace } = m.useModule(NFTMarketplaceModule);

  return {
    nftContract,
    marketplace,
  };
});

export default FullDeploymentModule;
