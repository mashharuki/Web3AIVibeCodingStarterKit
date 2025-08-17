import * as fs from "node:fs";
import * as path from "node:path";

const BASE_PATH = "outputs";
const BASE_NAME = "contracts";
const EXTENSION = "json";

// Environment-specific configuration
interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl?: string;
  blockExplorer?: string;
  isTestnet: boolean;
}

interface DeploymentMetadata {
  network: string;
  chainId: number;
  deployer: string;
  timestamp: string;
  blockNumber?: number;
  gasUsed?: string;
  transactionHash?: string;
  version?: string;
}

interface ContractInfo {
  address: string;
  deploymentTx: string;
  blockNumber: number;
  gasUsed: string;
  constructorArgs?: any[];
  verified?: boolean;
  verificationTx?: string;
}

interface DeploymentData {
  network: string;
  chainId: number;
  contracts: Record<string, ContractInfo>;
  metadata: DeploymentMetadata;
  lastUpdated: string;
  version: string;
}

// Network configurations
const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  hardhat: {
    name: "hardhat",
    chainId: 31337,
    isTestnet: true,
  },
  localhost: {
    name: "localhost", 
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
    isTestnet: true,
  },
  sepolia: {
    name: "sepolia",
    chainId: 11155111,
    rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/",
    blockExplorer: "https://sepolia.etherscan.io",
    isTestnet: true,
  },
};

/**
 * Get file path for contract addresses JSON
 */
const getFilePath = ({
  network,
  basePath,
  suffix,
}: {
  network: string;
  basePath?: string;
  suffix?: string;
}): string => {
  const _basePath = basePath ? basePath : BASE_PATH;
  const commonFilePath = `${_basePath}/${BASE_NAME}-${network}`;
  return suffix
    ? `${commonFilePath}-${suffix}.${EXTENSION}`
    : `${commonFilePath}.${EXTENSION}`;
};

/**
 * Load deployed contract addresses from JSON file
 */
const loadDeployedContractAddresses = (network: string): DeploymentData => {
  const filePath = getFilePath({ network });
  
  if (!fs.existsSync(filePath)) {
    console.warn(`Contract addresses file not found: ${filePath}`);
    return createEmptyDeploymentData(network);
  }
  
  try {
    const data = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(data);
    
    // Migrate old format to new format if needed
    if (parsed.contracts && !parsed.metadata) {
      return migrateOldFormat(parsed, network);
    }
    
    return parsed as DeploymentData;
  } catch (error) {
    console.error(`Error reading contract addresses file: ${error}`);
    return createEmptyDeploymentData(network);
  }
};

/**
 * Create empty deployment data structure
 */
const createEmptyDeploymentData = (network: string): DeploymentData => {
  const networkConfig = NETWORK_CONFIGS[network];
  return {
    network,
    chainId: networkConfig?.chainId || 0,
    contracts: {},
    metadata: {
      network,
      chainId: networkConfig?.chainId || 0,
      deployer: "",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
    lastUpdated: new Date().toISOString(),
    version: "1.0.0",
  };
};

/**
 * Migrate old format to new format
 */
const migrateOldFormat = (oldData: any, network: string): DeploymentData => {
  const networkConfig = NETWORK_CONFIGS[network];
  const newData: DeploymentData = {
    network,
    chainId: networkConfig?.chainId || oldData.chainId || 0,
    contracts: {},
    metadata: {
      network,
      chainId: networkConfig?.chainId || oldData.chainId || 0,
      deployer: oldData.deployer || "",
      timestamp: oldData.timestamp || oldData.lastUpdated || new Date().toISOString(),
      version: "1.0.0",
    },
    lastUpdated: oldData.lastUpdated || new Date().toISOString(),
    version: "1.0.0",
  };

  // Convert old contract format to new format
  if (oldData.contracts) {
    for (const [name, address] of Object.entries(oldData.contracts)) {
      if (typeof address === "string") {
        newData.contracts[name] = {
          address: address as string,
          deploymentTx: "",
          blockNumber: 0,
          gasUsed: "0",
        };
      }
    }
  }

  return newData;
};

/**
 * Write contract deployment info to JSON file
 */
const writeContractAddress = ({
  group,
  name,
  value,
  network,
  deploymentTx = "",
  blockNumber = 0,
  gasUsed = "0",
  constructorArgs = [],
}: {
  group: string;
  name: string | null;
  value: string;
  network: string;
  deploymentTx?: string;
  blockNumber?: number;
  gasUsed?: string;
  constructorArgs?: any[];
}) => {
  if (group !== "contracts") {
    // For backward compatibility with non-contract data
    writeValueToGroup({ group, key: name || "value", value, network });
    return;
  }

  const filePath = getFilePath({ network });
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Load existing data or create new
  let data = loadDeployedContractAddresses(network);
  
  // Write the contract info
  if (name) {
    data.contracts[name] = {
      address: value,
      deploymentTx,
      blockNumber,
      gasUsed,
      constructorArgs,
      verified: false,
    };
  }
  
  // Update metadata
  data.lastUpdated = new Date().toISOString();
  
  // Write to file
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Contract deployed: ${name} = ${value}`);
    if (deploymentTx) {
      console.log(`   Transaction: ${deploymentTx}`);
    }
    if (blockNumber > 0) {
      console.log(`   Block: ${blockNumber}`);
    }
  } catch (error) {
    console.error(`❌ Error writing contract address: ${error}`);
  }
};

/**
 * Write contract deployment info with full details
 */
const writeContractDeployment = ({
  contractName,
  contractInfo,
  network,
  deployer,
}: {
  contractName: string;
  contractInfo: ContractInfo;
  network: string;
  deployer: string;
}) => {
  const filePath = getFilePath({ network });
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Load existing data or create new
  let data = loadDeployedContractAddresses(network);
  
  // Update contract info
  data.contracts[contractName] = contractInfo;
  
  // Update metadata
  data.metadata.deployer = deployer;
  data.metadata.timestamp = new Date().toISOString();
  data.lastUpdated = new Date().toISOString();
  
  // Write to file
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Contract deployment recorded: ${contractName}`);
    console.log(`   Address: ${contractInfo.address}`);
    console.log(`   Transaction: ${contractInfo.deploymentTx}`);
    console.log(`   Block: ${contractInfo.blockNumber}`);
    console.log(`   Gas Used: ${contractInfo.gasUsed}`);
  } catch (error) {
    console.error(`❌ Error writing contract deployment: ${error}`);
  }
};

/**
 * Write value to group in JSON file
 */
const writeValueToGroup = ({
  group,
  key,
  value,
  network,
}: {
  group: string;
  key: string;
  value: any;
  network: string;
}) => {
  const filePath = getFilePath({ network });
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Load existing data or create new
  let data: any = {};
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      data = JSON.parse(fileContent);
    } catch (error) {
      console.warn(`Error reading existing file, creating new: ${error}`);
    }
  }
  
  // Initialize group if it doesn't exist
  if (!data[group]) {
    data[group] = {};
  }
  
  // Write the value
  data[group][key] = value;
  
  // Add metadata
  data.lastUpdated = new Date().toISOString();
  data.network = network;
  
  // Write to file
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Value saved: ${group}.${key} = ${JSON.stringify(value)}`);
  } catch (error) {
    console.error(`Error writing value: ${error}`);
  }
};

/**
 * Reset contract addresses JSON file
 */
const resetContractAddressesJson = (network: string) => {
  const filePath = getFilePath({ network });
  const initialData = createEmptyDeploymentData(network);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
    console.log(`✅ Contract addresses file reset: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error resetting contract addresses file: ${error}`);
  }
};

/**
 * Get contract address from JSON file
 */
const getContractAddress = (network: string, contractName: string): string | null => {
  const data = loadDeployedContractAddresses(network);
  const contractInfo = data.contracts?.[contractName];
  
  if (typeof contractInfo === "string") {
    // Handle old format
    return contractInfo;
  }
  
  return contractInfo?.address || null;
};

/**
 * Get contract info from JSON file
 */
const getContractInfo = (network: string, contractName: string): ContractInfo | null => {
  const data = loadDeployedContractAddresses(network);
  const contractInfo = data.contracts?.[contractName];
  
  if (typeof contractInfo === "string") {
    // Handle old format
    return {
      address: contractInfo,
      deploymentTx: "",
      blockNumber: 0,
      gasUsed: "0",
    };
  }
  
  return contractInfo || null;
};

/**
 * Check if contract is deployed
 */
const isContractDeployed = (network: string, contractName: string): boolean => {
  const address = getContractAddress(network, contractName);
  return address !== null && address !== "";
};

/**
 * Get all deployed contracts for a network
 */
const getAllDeployedContracts = (network: string): Record<string, string> => {
  const data = loadDeployedContractAddresses(network);
  const result: Record<string, string> = {};
  
  for (const [name, info] of Object.entries(data.contracts)) {
    if (typeof info === "string") {
      result[name] = info;
    } else {
      result[name] = info.address;
    }
  }
  
  return result;
};

/**
 * Get deployment metadata
 */
const getDeploymentMetadata = (network: string): DeploymentMetadata | null => {
  const data = loadDeployedContractAddresses(network);
  return data.metadata || null;
};

/**
 * Update contract verification status
 */
const updateContractVerification = (
  network: string,
  contractName: string,
  verified: boolean,
  verificationTx?: string
) => {
  const data = loadDeployedContractAddresses(network);
  
  if (data.contracts[contractName]) {
    if (typeof data.contracts[contractName] === "string") {
      // Convert old format to new format
      data.contracts[contractName] = {
        address: data.contracts[contractName] as string,
        deploymentTx: "",
        blockNumber: 0,
        gasUsed: "0",
        verified,
        verificationTx,
      };
    } else {
      (data.contracts[contractName] as ContractInfo).verified = verified;
      if (verificationTx) {
        (data.contracts[contractName] as ContractInfo).verificationTx = verificationTx;
      }
    }
    
    data.lastUpdated = new Date().toISOString();
    
    const filePath = getFilePath({ network });
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Contract verification updated: ${contractName} = ${verified}`);
    } catch (error) {
      console.error(`❌ Error updating contract verification: ${error}`);
    }
  }
};

/**
 * Get network configuration
 */
const getNetworkConfig = (network: string): NetworkConfig | null => {
  return NETWORK_CONFIGS[network] || null;
};

/**
 * Validate network configuration
 */
const validateNetwork = (network: string): boolean => {
  return network in NETWORK_CONFIGS;
};

/**
 * Get all supported networks
 */
const getSupportedNetworks = (): string[] => {
  return Object.keys(NETWORK_CONFIGS);
};

/**
 * Generate deployment summary
 */
const generateDeploymentSummary = (network: string): string => {
  const data = loadDeployedContractAddresses(network);
  const networkConfig = getNetworkConfig(network);
  
  let summary = `\n📋 Deployment Summary for ${network.toUpperCase()}\n`;
  summary += `${"=".repeat(50)}\n`;
  summary += `Network: ${data.network}\n`;
  summary += `Chain ID: ${data.chainId}\n`;
  summary += `Deployer: ${data.metadata.deployer}\n`;
  summary += `Timestamp: ${data.metadata.timestamp}\n`;
  summary += `Version: ${data.version}\n`;
  
  if (networkConfig?.blockExplorer) {
    summary += `Block Explorer: ${networkConfig.blockExplorer}\n`;
  }
  
  summary += `\n📦 Deployed Contracts:\n`;
  summary += `${"-".repeat(30)}\n`;
  
  const contracts = Object.entries(data.contracts);
  if (contracts.length === 0) {
    summary += "No contracts deployed yet.\n";
  } else {
    for (const [name, info] of contracts) {
      const address = typeof info === "string" ? info : info.address;
      const verified = typeof info === "string" ? "Unknown" : (info.verified ? "✅" : "❌");
      
      summary += `${name}:\n`;
      summary += `  Address: ${address}\n`;
      summary += `  Verified: ${verified}\n`;
      
      if (typeof info !== "string" && info.deploymentTx) {
        summary += `  Deployment Tx: ${info.deploymentTx}\n`;
      }
      
      if (networkConfig?.blockExplorer && address) {
        summary += `  Explorer: ${networkConfig.blockExplorer}/address/${address}\n`;
      }
      summary += "\n";
    }
  }
  
  return summary;
};

/**
 * Export deployment data for external use
 */
const exportDeploymentData = (network: string, format: "json" | "env" = "json"): string => {
  const data = loadDeployedContractAddresses(network);
  
  if (format === "env") {
    let envContent = `# Deployment addresses for ${network}\n`;
    envContent += `NETWORK=${network}\n`;
    envContent += `CHAIN_ID=${data.chainId}\n`;
    
    for (const [name, info] of Object.entries(data.contracts)) {
      const address = typeof info === "string" ? info : info.address;
      const envVarName = `${name.toUpperCase()}_ADDRESS`;
      envContent += `${envVarName}=${address}\n`;
    }
    
    return envContent;
  }
  
  return JSON.stringify(data, null, 2);
};

/**
 * Backup deployment data
 */
const backupDeploymentData = (network: string): string => {
  const data = loadDeployedContractAddresses(network);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = getFilePath({ 
    network, 
    suffix: `backup-${timestamp}` 
  });
  
  try {
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    console.log(`✅ Deployment data backed up: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`❌ Error backing up deployment data: ${error}`);
    throw error;
  }
};

/**
 * Restore deployment data from backup
 */
const restoreDeploymentData = (network: string, backupPath: string): void => {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  try {
    const backupData = fs.readFileSync(backupPath, "utf8");
    const data = JSON.parse(backupData);
    
    const currentPath = getFilePath({ network });
    fs.writeFileSync(currentPath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Deployment data restored from: ${backupPath}`);
  } catch (error) {
    console.error(`❌ Error restoring deployment data: ${error}`);
    throw error;
  }
};

/**
 * Compare deployments between networks
 */
const compareDeployments = (network1: string, network2: string): void => {
  const data1 = loadDeployedContractAddresses(network1);
  const data2 = loadDeployedContractAddresses(network2);
  
  console.log(`\n🔍 Comparing deployments: ${network1} vs ${network2}`);
  console.log(`${"=".repeat(50)}`);
  
  const allContracts = new Set([
    ...Object.keys(data1.contracts),
    ...Object.keys(data2.contracts)
  ]);
  
  for (const contractName of allContracts) {
    const addr1 = getContractAddress(network1, contractName);
    const addr2 = getContractAddress(network2, contractName);
    
    console.log(`\n${contractName}:`);
    console.log(`  ${network1}: ${addr1 || "Not deployed"}`);
    console.log(`  ${network2}: ${addr2 || "Not deployed"}`);
    
    if (addr1 && addr2) {
      console.log(`  Status: ✅ Deployed on both networks`);
    } else if (addr1 || addr2) {
      console.log(`  Status: ⚠️  Deployed on only one network`);
    } else {
      console.log(`  Status: ❌ Not deployed on either network`);
    }
  }
};

export {
    backupDeploymentData, compareDeployments, exportDeploymentData,
    // Utility functions
    generateDeploymentSummary,
    // Core functions
    getAllDeployedContracts,
    getContractAddress,
    getContractInfo,
    // Metadata functions
    getDeploymentMetadata, getFilePath,
    // Network configuration
    getNetworkConfig, getSupportedNetworks, isContractDeployed,
    loadDeployedContractAddresses,
    resetContractAddressesJson, restoreDeploymentData, updateContractVerification, validateNetwork, writeContractAddress,
    writeContractDeployment,
    writeValueToGroup, type ContractInfo,
    type DeploymentData, type DeploymentMetadata,
    // Types
    type NetworkConfig
};

