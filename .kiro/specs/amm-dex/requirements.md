# Requirements Document

## Introduction

UniswapライクなAMM（Automated Market Maker）DEXを学習目的で開発します。このDEXは、Ethereum Sepoliaテストネットワーク上で動作し、3つの主要なERC20トークン（USDC、JPYC、PYUSD）間でのスワップと流動性提供機能を提供します。

UNCHAINの学習コンテンツレベルの完成度を目指し、Web3初学者が理解しやすい構造とコードベースを維持します。

### 対象トークン（Sepolia Network）
- USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
- JPYC: 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB  
- PYUSD: 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9

## Requirements

### Requirement 1: トークンスワップ機能

**User Story:** As a ユーザー, I want 異なるERC20トークン間でスワップを実行したい, so that 最適な価格でトークンを交換できる

#### Acceptance Criteria

1. WHEN ユーザーがスワップ画面でトークンペアを選択 THEN システム SHALL 現在の交換レートを表示する
2. WHEN ユーザーがスワップ金額を入力 THEN システム SHALL 受け取り予定金額とスリッページを計算して表示する
3. WHEN ユーザーがスワップを実行 THEN システム SHALL ウォレットに署名を要求し、トランザクションを送信する
4. WHEN スワップトランザクションが成功 THEN システム SHALL ユーザーの残高を更新し、成功メッセージを表示する
5. IF スリッページが設定値を超える THEN システム SHALL 警告を表示し、ユーザーの確認を求める

### Requirement 2: 流動性提供機能

**User Story:** As a 流動性プロバイダー, I want トークンペアに流動性を提供したい, so that 取引手数料を獲得できる

#### Acceptance Criteria

1. WHEN ユーザーが流動性提供画面でトークンペアを選択 THEN システム SHALL 現在のプール比率を表示する
2. WHEN ユーザーが一方のトークン量を入力 THEN システム SHALL もう一方のトークンの必要量を自動計算する
3. WHEN ユーザーが流動性を提供 THEN システム SHALL LPトークンを発行し、ユーザーのウォレットに送信する
4. WHEN 流動性提供が完了 THEN システム SHALL プール内のユーザーのシェアを表示する
5. IF プールが存在しない THEN システム SHALL 新しいプールの作成を提案する

### Requirement 3: 流動性除去機能

**User Story:** As a 流動性プロバイダー, I want 提供した流動性を除去したい, so that 元本と手数料収益を回収できる

#### Acceptance Criteria

1. WHEN ユーザーが流動性管理画面を開く THEN システム SHALL ユーザーの全LPポジションを表示する
2. WHEN ユーザーが除去する流動性の割合を選択 THEN システム SHALL 受け取り予定のトークン量を表示する
3. WHEN ユーザーが流動性除去を実行 THEN システム SHALL LPトークンをバーンし、対応するトークンを返還する
4. WHEN 流動性除去が完了 THEN システム SHALL 獲得した手数料を含む詳細を表示する

### Requirement 4: プール管理機能

**User Story:** As a ユーザー, I want 利用可能なプール情報を確認したい, so that 最適な取引ペアを選択できる

#### Acceptance Criteria

1. WHEN ユーザーがプール一覧画面を開く THEN システム SHALL 全ての利用可能なプールを表示する
2. WHEN プール情報を表示 THEN システム SHALL TVL、24時間取引量、APRを表示する
3. WHEN ユーザーがプールを選択 THEN システム SHALL 詳細な統計情報を表示する
4. IF プールが存在しない THEN システム SHALL プール作成オプションを提供する

### Requirement 5: ウォレット統合機能

**User Story:** As a ユーザー, I want ウォレットを接続してDEXを利用したい, so that 安全にトークンを管理できる

#### Acceptance Criteria

1. WHEN ユーザーがDEXにアクセス THEN システム SHALL ウォレット接続オプションを表示する
2. WHEN ユーザーがウォレットを接続 THEN システム SHALL Sepoliaネットワークへの接続を確認する
3. WHEN ウォレットが接続済み THEN システム SHALL ユーザーのトークン残高を表示する
4. IF 間違ったネットワークに接続 THEN システム SHALL Sepoliaネットワークへの切り替えを促す
5. WHEN ユーザーがウォレットを切断 THEN システム SHALL 全ての残高情報をクリアする

### Requirement 6: 価格計算・スリッページ保護機能

**User Story:** As a ユーザー, I want 正確な価格情報とスリッページ保護を受けたい, so that 予期しない損失を避けられる

#### Acceptance Criteria

1. WHEN トークンスワップを実行 THEN システム SHALL AMM式に基づいて正確な価格を計算する
2. WHEN 大きな取引を実行 THEN システム SHALL 価格インパクトを事前に表示する
3. WHEN スリッページ設定を変更 THEN システム SHALL 新しい設定で価格を再計算する
4. IF 実際のスリッページが設定値を超える THEN システム SHALL トランザクションを拒否する
5. WHEN 価格が大きく変動 THEN システム SHALL リアルタイムで価格を更新する

### Requirement 7: ユーザーインターフェース機能

**User Story:** As a ユーザー, I want 直感的で使いやすいインターフェースを利用したい, so that 簡単にDEXの機能を使用できる

#### Acceptance Criteria

1. WHEN ユーザーがDEXにアクセス THEN システム SHALL レスポンシブなデザインを提供する
2. WHEN 取引を実行 THEN システム SHALL 進行状況を視覚的に表示する
3. WHEN エラーが発生 THEN システム SHALL 分かりやすいエラーメッセージを表示する
4. WHEN トランザクションが処理中 THEN システム SHALL ローディング状態を表示する
5. IF ユーザーが初回利用 THEN システム SHALL 基本的な使い方ガイドを提供する