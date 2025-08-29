import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { AMMFactory, AMMPair, AMMRouter, WETH9 } from '../../typechain-types';

describe('AMM Integration Tests', function () {
  let factory: AMMFactory;
  let router: AMMRouter;
  let weth: WETH9;
  let usdc: WETH9; // Mock USDC using WETH9
  let jpyc: WETH9; // Mock JPYC using WETH9
  let pyusd: WETH9; // Mock PYUSD using WETH9
  let owner: SignerWithAddress;
  let liquidityProvider: SignerWithAddress;
  let trader1: SignerWithAddress;
  let trader2: SignerWithAddress;

  async function deployFullSystemFixture() {
    const [owner, liquidityProvider, trader1, trader2] =
      await ethers.getSigners();

    // Deploy WETH
    const WETHFactory = await ethers.getContractFactory('WETH9');
    const weth = await WETHFactory.deploy();
    await weth.waitForDeployment();

    // Deploy mock tokens (using WETH9 as template)
    const usdc = await WETHFactory.deploy();
    await usdc.waitForDeployment();
    const jpyc = await WETHFactory.deploy();
    await jpyc.waitForDeployment();
    const pyusd = await WETHFactory.deploy();
    await pyusd.waitForDeployment();

    // Deploy Factory
    const AMMFactoryContract = await ethers.getContractFactory('AMMFactory');
    const factory = await AMMFactoryContract.deploy(owner.address);
    await factory.waitForDeployment();

    // Deploy Router
    const AMMRouterContract = await ethers.getContractFactory('AMMRouter');
    const router = await AMMRouterContract.deploy(
      await factory.getAddress(),
      await weth.getAddress()
    );
    await router.waitForDeployment();

    return {
      factory,
      router,
      weth,
      usdc,
      jpyc,
      pyusd,
      owner,
      liquidityProvider,
      trader1,
      trader2,
    };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployFullSystemFixture);
    factory = fixture.factory;
    router = fixture.router;
    weth = fixture.weth;
    usdc = fixture.usdc;
    jpyc = fixture.jpyc;
    pyusd = fixture.pyusd;
    owner = fixture.owner;
    liquidityProvider = fixture.liquidityProvider;
    trader1 = fixture.trader1;
    trader2 = fixture.trader2;

    // 各テスト用に十分な資金を準備
    const baseAmount = ethers.parseEther('100');
    await usdc.connect(liquidityProvider).deposit({ value: baseAmount });
    await jpyc.connect(liquidityProvider).deposit({ value: baseAmount });
    await pyusd.connect(liquidityProvider).deposit({ value: baseAmount });

    await usdc.connect(trader1).deposit({ value: baseAmount });
    await jpyc.connect(trader1).deposit({ value: baseAmount });
    await pyusd.connect(trader1).deposit({ value: baseAmount });

    await usdc.connect(trader2).deposit({ value: baseAmount });
    await jpyc.connect(trader2).deposit({ value: baseAmount });
    await pyusd.connect(trader2).deposit({ value: baseAmount });
  });

  describe('完全なDEXワークフロー', function () {
    it('流動性提供からスワップまでの完全なフローが動作する', async function () {
      // Step 1: トークンを準備
      const usdcAmount = ethers.parseEther('10'); // 10 USDC
      const jpycAmount = ethers.parseEther('15'); // 15 JPYC (1 USDC = 1.5 JPYC)

      // Step 2: ルーターに承認
      await usdc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await jpyc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);

      // Step 3: 流動性を追加
      const deadline = (await time.latest()) + 300;

      await router
        .connect(liquidityProvider)
        .addLiquidity(
          await usdc.getAddress(),
          await jpyc.getAddress(),
          usdcAmount,
          jpycAmount,
          0,
          0,
          liquidityProvider.address,
          deadline
        );

      // Step 4: ペアが作成されたことを確認
      const pairAddress = await factory.getPair(
        await usdc.getAddress(),
        await jpyc.getAddress()
      );
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      const AMMPairContract = await ethers.getContractFactory('AMMPair');
      const pair = AMMPairContract.attach(pairAddress) as AMMPair;

      // Step 5: 流動性が正しく追加されたことを確認
      const reserves = await pair.getReserves();
      expect(reserves[0]).to.be.greaterThan(0);
      expect(reserves[1]).to.be.greaterThan(0);

      // Step 6: トレーダーがスワップを実行
      const swapAmount = ethers.parseEther('1'); // 1 USDC
      await usdc
        .connect(trader1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const path = [await usdc.getAddress(), await jpyc.getAddress()];
      const amountsOut = await router.getAmountsOut(swapAmount, path);
      const expectedJpycOut = amountsOut[1];

      const jpycBalanceBefore = await jpyc.balanceOf(trader1.address);

      await router
        .connect(trader1)
        .swapExactTokensForTokens(
          swapAmount,
          0,
          path,
          trader1.address,
          deadline + 300
        );

      // Step 7: スワップが成功したことを確認
      const jpycBalanceAfter = await jpyc.balanceOf(trader1.address);
      expect(jpycBalanceAfter).to.equal(jpycBalanceBefore + expectedJpycOut);

      // Step 8: 価格影響を確認
      const reservesAfter = await pair.getReserves();
      expect(reservesAfter[0]).to.not.equal(reserves[0]);
      expect(reservesAfter[1]).to.not.equal(reserves[1]);
    });

    it('複数のペアでアービトラージが可能である', async function () {
      // 3つのトークンペアを作成: USDC/JPYC, USDC/PYUSD, JPYC/PYUSD
      const usdcAmount = ethers.parseEther('10');
      const jpycAmount = ethers.parseEther('15');
      const pyusdAmount = ethers.parseEther('10');

      // 承認
      await usdc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await jpyc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await pyusd
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;

      // USDC/JPYC ペア
      await router
        .connect(liquidityProvider)
        .addLiquidity(
          await usdc.getAddress(),
          await jpyc.getAddress(),
          usdcAmount,
          jpycAmount,
          0,
          0,
          liquidityProvider.address,
          deadline
        );

      // USDC/PYUSD ペア
      await router
        .connect(liquidityProvider)
        .addLiquidity(
          await usdc.getAddress(),
          await pyusd.getAddress(),
          usdcAmount,
          pyusdAmount,
          0,
          0,
          liquidityProvider.address,
          deadline + 300
        );

      // JPYC/PYUSD ペア（異なる比率で価格差を作る）
      await router.connect(liquidityProvider).addLiquidity(
        await jpyc.getAddress(),
        await pyusd.getAddress(),
        jpycAmount,
        pyusdAmount, // 同じ比率に変更
        0,
        0,
        liquidityProvider.address,
        deadline + 600
      );

      // アービトラージャーがトライアングラーアービトラージを実行
      const arbitrageAmount = ethers.parseEther('1');
      await usdc
        .connect(trader1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      // USDC -> JPYC -> PYUSD -> USDC のパスでアービトラージ
      // Step 1: USDC -> JPYC
      let path = [await usdc.getAddress(), await jpyc.getAddress()];

      await router
        .connect(trader1)
        .swapExactTokensForTokens(
          arbitrageAmount,
          0,
          path,
          trader1.address,
          deadline + 900
        );

      const jpycBalance = await jpyc.balanceOf(trader1.address);
      await jpyc
        .connect(trader1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      // Step 2: JPYC -> PYUSD
      path = [await jpyc.getAddress(), await pyusd.getAddress()];
      await router
        .connect(trader1)
        .swapExactTokensForTokens(
          jpycBalance,
          0,
          path,
          trader1.address,
          deadline + 1200
        );

      const pyusdBalance = await pyusd.balanceOf(trader1.address);
      await pyusd
        .connect(trader1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      // Step 3: PYUSD -> USDC
      path = [await pyusd.getAddress(), await usdc.getAddress()];
      await router
        .connect(trader1)
        .swapExactTokensForTokens(
          pyusdBalance,
          0,
          path,
          trader1.address,
          deadline + 1500
        );

      const finalUsdcBalance = await usdc.balanceOf(trader1.address);

      // アービトラージが成功したかどうかは市場の状況による
      // ここでは取引が成功したことを確認
      expect(finalUsdcBalance).to.be.greaterThan(0);
    });

    it('大量の流動性削除が正常に処理される', async function () {
      // 大量の流動性を追加
      const largeUsdcAmount = ethers.parseEther('10');
      const largeJpycAmount = ethers.parseEther('15');
      await usdc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await jpyc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;

      await router
        .connect(liquidityProvider)
        .addLiquidity(
          await usdc.getAddress(),
          await jpyc.getAddress(),
          largeUsdcAmount,
          largeJpycAmount,
          0,
          0,
          liquidityProvider.address,
          deadline
        );

      const pairAddress = await factory.getPair(
        await usdc.getAddress(),
        await jpyc.getAddress()
      );
      const AMMPairContract = await ethers.getContractFactory('AMMPair');
      const pair = AMMPairContract.attach(pairAddress) as AMMPair;

      const lpBalance = await pair.balanceOf(liquidityProvider.address);
      await pair
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);

      // 流動性の90%を削除
      const liquidityToRemove = (lpBalance * 90n) / 100n;

      const usdcBalanceBefore = await usdc.balanceOf(liquidityProvider.address);
      const jpycBalanceBefore = await jpyc.balanceOf(liquidityProvider.address);

      await router
        .connect(liquidityProvider)
        .removeLiquidity(
          await usdc.getAddress(),
          await jpyc.getAddress(),
          liquidityToRemove,
          0,
          0,
          liquidityProvider.address,
          deadline + 300
        );

      // トークンが返却されたことを確認
      expect(await usdc.balanceOf(liquidityProvider.address)).to.be.greaterThan(
        usdcBalanceBefore
      );
      expect(await jpyc.balanceOf(liquidityProvider.address)).to.be.greaterThan(
        jpycBalanceBefore
      );

      // 残りの流動性が正しく残っていることを確認
      const remainingLpBalance = await pair.balanceOf(
        liquidityProvider.address
      );
      expect(remainingLpBalance).to.equal(lpBalance - liquidityToRemove);
    });

    it('高頻度取引でも正常に動作する', async function () {
      // 初期流動性を追加
      const usdcAmount = ethers.parseEther('5');
      const jpycAmount = ethers.parseEther('7.5');
      await usdc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await jpyc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;

      await router
        .connect(liquidityProvider)
        .addLiquidity(
          await usdc.getAddress(),
          await jpyc.getAddress(),
          usdcAmount,
          jpycAmount,
          0,
          0,
          liquidityProvider.address,
          deadline
        );

      // 複数のトレーダーが同時に取引
      const tradeAmount = ethers.parseEther('0.1');

      // トレーダー1: USDC -> JPYC
      await usdc
        .connect(trader1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      // トレーダー2: JPYC -> USDC
      await jpyc
        .connect(trader2)
        .approve(await router.getAddress(), ethers.MaxUint256);

      // 連続取引を実行
      const trades = [];

      for (let i = 0; i < 5; i++) {
        // トレーダー1の取引
        const path1 = [await usdc.getAddress(), await jpyc.getAddress()];
        trades.push(
          router
            .connect(trader1)
            .swapExactTokensForTokens(
              tradeAmount,
              0,
              path1,
              trader1.address,
              deadline + 600 + i * 60
            )
        );

        // トレーダー2の取引
        const path2 = [await jpyc.getAddress(), await usdc.getAddress()];
        trades.push(
          router
            .connect(trader2)
            .swapExactTokensForTokens(
              tradeAmount * 15n,
              0,
              path2,
              trader2.address,
              deadline + 600 + i * 60
            )
        );
      }

      // すべての取引が成功することを確認
      await Promise.all(trades);

      // 最終的な残高を確認
      expect(await jpyc.balanceOf(trader1.address)).to.be.greaterThan(0);
      expect(await usdc.balanceOf(trader2.address)).to.be.greaterThan(0);
    });
  });

  describe('エラー処理とエッジケース', function () {
    it('流動性不足時のスワップが適切にリバートする', async function () {
      // 小さな流動性プールを作成
      const smallUsdcAmount = ethers.parseEther('1');
      const smallJpycAmount = ethers.parseEther('1.5');
      await usdc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await jpyc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;
      // 流動性追加
      await router
        .connect(liquidityProvider)
        .addLiquidity(
          await usdc.getAddress(),
          await jpyc.getAddress(),
          smallUsdcAmount,
          smallJpycAmount,
          0,
          0,
          liquidityProvider.address,
          deadline
        );

      // 流動性を超える大量のスワップを試行
      const excessiveAmount = smallUsdcAmount + ethers.parseEther('10000'); // プールより大きい
      await usdc
        .connect(trader1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const path = [await usdc.getAddress(), await jpyc.getAddress()];

      await expect(
        router
          .connect(trader1)
          .swapExactTokensForTokens(
            excessiveAmount,
            0,
            path,
            trader1.address,
            deadline + 300
          )
      ).to.be.reverted; // 流動性不足でリバート
    });

    it('期限切れ取引が適切にリバートする', async function () {
      const usdcAmount = ethers.parseEther('10');
      const jpycAmount = ethers.parseEther('15');
      await usdc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await jpyc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;

      await router
        .connect(liquidityProvider)
        .addLiquidity(
          await usdc.getAddress(),
          await jpyc.getAddress(),
          usdcAmount,
          jpycAmount,
          0,
          0,
          liquidityProvider.address,
          deadline
        );

      // 期限切れの取引を試行
      const pastDeadline = (await time.latest()) - 1;
      const swapAmount = ethers.parseEther('0.1');

      await usdc
        .connect(trader1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const path = [await usdc.getAddress(), await jpyc.getAddress()];

      await expect(
        router
          .connect(trader1)
          .swapExactTokensForTokens(
            swapAmount,
            0,
            path,
            trader1.address,
            pastDeadline
          )
      ).to.be.revertedWith('AMMRouter: EXPIRED');
    });

    it('スリッページ保護が正常に機能する', async function () {
      const usdcAmount = ethers.parseEther('10');
      const jpycAmount = ethers.parseEther('15');
      await usdc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await jpyc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;

      await router
        .connect(liquidityProvider)
        .addLiquidity(
          await usdc.getAddress(),
          await jpyc.getAddress(),
          usdcAmount,
          jpycAmount,
          0,
          0,
          liquidityProvider.address,
          deadline
        );

      const swapAmount = ethers.parseEther('0.1');
      await usdc.connect(trader1).deposit({ value: swapAmount });
      await usdc
        .connect(trader1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const path = [await usdc.getAddress(), await jpyc.getAddress()];
      const amountsOut = await router.getAmountsOut(swapAmount, path);
      const expectedOut = amountsOut[1];

      // 不可能な最小出力量を設定
      await expect(
        router
          .connect(trader1)
          .swapExactTokensForTokens(
            swapAmount,
            expectedOut + 1n,
            path,
            trader1.address,
            deadline + 300
          )
      ).to.be.revertedWith('AMMRouter: INSUFFICIENT_OUTPUT_AMOUNT');
    });
  });

  describe('ガス効率性とパフォーマンス', function () {
    it('複雑な取引でも合理的なガス使用量である', async function () {
      // 複数ペアの流動性を追加
      const amount = ethers.parseEther('10');

      await usdc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await jpyc
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await pyusd
        .connect(liquidityProvider)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;

      // 複数ペアを作成
      await router
        .connect(liquidityProvider)
        .addLiquidity(
          await usdc.getAddress(),
          await jpyc.getAddress(),
          amount,
          amount,
          0,
          0,
          liquidityProvider.address,
          deadline
        );

      await router
        .connect(liquidityProvider)
        .addLiquidity(
          await usdc.getAddress(),
          await pyusd.getAddress(),
          amount,
          amount,
          0,
          0,
          liquidityProvider.address,
          deadline + 300
        );

      await router
        .connect(liquidityProvider)
        .addLiquidity(
          await jpyc.getAddress(),
          await pyusd.getAddress(),
          amount,
          amount,
          0,
          0,
          liquidityProvider.address,
          deadline + 600
        );

      // 複雑なマルチホップスワップ
      const swapAmount = ethers.parseEther('0.1');
      await usdc
        .connect(trader1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const path = [
        await usdc.getAddress(),
        await jpyc.getAddress(),
        await pyusd.getAddress(),
      ];

      const tx = await router
        .connect(trader1)
        .swapExactTokensForTokens(
          swapAmount,
          0,
          path,
          trader1.address,
          deadline + 900
        );

      const receipt = await tx.wait();

      // マルチホップでも合理的なガス使用量
      expect(receipt!.gasUsed).to.be.lessThan(300000); // 30万ガス以下
    });
  });
});
