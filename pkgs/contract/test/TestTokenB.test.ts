import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { TestTokenB } from "../typechain-types";

describe("TestTokenB", function () {
  let testTokenB: TestTokenB;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  
  const INITIAL_SUPPLY = ethers.parseEther("2000000"); // 2M tokens
  const MAX_SUPPLY = ethers.parseEther("1000000000"); // 1B tokens

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const TestTokenBFactory = await ethers.getContractFactory("TestTokenB");
    testTokenB = await TestTokenBFactory.deploy(owner.address, INITIAL_SUPPLY);
    await testTokenB.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name", async function () {
      expect(await testTokenB.name()).to.equal("Test Token B");
    });

    it("Should set the correct symbol", async function () {
      expect(await testTokenB.symbol()).to.equal("TTB");
    });

    it("Should set the correct decimals", async function () {
      expect(await testTokenB.decimals()).to.equal(18);
    });

    it("Should set the correct initial supply", async function () {
      expect(await testTokenB.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("Should assign initial supply to owner", async function () {
      expect(await testTokenB.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Should set the correct max supply", async function () {
      expect(await testTokenB.maxSupply()).to.equal(MAX_SUPPLY);
    });

    it("Should set the correct owner", async function () {
      expect(await testTokenB.owner()).to.equal(owner.address);
    });
  });

  describe("Transfer", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await testTokenB.transfer(addr1.address, transferAmount);
      
      expect(await testTokenB.balanceOf(addr1.address)).to.equal(transferAmount);
      expect(await testTokenB.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - transferAmount);
    });

    it("Should emit Transfer event", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(testTokenB.transfer(addr1.address, transferAmount))
        .to.emit(testTokenB, "Transfer")
        .withArgs(owner.address, addr1.address, transferAmount);
    });

    it("Should fail when transferring more than balance", async function () {
      const transferAmount = INITIAL_SUPPLY + ethers.parseEther("1");
      
      await expect(testTokenB.transfer(addr1.address, transferAmount))
        .to.be.revertedWith("Insufficient balance");
    });

    it("Should fail when transferring to zero address", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(testTokenB.transfer(ethers.ZeroAddress, transferAmount))
        .to.be.revertedWith("Transfer to zero address");
    });
  });

  describe("Approval", function () {
    it("Should approve tokens for spending", async function () {
      const approveAmount = ethers.parseEther("100");
      
      await testTokenB.approve(addr1.address, approveAmount);
      
      expect(await testTokenB.allowance(owner.address, addr1.address)).to.equal(approveAmount);
    });

    it("Should emit Approval event", async function () {
      const approveAmount = ethers.parseEther("100");
      
      await expect(testTokenB.approve(addr1.address, approveAmount))
        .to.emit(testTokenB, "Approval")
        .withArgs(owner.address, addr1.address, approveAmount);
    });

    it("Should fail when approving zero address", async function () {
      const approveAmount = ethers.parseEther("100");
      
      await expect(testTokenB.approve(ethers.ZeroAddress, approveAmount))
        .to.be.revertedWith("Approve to zero address");
    });
  });

  describe("TransferFrom", function () {
    beforeEach(async function () {
      const approveAmount = ethers.parseEther("200");
      await testTokenB.approve(addr1.address, approveAmount);
    });

    it("Should transfer tokens using allowance", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await testTokenB.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
      
      expect(await testTokenB.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await testTokenB.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - transferAmount);
      expect(await testTokenB.allowance(owner.address, addr1.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should not decrease allowance when set to max uint256", async function () {
      const maxAllowance = ethers.MaxUint256;
      const transferAmount = ethers.parseEther("100");
      
      await testTokenB.approve(addr1.address, maxAllowance);
      await testTokenB.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
      
      expect(await testTokenB.allowance(owner.address, addr1.address)).to.equal(maxAllowance);
    });

    it("Should emit Transfer event", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(testTokenB.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
        .to.emit(testTokenB, "Transfer")
        .withArgs(owner.address, addr2.address, transferAmount);
    });

    it("Should fail when transferring more than allowance", async function () {
      const transferAmount = ethers.parseEther("300");
      
      await expect(testTokenB.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
        .to.be.revertedWith("Insufficient allowance");
    });

    it("Should fail when transferring more than balance", async function () {
      const largeAmount = INITIAL_SUPPLY + ethers.parseEther("1");
      await testTokenB.approve(addr1.address, largeAmount);
      
      await expect(testTokenB.connect(addr1).transferFrom(owner.address, addr2.address, largeAmount))
        .to.be.revertedWith("Insufficient balance");
    });

    it("Should fail when transferring from zero address", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(testTokenB.connect(addr1).transferFrom(ethers.ZeroAddress, addr2.address, transferAmount))
        .to.be.revertedWith("Transfer from zero address");
    });

    it("Should fail when transferring to zero address", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(testTokenB.connect(addr1).transferFrom(owner.address, ethers.ZeroAddress, transferAmount))
        .to.be.revertedWith("Transfer to zero address");
    });
  });

  describe("Mint", function () {
    it("Should mint tokens to specified address", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await testTokenB.mint(addr1.address, mintAmount);
      
      expect(await testTokenB.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await testTokenB.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
    });

    it("Should emit Transfer event when minting", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(testTokenB.mint(addr1.address, mintAmount))
        .to.emit(testTokenB, "Transfer")
        .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);
    });

    it("Should fail when non-owner tries to mint", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(testTokenB.connect(addr1).mint(addr2.address, mintAmount))
        .to.be.revertedWithCustomError(testTokenB, "OwnableUnauthorizedAccount");
    });

    it("Should fail when minting to zero address", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(testTokenB.mint(ethers.ZeroAddress, mintAmount))
        .to.be.revertedWith("Mint to zero address");
    });

    it("Should fail when minting zero amount", async function () {
      await expect(testTokenB.mint(addr1.address, 0))
        .to.be.revertedWith("Amount must be greater than zero");
    });

    it("Should fail when minting exceeds max supply", async function () {
      const excessiveAmount = MAX_SUPPLY - INITIAL_SUPPLY + ethers.parseEther("1");
      
      await expect(testTokenB.mint(addr1.address, excessiveAmount))
        .to.be.revertedWith("Exceeds maximum supply");
    });
  });

  describe("Burn", function () {
    beforeEach(async function () {
      // Transfer some tokens to addr1 for burning tests
      await testTokenB.transfer(addr1.address, ethers.parseEther("1000"));
    });

    it("Should burn tokens from caller's balance", async function () {
      const burnAmount = ethers.parseEther("500");
      const initialBalance = await testTokenB.balanceOf(addr1.address);
      const initialSupply = await testTokenB.totalSupply();
      
      await testTokenB.connect(addr1).burn(burnAmount);
      
      expect(await testTokenB.balanceOf(addr1.address)).to.equal(initialBalance - burnAmount);
      expect(await testTokenB.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should emit Transfer event when burning", async function () {
      const burnAmount = ethers.parseEther("500");
      
      await expect(testTokenB.connect(addr1).burn(burnAmount))
        .to.emit(testTokenB, "Transfer")
        .withArgs(addr1.address, ethers.ZeroAddress, burnAmount);
    });

    it("Should fail when burning more than balance", async function () {
      const burnAmount = ethers.parseEther("2000");
      
      await expect(testTokenB.connect(addr1).burn(burnAmount))
        .to.be.revertedWith("Insufficient balance to burn");
    });
  });

  describe("BurnFrom", function () {
    beforeEach(async function () {
      // Transfer tokens to addr1 and approve addr2 to burn them
      await testTokenB.transfer(addr1.address, ethers.parseEther("1000"));
      await testTokenB.connect(addr1).approve(addr2.address, ethers.parseEther("500"));
    });

    it("Should burn tokens from specified address using allowance", async function () {
      const burnAmount = ethers.parseEther("300");
      const initialBalance = await testTokenB.balanceOf(addr1.address);
      const initialSupply = await testTokenB.totalSupply();
      const initialAllowance = await testTokenB.allowance(addr1.address, addr2.address);
      
      await testTokenB.connect(addr2).burnFrom(addr1.address, burnAmount);
      
      expect(await testTokenB.balanceOf(addr1.address)).to.equal(initialBalance - burnAmount);
      expect(await testTokenB.totalSupply()).to.equal(initialSupply - burnAmount);
      expect(await testTokenB.allowance(addr1.address, addr2.address)).to.equal(initialAllowance - burnAmount);
    });

    it("Should not decrease allowance when set to max uint256", async function () {
      const maxAllowance = ethers.MaxUint256;
      const burnAmount = ethers.parseEther("300");
      
      await testTokenB.connect(addr1).approve(addr2.address, maxAllowance);
      await testTokenB.connect(addr2).burnFrom(addr1.address, burnAmount);
      
      expect(await testTokenB.allowance(addr1.address, addr2.address)).to.equal(maxAllowance);
    });

    it("Should emit Transfer event when burning from", async function () {
      const burnAmount = ethers.parseEther("300");
      
      await expect(testTokenB.connect(addr2).burnFrom(addr1.address, burnAmount))
        .to.emit(testTokenB, "Transfer")
        .withArgs(addr1.address, ethers.ZeroAddress, burnAmount);
    });

    it("Should fail when burning from zero address", async function () {
      const burnAmount = ethers.parseEther("300");
      
      await expect(testTokenB.connect(addr2).burnFrom(ethers.ZeroAddress, burnAmount))
        .to.be.revertedWith("Burn from zero address");
    });

    it("Should fail when burning more than allowance", async function () {
      const burnAmount = ethers.parseEther("600");
      
      await expect(testTokenB.connect(addr2).burnFrom(addr1.address, burnAmount))
        .to.be.revertedWith("Insufficient allowance");
    });

    it("Should fail when burning more than balance", async function () {
      const burnAmount = ethers.parseEther("2000");
      await testTokenB.connect(addr1).approve(addr2.address, burnAmount);
      
      await expect(testTokenB.connect(addr2).burnFrom(addr1.address, burnAmount))
        .to.be.revertedWith("Insufficient balance to burn");
    });
  });

  describe("Zero Supply Deployment", function () {
    it("Should deploy with zero initial supply", async function () {
      const TestTokenBFactory = await ethers.getContractFactory("TestTokenB");
      const zeroSupplyToken = await TestTokenBFactory.deploy(owner.address, 0);
      await zeroSupplyToken.waitForDeployment();
      
      expect(await zeroSupplyToken.totalSupply()).to.equal(0);
      expect(await zeroSupplyToken.balanceOf(owner.address)).to.equal(0);
    });

    it("Should fail deployment with initial supply exceeding max supply", async function () {
      const TestTokenBFactory = await ethers.getContractFactory("TestTokenB");
      const excessiveSupply = MAX_SUPPLY + ethers.parseEther("1");
      
      await expect(TestTokenBFactory.deploy(owner.address, excessiveSupply))
        .to.be.revertedWith("Initial supply exceeds maximum");
    });
  });
});