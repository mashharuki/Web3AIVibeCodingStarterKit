import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadDeployedContractAddresses } from "../helpers/contractsJsonHelper";

// Etherscan verification helper
const verifyOnEtherscan = async (
  hre: HardhatRuntimeEnvironment,
  {
    address,
    constructorArguments,
    contract,
  }: { address: string; constructorArguments: any[]; contract: string }
) => {
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments,
      contract,
    });
    console.log(`✅ Verified: ${contract} at ${address}`);
  } catch (err: any) {
    const message: string = err?.message || String(err);
    if (
      message.includes("Already Verified") ||
      message.includes("Contract source code already verified")
    ) {
      console.log(`ℹ️  Already verified: ${address}`);
      return;
    }
    console.error("❌ Verification failed:", message);
    throw err;
  }
};

// Verify AMMFactory
task("verify:factory", "Verify AMMFactory on Etherscan")
  .addOptionalParam("address", "Factory contract address (overrides outputs)")
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    const { network } = hre;
    const targetAddress: string =
      args.address || loadDeployedContractAddresses(network.name)?.contracts?.AMMFactory;

    if (!targetAddress) {
      throw new Error(
        `AMMFactory address not found. Pass --address or deploy and record to outputs for ${network.name}.`
      );
    }

    console.log(`🔍 Verifying AMMFactory at ${targetAddress} on ${network.name}...`);

    // Read constructor argument (feeToSetter) from chain
    const factory = await hre.viem.getContractAt("AMMFactory", targetAddress);
    const feeToSetter = await factory.read.feeToSetter();

    await verifyOnEtherscan(hre, {
      address: targetAddress,
      constructorArguments: [feeToSetter],
      contract: "contracts/AMMFactory.sol:AMMFactory",
    });
  });

// Verify AMMRouter
task("verify:router", "Verify AMMRouter on Etherscan")
  .addOptionalParam("address", "Router contract address (overrides outputs)")
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    const { network } = hre;
    const targetAddress: string =
      args.address || loadDeployedContractAddresses(network.name)?.contracts?.AMMRouter;

    if (!targetAddress) {
      throw new Error(
        `AMMRouter address not found. Pass --address or deploy and record to outputs for ${network.name}.`
      );
    }

    console.log(`🔍 Verifying AMMRouter at ${targetAddress} on ${network.name}...`);

    // Read constructor arguments from chain
    const router = await hre.viem.getContractAt("AMMRouter", targetAddress);
    const factoryAddr = await router.read.factory();
    const wethAddr = await router.read.WETH();

    await verifyOnEtherscan(hre, {
      address: targetAddress,
      constructorArguments: [factoryAddr, wethAddr],
      contract: "contracts/AMMRouter.sol:AMMRouter",
    });
  });

// Verify both contracts
task("verify:contracts", "Verify AMMFactory and AMMRouter on Etherscan").setAction(
  async (_args, hre: HardhatRuntimeEnvironment) => {
    console.log("🚀 Starting batch verification...");
    await hre.run("verify:factory");
    await hre.run("verify:router");
    console.log("🎉 Batch verification finished.");
  }
);
