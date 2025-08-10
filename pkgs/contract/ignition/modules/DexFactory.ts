import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * DexFactory Ignition モジュール
 * 
 * DEXファクトリーコントラクトをデプロイするモジュール
 * ペアの作成と管理、手数料設定を行う
 * 
 * @param feeToSetter 手数料設定権限を持つアドレス（省略時はデプロイアカウント）
 */
const DexFactoryModule = buildModule("DexFactoryModule", (m) => {
  // デプロイ時のパラメータ
  const feeToSetter = m.getParameter("feeToSetter", m.getAccount(0));

  // DexFactoryコントラクトをデプロイ
  const dexFactory = m.contract("DexFactory", [feeToSetter], {
    id: "DexFactory",
  });

  return { dexFactory };
});

export default DexFactoryModule;
