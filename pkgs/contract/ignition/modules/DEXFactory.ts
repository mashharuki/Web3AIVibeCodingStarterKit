import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DEXFactoryModule = buildModule("DEXFactoryModule", (m) => {
  // Get the deployer account as the initial fee setter
  const deployer = m.getAccount(0);
  
  // Deploy the DEXFactory contract with the deployer as the initial fee setter
  const factory = m.contract("DEXFactory", [deployer]);

  return { factory };
});

export default DEXFactoryModule;