import { expect } from "chai";
import fs from "node:fs";
import {
  getFilePath,
  loadDeployedContractAddresses,
  resetContractAddressesJson,
  writeContractAddress,
  writeValueToGroup,
} from "../helpers/contractsJsonHelper";

describe("ContractsJsonHelper", () => {
  const testNetwork = "test";
  const testFilePath = `outputs/contracts-${testNetwork}.json`;

  beforeEach(() => {
    // テスト前にファイルをクリーンアップ
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync("tmp")) {
      fs.rmSync("tmp", { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // テスト後にファイルをクリーンアップ
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync("tmp")) {
      fs.rmSync("tmp", { recursive: true, force: true });
    }
  });

  describe("getFilePath", () => {
    it("should generate correct file path with default base path", () => {
      const result = getFilePath({ network: testNetwork });
      expect(result).to.equal(`outputs/contracts-${testNetwork}.json`);
    });

    it("should generate correct file path with custom base path", () => {
      const result = getFilePath({
        network: testNetwork,
        basePath: "custom",
      });
      expect(result).to.equal(`custom/contracts-${testNetwork}.json`);
    });

    it("should generate correct file path with suffix", () => {
      const result = getFilePath({
        network: testNetwork,
        suffix: "backup",
      });
      expect(result).to.equal(`outputs/contracts-${testNetwork}-backup.json`);
    });
  });

  describe("resetContractAddressesJson", () => {
    it("should create new empty JSON file", () => {
      resetContractAddressesJson({ network: testNetwork });

      expect(fs.existsSync(testFilePath)).to.be.true;
      const content = JSON.parse(fs.readFileSync(testFilePath, "utf8"));
      expect(content).to.deep.equal({});
    });

    it("should backup existing file before creating new one", () => {
      // 既存ファイルを作成
      fs.writeFileSync(testFilePath, JSON.stringify({ existing: "data" }));

      resetContractAddressesJson({ network: testNetwork });

      // 新しいファイルが空であることを確認
      const newContent = JSON.parse(fs.readFileSync(testFilePath, "utf8"));
      expect(newContent).to.deep.equal({});

      // tmpフォルダにバックアップが作成されていることを確認
      expect(fs.existsSync("tmp")).to.be.true;
      const tmpFiles = fs.readdirSync("tmp");
      expect(tmpFiles.length).to.be.greaterThan(0);
      expect(tmpFiles[0]).to.include(`contracts-${testNetwork}-`);
    });
  });

  describe("writeContractAddress", () => {
    beforeEach(() => {
      // テスト用の空のJSONファイルを作成
      resetContractAddressesJson({ network: testNetwork });
    });

    it("should write contract address to JSON file", () => {
      const testAddress = "0x1234567890123456789012345678901234567890";

      writeContractAddress({
        group: "contracts",
        name: "TestContract",
        value: testAddress,
        network: testNetwork,
      });

      const content = loadDeployedContractAddresses(testNetwork);
      expect(content.contracts).to.exist;
      expect(content.contracts.TestContract).to.equal(testAddress);
    });

    it("should handle multiple contracts in same group", () => {
      const address1 = "0x1111111111111111111111111111111111111111";
      const address2 = "0x2222222222222222222222222222222222222222";

      writeContractAddress({
        group: "contracts",
        name: "Contract1",
        value: address1,
        network: testNetwork,
      });

      writeContractAddress({
        group: "contracts",
        name: "Contract2",
        value: address2,
        network: testNetwork,
      });

      const content = loadDeployedContractAddresses(testNetwork);
      expect(content.contracts.Contract1).to.equal(address1);
      expect(content.contracts.Contract2).to.equal(address2);
    });
  });

  describe("loadDeployedContractAddresses", () => {
    it("should load contract addresses from JSON file", () => {
      // テスト用データを準備
      const testData = {
        contracts: {
          TestContract: "0x1234567890123456789012345678901234567890",
        },
      };
      fs.writeFileSync(testFilePath, JSON.stringify(testData, null, 2));

      const result = loadDeployedContractAddresses(testNetwork);
      expect(result).to.deep.equal(testData);
    });
  });

  describe("writeValueToGroup", () => {
    beforeEach(() => {
      // テスト用の空のJSONファイルを作成
      resetContractAddressesJson({ network: testNetwork });
    });

    it("should write value to specified group", () => {
      const testValue = { key1: "value1", key2: "value2" };

      writeValueToGroup({
        group: "testGroup",
        value: testValue,
        fileName: testFilePath,
      });

      const content = loadDeployedContractAddresses(testNetwork);
      expect(content.testGroup).to.deep.equal(testValue);
    });
  });
});
