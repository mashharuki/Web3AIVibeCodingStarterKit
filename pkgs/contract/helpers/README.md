# Contract Deployment Helper

This module provides comprehensive utilities for managing smart contract deployments across different networks.

## Features

- ✅ **Deployment Tracking**: Store and retrieve contract addresses with full deployment metadata
- ✅ **Environment Management**: Support for multiple networks (hardhat, localhost, sepolia)
- ✅ **Backup & Restore**: Create backups and restore deployment data
- ✅ **Migration Support**: Automatically migrate from old deployment formats
- ✅ **Verification Tracking**: Track contract verification status
- ✅ **Export Utilities**: Export deployment data in JSON or ENV formats
- ✅ **Comparison Tools**: Compare deployments across networks
- ✅ **CLI Management**: Command-line tools for deployment management

## Quick Start

### Basic Usage

```typescript
import {
  writeContractAddress,
  getContractAddress,
  isContractDeployed,
  generateDeploymentSummary,
} from "../helpers/contractsJsonHelper";

// Deploy and save contract
writeContractAddress({
  group: "contracts",
  name: "DEXFactory",
  value: "0x1234...",
  network: "sepolia",
  deploymentTx: "0xabcd...",
  blockNumber: 12345,
  gasUsed: "150000",
});

// Check if contract is deployed
if (isContractDeployed("sepolia", "DEXFactory")) {
  const address = getContractAddress("sepolia", "DEXFactory");
  console.log(`DEXFactory deployed at: ${address}`);
}

// Generate deployment summary
console.log(generateDeploymentSummary("sepolia"));
```

### Enhanced Deployment Script

```typescript
import { writeContractDeployment, type ContractInfo } from "../helpers/contractsJsonHelper";

// Deploy contract with full metadata
const factory = await DEXFactory.deploy(deployer.address);
await factory.waitForDeployment();

const contractInfo: ContractInfo = {
  address: await factory.getAddress(),
  deploymentTx: factory.deploymentTransaction()?.hash || "",
  blockNumber: factory.deploymentTransaction()?.blockNumber || 0,
  gasUsed: factory.deploymentTransaction()?.gasLimit?.toString() || "0",
  constructorArgs: [deployer.address],
  verified: false,
};

writeContractDeployment({
  contractName: "DEXFactory",
  contractInfo,
  network: "sepolia",
  deployer: deployer.address,
});
```

## CLI Tools

The deployment manager provides command-line tools for managing deployments:

```bash
# Show deployment summary
npm run deployment:summary sepolia

# Export deployment data
npm run deployment:export sepolia --format env --output .env.deployed

# Create backup
npm run deployment:backup sepolia

# Compare deployments
npm run deployment:compare sepolia localhost

# List all contracts
npm run deployment:list sepolia

# Show supported networks
npm run deployment:networks
```

## API Reference

### Core Functions

#### `writeContractAddress(options)`
Write contract deployment information to JSON file.

```typescript
writeContractAddress({
  group: "contracts",           // Group name (usually "contracts")
  name: "ContractName",         // Contract name
  value: "0x123...",           // Contract address
  network: "sepolia",          // Network name
  deploymentTx?: "0xabc...",   // Optional: deployment transaction hash
  blockNumber?: 12345,         // Optional: block number
  gasUsed?: "150000",          // Optional: gas used
  constructorArgs?: [...],     // Optional: constructor arguments
});
```

#### `writeContractDeployment(options)`
Write full contract deployment information with metadata.

```typescript
writeContractDeployment({
  contractName: "DEXFactory",
  contractInfo: {
    address: "0x123...",
    deploymentTx: "0xabc...",
    blockNumber: 12345,
    gasUsed: "150000",
    constructorArgs: [deployer.address],
    verified: false,
  },
  network: "sepolia",
  deployer: "0xdeployer...",
});
```

#### `getContractAddress(network, contractName)`
Get contract address for a specific network.

```typescript
const address = getContractAddress("sepolia", "DEXFactory");
// Returns: "0x123..." or null if not found
```

#### `getContractInfo(network, contractName)`
Get full contract information for a specific network.

```typescript
const info = getContractInfo("sepolia", "DEXFactory");
// Returns: ContractInfo object or null if not found
```

#### `isContractDeployed(network, contractName)`
Check if a contract is deployed on a specific network.

```typescript
const deployed = isContractDeployed("sepolia", "DEXFactory");
// Returns: boolean
```

### Utility Functions

#### `generateDeploymentSummary(network)`
Generate a formatted deployment summary.

```typescript
const summary = generateDeploymentSummary("sepolia");
console.log(summary);
```

#### `exportDeploymentData(network, format)`
Export deployment data in different formats.

```typescript
// Export as JSON
const jsonData = exportDeploymentData("sepolia", "json");

// Export as environment variables
const envData = exportDeploymentData("sepolia", "env");
```

#### `backupDeploymentData(network)`
Create a backup of deployment data.

```typescript
const backupPath = backupDeploymentData("sepolia");
console.log(`Backup created: ${backupPath}`);
```

#### `compareDeployments(network1, network2)`
Compare deployments between two networks.

```typescript
compareDeployments("sepolia", "localhost");
```

### Network Management

#### `validateNetwork(network)`
Validate if a network is supported.

```typescript
const isValid = validateNetwork("sepolia"); // Returns: boolean
```

#### `getSupportedNetworks()`
Get list of all supported networks.

```typescript
const networks = getSupportedNetworks();
// Returns: ["hardhat", "localhost", "sepolia"]
```

#### `getNetworkConfig(network)`
Get network configuration.

```typescript
const config = getNetworkConfig("sepolia");
// Returns: NetworkConfig object or null
```

## Data Structures

### ContractInfo
```typescript
interface ContractInfo {
  address: string;              // Contract address
  deploymentTx: string;         // Deployment transaction hash
  blockNumber: number;          // Block number of deployment
  gasUsed: string;             // Gas used for deployment
  constructorArgs?: any[];      // Constructor arguments
  verified?: boolean;           // Verification status
  verificationTx?: string;      // Verification transaction hash
}
```

### DeploymentData
```typescript
interface DeploymentData {
  network: string;              // Network name
  chainId: number;             // Chain ID
  contracts: Record<string, ContractInfo>; // Deployed contracts
  metadata: DeploymentMetadata; // Deployment metadata
  lastUpdated: string;         // Last update timestamp
  version: string;             // Data format version
}
```

### NetworkConfig
```typescript
interface NetworkConfig {
  name: string;                // Network name
  chainId: number;            // Chain ID
  rpcUrl?: string;            // RPC URL
  blockExplorer?: string;     // Block explorer URL
  isTestnet: boolean;         // Is testnet flag
}
```

## File Structure

Deployment data is stored in the `outputs/` directory:

```
outputs/
├── contracts-hardhat.json      # Hardhat network deployments
├── contracts-localhost.json    # Localhost network deployments
├── contracts-sepolia.json      # Sepolia network deployments
└── contracts-sepolia-backup-2023-12-01T10-00-00-000Z.json  # Backup files
```

## Migration Support

The helper automatically migrates old deployment formats to the new structure:

**Old Format:**
```json
{
  "network": "sepolia",
  "contracts": {
    "DEXFactory": "0x123..."
  },
  "lastUpdated": "2023-01-01T00:00:00.000Z"
}
```

**New Format:**
```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "contracts": {
    "DEXFactory": {
      "address": "0x123...",
      "deploymentTx": "0xabc...",
      "blockNumber": 12345,
      "gasUsed": "150000",
      "verified": false
    }
  },
  "metadata": {
    "network": "sepolia",
    "chainId": 11155111,
    "deployer": "0xdeployer...",
    "timestamp": "2023-01-01T00:00:00.000Z",
    "version": "1.0.0"
  },
  "lastUpdated": "2023-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## Best Practices

1. **Always backup before major deployments**:
   ```bash
   npm run deployment:backup sepolia
   ```

2. **Use the enhanced deployment script** for comprehensive tracking:
   ```bash
   npm run deploy:enhanced -- --network sepolia
   ```

3. **Verify contracts after deployment**:
   ```typescript
   updateContractVerification("sepolia", "DEXFactory", true, "0xverificationtx");
   ```

4. **Compare deployments** before going to production:
   ```bash
   npm run deployment:compare sepolia localhost
   ```

5. **Export environment variables** for frontend integration:
   ```bash
   npm run deployment:export sepolia -- --format env --output ../frontend/.env.contracts
   ```

## Error Handling

The helper functions include comprehensive error handling:

- **File not found**: Creates new deployment data structure
- **Invalid JSON**: Logs error and returns empty structure
- **Network validation**: Validates network before operations
- **Backup failures**: Throws errors with detailed messages
- **Migration issues**: Handles format conversion gracefully

## Testing

Run the test suite to verify functionality:

```bash
npm test -- --grep "ContractsJsonHelper"
```

The test suite covers:
- ✅ File path generation
- ✅ Network validation
- ✅ Contract address storage and retrieval
- ✅ Deployment metadata tracking
- ✅ Verification status updates
- ✅ Data export functionality
- ✅ Migration from old formats
- ✅ Error handling scenarios