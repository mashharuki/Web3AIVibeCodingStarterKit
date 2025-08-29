import * as ethers from "ethers";
import { network } from 'hardhat';
import { writeContractAddress } from './../../helpers/contractsJsonHelper';

/**
 * 必要なコントラクトを一式デプロイするスクリプト
 * @returns
 */
async function main() {
  console.log('AMM DEX コントラクトのデプロイを開始します...');

  // デプロイアカウントを取得
  const [deployer] = await ethers.getSigners();

  console.log('デプロイアカウント:', deployer.address);
  console.log(
    'アカウント残高:',
    ethers.formatEther(await ethers.provider.getBalance(deployer.address))
  );

  // 1. AMMFactory をデプロイ
  console.log('\n1. AMMFactory をデプロイ中...');
  const AMMFactory = await ethers.getContractFactory('AMMFactory');
  // feeToSetterとしてdeployerを設定
  const factory = await AMMFactory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log('AMMFactory デプロイ完了:', factoryAddress);

  // 2. WETH モックをデプロイ（テスト用）
  console.log('\n2. WETH モック をデプロイ中...');
  // 実際のプロダクションではSepoliaの既存WETHアドレスを使用
  const WETH = await ethers.getContractFactory('WETH9');
  let weth;

  try {
    weth = await WETH.deploy();
    await weth.waitForDeployment();
    const wethAddress = await weth.getAddress();
    console.log('WETH モック デプロイ完了:', wethAddress);
  } catch (error) {
    console.log(
      'WETH モックのデプロイに失敗しました。既存のWETHアドレスを使用してください。'
    );
    // Sepolia WETH アドレス（実際の値に置き換える）
    const wethAddress = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
    console.log('既存 WETH アドレスを使用:', wethAddress);

    // 3. AMMRouter をデプロイ
    console.log('\n3. AMMRouter をデプロイ中...');
    const AMMRouter = await ethers.getContractFactory('AMMRouter');
    const router = await AMMRouter.deploy(factoryAddress, wethAddress);
    await router.waitForDeployment();
    const routerAddress = await router.getAddress();
    console.log('AMMRouter デプロイ完了:', routerAddress);

    // デプロイ結果をまとめて表示
    console.log('\n=== デプロイ完了 ===');
    console.log('AMMFactory:', factoryAddress);
    console.log('WETH:', wethAddress);
    console.log('AMMRouter:', routerAddress);

    // 設定ファイルに保存するための情報
    const deploymentInfo = {
      network: 'sepolia',
      contracts: {
        AMMFactory: factoryAddress,
        AMMRouter: routerAddress,
        WETH: wethAddress,
      },
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
    };

    console.log('\n=== 設定情報 ===');
    console.log(JSON.stringify(deploymentInfo, null, 2));
    return;
  }

  const wethAddress = await weth.getAddress();

  // 3. AMMRouter をデプロイ
  console.log('\n3. AMMRouter をデプロイ中...');
  const AMMRouter = await ethers.getContractFactory('AMMRouter');
  const router = await AMMRouter.deploy(factoryAddress, wethAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log('AMMRouter デプロイ完了:', routerAddress);

  // デプロイ結果をまとめて表示
  console.log('\n=== デプロイ完了 ===');
  console.log('AMMFactory:', factoryAddress);
  console.log('WETH:', wethAddress);
  console.log('AMMRouter:', routerAddress);

  // デプロイしたアドレスをjsonファイルに保存する
  writeContractAddress({
    group: 'contracts',
    name: 'AMMFactory',
    value: factoryAddress,
    network: network.name,
  });
  writeContractAddress({
    group: 'contracts',
    name: 'WETH9',
    value: wethAddress,
    network: network.name,
  });
  writeContractAddress({
    group: 'contracts',
    name: 'AMMRouter',
    value: routerAddress,
    network: network.name,
  });
}

export default main()