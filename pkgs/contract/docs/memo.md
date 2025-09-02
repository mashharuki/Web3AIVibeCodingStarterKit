# デプロイした記録

```bash
##################################### [FULL AMM DEPLOYMENT START] #####################################
🚀 Starting full AMM deployment...
Deployer account: 0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072
Network: sepolia
Account balance: 246077022920983071048

📋 Resetting deployment configuration...

📦 Step 1: Deploying AMMFactory...
##################################### [AMM Factory Deploy START] #####################################
Deploying contracts with the account: 0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072
Account balance: 246077022920983071048
Network: sepolia
AMMFactory deployed to: 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73
Fee to setter: 0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072
✅ AMMFactory deployment completed successfully!
📄 Contract address saved to outputs/contracts-sepolia.json
📊 Contract Information:
  - Fee to setter: 0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072
  - Initial pairs count: 0
##################################### [AMM Factory Deploy END] #####################################

📦 Step 2: Deploying AMMRouter...
##################################### [AMM Router Deploy START] #####################################
Deploying contracts with the account: 0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072
Account balance: 246076571853080461468
Network: sepolia
Using AMMFactory address: 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73
Using WETH address: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
AMMRouter deployed to: 0x29C854E385bdf0d9Df1e6C71B7E82580adaE41C0
Factory address: 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73
WETH address: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
✅ AMMRouter deployment completed successfully!
📄 Contract address saved to outputs/contracts-sepolia.json
📊 Contract Information:
  - Factory address: 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73
  - WETH address: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
  - Factory matches: true

🚀 Next Steps:
1. Create token pairs using Factory contract
2. Add initial liquidity to pairs
3. Test swap functionality

Use Hardhat tasks to interact with the deployed contracts:
npx hardhat createPair --factory 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73 --tokena <TOKEN_A> --tokenb <TOKEN_B> --network sepolia
##################################### [AMM Router Deploy END] #####################################

🔍 Verifying deployment...
✅ Deployment verification completed!

📊 Deployment Summary:
==========================================
Network: sepolia
Deployer: 0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072

📋 Deployed Contracts:
  🏭 AMMFactory: 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73
  🔀 AMMRouter:  0x29C854E385bdf0d9Df1e6C71B7E82580adaE41C0

🔧 Contract Configuration:
  Factory Fee To Setter: 0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072
  Factory Pairs Count: 0
  Router Factory: 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73
  Router WETH: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
  Factory Address Match: true

🪙 Target Tokens (Sepolia Network):
  USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
  JPYC: 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB
  PYUSD: 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9

🚀 Next Steps:
1. Create token pairs for the target tokens:
   npx hardhat createPair --factory 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73 --tokena 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 --tokenb 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB --network sepolia
   npx hardhat createPair --factory 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73 --tokena 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 --tokenb 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9 --network sepolia
   npx hardhat createPair --factory 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73 --tokena 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB --tokenb 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9 --network sepolia

2. Add initial liquidity to the pairs
3. Test swap functionality

📄 All contract addresses saved to: outputs/contracts-sepolia.json
##################################### [FULL AMM DEPLOYMENT END] #####################################
```

```bash
🚀 指定されたトークンペアを一括作成中...
📡 ネットワーク: sepolia
🏭 Factory アドレス: 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73

📝 USDC/JPYC ペアを処理中...
⚠️  USDC/JPYC ペアは既に存在します: 0x9f055248E74850Ffad7A448cF79cEcb74bA76881

📝 USDC/PYUSD ペアを処理中...
⏳ USDC/PYUSD ペアを作成中...
📝 トランザクションハッシュ: 0xceb66bbaa11406572c65b71f6d0d5e1d5aa531f314937995f378c8c796e9bb1d
✅ USDC/PYUSD ペア作成成功! アドレス: 0xe9EaE488565dCCB22C6147160B0efe1a6b3Cca17

📝 JPYC/PYUSD ペアを処理中...
⏳ JPYC/PYUSD ペアを作成中...
📝 トランザクションハッシュ: 0xbd76dc2ad67138d6600a99aa64f7ed19b88d511186b34a596d037bf4036278ec
✅ JPYC/PYUSD ペア作成成功! アドレス: 0x9d150802af41a9521e7A146b537BbE44251FF581

📊 作成完了! 総ペア数: 3
```

ペア情報の取得結果

```bash
🔍 全ペア情報を取得中...
📡 ネットワーク: sepolia
🏭 Factory アドレス: 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73
📊 総ペア数: 3

📋 ペア一覧:
================================================================================

1. ペアアドレス: 0x9f055248E74850Ffad7A448cF79cEcb74bA76881
   Token0: USDC (0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238)
   Token1: JPYC (0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB)
   Reserve0: 0
   Reserve1: 0
   LP Token総供給量: 0
   価格: 流動性が提供されていません
   Etherscan: https://sepolia.etherscan.io/address/0x9f055248E74850Ffad7A448cF79cEcb74bA76881

2. ペアアドレス: 0xe9EaE488565dCCB22C6147160B0efe1a6b3Cca17
   Token0: USDC (0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238)
   Token1: PYUSD (0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9)
   Reserve0: 0
   Reserve1: 0
   LP Token総供給量: 0
   価格: 流動性が提供されていません
   Etherscan: https://sepolia.etherscan.io/address/0xe9EaE488565dCCB22C6147160B0efe1a6b3Cca17

3. ペアアドレス: 0x9d150802af41a9521e7A146b537BbE44251FF581
   Token0: JPYC (0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB)
   Token1: PYUSD (0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9)
   Reserve0: 0
   Reserve1: 0
   LP Token総供給量: 0
   価格: 流動性が提供されていません
   Etherscan: https://sepolia.etherscan.io/address/0x9d150802af41a9521e7A146b537BbE44251FF581

================================================================================
✅ 全ペア情報の取得完了
```

流動性追加

```bash
🚀 Router経由で USDC/JPYC ペアに流動性を追加中...
📡 ネットワーク: sepolia
📍 USDC アドレス: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
📍 JPYC アドレス: 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB
💰 希望追加量 USDC: 1000000
💰 希望追加量 JPYC: 150000000
🔒 最小許容量 USDC: 950000
🔒 最小許容量 JPYC: 142500000
🛣️  Router アドレス: 0x29C854E385bdf0d9Df1e6C71B7E82580adaE41C0

💳 現在の残高:
   USDC: 824158012
   JPYC: 10000000000000000000000

🔐 現在の承認状況:
   USDC: 0
   JPYC: 0
⏳ USDCの承認を実行中...
📝 USDC承認トランザクション: 0xd974f42d1e0c03a6fa4e694f4aa3258f1d6305472b4e79912ac7dacff263c358
✅ USDCの承認完了
⏳ JPYCの承認を実行中...
📝 JPYC承認トランザクション: 0xb59bf03a66f840a10f8e41f6a47343eb12ae918448965aab83e3a956178168dc
✅ JPYCの承認完了

⏳ Router経由で流動性追加を実行中...
📝 流動性追加トランザクション: 0x4b0a2155fe998787b66a504d3dc714bad00a34734d1810e5ea59e1b622f2c563
✅ Router経由での流動性追加成功!
⛽ ガス使用量: 245103
🔗 Etherscan: https://sepolia.etherscan.io/tx/0x4b0a2155fe998787b66a504d3dc714bad00a34734d1810e5ea59e1b622f2c563

📊 追加後の残高:
   USDC: 823158012
   JPYC: 9999999999999850000000

💸 実際に使用された量:
   USDC: 1000000
   JPYC: 150000000

🎯 LPトークン情報:
   ペアアドレス: 0x9f055248E74850Ffad7A448cF79cEcb74bA76881
   取得したLPトークン: 12246448
   LPトークン総供給量: 12247448
   プールシェア: 99.9918%
```

流動性除去

```bash
💧 USDC/JPYC ペアから流動性を除去中...
📡 ネットワーク: sepolia
📍 USDC アドレス: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
📍 JPYC アドレス: 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB
🏭 Factory アドレス: 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73
🎯 ペアアドレス: 0x9f055248E74850Ffad7A448cF79cEcb74bA76881

💳 現在のLPトークン残高: 12246448
📊 LPトークン総供給量: 12247448
💰 除去する流動性: 1000000

📊 現在のリザーブ:
   Token0 (USDC): 1000000
   Token1 (JPYC): 150000000

💰 受け取り予定のトークン量:
   USDC: 81649
   JPYC: 12247449

⏳ LPトークンをペアコントラクトに送信中...
📝 LPトークン送信トランザクション: 0x589ef0edd19edbbedae7fa2f80f7afbaaec361e43bc55b1e070d99da9633081c
✅ LPトークン送信完了
⏳ 流動性除去を実行中...
📝 流動性除去トランザクション: 0xd8fd625d7faedfa3b09a38f35f21c787eb788a7aa5ed31f1ad6197f6e1959110
✅ 流動性除去成功!
⛽ ガス使用量: 152515
🔗 Etherscan: https://sepolia.etherscan.io/tx/0xd8fd625d7faedfa3b09a38f35f21c787eb788a7aa5ed31f1ad6197f6e1959110

📊 除去後の状況:
   新しいReserve0: 918351
   新しいReserve1: 137752551
   残りのLPトークン: 11246448
   LPトークン総供給量: 11247448
   残りのプールシェア: 99.9911%

💳 最終的なトークン残高:
   USDC: 821239661
   JPYC: 9999999999999862247449
```

Pairコントラクトの直呼びしてトークンをSwap

```bash
🔄 USDC → JPYC スワップを実行中...
📡 ネットワーク: sepolia
📍 入力トークン USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
📍 出力トークン JPYC: 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB
💰 入力量: 1000000
📊 スリッページ許容度: 0.5%
🏭 Factory アドレス: 0x57811ce07C616db1373b77ed97A2BDCEA336Fb73
🎯 ペアアドレス: 0x9f055248E74850Ffad7A448cF79cEcb74bA76881

📊 現在のリザーブ:
   Token0 (USDC): 918351
   Token1 (JPYC): 137752551
💰 予想出力量: 71704503
💰 最小出力量（スリッページ考慮）: 71345980
📈 価格インパクト: 108.8908%
⚠️  警告: 価格インパクトが大きいです (108.8908%)

💳 現在の残高:
   USDC: 821239661
   JPYC: 9999999999999862247449
🔐 現在の承認状況: 0
⏳ USDCの承認を実行中...
📝 承認トランザクション: 0xda75b73dcf395a111f1c8de688bd5cd08b107a8090fb9bf7e7c579f04f55f3c3
✅ 承認完了

⏳ USDCをペアコントラクトに送信中...
📝 送信トランザクション: 0x47e5198ed8988150d2b600b7468d2acf6582d105d5afb8846e265d3ed1615fbb
✅ トークン送信完了
⏳ スワップを実行中...
📝 スワップトランザクション: 0x829f795515012846395207d3be6915adc2c1a3e7eb3e97cb0182cf92d38d5582
✅ スワップ成功!
⛽ ガス使用量: 94274
🔗 Etherscan: https://sepolia.etherscan.io/tx/0x829f795515012846395207d3be6915adc2c1a3e7eb3e97cb0182cf92d38d5582

📊 スワップ結果:
   実際の出力量: 71704503
   予想出力量: 71704503
   実際のスリッページ: 0.0000%
   実効価格: 1 JPYC = 0.013946 USDC

📊 スワップ後のリザーブ:
   Token0 (USDC): 1918351
   Token1 (JPYC): 66048048

💳 最終的な残高:
   USDC: 820239661
   JPYC: 9999999999999933951952
```

見積もり

```bash
💭 USDC → JPYC スワップの見積もりを取得中...
📡 ネットワーク: sepolia
📍 入力トークン USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
📍 出力トークン JPYC: 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB
💰 入力量: 100000
🎯 ペアアドレス: 0x9f055248E74850Ffad7A448cF79cEcb74bA76881

📊 現在のリザーブ:
   Token0 (USDC): 1918351
   Token1 (JPYC): 66048048

💰 見積もり結果:
   予想出力量: 3263044
   価格インパクト: 5.2128%
   実効価格: 1 JPYC = 0.030646 USDC
   現在のプール価格: 1 JPYC = 0.029045 USDC
   取引手数料: 300 USDC

📊 スリッページ別最小出力量:
   0.1%: 3259780
   0.5%: 3246728
   1%: 3230413
   2%: 3197783
   5%: 3099891

⚠️  警告: 価格インパクトが大きいです (5.2128%)
   大きな取引を行う場合は、複数回に分けることを検討してください。
```

RouterコントラクトからトークンSwap実行

```bash
🔄 Router経由で USDC → JPYC 正確な出力量スワップを実行中...
📡 ネットワーク: sepolia
📍 USDC アドレス: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
📍 JPYC アドレス: 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB
🎯 希望出力量 JPYC: 15000
🔒 最大入力量 USDC: 10500
🛣️  Router アドレス: 0x29C854E385bdf0d9Df1e6C71B7E82580adaE41C0

📊 スワップ情報を計算中...
💡 必要な入力量: 438
📈 設定スリッページ: 95.83%

💳 スワップ前の残高:
   USDC: 820239661
   JPYC: 9999999999999933951952

🔐 現在の承認状況:
   USDC: 0
⏳ USDCの承認を実行中...
📝 USDC承認トランザクション: 0x17ffee90bfeed4951391f34f6484c57a63aab6358ba66d4a45ac3921d321a5b1
✅ USDCの承認完了

⏳ Router経由で正確な出力量スワップを実行中...
📝 スワップトランザクション: 0x880d02d361ea033e9b13dceac759b2812234cc4b72b021f4782b52fd3600e5d8
✅ Router経由での正確な出力量スワップ成功!
⛽ ガス使用量: 141287
🔗 Etherscan: https://sepolia.etherscan.io/tx/0x880d02d361ea033e9b13dceac759b2812234cc4b72b021f4782b52fd3600e5d8

📊 スワップ後の残高:
   USDC: 820239223
   JPYC: 9999999999999933966952

💸 実際の交換量:
   消費したUSDC: 438
   取得したJPYC: 15000
   交換レート: 1 USDC = 34.246575 JPYC

📈 予想との比較:
   予想入力量: 438
   実際入力量: 438
   希望出力量: 15000
   実際出力量: 15000
```