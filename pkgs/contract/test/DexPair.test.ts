import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import type { DexFactory, DexPair, TokenA, TokenB } from "../typechain-types";

describe("DexPair", () => {
  let factory: DexFactory;
  let tokenA: TokenA;
  let tokenB: TokenB;
  let pair: DexPair;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const MINIMUM_LIQUIDITY = 1000;

  beforeEach(async () => {
    // アカウントを取得
    const signers = await ethers.getSigners();
    if (!signers[0] || !signers[1] || !signers[2]) {
      throw new Error("Not enough signers available");
    }
    owner = signers[0];
    user1 = signers[1];
    user2 = signers[2];

    // トークンをデプロイ
    const TokenAFactory = await ethers.getContractFactory("TokenA");
    const TokenBFactory = await ethers.getContractFactory("TokenB");

    const tokenAContract = await TokenAFactory.deploy(owner.address);
    const tokenBContract = await TokenBFactory.deploy(owner.address);
    tokenA = tokenAContract as unknown as TokenA;
    tokenB = tokenBContract as unknown as TokenB;

    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    // ファクトリーをデプロイ
    const DexFactoryFactory = await ethers.getContractFactory("DexFactory");
    const factoryContract = await DexFactoryFactory.deploy(owner.address);
    factory = factoryContract as unknown as DexFactory;
    await factory.waitForDeployment();

    // ペアを作成
    const tokenAAddress = await tokenA.getAddress();
    const tokenBAddress = await tokenB.getAddress();
    await factory.createPair(tokenAAddress, tokenBAddress);

    const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);
    const DexPairFactory = await ethers.getContractFactory("DexPair");
    const pairContract = DexPairFactory.attach(pairAddress);
    pair = pairContract as unknown as DexPair;

    // ユーザーにテストトークンを配布
    await tokenA.connect(owner).faucet();
    await tokenB.connect(owner).faucet();
    await tokenA.connect(user1).faucet();
    await tokenB.connect(user1).faucet();
    await tokenA.connect(user2).faucet();
    await tokenB.connect(user2).faucet();
  });

  describe("デプロイメントと初期化", () => {
    it("ペアが正しく初期化されている", async () => {
      expect(await pair.name()).to.equal("DEX LP Token");
      expect(await pair.symbol()).to.equal("DEX-LP");
      expect(await pair.decimals()).to.equal(18);
      expect(await pair.totalSupply()).to.equal(0);
      expect(await pair.MINIMUM_LIQUIDITY()).to.equal(MINIMUM_LIQUIDITY);
      expect(await pair.factory()).to.equal(await factory.getAddress());

      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();
      const token0 = await pair.token0();
      const token1 = await pair.token1();

      // トークンが正しくソートされている
      expect(token0 < token1).to.be.true;
      expect([token0, token1].sort()).to.deep.equal(
        [tokenAAddress, tokenBAddress].sort()
      );
    });
  });

  describe("流動性提供 (Mint)", () => {
    it("初回流動性提供が正常に動作する", async () => {
      const amount0 = ethers.parseEther("10");
      const amount1 = ethers.parseEther("10");

      // トークンをペアに転送
      await tokenA.connect(user1).transfer(await pair.getAddress(), amount0);
      await tokenB.connect(user1).transfer(await pair.getAddress(), amount1);

      // 期待されるLPトークン量を計算 (sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY)
      const expectedLiquidity =
        ethers.parseEther("10") - BigInt(MINIMUM_LIQUIDITY);

      await expect(pair.mint(user1.address))
        .to.emit(pair, "Mint")
        .withArgs(owner.address, amount0, amount1)
        .and.to.emit(pair, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, expectedLiquidity);

      expect(await pair.balanceOf(user1.address)).to.equal(expectedLiquidity);
      expect(await pair.totalSupply()).to.equal(ethers.parseEther("10"));
    });

    it("追加流動性提供が正常に動作する", async () => {
      // 初回流動性提供
      const initialAmount0 = ethers.parseEther("10");
      const initialAmount1 = ethers.parseEther("10");

      await tokenA
        .connect(user1)
        .transfer(await pair.getAddress(), initialAmount0);
      await tokenB
        .connect(user1)
        .transfer(await pair.getAddress(), initialAmount1);
      await pair.mint(user1.address);

      // 追加流動性提供
      const additionalAmount0 = ethers.parseEther("5");
      const additionalAmount1 = ethers.parseEther("5");

      await tokenA
        .connect(user2)
        .transfer(await pair.getAddress(), additionalAmount0);
      await tokenB
        .connect(user2)
        .transfer(await pair.getAddress(), additionalAmount1);

      const totalSupplyBefore = await pair.totalSupply();
      const expectedAdditionalLiquidity = ethers.parseEther("5");

      await expect(pair.mint(user2.address))
        .to.emit(pair, "Mint")
        .withArgs(owner.address, additionalAmount0, additionalAmount1);

      expect(await pair.balanceOf(user2.address)).to.equal(
        expectedAdditionalLiquidity
      );
    });

    it("不均等な流動性提供は適切に処理される", async () => {
      // 初回流動性提供
      await tokenA
        .connect(user1)
        .transfer(await pair.getAddress(), ethers.parseEther("10"));
      await tokenB
        .connect(user1)
        .transfer(await pair.getAddress(), ethers.parseEther("20"));
      await pair.mint(user1.address);

      // 不均等な追加流動性提供
      await tokenA
        .connect(user2)
        .transfer(await pair.getAddress(), ethers.parseEther("5"));
      await tokenB
        .connect(user2)
        .transfer(await pair.getAddress(), ethers.parseEther("15"));
      await pair.mint(user2.address);

      // 最小比率で計算されることを確認
      expect(await pair.balanceOf(user2.address)).to.be.gt(0);
    });

    it("流動性が不足している場合は失敗する", async () => {
      await expect(pair.mint(user1.address)).to.be.revertedWithPanic(0x11); // オーバーフローパニック
    });
  });

  describe("流動性削除 (Burn)", () => {
    beforeEach(async () => {
      // 初期流動性を提供
      await tokenA
        .connect(user1)
        .transfer(await pair.getAddress(), ethers.parseEther("20"));
      await tokenB
        .connect(user1)
        .transfer(await pair.getAddress(), ethers.parseEther("20"));
      await pair.mint(user1.address);
    });

    it("流動性削除が正常に動作する", async () => {
      const lpBalance = await pair.balanceOf(user1.address);
      const burnAmount = lpBalance / 2n;

      // LPトークンをペアに転送
      await pair.connect(user1).transfer(await pair.getAddress(), burnAmount);

      const balanceBefore0 = await tokenA.balanceOf(user1.address);
      const balanceBefore1 = await tokenB.balanceOf(user1.address);

      await expect(pair.burn(user1.address)).to.emit(pair, "Burn");

      const balanceAfter0 = await tokenA.balanceOf(user1.address);
      const balanceAfter1 = await tokenB.balanceOf(user1.address);

      expect(balanceAfter0).to.be.gt(balanceBefore0);
      expect(balanceAfter1).to.be.gt(balanceBefore1);
    });

    it("無効な受取人アドレスでは失敗する", async () => {
      const lpBalance = await pair.balanceOf(user1.address);
      await pair.connect(user1).transfer(await pair.getAddress(), lpBalance);

      await expect(
        pair.burn(await pair.getAddress())
      ).to.be.revertedWithCustomError(pair, "InvalidTo");
    });
  });

  describe("スワップ", () => {
    beforeEach(async () => {
      // 流動性を提供
      await tokenA
        .connect(user1)
        .transfer(await pair.getAddress(), ethers.parseEther("100"));
      await tokenB
        .connect(user1)
        .transfer(await pair.getAddress(), ethers.parseEther("100"));
      await pair.mint(user1.address);
    });

    it("Token0からToken1へのスワップが正常に動作する", async () => {
      const swapAmount = ethers.parseEther("1");
      const token0Address = await pair.token0();
      const isTokenAToken0 = token0Address === (await tokenA.getAddress());

      if (isTokenAToken0) {
        await tokenA
          .connect(user2)
          .transfer(await pair.getAddress(), swapAmount);
      } else {
        await tokenB
          .connect(user2)
          .transfer(await pair.getAddress(), swapAmount);
      }

      // リザーブを取得してスワップ量を計算
      const reserves = await pair.getReserves();
      const reserveIn = isTokenAToken0
        ? reserves._reserve0
        : reserves._reserve1;
      const reserveOut = isTokenAToken0
        ? reserves._reserve1
        : reserves._reserve0;

      // UniswapV2のgetAmountOut計算 (0.3%手数料)
      const amountInWithFee = swapAmount * 997n;
      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn * 1000n + amountInWithFee;
      const outputAmount = numerator / denominator;

      await expect(
        pair.swap(
          isTokenAToken0 ? 0 : outputAmount,
          isTokenAToken0 ? outputAmount : 0,
          user2.address,
          "0x"
        )
      ).to.emit(pair, "Swap");
    });

    it("不正な出力量では失敗する", async () => {
      await expect(
        pair.swap(0, 0, user2.address, "0x")
      ).to.be.revertedWithCustomError(pair, "InsufficientOutputAmount");
    });

    it("リザーブを超える出力量では失敗する", async () => {
      const excessiveAmount = ethers.parseEther("150");

      await expect(
        pair.swap(excessiveAmount, 0, user2.address, "0x")
      ).to.be.revertedWithCustomError(pair, "InsufficientLiquidity");
    });

    it("無効な受取人アドレスでは失敗する", async () => {
      const swapAmount = ethers.parseEther("1");
      const tokenAAddress = await tokenA.getAddress();

      await tokenA.connect(user2).transfer(await pair.getAddress(), swapAmount);

      await expect(
        pair.swap(0, ethers.parseEther("0.99"), tokenAAddress, "0x")
      ).to.be.revertedWithCustomError(pair, "InvalidTo");
    });
  });

  describe("リザーブ同期", () => {
    it("sync関数が正常に動作する", async () => {
      // 流動性を提供
      await tokenA
        .connect(user1)
        .transfer(await pair.getAddress(), ethers.parseEther("10"));
      await tokenB
        .connect(user1)
        .transfer(await pair.getAddress(), ethers.parseEther("10"));
      await pair.mint(user1.address);

      // 直接トークンを追加送信
      await tokenA.transfer(await pair.getAddress(), ethers.parseEther("1"));

      await expect(pair.sync()).to.emit(pair, "Sync");

      const reserves = await pair.getReserves();
      expect(reserves._reserve0).to.be.gt(0);
      expect(reserves._reserve1).to.be.gt(0);
    });
  });

  describe("価格オラクル", () => {
    it("価格累積値が更新される", async () => {
      // 流動性を提供
      await tokenA
        .connect(user1)
        .transfer(await pair.getAddress(), ethers.parseEther("10"));
      await tokenB
        .connect(user1)
        .transfer(await pair.getAddress(), ethers.parseEther("20"));
      await pair.mint(user1.address);

      const price0Before = await pair.price0CumulativeLast();
      const price1Before = await pair.price1CumulativeLast();

      // 時間を進める
      await ethers.provider.send("evm_increaseTime", [3600]); // 1時間
      await ethers.provider.send("evm_mine", []);

      // 同期を実行して価格を更新
      await pair.sync();

      const price0After = await pair.price0CumulativeLast();
      const price1After = await pair.price1CumulativeLast();

      expect(price0After).to.be.gt(price0Before);
      expect(price1After).to.be.gt(price1Before);
    });
  });
});
