import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * TokenB Ignition モジュール
 *
 * フォーセット機能付きERC20トークン（TokenB）をデプロイするモジュール
 *
 * @param owner トークンのオーナーアドレス（省略時はデプロイアカウント）
 */
const TokenBModule = buildModule("TokenBModule", (m) => {
  // デプロイ時のパラメータ
  const owner = m.getParameter("owner", m.getAccount(0));

  // TokenBコントラクトをデプロイ
  const tokenB = m.contract("TokenB", [owner], {
    id: "TokenB",
  });

  return { tokenB };
});

export default TokenBModule;
