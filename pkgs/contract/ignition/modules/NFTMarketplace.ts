import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * NFTマーケットプレイスのデプロイメントモジュール
 */
const NFTMarketplaceModule = buildModule("NFTMarketplaceModule", (m) => {
  // デプロイメントパラメータの設定
  const owner = m.getParameter("owner");

  // NFTマーケットプレイスをデプロイ
  const marketplace = m.contract("NFTMarketplace", [owner]);

  return {
    marketplace,
  };
});

export default NFTMarketplaceModule;
