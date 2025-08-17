import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { DEXFactory } from "../typechain-types";

describe("DEXFactory", function () {
  let factory: DEXFactory;
  let owner: HardhatEthersSigner;
  let feeToSetter: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;

  beforeEach(async function () {
    [owner, feeToSetter, user] = await ethers.getSigners();
    
    // Deploy factory contract
    const DEXFactory = await ethers.getContractFactory("DEXFactory");
    factory = await DEXFactory.deploy(feeToSetter.address);
    await factory.waitForDeployment();

    // Create mock token addresses for testing
    tokenA = "0x1111111111111111111111111111111111111111";
    tokenB = "0x2222222222222222222222222222222222222222";
    tokenC = "0x3333333333333333333333333333333333333333";
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should set the correct feeToSetter", async function () {
      expect(await factory.feeToSetter()).to.equal(feeToSetter.address);
    });

    it("Should initialize feeTo as zero address", async function () {
      expect(await factory.feeTo()).to.equal(ethers.ZeroAddress);
    });

    it("Should initialize with zero pairs", async function () {
      expect(await factory.allPairsLength()).to.equal(0n);
    });

    it("Should revert with ZeroAddress error if feeToSetter is zero address", async function () {
      const DEXFactory = await ethers.getContractFactory("DEXFactory");
      await expect(DEXFactory.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(factory, "ZeroAddress");
    });
  });

  describe("createPair", function () {
    it("Should create a new pair successfully", async function () {
      const tx = await factory.createPair(tokenA, tokenB);
      const receipt = await tx.wait();
      
      // Check that pair was created
      const pairAddress = await factory.getPair(tokenA, tokenB);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);
      
      // Check that pair is accessible from both directions
      expect(await factory.getPair(tokenB, tokenA)).to.equal(pairAddress);
      
      // Check that pair was added to allPairs
      expect(await factory.allPairsLength()).to.equal(1n);
      expect(await factory.allPairs(0)).to.equal(pairAddress);
    });

    it("Should emit PairCreated event with correct parameters", async function () {
      // Determine token order (token0 < token1)
      const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
      
      const tx = await factory.createPair(tokenA, tokenB);
      const receipt = await tx.wait();
      
      // Get the pair address from the transaction
      const pairAddress = await factory.getPair(token0, token1);
      
      await expect(tx)
        .to.emit(factory, "PairCreated")
        .withArgs(token0, token1, pairAddress, 0);
    });

    it("Should create pairs with consistent addresses regardless of token order", async function () {
      const pair1 = await factory.createPair.staticCall(tokenA, tokenB);
      const pair2 = await factory.createPair.staticCall(tokenB, tokenA);
      
      expect(pair1).to.equal(pair2);
    });

    it("Should revert with IdenticalAddresses error if tokens are identical", async function () {
      await expect(factory.createPair(tokenA, tokenA))
        .to.be.revertedWithCustomError(factory, "IdenticalAddresses");
    });

    it("Should revert with ZeroAddress error if one token is zero address", async function () {
      await expect(factory.createPair(ethers.ZeroAddress, tokenB))
        .to.be.revertedWithCustomError(factory, "ZeroAddress");
      
      await expect(factory.createPair(tokenA, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(factory, "ZeroAddress");
    });

    it("Should revert with PairExists error if pair already exists", async function () {
      await factory.createPair(tokenA, tokenB);
      
      await expect(factory.createPair(tokenA, tokenB))
        .to.be.revertedWithCustomError(factory, "PairExists");
      
      await expect(factory.createPair(tokenB, tokenA))
        .to.be.revertedWithCustomError(factory, "PairExists");
    });

    it("Should create multiple different pairs", async function () {
      await factory.createPair(tokenA, tokenB);
      await factory.createPair(tokenA, tokenC);
      await factory.createPair(tokenB, tokenC);
      
      expect(await factory.allPairsLength()).to.equal(3n);
      
      const pair1 = await factory.getPair(tokenA, tokenB);
      const pair2 = await factory.getPair(tokenA, tokenC);
      const pair3 = await factory.getPair(tokenB, tokenC);
      
      expect(pair1).to.not.equal(pair2);
      expect(pair1).to.not.equal(pair3);
      expect(pair2).to.not.equal(pair3);
    });
  });

  describe("getPair", function () {
    beforeEach(async function () {
      await factory.createPair(tokenA, tokenB);
    });

    it("Should return correct pair address", async function () {
      const pairAddress = await factory.getPair(tokenA, tokenB);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should return same address for both token orders", async function () {
      const pair1 = await factory.getPair(tokenA, tokenB);
      const pair2 = await factory.getPair(tokenB, tokenA);
      expect(pair1).to.equal(pair2);
    });

    it("Should return zero address for non-existent pair", async function () {
      const pairAddress = await factory.getPair(tokenA, tokenC);
      expect(pairAddress).to.equal(ethers.ZeroAddress);
    });
  });

  describe("allPairs and allPairsLength", function () {
    it("Should return correct length after creating pairs", async function () {
      expect(await factory.allPairsLength()).to.equal(0n);
      
      await factory.createPair(tokenA, tokenB);
      expect(await factory.allPairsLength()).to.equal(1n);
      
      await factory.createPair(tokenA, tokenC);
      expect(await factory.allPairsLength()).to.equal(2n);
    });

    it("Should return correct pair addresses by index", async function () {
      await factory.createPair(tokenA, tokenB);
      await factory.createPair(tokenA, tokenC);
      
      const pair1 = await factory.allPairs(0);
      const pair2 = await factory.allPairs(1);
      
      expect(pair1).to.equal(await factory.getPair(tokenA, tokenB));
      expect(pair2).to.equal(await factory.getPair(tokenA, tokenC));
    });
  });

  describe("Fee Management", function () {
    describe("setFeeTo", function () {
      it("Should allow feeToSetter to set feeTo", async function () {
        const newFeeTo = user.address;
        const oldFeeTo = await factory.feeTo();
        
        await expect(factory.connect(feeToSetter).setFeeTo(newFeeTo))
          .to.emit(factory, "FeeToUpdated")
          .withArgs(oldFeeTo, newFeeTo);
        
        expect(await factory.feeTo()).to.equal(newFeeTo);
      });

      it("Should allow setting feeTo to zero address", async function () {
        // First set to non-zero address
        await expect(factory.connect(feeToSetter).setFeeTo(user.address))
          .to.emit(factory, "FeeToUpdated")
          .withArgs(ethers.ZeroAddress, user.address);
        expect(await factory.feeTo()).to.equal(user.address);
        
        // Then set back to zero address
        await expect(factory.connect(feeToSetter).setFeeTo(ethers.ZeroAddress))
          .to.emit(factory, "FeeToUpdated")
          .withArgs(user.address, ethers.ZeroAddress);
        expect(await factory.feeTo()).to.equal(ethers.ZeroAddress);
      });

      it("Should revert with Forbidden error if caller is not feeToSetter", async function () {
        await expect(factory.connect(owner).setFeeTo(user.address))
          .to.be.revertedWithCustomError(factory, "Forbidden");
        
        await expect(factory.connect(user).setFeeTo(user.address))
          .to.be.revertedWithCustomError(factory, "Forbidden");
      });
    });

    describe("setFeeToSetter", function () {
      it("Should allow owner to set feeToSetter", async function () {
        const newFeeToSetter = user.address;
        const oldFeeToSetter = await factory.feeToSetter();
        
        await expect(factory.connect(owner).setFeeToSetter(newFeeToSetter))
          .to.emit(factory, "FeeToSetterUpdated")
          .withArgs(oldFeeToSetter, newFeeToSetter);
        
        expect(await factory.feeToSetter()).to.equal(newFeeToSetter);
      });

      it("Should revert with ZeroAddress error if new feeToSetter is zero address", async function () {
        await expect(factory.connect(owner).setFeeToSetter(ethers.ZeroAddress))
          .to.be.revertedWithCustomError(factory, "ZeroAddress");
      });

      it("Should revert with OwnableUnauthorizedAccount error if caller is not owner", async function () {
        await expect(factory.connect(feeToSetter).setFeeToSetter(user.address))
          .to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
        
        await expect(factory.connect(user).setFeeToSetter(user.address))
          .to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
      });

      it("Should allow new feeToSetter to set feeTo after transfer", async function () {
        // Transfer feeToSetter role to user
        await factory.connect(owner).setFeeToSetter(user.address);
        
        // New feeToSetter should be able to set feeTo
        await factory.connect(user).setFeeTo(owner.address);
        expect(await factory.feeTo()).to.equal(owner.address);
        
        // Old feeToSetter should no longer be able to set feeTo
        await expect(factory.connect(feeToSetter).setFeeTo(user.address))
          .to.be.revertedWithCustomError(factory, "Forbidden");
      });
    });
  });

  describe("Access Control", function () {
    it("Should maintain proper ownership", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should allow owner to transfer ownership", async function () {
      await factory.connect(owner).transferOwnership(user.address);
      expect(await factory.owner()).to.equal(user.address);
    });

    it("Should separate owner and feeToSetter roles", async function () {
      // Owner can set feeToSetter but not feeTo directly
      await factory.connect(owner).setFeeToSetter(user.address);
      await expect(factory.connect(owner).setFeeTo(owner.address))
        .to.be.revertedWithCustomError(factory, "Forbidden");
      
      // FeeToSetter can set feeTo but not feeToSetter
      await expect(factory.connect(user).setFeeToSetter(owner.address))
        .to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
      
      // New feeToSetter can set feeTo
      await factory.connect(user).setFeeTo(owner.address);
      expect(await factory.feeTo()).to.equal(owner.address);
    });
  });

  describe("Gas Optimization", function () {
    it("Should create pairs efficiently", async function () {
      const tx = await factory.createPair(tokenA, tokenB);
      const receipt = await tx.wait();
      
      // Gas usage should be reasonable for pair creation
      expect(Number(receipt?.gasUsed)).to.be.lessThan(3000000);
      console.log(`Pair creation gas used: ${receipt?.gasUsed}`);
    });

    it("Should have consistent gas usage for multiple pair creations", async function () {
      const tx1 = await factory.createPair(tokenA, tokenB);
      const receipt1 = await tx1.wait();
      
      const tx2 = await factory.createPair(tokenA, tokenC);
      const receipt2 = await tx2.wait();
      
      const tx3 = await factory.createPair(tokenB, tokenC);
      const receipt3 = await tx3.wait();
      
      // Gas usage should be consistent (within 10% variance)
      const gas1 = Number(receipt1?.gasUsed);
      const gas2 = Number(receipt2?.gasUsed);
      const gas3 = Number(receipt3?.gasUsed);
      
      const maxGas = Math.max(gas1, gas2, gas3);
      const minGas = Math.min(gas1, gas2, gas3);
      const variance = (maxGas - minGas) / minGas;
      
      expect(variance).to.be.lessThan(0.1); // Less than 10% variance
      
      console.log(`Gas usage - Pair 1: ${gas1}, Pair 2: ${gas2}, Pair 3: ${gas3}`);
      console.log(`Gas variance: ${(variance * 100).toFixed(2)}%`);
    });

    it("Should have efficient gas usage for fee management operations", async function () {
      // Test setFeeTo gas usage
      const tx1 = await factory.connect(feeToSetter).setFeeTo(user.address);
      const receipt1 = await tx1.wait();
      expect(Number(receipt1?.gasUsed)).to.be.lessThan(50000);
      
      // Test setFeeToSetter gas usage
      const tx2 = await factory.connect(owner).setFeeToSetter(user.address);
      const receipt2 = await tx2.wait();
      expect(Number(receipt2?.gasUsed)).to.be.lessThan(50000);
      
      console.log(`setFeeTo gas used: ${receipt1?.gasUsed}`);
      console.log(`setFeeToSetter gas used: ${receipt2?.gasUsed}`);
    });

    it("Should have efficient gas usage for view functions", async function () {
      // Create some pairs first
      await factory.createPair(tokenA, tokenB);
      await factory.createPair(tokenA, tokenC);
      
      // View functions should use minimal gas
      const gasEstimate1 = await factory.getPair.estimateGas(tokenA, tokenB);
      const gasEstimate2 = await factory.allPairsLength.estimateGas();
      const gasEstimate3 = await factory.allPairs.estimateGas(0);
      
      expect(Number(gasEstimate1)).to.be.lessThan(30000);
      expect(Number(gasEstimate2)).to.be.lessThan(30000);
      expect(Number(gasEstimate3)).to.be.lessThan(30000);
      
      console.log(`getPair gas estimate: ${gasEstimate1}`);
      console.log(`allPairsLength gas estimate: ${gasEstimate2}`);
      console.log(`allPairs gas estimate: ${gasEstimate3}`);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle maximum number of pairs", async function () {
      // Create multiple pairs to test array growth
      const tokens = [tokenA, tokenB, tokenC];
      let pairCount = 0;
      
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          await factory.createPair(tokens[i], tokens[j]);
          pairCount++;
        }
      }
      
      expect(await factory.allPairsLength()).to.equal(pairCount);
    });

    it("Should maintain state consistency after multiple operations", async function () {
      // Create pairs
      await factory.createPair(tokenA, tokenB);
      await factory.createPair(tokenA, tokenC);
      
      // Change fee settings
      await factory.connect(feeToSetter).setFeeTo(user.address);
      await factory.connect(owner).setFeeToSetter(user.address);
      
      // Verify all state is still consistent
      expect(await factory.allPairsLength()).to.equal(2);
      expect(await factory.getPair(tokenA, tokenB)).to.not.equal(ethers.ZeroAddress);
      expect(await factory.getPair(tokenA, tokenC)).to.not.equal(ethers.ZeroAddress);
      expect(await factory.feeTo()).to.equal(user.address);
      expect(await factory.feeToSetter()).to.equal(user.address);
    });

    it("Should handle CREATE2 address collision gracefully", async function () {
      // This test verifies that the CREATE2 implementation works correctly
      // by ensuring deterministic addresses
      const pair1Address = await factory.createPair.staticCall(tokenA, tokenB);
      const pair2Address = await factory.createPair.staticCall(tokenB, tokenA);
      
      expect(pair1Address).to.equal(pair2Address);
      
      // Actually create the pair
      await factory.createPair(tokenA, tokenB);
      const actualAddress = await factory.getPair(tokenA, tokenB);
      
      expect(actualAddress).to.equal(pair1Address);
    });

    it("Should properly initialize created pairs", async function () {
      await factory.createPair(tokenA, tokenB);
      const pairAddress = await factory.getPair(tokenA, tokenB);
      
      // Get the pair contract instance
      const pair = await ethers.getContractAt("DEXPair", pairAddress) as DEXPair;
      
      // Verify pair initialization
      const token0 = await pair.token0();
      const token1 = await pair.token1();
      const factory_addr = await pair.factory();
      
      expect(factory_addr).to.equal(await factory.getAddress());
      
      // Tokens should be sorted
      const [expectedToken0, expectedToken1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
      expect(token0).to.equal(expectedToken0);
      expect(token1).to.equal(expectedToken1);
    });
  });

  describe("Event Verification", function () {
    it("Should emit events with correct indexed parameters", async function () {
      const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
      
      const tx = await factory.createPair(tokenA, tokenB);
      const receipt = await tx.wait();
      
      // Find the PairCreated event
      const event = receipt?.logs.find(log => {
        try {
          const parsed = factory.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          return parsed?.name === "PairCreated";
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      
      if (event) {
        const parsed = factory.interface.parseLog({
          topics: event.topics,
          data: event.data
        });
        
        expect(parsed?.args[0]).to.equal(token0); // token0
        expect(parsed?.args[1]).to.equal(token1); // token1
        expect(parsed?.args[3]).to.equal(0n); // pair index
      }
    });

    it("Should emit FeeToUpdated event with correct parameters", async function () {
      const oldFeeTo = await factory.feeTo();
      const newFeeTo = user.address;
      
      const tx = await factory.connect(feeToSetter).setFeeTo(newFeeTo);
      
      await expect(tx)
        .to.emit(factory, "FeeToUpdated")
        .withArgs(oldFeeTo, newFeeTo);
    });

    it("Should emit FeeToSetterUpdated event with correct parameters", async function () {
      const oldFeeToSetter = await factory.feeToSetter();
      const newFeeToSetter = user.address;
      
      const tx = await factory.connect(owner).setFeeToSetter(newFeeToSetter);
      
      await expect(tx)
        .to.emit(factory, "FeeToSetterUpdated")
        .withArgs(oldFeeToSetter, newFeeToSetter);
    });
  });

  describe("Integration with OpenZeppelin Ownable", function () {
    it("Should properly integrate with Ownable functionality", async function () {
      // Test ownership transfer
      await factory.connect(owner).transferOwnership(user.address);
      expect(await factory.owner()).to.equal(user.address);
      
      // Old owner should not be able to set feeToSetter
      await expect(factory.connect(owner).setFeeToSetter(feeToSetter.address))
        .to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
      
      // New owner should be able to set feeToSetter
      await factory.connect(user).setFeeToSetter(owner.address);
      expect(await factory.feeToSetter()).to.equal(owner.address);
    });

    it("Should handle ownership renouncement", async function () {
      await factory.connect(owner).renounceOwnership();
      expect(await factory.owner()).to.equal(ethers.ZeroAddress);
      
      // No one should be able to set feeToSetter after renouncing ownership
      await expect(factory.connect(owner).setFeeToSetter(user.address))
        .to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });
});