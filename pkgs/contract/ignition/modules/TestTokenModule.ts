import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";

const TestTokenModule = buildModule("TestTokenModule", (m) => {
  const InitialSupply = parseUnits("1000000", 18); // 1,000,000トークン (18桁)
  const initialSupply = m.getParameter("initialSupply", InitialSupply);

  const tokenA = m.contract("TestToken", [
    "TestTokenA",
    "TKA",
    initialSupply
  ], { id: "TestTokenA" });

  const tokenB = m.contract("TestToken", [
    "TestTokenB",
    "TKB",
    initialSupply
  ],{ id: "TestTokenB" });

  return { tokenA, tokenB };
});

export default TestTokenModule;
