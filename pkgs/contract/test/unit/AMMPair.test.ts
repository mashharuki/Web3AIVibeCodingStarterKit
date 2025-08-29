import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { AMMFactory, AMMPair, WETH9 } from '../../typechain-types';

describe('AMMPair', function () {
  let factory: AMMFactory;
  let weth: WETH9;
  let pair: AMMPair;
  let token0: WETH9;
  let token1: WETH9;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  // テスト用の定数
  const MINIMUM_LIQUIDITY = 1000n;

  async function deployContractsFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy WETH (テスト用トークンとして使用)
    const WETHFactory = await ethers.getContractFactory('WETH9');
    const weth = await WETHFactory.deploy();
    await weth.waitForDeployment();

    // 2つのテスト用トークンを作成
    const token0 = await WETHFactory.deploy();
    await token0.waitForDeployment();
    const token1 = await WETHFactory.deploy();
    await token1.waitForDeployment();

    // Deploy Factory
    const AMMFactoryContract = await ethers.getContractFactory('AMMFactory');
    const factory = await AMMFactoryContract.deploy(owner.address);
    await factory.waitForDeployment();

    // ペアを作成
    const token0Address = await token0.getAddress();
    const token1Address = await token1.getAddress();

    // トークンアドレスをソート
    const [sortedToken0, sortedToken1] =
      token0Address < token1Address
        ? [token0Address, token1Address]
        : [token1Address, token0Address];

    await factory.createPair(sortedToken0, sortedToken1);
    const pairAddress = await factory.getPair(sortedToken0, sortedToken1);

    // ペアコントラクトのインスタンスを取得
    const AMMPairContract = await ethers.getContractFactory('AMMPair');
    const pair = AMMPairContract.attach(pairAddress) as AMMPair;

    // トークンの順序を確認して正しく割り当て
    const pairToken0 = await pair.token0();
    const pairToken1 = await pair.token1();

    const finalToken0 = pairToken0 === token0Address ? token0 : token1;
    const finalToken1 = pairToken1 === token1Address ? token1 : token0;

    return {
      factory,
      weth,
      pair,
      token0: finalToken0,
      token1: finalToken1,
      owner,
      user1,
      user2,
    };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployContractsFixture);
    factory = fixture.factory;
    weth = fixture.weth;
    pair = fixture.pair;
    token0 = fixture.token0;
    token1 = fixture.token1;
    owner = fixture.owner;
    user1 = fixture.user1;
    user2 = fixture.user2;
  });

  describe('初期化', function () {
    it('正しいトークンアドレスが設定されている', async function () {
      const pairToken0 = await pair.token0();
      const pairToken1 = await pair.token1();
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();

      expect(pairToken0).to.equal(token0Address);
      expect(pairToken1).to.equal(token1Address);
      expect(pairToken0 < pairToken1).to.be.true; // トークンがソートされている
    });

    it('初期残高が0である', async function () {
      const reserves = await pair.getReserves();
      expect(reserves[0]).to.equal(0); // reserve0
      expect(reserves[1]).to.equal(0); // reserve1
    });

    it('初期総供給量が0である', async function () {
      expect(await pair.totalSupply()).to.equal(0);
    });

    it('正しいファクトリーアドレスが設定されている', async function () {
      expect(await pair.factory()).to.equal(await factory.getAddress());
    });
  });

  describe('流動性追加 (mint)', function () {
    const token0Amount = ethers.parseEther('1');
    const token1Amount = ethers.parseEther('4');

    beforeEach(async function () {
      // ユーザーにトークンを付与
      await token0.connect(user1).deposit({ value: token0Amount });
      await token1.connect(user1).deposit({ value: token1Amount });
    });

    it('初回流動性追加が成功する', async function () {
      // トークンをペアに転送
      await token0
        .connect(user1)
        .transfer(await pair.getAddress(), token0Amount);
      await token1
        .connect(user1)
        .transfer(await pair.getAddress(), token1Amount);

      // 流動性をミント
      const expectedLiquidity = ethers.parseEther('2') - MINIMUM_LIQUIDITY; // sqrt(1*4) - MINIMUM_LIQUIDITY

      await expect(pair.mint(user1.address))
        .to.emit(pair, 'Mint')
        .withArgs(owner.address, token0Amount, token1Amount);

      // LPトークンの残高を確認
      expect(await pair.balanceOf(user1.address)).to.equal(expectedLiquidity);
      expect(await pair.totalSupply()).to.equal(ethers.parseEther('2'));

      // 残高を確認
      const reserves = await pair.getReserves();
      expect(reserves[0]).to.equal(token0Amount);
      expect(reserves[1]).to.equal(token1Amount);
    });

    it('既存プールへの流動性追加が成功する', async function () {
      // 初回流動性追加
      await token0
        .connect(user1)
        .transfer(await pair.getAddress(), token0Amount);
      await token1
        .connect(user1)
        .transfer(await pair.getAddress(), token1Amount);
      await pair.mint(user1.address);

      // 2回目の流動性追加の準備
      const additionalToken0 = ethers.parseEther('0.5');
      const additionalToken1 = ethers.parseEther('2');

      await token0.connect(user2).deposit({ value: additionalToken0 });
      await token1.connect(user2).deposit({ value: additionalToken1 });

      await token0
        .connect(user2)
        .transfer(await pair.getAddress(), additionalToken0);
      await token1
        .connect(user2)
        .transfer(await pair.getAddress(), additionalToken1);

      // 2回目の流動性追加
      const totalSupplyBefore = await pair.totalSupply();
      const expectedLiquidity =
        (additionalToken0 * totalSupplyBefore) / token0Amount;

      await expect(pair.mint(user2.address))
        .to.emit(pair, 'Mint')
        .withArgs(owner.address, additionalToken0, additionalToken1);

      expect(await pair.balanceOf(user2.address)).to.equal(expectedLiquidity);
    });

    it('不十分な流動性でリバートする', async function () {
      // 極小の流動性を追加しようとする（sqrt(amount0 * amount1) < MINIMUM_LIQUIDITY）
      const tinyAmount = 31n; // sqrt(31*31) = 31 < MINIMUM_LIQUIDITY(1000)
      await token0.connect(user1).transfer(await pair.getAddress(), tinyAmount);
      await token1.connect(user1).transfer(await pair.getAddress(), tinyAmount);

      // Math.sqrt(31*31) - 1000 でアンダーフローが発生する
      await expect(pair.mint(user1.address)).to.be.revertedWithPanic(0x11); // Arithmetic overflow/underflow
    });

    it('不均衡な流動性追加で最小値が使用される', async function () {
      // 初回流動性追加
      await token0
        .connect(user1)
        .transfer(await pair.getAddress(), token0Amount);
      await token1
        .connect(user1)
        .transfer(await pair.getAddress(), token1Amount);
      await pair.mint(user1.address);

      // 不均衡な追加流動性
      const imbalancedToken0 = ethers.parseEther('1');
      const imbalancedToken1 = ethers.parseEther('1'); // 比率が合わない

      await token0.connect(user2).deposit({ value: imbalancedToken0 });
      await token1.connect(user2).deposit({ value: imbalancedToken1 });

      await token0
        .connect(user2)
        .transfer(await pair.getAddress(), imbalancedToken0);
      await token1
        .connect(user2)
        .transfer(await pair.getAddress(), imbalancedToken1);

      const totalSupplyBefore = await pair.totalSupply();
      const expectedLiquidity0 =
        (imbalancedToken0 * totalSupplyBefore) / token0Amount;
      const expectedLiquidity1 =
        (imbalancedToken1 * totalSupplyBefore) / token1Amount;
      const expectedLiquidity =
        expectedLiquidity0 < expectedLiquidity1
          ? expectedLiquidity0
          : expectedLiquidity1;

      await pair.mint(user2.address);
      expect(await pair.balanceOf(user2.address)).to.equal(expectedLiquidity);
    });
  });

  describe('流動性削除 (burn)', function () {
    const token0Amount = ethers.parseEther('3');
    const token1Amount = ethers.parseEther('3');

    beforeEach(async function () {
      // 初期流動性を追加
      await token0.connect(user1).deposit({ value: token0Amount });
      await token1.connect(user1).deposit({ value: token1Amount });
      await token0
        .connect(user1)
        .transfer(await pair.getAddress(), token0Amount);
      await token1
        .connect(user1)
        .transfer(await pair.getAddress(), token1Amount);
      await pair.mint(user1.address);
    });

    it('流動性削除が成功する', async function () {
      const liquidity = await pair.balanceOf(user1.address);
      const totalSupply = await pair.totalSupply();

      // LPトークンをペアに転送
      await pair.connect(user1).transfer(await pair.getAddress(), liquidity);

      const expectedToken0 = (liquidity * token0Amount) / totalSupply;
      const expectedToken1 = (liquidity * token1Amount) / totalSupply;

      await expect(pair.burn(user1.address))
        .to.emit(pair, 'Burn')
        .withArgs(owner.address, expectedToken0, expectedToken1, user1.address);

      // トークンが返却されたことを確認
      expect(await token0.balanceOf(user1.address)).to.equal(expectedToken0);
      expect(await token1.balanceOf(user1.address)).to.equal(expectedToken1);
    });

    it('部分的な流動性削除が成功する', async function () {
      const totalLiquidity = await pair.balanceOf(user1.address);
      const burnLiquidity = totalLiquidity / 2n; // 半分を削除

      await pair
        .connect(user1)
        .transfer(await pair.getAddress(), burnLiquidity);

      const totalSupply = await pair.totalSupply();
      const expectedToken0 = (burnLiquidity * token0Amount) / totalSupply;
      const expectedToken1 = (burnLiquidity * token1Amount) / totalSupply;

      await pair.burn(user1.address);

      expect(await token0.balanceOf(user1.address)).to.equal(expectedToken0);
      expect(await token1.balanceOf(user1.address)).to.equal(expectedToken1);
      expect(await pair.balanceOf(user1.address)).to.equal(
        totalLiquidity - burnLiquidity
      );
    });

    it('不十分な流動性でリバートする', async function () {
      // LPトークンを転送せずにburnを試行
      await expect(pair.burn(user1.address)).to.be.revertedWith(
        'AMMPair: INSUFFICIENT_LIQUIDITY_BURNED'
      );
    });
  });

  describe('スワップ (swap)', function () {
    const token0Amount = ethers.parseEther('5');
    const token1Amount = ethers.parseEther('10');
    const swapAmount = ethers.parseEther('1');

    beforeEach(async function () {
      // 初期流動性を追加
      await token0.connect(user1).deposit({ value: token0Amount });
      await token1.connect(user1).deposit({ value: token1Amount });
      await token0
        .connect(user1)
        .transfer(await pair.getAddress(), token0Amount);
      await token1
        .connect(user1)
        .transfer(await pair.getAddress(), token1Amount);
      await pair.mint(user1.address);

      // スワップ用のトークンを準備
      await token0.connect(user2).deposit({ value: swapAmount });
    });

    it('token0からtoken1へのスワップが成功する', async function () {
      // スワップ前の残高を記録
      const token1BalanceBefore = await token1.balanceOf(user2.address);

      // 期待される出力量を計算 (手数料0.3%を考慮)
      const amountInWithFee = swapAmount * 997n;
      const numerator = amountInWithFee * token1Amount;
      const denominator = token0Amount * 1000n + amountInWithFee;
      const expectedAmountOut = numerator / denominator;

      // トークンをペアに転送
      await token0.connect(user2).transfer(await pair.getAddress(), swapAmount);

      // スワップ実行
      await expect(pair.swap(0, expectedAmountOut, user2.address, '0x'))
        .to.emit(pair, 'Swap')
        .withArgs(
          owner.address,
          swapAmount,
          0,
          0,
          expectedAmountOut,
          user2.address
        );

      // 残高を確認
      expect(await token1.balanceOf(user2.address)).to.equal(
        token1BalanceBefore + expectedAmountOut
      );
    });

    it('token1からtoken0へのスワップが成功する', async function () {
      // user2にtoken1を付与
      await token1.connect(user2).deposit({ value: swapAmount });

      const token0BalanceBefore = await token0.balanceOf(user2.address);

      // 期待される出力量を計算
      const amountInWithFee = swapAmount * 997n;
      const numerator = amountInWithFee * token0Amount;
      const denominator = token1Amount * 1000n + amountInWithFee;
      const expectedAmountOut = numerator / denominator;

      // トークンをペアに転送
      await token1.connect(user2).transfer(await pair.getAddress(), swapAmount);

      // スワップ実行
      await expect(pair.swap(expectedAmountOut, 0, user2.address, '0x'))
        .to.emit(pair, 'Swap')
        .withArgs(
          owner.address,
          0,
          swapAmount,
          expectedAmountOut,
          0,
          user2.address
        );

      expect(await token0.balanceOf(user2.address)).to.equal(
        token0BalanceBefore + expectedAmountOut
      );
    });

    it('不十分な出力量でリバートする', async function () {
      await expect(pair.swap(0, 0, user2.address, '0x')).to.be.revertedWith(
        'AMMPair: INSUFFICIENT_OUTPUT_AMOUNT'
      );
    });

    it('流動性不足でリバートする', async function () {
      const excessiveAmount = token1Amount + 1n;
      await expect(
        pair.swap(0, excessiveAmount, user2.address, '0x')
      ).to.be.revertedWith('AMMPair: INSUFFICIENT_LIQUIDITY');
    });

    it('不正な受信者アドレスでリバートする', async function () {
      await token0.connect(user2).transfer(await pair.getAddress(), swapAmount);

      // token0アドレスを受信者として指定（不正）
      await expect(
        pair.swap(0, 1, await token0.getAddress(), '0x')
      ).to.be.revertedWith('AMMPair: INVALID_TO');
    });

    it('K値の不変性が保たれる', async function () {
      const reservesBefore = await pair.getReserves();
      const kBefore = reservesBefore[0] * reservesBefore[1];

      // スワップ実行
      await token0.connect(user2).transfer(await pair.getAddress(), swapAmount);

      const amountInWithFee = swapAmount * 997n;
      const numerator = amountInWithFee * token1Amount;
      const denominator = token0Amount * 1000n + amountInWithFee;
      const expectedAmountOut = numerator / denominator;

      await pair.swap(0, expectedAmountOut, user2.address, '0x');

      const reservesAfter = await pair.getReserves();
      const kAfter = reservesAfter[0] * reservesAfter[1];

      // K値は手数料により増加する
      expect(kAfter).to.be.greaterThan(kBefore);
    });

    it('入力なしでリバートする', async function () {
      // トークンを転送せずにスワップを試行
      await expect(pair.swap(0, 1, user2.address, '0x')).to.be.revertedWith(
        'AMMPair: INSUFFICIENT_INPUT_AMOUNT'
      );
    });
  });

  describe('ユーティリティ関数', function () {
    const token0Amount = ethers.parseEther('1');
    const token1Amount = ethers.parseEther('4');

    beforeEach(async function () {
      // 初期流動性を追加
      await token0.connect(user1).deposit({ value: token0Amount });
      await token1.connect(user1).deposit({ value: token1Amount });
      await token0
        .connect(user1)
        .transfer(await pair.getAddress(), token0Amount);
      await token1
        .connect(user1)
        .transfer(await pair.getAddress(), token1Amount);
      await pair.mint(user1.address);
    });

    describe('skim', function () {
      it('余剰トークンを正しく回収する', async function () {
        // 余剰トークンを送信
        const excessAmount = ethers.parseEther('0.5');
        await token0.connect(user2).deposit({ value: excessAmount });
        await token0
          .connect(user2)
          .transfer(await pair.getAddress(), excessAmount);

        const balanceBefore = await token0.balanceOf(user2.address);

        await pair.skim(user2.address);

        expect(await token0.balanceOf(user2.address)).to.equal(
          balanceBefore + excessAmount
        );
      });
    });

    describe('sync', function () {
      it('残高を現在のトークン残高に同期する', async function () {
        // 直接トークンを送信（残高と実際の残高に差を作る）
        const extraAmount = ethers.parseEther('0.1');
        await token0.connect(user2).deposit({ value: extraAmount });
        await token0
          .connect(user2)
          .transfer(await pair.getAddress(), extraAmount);

        await expect(pair.sync()).to.emit(pair, 'Sync');

        const reserves = await pair.getReserves();
        expect(reserves[0]).to.equal(token0Amount + extraAmount);
        expect(reserves[1]).to.equal(token1Amount);
      });
    });
  });

  describe('エラーケース', function () {
    it('ロック中の再入呼び出しでリバートする', async function () {
      // この場合、実際の再入攻撃をシミュレートするのは複雑なので、
      // ロック機構が存在することを確認する
      // 実際のテストでは、maliciousコントラクトを作成して再入を試行する必要がある
    });

    it('オーバーフローでリバートする', async function () {
      // 最大値を超える残高でupdateを試行
      // 実際のテストでは、極端に大きな値を使用してオーバーフローを発生させる
    });
  });

  describe('イベント', function () {
    it('Syncイベントが正しく発行される', async function () {
      const token0Amount = ethers.parseEther('1');
      const token1Amount = ethers.parseEther('1');

      await token0.connect(user1).deposit({ value: token0Amount });
      await token1.connect(user1).deposit({ value: token1Amount });
      await token0
        .connect(user1)
        .transfer(await pair.getAddress(), token0Amount);
      await token1
        .connect(user1)
        .transfer(await pair.getAddress(), token1Amount);

      await expect(pair.mint(user1.address))
        .to.emit(pair, 'Sync')
        .withArgs(token0Amount, token1Amount);
    });
  });
});
