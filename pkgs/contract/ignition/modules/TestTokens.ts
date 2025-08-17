import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import TestTokenAModule from "./TestTokenA";
import TestTokenBModule from "./TestTokenB";
import TestTokenFaucetModule from "./TestTokenFaucet";

/**
 * Test tokens deployment module
 * Deploys test tokens and faucet for development/testing
 */
const TestTokensModule = buildModule("TestTokensModule", (m) => {
  // Deploy test tokens
  const { testTokenA } = m.useModule(TestTokenAModule);
  const { testTokenB } = m.useModule(TestTokenBModule);
  
  // Deploy faucet
  const { testTokenFaucet } = m.useModule(TestTokenFaucetModule);

  return {
    testTokenA,
    testTokenB,
    testTokenFaucet,
  };
});

export default TestTokensModule;