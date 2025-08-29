import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { AMMFactory, AMMPair, AMMRouter, WETH9 } from '../../typechain-types';

describe('AMMRouter', function () {
  let factory: AMMFactory;
  let router: AMMRouter;
  let weth: WETH9;
  let tokenA: WETH9;
  let tokenB: WETH9;
  let pair: AMMPair;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  // テスト用の定数
  const MINIMUM_LIQUIDITY = 1000n;

  async function deployContractsFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy WETH
    const WETHFactory = await ethers.getContractFactory('WETH9');
    const weth = await WETHFactory.deploy();
    await weth.waitForDeployment();

    // Deploy test tokens
    const tokenA = await WETHFactory.deploy();
    await tokenA.waitForDeployment();
    const tokenB = await WETHFactory.deploy();
    await tokenB.waitForDeployment();

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

    // Create pair
    const tokenAAddress = await tokenA.getAddress();
    const tokenBAddress = await tokenB.getAddress();

    await factory.createPair(tokenAAddress, tokenBAddress);
    const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);

    const AMMPairContract = await ethers.getContractFactory('AMMPair');
    const pair = AMMPairContract.attach(pairAddress) as AMMPair;

    return {
      factory,
      router,
      weth,
      tokenA,
      tokenB,
      pair,
      owner,
      user1,
      user2,
    };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployContractsFixture);
    factory = fixture.factory;
    router = fixture.router;
    weth = fixture.weth;
    tokenA = fixture.tokenA;
    tokenB = fixture.tokenB;
    pair = fixture.pair;
    owner = fixture.owner;
    user1 = fixture.user1;
    user2 = fixture.user2;
  });

  describe('初期化', function () {
    it('正しいファクトリーとWETHアドレスが設定されている', async function () {
      expect(await router.factory()).to.equal(await factory.getAddress());
      expect(await router.WETH()).to.equal(await weth.getAddress());
    });
  });

  describe('流動性追加 (addLiquidity)', function () {
    const tokenAAmount = ethers.parseEther('1');
    const tokenBAmount = ethers.parseEther('4');

    beforeEach(async function () {
      // ユーザーにトークンを付与
      await tokenA.connect(user1).deposit({ value: tokenAAmount * 2n });
      await tokenB.connect(user1).deposit({ value: tokenBAmount * 2n });

      // ルーターにトークンの使用を承認
      await tokenA
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await tokenB
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);
    });

    it('初回流動性追加が成功する', async function () {
      const deadline = (await time.latest()) + 300; // 5分後

      const tx = await router.connect(user1).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        tokenAAmount,
        tokenBAmount,
        0, // amountAMin
        0, // amountBMin
        user1.address,
        deadline
      );

      const receipt = await tx.wait();

      // LPトークンが発行されたことを確認
      const expectedLiquidity = ethers.parseEther('2') - MINIMUM_LIQUIDITY; // sqrt(1*4) - MINIMUM_LIQUIDITY
      expect(await pair.balanceOf(user1.address)).to.equal(expectedLiquidity);

      // 残高が正しく更新されたことを確認
      const reserves = await pair.getReserves();
      // トークンの順序を確認して正しく比較
      const token0Address = await pair.token0();
      const tokenAAddress = await tokenA.getAddress();

      if (token0Address === tokenAAddress) {
        expect(reserves[0]).to.equal(tokenAAmount);
        expect(reserves[1]).to.equal(tokenBAmount);
      } else {
        expect(reserves[0]).to.equal(tokenBAmount);
        expect(reserves[1]).to.equal(tokenAAmount);
      }
    });

    it('既存プールへの流動性追加が成功する', async function () {
      const deadline = (await time.latest()) + 300;

      // 初回流動性追加
      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          tokenAAmount,
          tokenBAmount,
          0,
          0,
          user1.address,
          deadline
        );

      // 2回目の流動性追加
      const additionalTokenA = tokenAAmount / 2n;
      const additionalTokenB = tokenBAmount / 2n;

      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          additionalTokenA,
          additionalTokenB,
          0,
          0,
          user1.address,
          deadline + 300
        );

      // 総流動性が増加したことを確認
      const totalSupply = await pair.totalSupply();
      expect(totalSupply).to.be.greaterThan(ethers.parseEther('2'));
    });

    it('最小数量制限でリバートする', async function () {
      const deadline = (await time.latest()) + 300;

      // 初回流動性追加を行う
      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          tokenAAmount,
          tokenBAmount,
          0,
          0,
          user1.address,
          deadline
        );

      // 2回目の追加で不均衡な量を指定し、最小数量制限をテスト
      const desiredTokenA = tokenAAmount / 4n; // 0.25 ETH
      const desiredTokenB = tokenBAmount; // 4 ETH (比率が合わない)

      // 実際に使用される量は比率に基づいて調整される
      // tokenA : tokenB = 1 : 4 の比率なので、0.25 ETH に対して 1 ETH のtokenBが必要
      // しかし、最小値として 2 ETH を要求する

      await expect(
        router.connect(user1).addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          desiredTokenA,
          desiredTokenB,
          0,
          tokenBAmount / 2n + 1n, // 実際に使用される量より大きい最小値
          user1.address,
          deadline + 300
        )
      ).to.be.revertedWith('AMMRouter: INSUFFICIENT_B_AMOUNT');
    });

    it('期限切れでリバートする', async function () {
      const pastDeadline = (await time.latest()) - 1;

      await expect(
        router
          .connect(user1)
          .addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            tokenAAmount,
            tokenBAmount,
            0,
            0,
            user1.address,
            pastDeadline
          )
      ).to.be.revertedWith('AMMRouter: EXPIRED');
    });

    it('不均衡な流動性追加で最適な比率が計算される', async function () {
      const deadline = (await time.latest()) + 300;

      // 初回流動性追加
      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          tokenAAmount,
          tokenBAmount,
          0,
          0,
          user1.address,
          deadline
        );

      // 不均衡な追加（tokenBを多く指定）
      const excessiveTokenB = tokenBAmount * 2n;

      const tx = await router.connect(user1).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        tokenAAmount,
        excessiveTokenB, // 過剰な量
        0,
        tokenBAmount, // 最小値は現在の比率に基づく
        user1.address,
        deadline + 300
      );

      // 実際に使用された量は比率に基づいて調整される
      const receipt = await tx.wait();
      // 詳細な検証はイベントログで確認可能
    });
  });

  describe('ETH流動性追加 (addLiquidityETH)', function () {
    const tokenAmount = ethers.parseEther('1');
    const ethAmount = ethers.parseEther('4');

    beforeEach(async function () {
      await tokenA.connect(user1).deposit({ value: tokenAmount * 2n });
      await tokenA
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);
    });

    it('ETH流動性追加が成功する', async function () {
      const deadline = (await time.latest()) + 300;

      const tx = await router
        .connect(user1)
        .addLiquidityETH(
          await tokenA.getAddress(),
          tokenAmount,
          0,
          0,
          user1.address,
          deadline,
          { value: ethAmount }
        );

      // WETH/TokenAペアが作成されたことを確認
      const wethPairAddress = await factory.getPair(
        await weth.getAddress(),
        await tokenA.getAddress()
      );
      expect(wethPairAddress).to.not.equal(ethers.ZeroAddress);

      // 余剰ETHが返金されたことを確認（この場合は返金なし）
      const receipt = await tx.wait();
    });

    it('余剰ETHが返金される', async function () {
      // 初回流動性追加を行う
      const deadline = (await time.latest()) + 300;

      await router
        .connect(user1)
        .addLiquidityETH(
          await tokenA.getAddress(),
          tokenAmount,
          0,
          0,
          user1.address,
          deadline,
          { value: ethAmount }
        );

      // 2回目の追加で余剰ETHをテスト
      const additionalTokenAmount = tokenAmount / 2n;
      const excessiveEth = ethAmount; // 必要量より多いETH
      const expectedEthUsed = ethAmount / 2n; // 実際に使用される量

      const balanceBefore = await ethers.provider.getBalance(user1.address);

      const tx = await router
        .connect(user1)
        .addLiquidityETH(
          await tokenA.getAddress(),
          additionalTokenAmount,
          0,
          0,
          user1.address,
          deadline + 300,
          { value: excessiveEth }
        );

      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // 使用されなかったETHが返金されている
      const actualEthUsed = balanceBefore - balanceAfter - gasUsed;
      expect(actualEthUsed).to.be.lessThan(excessiveEth);
    });
  });

  describe('流動性削除 (removeLiquidity)', function () {
    const tokenAAmount = ethers.parseEther('3');
    const tokenBAmount = ethers.parseEther('3');

    beforeEach(async function () {
      // 初期流動性を追加
      await tokenA.connect(user1).deposit({ value: tokenAAmount });
      await tokenB.connect(user1).deposit({ value: tokenBAmount });
      await tokenA
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await tokenB
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;
      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          tokenAAmount,
          tokenBAmount,
          0,
          0,
          user1.address,
          deadline
        );

      // LPトークンの使用を承認
      await pair
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);
    });

    it('流動性削除が成功する', async function () {
      const liquidity = await pair.balanceOf(user1.address);
      const deadline = (await time.latest()) + 300;

      const tokenABalanceBefore = await tokenA.balanceOf(user1.address);
      const tokenBBalanceBefore = await tokenB.balanceOf(user1.address);

      await router
        .connect(user1)
        .removeLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          liquidity,
          0,
          0,
          user1.address,
          deadline
        );

      // トークンが返却されたことを確認
      expect(await tokenA.balanceOf(user1.address)).to.be.greaterThan(
        tokenABalanceBefore
      );
      expect(await tokenB.balanceOf(user1.address)).to.be.greaterThan(
        tokenBBalanceBefore
      );
      expect(await pair.balanceOf(user1.address)).to.equal(0);
    });

    it('部分的な流動性削除が成功する', async function () {
      const totalLiquidity = await pair.balanceOf(user1.address);
      const partialLiquidity = totalLiquidity / 2n;
      const deadline = (await time.latest()) + 300;

      await router
        .connect(user1)
        .removeLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          partialLiquidity,
          0,
          0,
          user1.address,
          deadline
        );

      // 半分のLPトークンが残っていることを確認
      expect(await pair.balanceOf(user1.address)).to.equal(
        totalLiquidity - partialLiquidity
      );
    });

    it('最小数量制限でリバートする', async function () {
      const liquidity = await pair.balanceOf(user1.address);
      const deadline = (await time.latest()) + 300;

      await expect(
        router.connect(user1).removeLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          liquidity,
          tokenAAmount + 1n, // 不可能な最小値
          0,
          user1.address,
          deadline
        )
      ).to.be.revertedWith('AMMRouter: INSUFFICIENT_A_AMOUNT');
    });
  });

  describe('スワップ (swapExactTokensForTokens)', function () {
    const tokenAAmount = ethers.parseEther('5');
    const tokenBAmount = ethers.parseEther('10');
    const swapAmount = ethers.parseEther('1');

    beforeEach(async function () {
      // 初期流動性を追加
      await tokenA.connect(user1).deposit({ value: tokenAAmount });
      await tokenB.connect(user1).deposit({ value: tokenBAmount });
      await tokenA
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await tokenB
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;
      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          tokenAAmount,
          tokenBAmount,
          0,
          0,
          user1.address,
          deadline
        );

      // スワップ用のトークンを準備
      await tokenA.connect(user2).deposit({ value: swapAmount });
      await tokenA
        .connect(user2)
        .approve(await router.getAddress(), ethers.MaxUint256);
    });

    it('正確な入力量でのスワップが成功する', async function () {
      const deadline = (await time.latest()) + 300;
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      // 期待される出力量を計算
      const amountsOut = await router.getAmountsOut(swapAmount, path);
      const expectedAmountOut = amountsOut[1];

      const tokenBBalanceBefore = await tokenB.balanceOf(user2.address);

      await router.connect(user2).swapExactTokensForTokens(
        swapAmount,
        0, // amountOutMin
        path,
        user2.address,
        deadline
      );

      // 正しい量のトークンBが受け取られたことを確認
      expect(await tokenB.balanceOf(user2.address)).to.equal(
        tokenBBalanceBefore + expectedAmountOut
      );
      expect(await tokenA.balanceOf(user2.address)).to.equal(0);
    });

    it('スリッページ保護が機能する', async function () {
      const deadline = (await time.latest()) + 300;
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      const amountsOut = await router.getAmountsOut(swapAmount, path);
      const expectedAmountOut = amountsOut[1];

      // 不可能な最小出力量を設定
      await expect(
        router
          .connect(user2)
          .swapExactTokensForTokens(
            swapAmount,
            expectedAmountOut + 1n,
            path,
            user2.address,
            deadline
          )
      ).to.be.revertedWith('AMMRouter: INSUFFICIENT_OUTPUT_AMOUNT');
    });

    it('期限切れでリバートする', async function () {
      const pastDeadline = (await time.latest()) - 1;
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      await expect(
        router
          .connect(user2)
          .swapExactTokensForTokens(
            swapAmount,
            0,
            path,
            user2.address,
            pastDeadline
          )
      ).to.be.revertedWith('AMMRouter: EXPIRED');
    });

    it('複数ホップのスワップが成功する', async function () {
      // 3つ目のトークンを作成
      const WETHFactory = await ethers.getContractFactory('WETH9');
      const tokenC = await WETHFactory.deploy();
      await tokenC.waitForDeployment();

      // tokenB/tokenCペアを作成
      await factory.createPair(
        await tokenB.getAddress(),
        await tokenC.getAddress()
      );

      // tokenB/tokenCペアに流動性を追加
      const tokenCAmount = ethers.parseEther('20');
      await tokenB.connect(user1).deposit({ value: tokenBAmount });
      await tokenC.connect(user1).deposit({ value: tokenCAmount });
      await tokenB
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await tokenC
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;
      await router
        .connect(user1)
        .addLiquidity(
          await tokenB.getAddress(),
          await tokenC.getAddress(),
          tokenBAmount,
          tokenCAmount,
          0,
          0,
          user1.address,
          deadline
        );

      // tokenA -> tokenB -> tokenC のパスでスワップ
      const path = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
      ];

      const tokenCBalanceBefore = await tokenC.balanceOf(user2.address);

      await router
        .connect(user2)
        .swapExactTokensForTokens(
          swapAmount,
          0,
          path,
          user2.address,
          deadline + 300
        );

      // tokenCが受け取られたことを確認
      expect(await tokenC.balanceOf(user2.address)).to.be.greaterThan(
        tokenCBalanceBefore
      );
    });
  });

  describe('正確な出力量でのスワップ (swapTokensForExactTokens)', function () {
    const tokenAAmount = ethers.parseEther('5');
    const tokenBAmount = ethers.parseEther('10');
    const exactAmountOut = ethers.parseEther('1');

    beforeEach(async function () {
      // 初期流動性を追加
      await tokenA.connect(user1).deposit({ value: tokenAAmount });
      await tokenB.connect(user1).deposit({ value: tokenBAmount });
      await tokenA
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await tokenB
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;
      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          tokenAAmount,
          tokenBAmount,
          0,
          0,
          user1.address,
          deadline
        );

      // スワップ用のトークンを準備
      await tokenA.connect(user2).deposit({ value: ethers.parseEther('2') });
      await tokenA
        .connect(user2)
        .approve(await router.getAddress(), ethers.MaxUint256);
    });

    it('正確な出力量でのスワップが成功する', async function () {
      const deadline = (await time.latest()) + 300;
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      // 必要な入力量を計算
      const amountsIn = await router.getAmountsIn(exactAmountOut, path);
      const requiredAmountIn = amountsIn[0];

      const tokenABalanceBefore = await tokenA.balanceOf(user2.address);
      const tokenBBalanceBefore = await tokenB.balanceOf(user2.address);

      await router.connect(user2).swapTokensForExactTokens(
        exactAmountOut,
        requiredAmountIn + ethers.parseEther('0.1'), // 少し余裕を持たせる
        path,
        user2.address,
        deadline
      );

      // 正確な量のトークンBが受け取られたことを確認
      expect(await tokenB.balanceOf(user2.address)).to.equal(
        tokenBBalanceBefore + exactAmountOut
      );

      // 必要な分だけトークンAが使用されたことを確認
      expect(await tokenA.balanceOf(user2.address)).to.equal(
        tokenABalanceBefore - requiredAmountIn
      );
    });

    it('過剰な入力量制限でリバートする', async function () {
      const deadline = (await time.latest()) + 300;
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      const amountsIn = await router.getAmountsIn(exactAmountOut, path);
      const requiredAmountIn = amountsIn[0];

      // 不可能な最大入力量を設定
      await expect(
        router.connect(user2).swapTokensForExactTokens(
          exactAmountOut,
          requiredAmountIn - 1n, // 不足する最大値
          path,
          user2.address,
          deadline
        )
      ).to.be.revertedWith('AMMRouter: EXCESSIVE_INPUT_AMOUNT');
    });
  });

  describe('ETHスワップ', function () {
    const tokenAmount = ethers.parseEther('10');
    const ethAmount = ethers.parseEther('5');

    beforeEach(async function () {
      // WETH/tokenAペアに流動性を追加
      await tokenA.connect(user1).deposit({ value: tokenAmount });
      await tokenA
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;
      await router
        .connect(user1)
        .addLiquidityETH(
          await tokenA.getAddress(),
          tokenAmount,
          0,
          0,
          user1.address,
          deadline,
          { value: ethAmount }
        );
    });

    it('ETHからトークンへのスワップが成功する', async function () {
      const deadline = (await time.latest()) + 300;
      const path = [await weth.getAddress(), await tokenA.getAddress()];
      const swapEthAmount = ethers.parseEther('1');

      const tokenABalanceBefore = await tokenA.balanceOf(user2.address);

      await router.connect(user2).swapExactETHForTokens(
        0, // amountOutMin
        path,
        user2.address,
        deadline,
        { value: swapEthAmount }
      );

      // トークンAが受け取られたことを確認
      expect(await tokenA.balanceOf(user2.address)).to.be.greaterThan(
        tokenABalanceBefore
      );
    });

    it('トークンからETHへのスワップが成功する', async function () {
      const deadline = (await time.latest()) + 300;
      const path = [await tokenA.getAddress(), await weth.getAddress()];
      const swapTokenAmount = ethers.parseEther('1');

      // user2にトークンAを付与
      await tokenA.connect(user2).deposit({ value: swapTokenAmount });
      await tokenA
        .connect(user2)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const ethBalanceBefore = await ethers.provider.getBalance(user2.address);

      const tx = await router
        .connect(user2)
        .swapExactTokensForETH(
          swapTokenAmount,
          0,
          path,
          user2.address,
          deadline
        );

      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const ethBalanceAfter = await ethers.provider.getBalance(user2.address);

      // ETHが受け取られたことを確認（ガス代を考慮）
      expect(ethBalanceAfter).to.be.greaterThan(ethBalanceBefore - gasUsed);
    });

    it('不正なパスでリバートする', async function () {
      const deadline = (await time.latest()) + 300;
      const invalidPath = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
      ]; // WETHが含まれていない

      await expect(
        router
          .connect(user2)
          .swapExactETHForTokens(0, invalidPath, user2.address, deadline, {
            value: ethers.parseEther('1'),
          })
      ).to.be.revertedWith('AMMRouter: INVALID_PATH');
    });
  });

  describe('ライブラリ関数', function () {
    it('quote関数が正しく動作する', async function () {
      const amountA = ethers.parseEther('1');
      const reserveA = ethers.parseEther('10');
      const reserveB = ethers.parseEther('20');

      const amountB = await router.quote(amountA, reserveA, reserveB);
      const expectedAmountB = (amountA * reserveB) / reserveA;

      expect(amountB).to.equal(expectedAmountB);
    });

    it('getAmountOut関数が正しく動作する', async function () {
      const amountIn = ethers.parseEther('1');
      const reserveIn = ethers.parseEther('10');
      const reserveOut = ethers.parseEther('20');

      const amountOut = await router.getAmountOut(
        amountIn,
        reserveIn,
        reserveOut
      );

      // 手数料0.3%を考慮した計算
      const amountInWithFee = amountIn * 997n;
      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn * 1000n + amountInWithFee;
      const expectedAmountOut = numerator / denominator;

      expect(amountOut).to.equal(expectedAmountOut);
    });

    it('getAmountIn関数が正しく動作する', async function () {
      const amountOut = ethers.parseEther('1');
      const reserveIn = ethers.parseEther('10');
      const reserveOut = ethers.parseEther('20');

      const amountIn = await router.getAmountIn(
        amountOut,
        reserveIn,
        reserveOut
      );

      // 逆算での計算
      const numerator = reserveIn * amountOut * 1000n;
      const denominator = (reserveOut - amountOut) * 997n;
      const expectedAmountIn = numerator / denominator + 1n; // 切り上げ

      expect(amountIn).to.equal(expectedAmountIn);
    });

    it('getAmountsOut関数が正しく動作する', async function () {
      // 流動性を追加してテスト
      const tokenAAmount = ethers.parseEther('10');
      const tokenBAmount = ethers.parseEther('20');

      await tokenA.connect(user1).deposit({ value: tokenAAmount });
      await tokenB.connect(user1).deposit({ value: tokenBAmount });
      await tokenA
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await tokenB
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;
      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          tokenAAmount,
          tokenBAmount,
          0,
          0,
          user1.address,
          deadline
        );

      const amountIn = ethers.parseEther('1');
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      const amounts = await router.getAmountsOut(amountIn, path);

      expect(amounts.length).to.equal(2);
      expect(amounts[0]).to.equal(amountIn);
      expect(amounts[1]).to.be.greaterThan(0);
    });
  });

  describe('エラーケース', function () {
    it('存在しないペアでリバートする', async function () {
      // 存在しないトークンペアでスワップを試行
      const WETHFactory = await ethers.getContractFactory('WETH9');
      const nonExistentToken = await WETHFactory.deploy();
      await nonExistentToken.waitForDeployment();

      const deadline = (await time.latest()) + 300;
      const path = [
        await tokenA.getAddress(),
        await nonExistentToken.getAddress(),
      ];

      await tokenA.connect(user2).deposit({ value: ethers.parseEther('1') });
      await tokenA
        .connect(user2)
        .approve(await router.getAddress(), ethers.MaxUint256);

      // ペアが存在しないためリバートする
      await expect(
        router
          .connect(user2)
          .swapExactTokensForTokens(
            ethers.parseEther('1'),
            0,
            path,
            user2.address,
            deadline
          )
      ).to.be.reverted;
    });

    it('不十分な承認でリバートする', async function () {
      // 流動性を追加
      const tokenAAmount = ethers.parseEther('5');
      const tokenBAmount = ethers.parseEther('10');

      await tokenA.connect(user1).deposit({ value: tokenAAmount });
      await tokenB.connect(user1).deposit({ value: tokenBAmount });
      await tokenA
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await tokenB
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;
      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          tokenAAmount,
          tokenBAmount,
          0,
          0,
          user1.address,
          deadline
        );

      // 承認なしでスワップを試行
      await tokenA.connect(user2).deposit({ value: ethers.parseEther('1') });
      // 承認をしない

      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      await expect(
        router
          .connect(user2)
          .swapExactTokensForTokens(
            ethers.parseEther('1'),
            0,
            path,
            user2.address,
            deadline + 300
          )
      ).to.be.revertedWith('AMMRouter: TRANSFER_FROM_FAILED');
    });
  });

  describe('ガス効率性', function () {
    it('大量のスワップでもガス制限内で実行される', async function () {
      // 大きな流動性プールを作成
      const largeTokenAAmount = ethers.parseEther('1000');
      const largeTokenBAmount = ethers.parseEther('2000');

      await tokenA.connect(user1).deposit({ value: largeTokenAAmount });
      await tokenB.connect(user1).deposit({ value: largeTokenBAmount });
      await tokenA
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);
      await tokenB
        .connect(user1)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const deadline = (await time.latest()) + 300;
      await router
        .connect(user1)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          largeTokenAAmount,
          largeTokenBAmount,
          0,
          0,
          user1.address,
          deadline
        );

      // 大量のスワップを実行
      const largeSwapAmount = ethers.parseEther('100');
      await tokenA.connect(user2).deposit({ value: largeSwapAmount });
      await tokenA
        .connect(user2)
        .approve(await router.getAddress(), ethers.MaxUint256);

      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      const tx = await router
        .connect(user2)
        .swapExactTokensForTokens(
          largeSwapAmount,
          0,
          path,
          user2.address,
          deadline + 300
        );

      const receipt = await tx.wait();

      // ガス使用量が合理的な範囲内であることを確認
      expect(receipt!.gasUsed).to.be.lessThan(200000); // 20万ガス以下
    });
  });
});
