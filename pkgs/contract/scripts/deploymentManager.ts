#!/usr/bin/env ts-node

import { program } from "commander";
import {
    backupDeploymentData,
    compareDeployments,
    exportDeploymentData,
    generateDeploymentSummary,
    getAllDeployedContracts,
    getSupportedNetworks,
    resetContractAddressesJson,
    restoreDeploymentData,
    updateContractVerification,
    validateNetwork,
} from "../helpers/contractsJsonHelper";

/**
 * Deployment management CLI tool
 */

program
  .name("deployment-manager")
  .description("CLI tool for managing contract deployments")
  .version("1.0.0");

// Summary command
program
  .command("summary")
  .description("Generate deployment summary for a network")
  .argument("<network>", "Network name")
  .action((network: string) => {
    if (!validateNetwork(network)) {
      console.error(`❌ Unsupported network: ${network}`);
      console.log(`Supported networks: ${getSupportedNetworks().join(", ")}`);
      process.exit(1);
    }
    
    const summary = generateDeploymentSummary(network);
    console.log(summary);
  });

// Export command
program
  .command("export")
  .description("Export deployment data")
  .argument("<network>", "Network name")
  .option("-f, --format <format>", "Export format (json|env)", "json")
  .option("-o, --output <file>", "Output file path")
  .action((network: string, options: any) => {
    if (!validateNetwork(network)) {
      console.error(`❌ Unsupported network: ${network}`);
      process.exit(1);
    }
    
    const data = exportDeploymentData(network, options.format);
    
    if (options.output) {
      const fs = require("fs");
      fs.writeFileSync(options.output, data);
      console.log(`✅ Deployment data exported to: ${options.output}`);
    } else {
      console.log(data);
    }
  });

// Backup command
program
  .command("backup")
  .description("Backup deployment data")
  .argument("<network>", "Network name")
  .action((network: string) => {
    if (!validateNetwork(network)) {
      console.error(`❌ Unsupported network: ${network}`);
      process.exit(1);
    }
    
    try {
      const backupPath = backupDeploymentData(network);
      console.log(`✅ Backup created: ${backupPath}`);
    } catch (error) {
      console.error(`❌ Backup failed: ${error}`);
      process.exit(1);
    }
  });

// Restore command
program
  .command("restore")
  .description("Restore deployment data from backup")
  .argument("<network>", "Network name")
  .argument("<backup-path>", "Path to backup file")
  .action((network: string, backupPath: string) => {
    if (!validateNetwork(network)) {
      console.error(`❌ Unsupported network: ${network}`);
      process.exit(1);
    }
    
    try {
      restoreDeploymentData(network, backupPath);
      console.log(`✅ Deployment data restored for ${network}`);
    } catch (error) {
      console.error(`❌ Restore failed: ${error}`);
      process.exit(1);
    }
  });

// Compare command
program
  .command("compare")
  .description("Compare deployments between two networks")
  .argument("<network1>", "First network name")
  .argument("<network2>", "Second network name")
  .action((network1: string, network2: string) => {
    if (!validateNetwork(network1)) {
      console.error(`❌ Unsupported network: ${network1}`);
      process.exit(1);
    }
    
    if (!validateNetwork(network2)) {
      console.error(`❌ Unsupported network: ${network2}`);
      process.exit(1);
    }
    
    compareDeployments(network1, network2);
  });

// List command
program
  .command("list")
  .description("List all deployed contracts for a network")
  .argument("<network>", "Network name")
  .action((network: string) => {
    if (!validateNetwork(network)) {
      console.error(`❌ Unsupported network: ${network}`);
      process.exit(1);
    }
    
    const contracts = getAllDeployedContracts(network);
    
    console.log(`\n📦 Deployed contracts on ${network}:`);
    console.log(`${"-".repeat(40)}`);
    
    if (Object.keys(contracts).length === 0) {
      console.log("No contracts deployed yet.");
    } else {
      for (const [name, address] of Object.entries(contracts)) {
        console.log(`${name}: ${address}`);
      }
    }
  });

// Reset command
program
  .command("reset")
  .description("Reset deployment data for a network")
  .argument("<network>", "Network name")
  .option("--confirm", "Confirm the reset operation")
  .action((network: string, options: any) => {
    if (!validateNetwork(network)) {
      console.error(`❌ Unsupported network: ${network}`);
      process.exit(1);
    }
    
    if (!options.confirm) {
      console.error("❌ This operation will delete all deployment data.");
      console.error("Use --confirm flag to proceed.");
      process.exit(1);
    }
    
    resetContractAddressesJson(network);
    console.log(`✅ Deployment data reset for ${network}`);
  });

// Verify command
program
  .command("verify")
  .description("Update contract verification status")
  .argument("<network>", "Network name")
  .argument("<contract>", "Contract name")
  .option("--verified", "Mark as verified", false)
  .option("--tx <hash>", "Verification transaction hash")
  .action((network: string, contractName: string, options: any) => {
    if (!validateNetwork(network)) {
      console.error(`❌ Unsupported network: ${network}`);
      process.exit(1);
    }
    
    updateContractVerification(
      network,
      contractName,
      options.verified,
      options.tx
    );
  });

// Networks command
program
  .command("networks")
  .description("List all supported networks")
  .action(() => {
    const networks = getSupportedNetworks();
    console.log("\n🌐 Supported networks:");
    console.log(`${"-".repeat(20)}`);
    networks.forEach(network => {
      console.log(`• ${network}`);
    });
  });

// Parse command line arguments
program.parse();