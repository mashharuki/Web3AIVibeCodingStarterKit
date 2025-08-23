import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DEXFactoryModule = buildModule("DEXFactoryModule", (m) => {
  // DEXRouterのデプロイも必要になる可能性があります。
  const dexFactory = m.contract("DEXFactory", ["0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072"]);

  return { dexFactory };
});

export default DEXFactoryModule;
