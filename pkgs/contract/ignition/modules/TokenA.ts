import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * TokenA Ignition モジュール
 * 
 * フォーセット機能付きERC20トークン（TokenA）をデプロイするモジュール
 * 
 * @param owner トークンのオーナーアドレス（省略時はデプロイアカウント）
 */
const TokenAModule = buildModule("TokenAModule", (m) => {
  // デプロイ時のパラメータ
  const owner = m.getParameter("owner", m.getAccount(0));

  // TokenAコントラクトをデプロイ
  const tokenA = m.contract("TokenA", [owner], {
    id: "TokenA",
  });

  return { tokenA };
});

export default TokenAModule;
