import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import DexFactoryModule from "./DexFactory";
import DexRouterModule from "./DexRouter";
import TokenAModule from "./TokenA";
import TokenBModule from "./TokenB";

/**
 * DEX全体 Ignition モジュール
 * 
 * DEXシステム全体をデプロイするメインモジュール
 * 以下のコントラクトを順序立ててデプロイする：
 * 1. TokenA（テスト用トークン）
 * 2. TokenB（テスト用トークン）
 * 3. DexFactory（ペア管理）
 * 4. DexRouter（ユーザーインターフェース）
 * 
 * デプロイ後、TokenA-TokenBペアの作成も行う
 */
const DexModule = buildModule("DexModule", (m) => {
  // 各モジュールを使用してコントラクトをデプロイ
  const { tokenA } = m.useModule(TokenAModule);
  const { tokenB } = m.useModule(TokenBModule);
  const { dexFactory } = m.useModule(DexFactoryModule);
  const { dexRouter } = m.useModule(DexRouterModule);

  // TokenA-TokenBペアを作成
  m.call(dexFactory, "createPair", [tokenA, tokenB], {
    id: "CreateTokenATokenBPair",
  });

  return {
    tokenA,
    tokenB,
    dexFactory,
    dexRouter,
  };
});

export default DexModule;
