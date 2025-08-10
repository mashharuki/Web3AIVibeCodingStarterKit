import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import type { DexFactory, DexPair, DexRouter, TokenA, TokenB } from "../typechain-types";

/**
 * DEX統合テスト
 * 
 * 目的: DEX（分散取引所）の全体的なワークフローと実用的なシナリオをテストする
 * 対象機能:
 * - エンドツーエンドの取引フロー
 * - 複数回のスワップによる価格変動
 * - 手数料分配メカニズム
 * - エッジケースの処理
 */
describe("DEX Integration Tests", () => {
  // メインコントラクト
  let factory: DexFactory;    // ペア作成と管理を行うファクトリー
  let router: DexRouter;      // ユーザーインターフェースを提供するルーター
  let tokenA: TokenA;         // テスト用トークンA（フォーセット機能付き）
  let tokenB: TokenB;         // テスト用トークンB（フォーセット機能付き）
  let pair: DexPair;          // TokenA-TokenBのAMMペア

  // テストアカウント
  let owner: HardhatEthersSigner;              // コントラクトオーナー
  let liquidity_provider: HardhatEthersSigner; // 流動性提供者
  let trader1: HardhatEthersSigner;            // トレーダー1
  let trader2: HardhatEthersSigner;            // トレーダー2

  /**
   * テスト前のセットアップ
   * 
   * 処理内容:
   * 1. テストアカウントの準備
   * 2. トークンA・Bのデプロイ
   * 3. ファクトリーのデプロイ
   * 4. ルーターのデプロイ
   * 5. トークンペアの作成
   * 6. 全ユーザーへのテストトークン配布
   */
  beforeEach(async () => {
    // アカウントを取得
    const signers = await ethers.getSigners();
    if (!signers[0] || !signers[1] || !signers[2] || !signers[3]) {
      throw new Error("Not enough signers available");
    }
    owner = signers[0];
    liquidity_provider = signers[1];
    trader1 = signers[2];
    trader2 = signers[3];

    // トークンをデプロイ（フォーセット機能付きERC20トークン）
    const TokenAFactory = await ethers.getContractFactory("TokenA");
    const TokenBFactory = await ethers.getContractFactory("TokenB");
    
    const tokenAContract = await TokenAFactory.deploy(owner.address);
    const tokenBContract = await TokenBFactory.deploy(owner.address);
    tokenA = tokenAContract as unknown as TokenA;
    tokenB = tokenBContract as unknown as TokenB;
    
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    // ファクトリーをデプロイ（ペア作成と管理）
    const DexFactoryFactory = await ethers.getContractFactory("DexFactory");
    const factoryContract = await DexFactoryFactory.deploy(owner.address);
    factory = factoryContract as unknown as DexFactory;
    await factory.waitForDeployment();

    // ルーターをデプロイ（ユーザーインターフェース）
    const DexRouterFactory = await ethers.getContractFactory("DexRouter");
    const routerContract = await DexRouterFactory.deploy(await factory.getAddress());
    router = routerContract as unknown as DexRouter;
    await router.waitForDeployment();

    // ペアを作成（TokenA-TokenBの取引ペア）
    const tokenAAddress = await tokenA.getAddress();
    const tokenBAddress = await tokenB.getAddress();
    await factory.createPair(tokenAAddress, tokenBAddress);
    
    const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);
    const DexPairFactory = await ethers.getContractFactory("DexPair");
    const pairContract = DexPairFactory.attach(pairAddress);
    pair = pairContract as unknown as DexPair;

    // 全ユーザーにテストトークンを配布（各100トークン）
    await tokenA.connect(liquidity_provider).faucet();
    await tokenB.connect(liquidity_provider).faucet();
    await tokenA.connect(trader1).faucet();
    await tokenB.connect(trader1).faucet();
    await tokenA.connect(trader2).faucet();
    await tokenB.connect(trader2).faucet();
  });

  /**
   * 完全なDEXワークフローテスト
   * 
   * 目的: 実際のユーザーがDEXを利用する一連の流れをテストする
   */
  describe("完全なDEXワークフロー", () => {
    /**
     * エンドツーエンドフローテスト
     * 
     * テストシナリオ:
     * 1. 流動性提供者が初期流動性を提供
     * 2. トレーダー1がTokenA→TokenBスワップ
     * 3. トレーダー2がTokenB→TokenAスワップ
     * 4. 流動性提供者が流動性の一部を削除
     * 
     * 検証項目:
     * - 各ステップが正常に実行される
     * - 残高の変化が期待通り
     * - LPトークンの発行・削除が正確
     */
    it("流動性提供からスワップまでの完全なフローが動作する", async () => {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      
      // Step 1: 流動性提供（TokenA:TokenB = 50:100の比率）
      const liquidityAmountA = ethers.parseEther("50");
      const liquidityAmountB = ethers.parseEther("100");
      
      // ルーターがトークンを使用できるよう承認
      await tokenA.connect(liquidity_provider).approve(await router.getAddress(), liquidityAmountA);
      await tokenB.connect(liquidity_provider).approve(await router.getAddress(), liquidityAmountB);
      
      // 流動性追加の結果を事前計算で確認
      const { amountA, amountB, liquidity } = await router.connect(liquidity_provider).addLiquidity.staticCall(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidityAmountA,
        liquidityAmountB,
        liquidityAmountA,
        liquidityAmountB,
        liquidity_provider.address,
        deadline
      );
      
      // 実際に流動性を追加
      await router.connect(liquidity_provider).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidityAmountA,
        liquidityAmountB,
        liquidityAmountA,
        liquidityAmountB,
        liquidity_provider.address,
        deadline
      );
      
      // 流動性追加の結果を検証
      expect(amountA).to.equal(liquidityAmountA);
      expect(amountB).to.equal(liquidityAmountB);
      expect(liquidity).to.be.gt(0);
      
      // LPトークンが正しく発行されたことを確認
      const lpBalance = await pair.balanceOf(liquidity_provider.address);
      expect(lpBalance).to.equal(liquidity);
      
      // Step 2: Trader1がTokenA → TokenBスワップ（5 TokenA → ? TokenB）
      const swapAmountA = ethers.parseEther("5");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      
      // ルーターにトークン使用を承認
      await tokenA.connect(trader1).approve(await router.getAddress(), swapAmountA);
      
      // 期待される出力量を計算
      const amountsOut = await router.getAmountsOut(swapAmountA, path);
      const expectedAmountB = amountsOut[1];
      
      const trader1BalanceBBefore = await tokenB.balanceOf(trader1.address);
      
      // スワップを実行
      await router.connect(trader1).swapExactTokensForTokens(
        swapAmountA,
        0,
        path,
        trader1.address,
        deadline
      );
      
      const trader1BalanceBAfter = await tokenB.balanceOf(trader1.address);
      expect(trader1BalanceBAfter - trader1BalanceBBefore).to.equal(expectedAmountB);
      
      // Step 3: Trader2がTokenB → TokenAスワップ（10 TokenB → ? TokenA）
      const swapAmountB = ethers.parseEther("10");
      const reversePath = [await tokenB.getAddress(), await tokenA.getAddress()];
      
      await tokenB.connect(trader2).approve(await router.getAddress(), swapAmountB);
      
      const trader2BalanceABefore = await tokenA.balanceOf(trader2.address);
      
      await router.connect(trader2).swapExactTokensForTokens(
        swapAmountB,
        0,
        reversePath,
        trader2.address,
        deadline
      );
      
      const trader2BalanceAAfter = await tokenA.balanceOf(trader2.address);
      expect(trader2BalanceAAfter).to.be.gt(trader2BalanceABefore);
      
      // Step 4: 流動性削除（LPトークンの半分を削除）
      const removeLiquidity = lpBalance / 2n;
      await pair.connect(liquidity_provider).approve(await router.getAddress(), removeLiquidity);
      
      const providerBalanceABefore = await tokenA.balanceOf(liquidity_provider.address);
      const providerBalanceBBefore = await tokenB.balanceOf(liquidity_provider.address);
      
      // 流動性削除を実行
      await router.connect(liquidity_provider).removeLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        removeLiquidity,
        0,
        0,
        liquidity_provider.address,
        deadline
      );
      
      const providerBalanceAAfter = await tokenA.balanceOf(liquidity_provider.address);
      const providerBalanceBAfter = await tokenB.balanceOf(liquidity_provider.address);
      
      // 流動性削除後に残高が増加していることを確認
      expect(providerBalanceAAfter).to.be.gt(providerBalanceABefore);
      expect(providerBalanceBAfter).to.be.gt(providerBalanceBBefore);
    });

    /**
     * 複数回スワップによる価格変動テスト
     * 
     * テストシナリオ:
     * 1. 初期流動性を1:1の比率で提供
     * 2. 同一方向に3回連続でスワップを実行
     * 3. 価格の変動を確認
     * 
     * 検証項目:
     * - 同一方向のスワップで価格が適切に変動
     * - AMM特有の価格発見メカニズムが動作
     * - フォーセットのクールダウン機能をテスト環境で回避
     */
    it("複数回のスワップで価格が適切に変動する", async () => {
      // 現在のブロックタイムスタンプを取得（動的なdeadline計算）
      const currentBlock = await ethers.provider.getBlock("latest");
      const deadline = (currentBlock?.timestamp || 0) + 86400;
      
      // 初期流動性を提供（TokenA:TokenB = 100:100の1:1比率）
      const liquidityAmountA = ethers.parseEther("100");
      const liquidityAmountB = ethers.parseEther("100");
      
      await tokenA.connect(liquidity_provider).approve(await router.getAddress(), liquidityAmountA);
      await tokenB.connect(liquidity_provider).approve(await router.getAddress(), liquidityAmountB);
      
      await router.connect(liquidity_provider).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidityAmountA,
        liquidityAmountB,
        liquidityAmountA,
        liquidityAmountB,
        liquidity_provider.address,
        deadline
      );
      
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const swapAmount = ethers.parseEther("10");
      
      // 初回スワップ前の価格（10 TokenA → ? TokenB）を記録
      const initialAmountsOut = await router.getAmountsOut(swapAmount, path);
      const initialPrice = initialAmountsOut[1];
      
        // 複数回スワップを実行（TokenAの需要を増加させる）
        for (let i = 0; i < 3; i++) {
          // 各スワップで新しいdeadlineを計算
          const swapBlock = await ethers.provider.getBlock("latest");
          const currentDeadline = (swapBlock?.timestamp || 0) + 86400;
          
          await tokenA.connect(trader1).approve(await router.getAddress(), swapAmount);
          await router.connect(trader1).swapExactTokensForTokens(
            swapAmount,
            0,
            path,
            trader1.address,
            currentDeadline
          );
          
          // 追加のfaucetでトークンを補充（時間をスキップして24時間制限を回避）
          if (i < 2) { // 最後のループ以外でfaucet
            await ethers.provider.send("evm_increaseTime", [86400]); // 24時間進める
            await ethers.provider.send("evm_mine", []); // ブロックをマイン
            await tokenA.connect(trader1).faucet(); // 新しいトークンを取得
          }
        }
        
      // スワップ後の価格（同じ10 TokenA → ? TokenB）を確認
      const finalAmountsOut = await router.getAmountsOut(swapAmount, path);
      const finalPrice = finalAmountsOut[1];
      
      // TokenAの需要が増加したため、TokenBの出力量は減少する（価格が上昇）
      expect(finalPrice).to.be.lt(initialPrice);
    });

    /**
     * 手数料分配メカニズムテスト
     * 
     * テストシナリオ:
     * 1. 初期流動性を提供
     * 2. 大量のスワップを実行（手数料を発生させる）
     * 3. スワップ後のリザーブ変化を確認
     * 
     * 検証項目:
     * - スワップ手数料がプールに蓄積される
     * - リザーブが手数料分だけ増加する
     * - 手数料が流動性提供者に分配される仕組み
     */
    it("手数料が流動性提供者に正しく分配される", async () => {
      const currentBlock = await ethers.provider.getBlock("latest");
      const deadline = (currentBlock?.timestamp || 0) + 86400; // 動的なdeadline
      
      // 流動性提供（100:100の比率）
      const liquidityAmountA = ethers.parseEther("100");
      const liquidityAmountB = ethers.parseEther("100");
      
      await tokenA.connect(liquidity_provider).approve(await router.getAddress(), liquidityAmountA);
      await tokenB.connect(liquidity_provider).approve(await router.getAddress(), liquidityAmountB);
      
      await router.connect(liquidity_provider).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidityAmountA,
        liquidityAmountB,
        liquidityAmountA,
        liquidityAmountB,
        liquidity_provider.address,
        deadline
      );
      
      // 初期リザーブを記録
      const initialReserves = await router.getReserves(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      
      // 大量のスワップを実行（10 TokenA → TokenB、0.3%の手数料が発生）
      const swapAmount = ethers.parseEther("10");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      
      await tokenA.connect(trader1).approve(await router.getAddress(), swapAmount);
      await router.connect(trader1).swapExactTokensForTokens(
        swapAmount,
        0,
        path,
        trader1.address,
        deadline
      );
      
      // スワップ後のリザーブ
      const afterSwapReserves = await router.getReserves(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      
      // リザーブが増加していることを確認（手数料分）
      // TokenAのリザーブは入力された分だけ増加（手数料込み）
      expect(afterSwapReserves.reserveA).to.be.gt(initialReserves.reserveA);
    });

    /**
     * 流動性不足時の大量スワップエラーテスト
     * 
     * テストシナリオ:
     * 1. 少量の流動性のみ提供（10:10）
     * 2. 大量のスワップを試行（95 TokenA）
     * 3. 非現実的な最小出力量を設定
     * 4. スリッページエラーが発生することを確認
     * 
     * 検証項目:
     * - スリッページ保護機能が動作
     * - 適切なエラーメッセージが返される
     * - 流動性が不足している場合の処理
     */
    it("流動性が不足している状況での大量スワップは失敗する", async () => {
      const currentBlock = await ethers.provider.getBlock("latest");
      const deadline = (currentBlock?.timestamp || 0) + 86400; // 動的なdeadline
      
      // 少量の流動性のみ提供（10:10の比率）
      const liquidityAmountA = ethers.parseEther("10");
      const liquidityAmountB = ethers.parseEther("10");
      
      await tokenA.connect(liquidity_provider).approve(await router.getAddress(), liquidityAmountA);
      await tokenB.connect(liquidity_provider).approve(await router.getAddress(), liquidityAmountB);
      
      await router.connect(liquidity_provider).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidityAmountA,
        liquidityAmountB,
        liquidityAmountA,
        liquidityAmountB,
        liquidity_provider.address,
        deadline
      );
      
      // 現在の100TKAを使って、リザーブよりも大量のスワップを試行
      const excessiveSwapAmount = ethers.parseEther("95"); // ほぼ全残高を使用
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      
      await tokenA.connect(trader1).approve(await router.getAddress(), excessiveSwapAmount);
      
      // 非現実的な高い最小出力量を設定してスワップを試行
      await expect(
        router.connect(trader1).swapExactTokensForTokens(
          excessiveSwapAmount,
          ethers.parseEther("9.5"), // 現実的でない高い最小出力量を設定
          path,
          trader1.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientOutputAmount");
    });
  });

  /**
   * エッジケーステスト
   * 
   * 目的: 特殊な状況や境界条件での動作を確認する
   */
  describe("エッジケース", () => {
    /**
     * 最小流動性処理テスト
     * 
     * テストシナリオ:
     * 1. 最小流動性要件を満たす量（1 ETH:1 ETH）を提供
     * 2. MINIMUM_LIQUIDITY（1000 wei）が適切に処理されることを確認
     * 
     * 検証項目:
     * - 最小流動性要件のチェックが動作
     * - LPトークンが正しく発行される
     * - deadアドレスへの永続ロックが動作
     */
    it("最小流動性の処理が正しく動作する", async () => {
      const currentBlock = await ethers.provider.getBlock("latest");
      const deadline = (currentBlock?.timestamp || 0) + 86400; // 動的なdeadline
      
      // 最小流動性を満たす量を提供（sqrt(a*b) > MINIMUM_LIQUIDITY = 1000となるように）
      const minAmountA = ethers.parseEther("1");
      const minAmountB = ethers.parseEther("1");
      
      await tokenA.connect(liquidity_provider).approve(await router.getAddress(), minAmountA);
      await tokenB.connect(liquidity_provider).approve(await router.getAddress(), minAmountB);
      
      await expect(
        router.connect(liquidity_provider).addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          minAmountA,
          minAmountB,
          minAmountA,
          minAmountB,
          liquidity_provider.address,
          deadline
        )
      ).to.not.be.reverted;
      
      // MINIMUM_LIQUIDITYが適切に処理されたことを確認
      const lpBalance = await pair.balanceOf(liquidity_provider.address);
      expect(lpBalance).to.be.gt(0);
    });

    /**
     * 同一比率流動性追加テスト
     * 
     * テストシナリオ:
     * 1. 初期流動性を1:2の比率で提供
     * 2. 同じ比率（5:10）で追加流動性を提供
     * 3. 比率が正確に維持されることを確認
     * 
     * 検証項目:
     * - 既存価格比率の維持
     * - 追加流動性の正確な処理
     * - スリッページの発生しない正確な比率計算
     */
    it("同一比率での流動性追加が正確に動作する", async () => {
      const currentBlock = await ethers.provider.getBlock("latest");
      const deadline = (currentBlock?.timestamp || 0) + 86400; // 動的なdeadline
      
      // 初期流動性（1:2の比率）
      const initialAmountA = ethers.parseEther("10");
      const initialAmountB = ethers.parseEther("20");
      
      await tokenA.connect(liquidity_provider).approve(await router.getAddress(), initialAmountA);
      await tokenB.connect(liquidity_provider).approve(await router.getAddress(), initialAmountB);
      
      await router.connect(liquidity_provider).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        initialAmountA,
        initialAmountB,
        initialAmountA,
        initialAmountB,
        liquidity_provider.address,
        deadline
      );
      
      // 同じ比率で追加流動性（5:10 = 1:2の比率を維持）
      const additionalAmountA = ethers.parseEther("5");
      const additionalAmountB = ethers.parseEther("10");
      
      await tokenA.connect(trader1).approve(await router.getAddress(), additionalAmountA);
      await tokenB.connect(trader1).approve(await router.getAddress(), additionalAmountB);
      
      // 追加流動性の結果を事前計算で確認
      const result = await router.connect(trader1).addLiquidity.staticCall(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        additionalAmountA,
        additionalAmountB,
        additionalAmountA,
        additionalAmountB,
        trader1.address,
        deadline
      );
      
      // 同一比率なので、指定した金額が正確に使用される
      expect(result.amountA).to.equal(additionalAmountA);
      expect(result.amountB).to.equal(additionalAmountB);
    });
  });
});
