import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const TestTokenAModule = buildModule("TestTokenAModule", (m) => {
  // Get the deployer account as the initial owner
  const deployer = m.getAccount(0);
  
  // Initial supply: 1,000,000 tokens
  const initialSupply = parseEther("1000000");
  
  // Deploy TestTokenA contract
  const testTokenA = m.contract("TestTokenA", [deployer, initialSupply]);

  return { testTokenA };
});

export default TestTokenAModule;