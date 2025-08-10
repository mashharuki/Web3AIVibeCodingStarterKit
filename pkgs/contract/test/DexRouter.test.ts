import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import type {
  DexFactory,
  DexPair,
  DexRouter,
  TokenA,
  TokenB,
} from "../typechain-types";

describe("DexRouter", () => {
  let factory: DexFactory;
  let router: DexRouter;
  let tokenA: TokenA;
  let tokenB: TokenB;
  let pair: DexPair;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

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

    // ルーターをデプロイ
    const DexRouterFactory = await ethers.getContractFactory("DexRouter");
    const routerContract = await DexRouterFactory.deploy(
      await factory.getAddress()
    );
    router = routerContract as unknown as DexRouter;
    await router.waitForDeployment();

    // ペアを作成
    const tokenAAddress = await tokenA.getAddress();
    const tokenBAddress = await tokenB.getAddress();
    // createPair メソッドを呼び出す
    await factory.createPair(tokenAAddress, tokenBAddress);
    // ペアコントラクトのアドレスを取得
    const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);
    const DexPairFactory = await ethers.getContractFactory("DexPair");
    const pairContract = DexPairFactory.attach(pairAddress);
    pair = pairContract as unknown as DexPair;

    // ユーザーにテストトークンを配布
    await tokenA.connect(user1).faucet();
    await tokenB.connect(user1).faucet();
    await tokenA.connect(user2).faucet();
    await tokenB.connect(user2).faucet();
  });

  describe("デプロイメント", () => {
    it("初期状態が正しく設定されている", async () => {
      expect(await router.FACTORY()).to.equal(await factory.getAddress());
    });

    it("ゼロアドレスのファクトリーでは失敗する", async () => {
      const DexRouterFactory = await ethers.getContractFactory("DexRouter");
      await expect(
        DexRouterFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(router, "ZeroAddress");
    });
  });

  describe("流動性追加 (addLiquidity)", () => {
    it("新しいペアへの流動性追加が正常に動作する", async () => {
      const amountA = ethers.parseEther("10");
      const amountB = ethers.parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 86400; // 24時間後

      // ルーターにトークンの使用を承認
      await tokenA.connect(user1).approve(await router.getAddress(), amountA);
      await tokenB.connect(user1).approve(await router.getAddress(), amountB);

      await expect(
        // 流動性を追加
        router
          .connect(user1)
          .addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            amountA,
            amountB,
            amountA,
            amountB,
            user1.address,
            deadline
          )
      ).to.not.be.reverted;

      // LPトークンが発行されたことを確認
      expect(await pair.balanceOf(user1.address)).to.be.gt(0);
    });

    it("既存ペアへの流動性追加が正常に動作する", async () => {
      // 初回流動性追加
      const initialAmountA = ethers.parseEther("10");
      const initialAmountB = ethers.parseEther("20");

      await tokenA
        .connect(user1)
        .approve(await router.getAddress(), initialAmountA);
      await tokenB
        .connect(user1)
        .approve(await router.getAddress(), initialAmountB);

      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          initialAmountA,
          initialAmountB,
          initialAmountA,
          initialAmountB,
          user1.address,
          deadline
        );

      // 追加流動性提供
      const additionalAmountA = ethers.parseEther("5");
      const additionalAmountB = ethers.parseEther("10");

      await tokenA
        .connect(user2)
        .approve(await router.getAddress(), additionalAmountA);
      await tokenB
        .connect(user2)
        .approve(await router.getAddress(), additionalAmountB);

      await expect(
        // 別ユーザーから追加流動性を提供
        router
          .connect(user2)
          .addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            additionalAmountA,
            additionalAmountB,
            0,
            0,
            user2.address,
            deadline
          )
      ).to.not.be.reverted;

      expect(await pair.balanceOf(user2.address)).to.be.gt(0);
    });

    it("期限切れの場合は失敗する", async () => {
      const amountA = ethers.parseEther("10");
      const amountB = ethers.parseEther("10");
      const pastDeadline = Math.floor(Date.now() / 1000) - 3600; // 1時間前

      await tokenA.connect(user1).approve(await router.getAddress(), amountA);
      await tokenB.connect(user1).approve(await router.getAddress(), amountB);

      await expect(
        router
          .connect(user1)
          .addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            amountA,
            amountB,
            amountA,
            amountB,
            user1.address,
            pastDeadline
          )
      ).to.be.revertedWithCustomError(router, "DeadlineExpired");
    });
  });

  describe("流動性削除 (removeLiquidity)", () => {
    beforeEach(async () => {
      // 流動性を事前に追加
      const amountA = ethers.parseEther("20");
      const amountB = ethers.parseEther("20");
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await tokenA.connect(user1).approve(await router.getAddress(), amountA);
      await tokenB.connect(user1).approve(await router.getAddress(), amountB);

      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          amountA,
          amountB,
          amountA,
          amountB,
          user1.address,
          deadline
        );
    });

    it("流動性削除が正常に動作する", async () => {
      const lpBalance = await pair.balanceOf(user1.address);
      const removeLiquidity = lpBalance / 2n;
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await pair
        .connect(user1)
        .approve(await router.getAddress(), removeLiquidity);

      const balanceABefore = await tokenA.balanceOf(user1.address);
      const balanceBBefore = await tokenB.balanceOf(user1.address);

      await expect(
        // 流動性削除
        router
          .connect(user1)
          .removeLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            removeLiquidity,
            0,
            0,
            user1.address,
            deadline
          )
      ).to.not.be.reverted;

      const balanceAAfter = await tokenA.balanceOf(user1.address);
      const balanceBAfter = await tokenB.balanceOf(user1.address);

      expect(balanceAAfter).to.be.gt(balanceABefore);
      expect(balanceBAfter).to.be.gt(balanceBBefore);
    });

    it("存在しないペアでは失敗する", async () => {
      const DummyTokenFactory = await ethers.getContractFactory("TokenA");
      const dummyToken = await DummyTokenFactory.deploy(owner.address);

      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        router
          .connect(user1)
          .removeLiquidity(
            await tokenA.getAddress(),
            await dummyToken.getAddress(),
            ethers.parseEther("1"),
            0,
            0,
            user1.address,
            deadline
          )
      ).to.be.revertedWithCustomError(router, "PairDoesNotExist");
    });
  });

  describe("スワップ", () => {
    beforeEach(async () => {
      // 流動性を事前に追加
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await tokenA.connect(user1).approve(await router.getAddress(), amountA);
      await tokenB.connect(user1).approve(await router.getAddress(), amountB);

      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          amountA,
          amountB,
          amountA,
          amountB,
          user1.address,
          deadline
        );
    });

    it("正確な入力量でのスワップが正常に動作する", async () => {
      const swapAmount = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      await tokenA
        .connect(user2)
        .approve(await router.getAddress(), swapAmount);

      const balanceBBefore = await tokenB.balanceOf(user2.address);

      await expect(
        // トークンをスワップする
        router
          .connect(user2)
          .swapExactTokensForTokens(
            swapAmount,
            0,
            path,
            user2.address,
            deadline
          )
      ).to.not.be.reverted;

      const balanceBAfter = await tokenB.balanceOf(user2.address);
      expect(balanceBAfter).to.be.gt(balanceBBefore);
    });

    it("正確な出力量でのスワップが正常に動作する", async () => {
      const outputAmount = ethers.parseEther("1");
      const maxInputAmount = ethers.parseEther("2");
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      await tokenA
        .connect(user2)
        .approve(await router.getAddress(), maxInputAmount);

      const balanceABefore = await tokenA.balanceOf(user2.address);
      const balanceBBefore = await tokenB.balanceOf(user2.address);

      await expect(
        router
          .connect(user2)
          .swapTokensForExactTokens(
            outputAmount,
            maxInputAmount,
            path,
            user2.address,
            deadline
          )
      ).to.not.be.reverted;

      const balanceAAfter = await tokenA.balanceOf(user2.address);
      const balanceBAfter = await tokenB.balanceOf(user2.address);

      expect(balanceAAfter).to.be.lt(balanceABefore);
      expect(balanceBAfter - balanceBBefore).to.equal(outputAmount);
    });

    it("不正なパスでは失敗する", async () => {
      const swapAmount = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      const invalidPath = [await tokenA.getAddress()]; // 1つのトークンのみ

      await tokenA
        .connect(user2)
        .approve(await router.getAddress(), swapAmount);

      await expect(
        router
          .connect(user2)
          .swapExactTokensForTokens(
            swapAmount,
            0,
            invalidPath,
            user2.address,
            deadline
          )
      ).to.be.revertedWithCustomError(router, "InvalidPath");
    });
  });

  describe("ユーティリティ関数", () => {
    beforeEach(async () => {
      // 流動性を事前に追加
      const amountA = ethers.parseEther("50"); // 100から50に減らす
      const amountB = ethers.parseEther("50"); // 200から50に減らす
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await tokenA.connect(user1).approve(await router.getAddress(), amountA);
      await tokenB.connect(user1).approve(await router.getAddress(), amountB);

      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          amountA,
          amountB,
          amountA,
          amountB,
          user1.address,
          deadline
        );
    });

    it("getReservesが正確な値を返す", async () => {
      const reserves = await router.getReserves(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      expect(reserves.reserveA).to.be.gt(0);
      expect(reserves.reserveB).to.be.gt(0);
    });

    it("getAmountOutが正確な値を返す", async () => {
      const amountIn = ethers.parseEther("1");
      const reserves = await router.getReserves(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      const amountOut = await router.getAmountOut(
        amountIn,
        reserves.reserveA,
        reserves.reserveB
      );

      expect(amountOut).to.be.gt(0);
      expect(amountOut).to.be.lt(amountIn * 2n); // 2:1の比率なので
    });

    it("getAmountInが正確な値を返す", async () => {
      const amountOut = ethers.parseEther("1");
      const reserves = await router.getReserves(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      const amountIn = await router.getAmountIn(
        amountOut,
        reserves.reserveA,
        reserves.reserveB
      );

      expect(amountIn).to.be.gt(0);
    });

    it("getAmountsOutが正確な値を返す", async () => {
      const amountIn = ethers.parseEther("1");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      const amounts = await router.getAmountsOut(amountIn, path);

      expect(amounts.length).to.equal(2);
      expect(amounts[0]).to.equal(amountIn);
      expect(amounts[1]).to.be.gt(0);
    });

    it("getAmountsInが正確な値を返す", async () => {
      const amountOut = ethers.parseEther("1");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      const amounts = await router.getAmountsIn(amountOut, path);

      expect(amounts.length).to.equal(2);
      expect(amounts[0]).to.be.gt(0);
      expect(amounts[1]).to.equal(amountOut);
    });
  });
});
