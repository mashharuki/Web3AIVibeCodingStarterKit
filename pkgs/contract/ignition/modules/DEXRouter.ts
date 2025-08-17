import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import DEXFactoryModule from "./DEXFactory";

const DEXRouterModule = buildModule("DEXRouterModule", (m) => {
  // Import the factory from DEXFactoryModule
  const { factory } = m.useModule(DEXFactoryModule);
  
  // Get the deployer account to use as WETH placeholder for testing
  // In production, this would be the actual WETH contract address
  const deployer = m.getAccount(0);
  const wethAddress = deployer; // Using deployer address as WETH placeholder
  
  // Deploy DEXRouter contract
  const router = m.contract("DEXRouter", [factory, wethAddress]);

  return { router, factory };
});

export default DEXRouterModule;