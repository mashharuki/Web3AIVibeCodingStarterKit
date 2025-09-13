# Requirements Document

## Introduction

PizzaDAO × Ethreactor Mini Hackathon @ ETHTokyo '25に提出するピザルーレットゲームアプリです。ユーザーは回転するピザボードをタップしてピザを完成させ、スコアに応じてNFTをミントできるWeb3ミニゲームです。1画面完結型のシンプルなゲーム体験を提供し、Farcaster MiniAppとして動作します。

## Requirements

### Requirement 1

**User Story:** As a ゲームプレイヤー, I want ウォレットを接続してゲームにアクセスしたい, so that 自分のアカウントでNFTをミントできる

#### Acceptance Criteria

1. WHEN ユーザーがFarcasterのミニアプリにアクセス THEN システム SHALL OnChainKitのウォレット接続UIを表示する
2. WHEN ユーザーがウォレット接続ボタンをクリック THEN システム SHALL Base Sepoliaネットワークへの接続を要求する
3. WHEN ウォレット接続が成功 THEN システム SHALL 接続されたウォレットアドレスをヘッダーに表示する
4. IF ウォレットが未接続 THEN システム SHALL ゲーム機能へのアクセスを制限する

### Requirement 2

**User Story:** As a ゲームプレイヤー, I want ピザルーレットゲームをプレイしたい, so that 楽しみながらピザを完成させることができる

#### Acceptance Criteria

1. WHEN ページが読み込まれる THEN システム SHALL 12切れのピザボード（ダーツの的形状）を表示する
2. WHEN ユーザーが「ゲームスタート」ボタンをクリック THEN システム SHALL ピザボードを回転させる
3. WHEN ユーザーがボードをタップ THEN システム SHALL タップした位置のピザ切れを6種類の味からランダムに選択して埋める
4. WHEN ピザ切れが埋められる THEN システム SHALL 視覚的なフィードバック（色の変化、アニメーション）を提供する
5. WHEN 全12切れが埋まる THEN システム SHALL ゲーム終了状態に移行する

### Requirement 3

**User Story:** As a ゲームプレイヤー, I want スコアシステムでピザの完成度を評価されたい, so that 戦略的にピザを作ることができる

#### Acceptance Criteria

1. WHEN ピザ切れが配置される THEN システム SHALL 基本ポイント10点を付与する
2. WHEN 隣接する2つのピザ切れが同じ味 THEN システム SHALL 隣接ボーナス20点を加算する
3. WHEN 3つ以上連続で同じ味が隣接 THEN システム SHALL 連続ボーナス（連続数 × 10点）を追加する
4. WHEN 全12切れが同じ味 THEN システム SHALL パーフェクトボーナス500点を付与する
5. WHEN ゲーム終了時 THEN システム SHALL 最終スコアを計算して表示する
6. WHEN 最終スコア >= 800点 THEN システム SHALL ダイアモンドランクを付与する
7. WHEN 最終スコア >= 600点 AND < 800点 THEN システム SHALL ゴールドランクを付与する
8. WHEN 最終スコア >= 400点 AND < 600点 THEN システム SHALL シルバーランクを付与する
9. WHEN 最終スコア < 400点 THEN システム SHALL ブロンズランクを付与する
10. WHEN ランクが決定される THEN システム SHALL ランクに応じたビジュアル表示（色、アイコン、エフェクト）を行う
11. WHEN 特定のピザパターンが完成 THEN システム SHALL 楽しい役職名とアニメーション演出を表示する

### Requirement 4

**User Story:** As a ゲームプレイヤー, I want 獲得したスコアに応じてNFTをミントしたい, so that ゲームの成果を永続的に保存できる

#### Acceptance Criteria

1. WHEN ゲームが終了してランクが決定される THEN システム SHALL 「NFTをミント」ボタンを表示する
2. WHEN ユーザーが「NFTをミント」ボタンをクリック THEN システム SHALL Base Sepolia上でNFTミント処理を実行する
3. WHEN NFTミント処理が開始される THEN システム SHALL ローディング状態を表示する
4. WHEN NFTミントが成功 THEN システム SHALL 成功メッセージとNFTの詳細を表示する
5. WHEN NFTミントが失敗 THEN システム SHALL エラーメッセージを表示してリトライオプションを提供する
6. WHEN NFTミントが完了 THEN システム SHALL 「もう一度プレイ」ボタンを表示する

### Requirement 5

**User Story:** As a ゲームプレイヤー, I want ゲームをリセットして再プレイしたい, so that 何度でもゲームを楽しむことができる

#### Acceptance Criteria

1. WHEN ユーザーが「もう一度プレイ」ボタンをクリック THEN システム SHALL ゲーム状態を初期化する
2. WHEN ゲーム状態が初期化される THEN システム SHALL 全てのピザ切れを空の状態に戻す
3. WHEN ゲーム状態が初期化される THEN システム SHALL スコアを0にリセットする
4. WHEN ゲーム状態が初期化される THEN システム SHALL 新しいゲームを開始可能な状態にする

### Requirement 6

**User Story:** As a Farcasterユーザー, I want MiniAppとしてゲームにアクセスしたい, so that Farcaster内でシームレスにゲームを楽しめる

#### Acceptance Criteria

1. WHEN アプリがFarcaster内で起動される THEN システム SHALL MiniAppKitを使用してFarcasterコンテキストを取得する
2. WHEN Farcasterユーザー情報が利用可能 THEN システム SHALL ユーザー名を表示に含める
3. WHEN ゲームが完了 THEN システム SHALL Farcasterでの共有オプションを提供する
4. IF Farcaster外でアクセスされる THEN システム SHALL 通常のWeb3アプリとして動作する

### Requirement 7

**User Story:** As a ユーザー, I want レスポンシブなUIでゲームをプレイしたい, so that モバイルデバイスでも快適にゲームができる

#### Acceptance Criteria

1. WHEN アプリがモバイルデバイスで表示される THEN システム SHALL タッチ操作に最適化されたUIを提供する
2. WHEN アプリが異なる画面サイズで表示される THEN システム SHALL レスポンシブデザインで適切にレイアウトを調整する
3. WHEN ピザボードが表示される THEN システム SHALL 画面サイズに応じて適切なサイズで表示する
4. WHEN タップ操作が行われる THEN システム SHALL 正確なタップ位置を検出してピザ切れを特定する

### Requirement 8

**User Story:** As a ゲームプレイヤー, I want 楽しい演出とユーモアな役職名を見たい, so that ゲームをより楽しく体験できる

#### Acceptance Criteria

1. WHEN 全12切れが同じ味 THEN システム SHALL 「ロイヤルストレートピザフラッシュ！」の演出を表示する
2. WHEN 6切れ以上が同じ味で連続 THEN システム SHALL 「ピザマスター」の称号を表示する
3. WHEN 4つの異なる味が均等に配置 THEN システム SHALL 「バランス職人」の称号を表示する
4. WHEN 隣接ボーナスが5回以上発生 THEN システム SHALL 「コンボキング」の称号を表示する
5. WHEN 特別な役職が発生 THEN システム SHALL アニメーション、効果音、パーティクルエフェクトを表示する
6. WHEN 役職演出が表示される THEN システム SHALL ユーモラスで楽しいメッセージを含める
7. WHEN 演出が完了 THEN システム SHALL SNS共有用のスクリーンショット機能を提供する