import { expect } from "chai";
import fs from "node:fs";
import path from "node:path";
import {
    type ContractInfo,
    exportDeploymentData,
    generateDeploymentSummary,
    getAllDeployedContracts,
    getContractAddress,
    getContractInfo,
    getFilePath,
    getSupportedNetworks,
    isContractDeployed,
    loadDeployedContractAddresses,
    resetContractAddressesJson,
    updateContractVerification,
    validateNetwork,
    writeContractAddress,
    writeContractDeployment,
} from "../helpers/contractsJsonHelper";

describe("ContractsJsonHelper", function () {
  const testNetwork = "hardhat";
  const testContractName = "TestContract";
  const testAddress = "0x1234567890123456789012345678901234567890";
  
  beforeEach(function () {
    // Clean up test files before each test
    const filePath = getFilePath({ network: testNetwork });
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  afterEach(function () {
    // Clean up test files after each test
    const filePath = getFilePath({ network: testNetwork });
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  describe("getFilePath", function () {
    it("should generate correct file path", function () {
      const filePath = getFilePath({ network: testNetwork });
      expect(filePath).to.equal("outputs/contracts-hardhat.json");
    });

    it("should generate correct file path with suffix", function () {
      const filePath = getFilePath({ 
        network: testNetwork, 
        suffix: "backup" 
      });
      expect(filePath).to.equal("outputs/contracts-hardhat-backup.json");
    });

    it("should generate correct file path with custom base path", function () {
      const filePath = getFilePath({ 
        network: testNetwork, 
        basePath: "custom" 
      });
      expect(filePath).to.equal("custom/contracts-hardhat.json");
    });
  });

  describe("validateNetwork", function () {
    it("should validate supported networks", function () {
      expect(validateNetwork("hardhat")).to.be.true;
      expect(validateNetwork("sepolia")).to.be.true;
      expect(validateNetwork("localhost")).to.be.true;
    });

    it("should reject unsupported networks", function () {
      expect(validateNetwork("mainnet")).to.be.false;
      expect(validateNetwork("invalid")).to.be.false;
    });
  });

  describe("getSupportedNetworks", function () {
    it("should return array of supported networks", function () {
      const networks = getSupportedNetworks();
      expect(networks).to.be.an("array");
      expect(networks).to.include("hardhat");
      expect(networks).to.include("sepolia");
      expect(networks).to.include("localhost");
    });
  });

  describe("resetContractAddressesJson", function () {
    it("should create initial deployment data structure", function () {
      resetContractAddressesJson(testNetwork);
      
      const data = loadDeployedContractAddresses(testNetwork);
      expect(data).to.have.property("network", testNetwork);
      expect(data).to.have.property("chainId", 31337);
      expect(data).to.have.property("contracts");
      expect(data).to.have.property("metadata");
      expect(data).to.have.property("lastUpdated");
      expect(data).to.have.property("version");
    });
  });

  describe("writeContractAddress", function () {
    it("should write contract address with basic info", function () {
      writeContractAddress({
        group: "contracts",
        name: testContractName,
        value: testAddress,
        network: testNetwork,
      });

      const address = getContractAddress(testNetwork, testContractName);
      expect(address).to.equal(testAddress);
    });

    it("should write contract address with full deployment info", function () {
      writeContractAddress({
        group: "contracts",
        name: testContractName,
        value: testAddress,
        network: testNetwork,
        deploymentTx: "0xabcd",
        blockNumber: 12345,
        gasUsed: "100000",
        constructorArgs: ["arg1", "arg2"],
      });

      const contractInfo = getContractInfo(testNetwork, testContractName);
      expect(contractInfo).to.not.be.null;
      expect(contractInfo!.address).to.equal(testAddress);
      expect(contractInfo!.deploymentTx).to.equal("0xabcd");
      expect(contractInfo!.blockNumber).to.equal(12345);
      expect(contractInfo!.gasUsed).to.equal("100000");
      expect(contractInfo!.constructorArgs).to.deep.equal(["arg1", "arg2"]);
    });
  });

  describe("writeContractDeployment", function () {
    it("should write full contract deployment info", function () {
      const contractInfo: ContractInfo = {
        address: testAddress,
        deploymentTx: "0xabcd1234",
        blockNumber: 12345,
        gasUsed: "150000",
        constructorArgs: ["param1"],
        verified: false,
      };

      writeContractDeployment({
        contractName: testContractName,
        contractInfo,
        network: testNetwork,
        deployer: "0xdeployer",
      });

      const retrievedInfo = getContractInfo(testNetwork, testContractName);
      expect(retrievedInfo).to.deep.equal(contractInfo);

      const data = loadDeployedContractAddresses(testNetwork);
      expect(data.metadata.deployer).to.equal("0xdeployer");
    });
  });

  describe("isContractDeployed", function () {
    it("should return false for non-deployed contract", function () {
      expect(isContractDeployed(testNetwork, testContractName)).to.be.false;
    });

    it("should return true for deployed contract", function () {
      writeContractAddress({
        group: "contracts",
        name: testContractName,
        value: testAddress,
        network: testNetwork,
      });

      expect(isContractDeployed(testNetwork, testContractName)).to.be.true;
    });
  });

  describe("getAllDeployedContracts", function () {
    it("should return empty object when no contracts deployed", function () {
      const contracts = getAllDeployedContracts(testNetwork);
      expect(contracts).to.deep.equal({});
    });

    it("should return all deployed contracts", function () {
      writeContractAddress({
        group: "contracts",
        name: "Contract1",
        value: "0xaddress1",
        network: testNetwork,
      });

      writeContractAddress({
        group: "contracts",
        name: "Contract2",
        value: "0xaddress2",
        network: testNetwork,
      });

      const contracts = getAllDeployedContracts(testNetwork);
      expect(contracts).to.deep.equal({
        Contract1: "0xaddress1",
        Contract2: "0xaddress2",
      });
    });
  });

  describe("updateContractVerification", function () {
    it("should update contract verification status", function () {
      // First deploy a contract
      writeContractAddress({
        group: "contracts",
        name: testContractName,
        value: testAddress,
        network: testNetwork,
      });

      // Update verification status
      updateContractVerification(
        testNetwork,
        testContractName,
        true,
        "0xverificationtx"
      );

      const contractInfo = getContractInfo(testNetwork, testContractName);
      expect(contractInfo!.verified).to.be.true;
      expect(contractInfo!.verificationTx).to.equal("0xverificationtx");
    });
  });

  describe("generateDeploymentSummary", function () {
    it("should generate summary for empty deployment", function () {
      resetContractAddressesJson(testNetwork);
      const summary = generateDeploymentSummary(testNetwork);
      
      expect(summary).to.include("Deployment Summary");
      expect(summary).to.include(testNetwork.toUpperCase());
      expect(summary).to.include("No contracts deployed yet");
    });

    it("should generate summary with deployed contracts", function () {
      writeContractAddress({
        group: "contracts",
        name: testContractName,
        value: testAddress,
        network: testNetwork,
      });

      const summary = generateDeploymentSummary(testNetwork);
      
      expect(summary).to.include("Deployment Summary");
      expect(summary).to.include(testContractName);
      expect(summary).to.include(testAddress);
    });
  });

  describe("exportDeploymentData", function () {
    it("should export data in JSON format", function () {
      writeContractAddress({
        group: "contracts",
        name: testContractName,
        value: testAddress,
        network: testNetwork,
      });

      const exported = exportDeploymentData(testNetwork, "json");
      const parsed = JSON.parse(exported);
      
      expect(parsed).to.have.property("network", testNetwork);
      expect(parsed.contracts).to.have.property(testContractName);
    });

    it("should export data in ENV format", function () {
      writeContractAddress({
        group: "contracts",
        name: testContractName,
        value: testAddress,
        network: testNetwork,
      });

      const exported = exportDeploymentData(testNetwork, "env");
      
      expect(exported).to.include(`NETWORK=${testNetwork}`);
      expect(exported).to.include(`TESTCONTRACT_ADDRESS=${testAddress}`);
    });
  });

  describe("migration from old format", function () {
    it("should migrate old format to new format", function () {
      // Create old format file
      const filePath = getFilePath({ network: testNetwork });
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const oldData = {
        network: testNetwork,
        contracts: {
          [testContractName]: testAddress,
        },
        lastUpdated: "2023-01-01T00:00:00.000Z",
      };

      fs.writeFileSync(filePath, JSON.stringify(oldData, null, 2));

      // Load and verify migration
      const data = loadDeployedContractAddresses(testNetwork);
      expect(data.contracts[testContractName]).to.have.property("address", testAddress);
      expect(data.contracts[testContractName]).to.have.property("deploymentTx", "");
      expect(data.contracts[testContractName]).to.have.property("blockNumber", 0);
      expect(data.contracts[testContractName]).to.have.property("gasUsed", "0");
    });
  });
});