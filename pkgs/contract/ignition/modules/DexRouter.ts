import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import DexFactoryModule from "./DexFactory";

/**
 * DexRouter Ignition モジュール
 * 
 * DEXルーターコントラクトをデプロイするモジュール
 * ユーザーインターフェースとして流動性管理とスワップ機能を提供
 * 
 * DexFactoryモジュールに依存し、ファクトリーアドレスを参照する
 */
const DexRouterModule = buildModule("DexRouterModule", (m) => {
  // DexFactoryモジュールを使用
  const { dexFactory } = m.useModule(DexFactoryModule);

  // DexRouterコントラクトをデプロイ（ファクトリーアドレスを引数に）
  const dexRouter = m.contract("DexRouter", [dexFactory], {
    id: "DexRouter",
  });

  return { dexRouter, dexFactory };
});

export default DexRouterModule;
