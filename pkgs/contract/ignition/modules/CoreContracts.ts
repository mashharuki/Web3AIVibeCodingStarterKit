import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import DEXFactoryModule from "./DEXFactory";
import DEXRouterModule from "./DEXRouter";

/**
 * Core DEX contracts deployment module
 * Deploys only the essential DEX contracts (Factory and Router)
 */
const CoreContractsModule = buildModule("CoreContractsModule", (m) => {
  // Deploy factory first
  const { factory } = m.useModule(DEXFactoryModule);
  
  // Deploy router with factory dependency
  const { router } = m.useModule(DEXRouterModule);

  return {
    factory,
    router,
  };
});

export default CoreContractsModule;