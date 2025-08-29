import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { AMMFactory, AMMPair, AMMRouter, WETH9 } from '../../typechain-types';

describe('AMM Core Contracts', function () {
  let factory: AMMFactory;
  let router: AMMRouter;
  let weth: WETH9;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy WETH
    const WETHFactory = await ethers.getContractFactory('WETH9');
    weth = await WETHFactory.deploy();
    await weth.waitForDeployment();

    // Deploy Factory
    const AMMFactoryContract = await ethers.getContractFactory('AMMFactory');
    factory = await AMMFactoryContract.deploy(owner.address);
    await factory.waitForDeployment();

    // Deploy Router
    const AMMRouterContract = await ethers.getContractFactory('AMMRouter');
    router = await AMMRouterContract.deploy(
      await factory.getAddress(),
      await weth.getAddress()
    );
    await router.waitForDeployment();
  });

  describe('Factory', function () {
    it('Should deploy with correct initial state', async function () {
      expect(await factory.feeToSetter()).to.equal(owner.address);
      expect(await factory.feeTo()).to.equal(ethers.ZeroAddress);
      expect(await factory.allPairsLength()).to.equal(0);
    });

    it('Should create a new pair', async function () {
      // Create mock token addresses for testing
      const tokenA = '0x1111111111111111111111111111111111111111';
      const tokenB = '0x2222222222222222222222222222222222222222';

      const tx = await factory.createPair(tokenA, tokenB);
      const receipt = await tx.wait();

      expect(await factory.allPairsLength()).to.equal(1);

      const pairAddress = await factory.getPair(tokenA, tokenB);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      // Check reverse mapping
      expect(await factory.getPair(tokenB, tokenA)).to.equal(pairAddress);
    });

    it('Should not create duplicate pairs', async function () {
      const tokenA = '0x1111111111111111111111111111111111111111';
      const tokenB = '0x2222222222222222222222222222222222222222';

      await factory.createPair(tokenA, tokenB);

      await expect(factory.createPair(tokenA, tokenB)).to.be.revertedWith(
        'AMMFactory: PAIR_EXISTS'
      );
    });

    it('Should not create pair with identical addresses', async function () {
      const token = '0x1111111111111111111111111111111111111111';

      await expect(factory.createPair(token, token)).to.be.revertedWith(
        'AMMFactory: IDENTICAL_ADDRESSES'
      );
    });

    it('Should not create pair with zero address', async function () {
      const token = '0x1111111111111111111111111111111111111111';

      await expect(
        factory.createPair(ethers.ZeroAddress, token)
      ).to.be.revertedWith('AMMFactory: ZERO_ADDRESS');
    });
  });

  describe('Router', function () {
    it('Should deploy with correct factory and WETH addresses', async function () {
      expect(await router.factory()).to.equal(await factory.getAddress());
      expect(await router.WETH()).to.equal(await weth.getAddress());
    });
  });

  describe('WETH', function () {
    it('Should allow deposits and withdrawals', async function () {
      const depositAmount = ethers.parseEther('1.0');

      // Deposit ETH
      await weth.connect(user1).deposit({ value: depositAmount });
      expect(await weth.balanceOf(user1.address)).to.equal(depositAmount);

      // Withdraw ETH
      const initialBalance = await ethers.provider.getBalance(user1.address);
      const tx = await weth.connect(user1).withdraw(depositAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalBalance = await ethers.provider.getBalance(user1.address);
      expect(finalBalance).to.be.closeTo(
        initialBalance + depositAmount - gasUsed,
        ethers.parseEther('0.001') // Allow for small gas variations
      );
    });

    it('Should handle transfers correctly', async function () {
      const amount = ethers.parseEther('1.0');

      // Deposit
      await weth.connect(user1).deposit({ value: amount });

      // Transfer
      await weth.connect(user1).transfer(user2.address, amount);

      expect(await weth.balanceOf(user1.address)).to.equal(0);
      expect(await weth.balanceOf(user2.address)).to.equal(amount);
    });
  });

  describe('Integration', function () {
    it('Should create pair through factory and verify pair contract', async function () {
      const tokenA = '0x1111111111111111111111111111111111111111';
      const tokenB = '0x2222222222222222222222222222222222222222';

      await factory.createPair(tokenA, tokenB);
      const pairAddress = await factory.getPair(tokenA, tokenB);

      // Get pair contract instance
      const AMMPairContract = await ethers.getContractFactory('AMMPair');
      const pair = AMMPairContract.attach(pairAddress) as AMMPair;

      // Verify pair initialization
      const token0 = await pair.token0();
      const token1 = await pair.token1();

      // Tokens should be sorted
      expect(token0 < token1).to.be.true;
      const sortedTokens = [tokenA, tokenB].sort();
      expect([token0, token1]).to.deep.equal(sortedTokens);

      // Check initial reserves
      const reserves = await pair.getReserves();
      expect(reserves[0]).to.equal(0); // reserve0
      expect(reserves[1]).to.equal(0); // reserve1
    });
  });
});
