import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TestTokenFaucetModule = buildModule("TestTokenFaucetModule", (m) => {
  // Get the deployer account as the initial owner
  const deployer = m.getAccount(0);
  
  // Deploy TestTokenFaucet contract
  const testTokenFaucet = m.contract("TestTokenFaucet", [deployer]);

  return { testTokenFaucet };
});

export default TestTokenFaucetModule;