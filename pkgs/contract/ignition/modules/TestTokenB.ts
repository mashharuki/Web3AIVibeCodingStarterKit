import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const TestTokenBModule = buildModule("TestTokenBModule", (m) => {
  // Get the deployer account as the initial owner
  const deployer = m.getAccount(0);
  
  // Initial supply: 1,000,000 tokens
  const initialSupply = parseEther("1000000");
  
  // Deploy TestTokenB contract
  const testTokenB = m.contract("TestTokenB", [deployer, initialSupply]);

  return { testTokenB };
});

export default TestTokenBModule;