import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

/**
 * NFTコントラクトのデプロイメントモジュール
 */
const NFTContractModule = buildModule("NFTContractModule", (m) => {
  // デプロイメントパラメータの設定
  const tokenName = m.getParameter("tokenName", "VibeNFT");
  const tokenSymbol = m.getParameter("tokenSymbol", "VNFT");
  const mintFee = m.getParameter("mintFee", parseEther("0.01"));
  const owner = m.getParameter("owner");

  // NFTコントラクトをデプロイ
  const nftContract = m.contract("NFTContract", [tokenName, tokenSymbol, mintFee, owner]);

  return {
    nftContract,
  };
});

export default NFTContractModule;
