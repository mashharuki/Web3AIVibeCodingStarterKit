# Implementation Plan

- [x] 1. プロジェクト構造とコア設定のセットアップ

  - モノレポ構造の作成と pnpm ワークスペース設定
  - ルートレベルの設定ファイル（package.json, pnpm-workspace.yaml, biome.json）作成
  - .gitignore ファイルの設定
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. スマートコントラクトパッケージの基盤構築

  - pkgs/contract/ディレクトリ構造の作成
  - Hardhat は安定している V2 でテンプレプロジェクトを生成
  - Hardhat 設定ファイル（hardhat.config.ts）の実装
  - package.json と tsconfig.json の設定
  - コンパイルコマンドとテストコマンドが問題なく実行されることを確認する
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 3. コントラクトヘルパー関数の実装

  - helpers/contractsJsonHelper.ts ファイルの作成
  - デプロイメント管理機能の実装（writeContractAddress, loadDeployedContractAddresses 等）
  - outputs ディレクトリと JSON 管理機能の実装
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 4. Solhint 設定とコード品質ツールのセットアップ

  - .solhint.json と.solhintignore ファイルの作成
  - コード品質チェック設定の実装
  - _Requirements: 7.4_

- [x] 5. コントラクトインターフェースの定義

  - contracts/interfaces/IAMMFactory.sol の作成
  - contracts/interfaces/IAMMPair.sol の作成
  - contracts/interfaces/IAMMRouter.sol の作成
  - 型安全性とコード再利用性の向上
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 6. AMM Factory コントラクトの実装

  - contracts/AMMFactory.sol の作成
  - ペア作成機能（createPair）の実装
  - ペア管理機能（getPair, allPairs）の実装
  - PairCreated イベントの定義と発行
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. AMM Pair コントラクトの実装

  - contracts/AMMPair.sol の作成
  - ERC20 継承による LP トークン機能の実装
  - 流動性管理機能（mint, burn）の実装
  - スワップ機能（swap）と AMM 価格計算の実装
  - リザーブ管理と getReserves 関数の実装
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 6.1, 6.2_

- [x] 8. AMM Router コントラクトの実装

  - contracts/AMMRouter.sol の作成
  - ユーザーフレンドリーな流動性追加機能（addLiquidity）の実装
  - 流動性除去機能（removeLiquidity）の実装
  - トークンスワップ機能（swapExactTokensForTokens）の実装
  - スリッページ保護とデッドライン機能の実装
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 6.3, 6.4_

- [x] 9. AMM Factory コントラクトのテスト実装

  - test/AMMFactory.test.ts の作成
  - ペア作成機能のテスト（正常系・異常系）
  - 重複ペア作成防止のテスト
  - イベント発行のテスト
  - エッジケースのテスト
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10. AMM Pair コントラクトのテスト実装

  - test/AMMPair.test.ts の作成
  - 流動性追加・除去機能のテスト
  - スワップ機能と価格計算のテスト
  - AMM 式（x\*y=k）の検証テスト
  - 手数料計算のテスト
  - エラーハンドリングのテスト
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 6.1, 6.2_

- [x] 11. AMM Router コントラクトのテスト実装

  - test/AMMRouter.test.ts の作成
  - ルーター経由の流動性操作テスト
  - スワップ機能のテスト
  - スリッページ保護のテスト
  - デッドライン機能のテスト
  - 複数ホップスワップのテスト
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 6.3, 6.4_

- [x] 12. コントラクトデプロイメントスクリプトの実装

  - ignition/AMMFactory.ts の作成
  - ignition/AMMRouter.ts の作成
  - デプロイメント順序の管理
  - コントラクトアドレスの自動保存機能
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 13. Hardhat タスクの実装（Factory 関連）

  - tasks/AMMFactory/createPair.ts の作成
  - tasks/AMMFactory/getPairs.ts の作成
  - Sepolia ネットワーク対応
  - 指定トークンペア（USDC/JPYC, USDC/PYUSD, JPYC/PYUSD）の作成タスク
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 14. Hardhat タスクの実装（Pair 関連）

  - tasks/AMMPair/addLiquidity.ts の作成
  - tasks/AMMPair/removeLiquidity.ts の作成
  - tasks/AMMPair/swap.ts の作成
  - 各ペアコントラクトとの連携機能
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 15. Hardhat タスクの実装（Router 関連）

  - tasks/AMMRouter/addLiquidity.ts の作成
  - tasks/AMMRouter/removeLiquidity.ts の作成
  - tasks/AMMRouter/swapTokens.ts の作成
  - ユーザーフレンドリーなインターフェース提供
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2_

- [x] 16. フロントエンドパッケージの基盤構築

  - pkgs/frontend/ディレクトリ構造の作成
  - Next.js のテンプレ生成
  - Next.js App Router の設定
  - package.json, tsconfig.json, tailwind.config.js の設定
  - Shadcn/UI 設定（components.json）の実装
  - _Requirements: 5.1, 5.2, 7.1, 7.2_

- [x] 17. Web3 統合とウォレット接続の実装

  - wagmi, viem, RainbowKit の設定
  - Sepolia ネットワーク設定
  - ウォレット接続コンポーネント（WalletConnector.tsx）の作成
  - ネットワーク切り替え機能（NetworkSwitcher.tsx）の実装
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 18. トークン設定とコントラクト統合

  - lib/tokens.ts で Sepolia トークン設定（USDC, JPYC, PYUSD）
  - lib/contracts.ts でデプロイ済みコントラクト設定
  - コントラクト ABI の統合
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 19. 価格計算とユーティリティ関数の実装

  - lib/calculations.ts で AMM 価格計算ロジック
  - utils/formatters.ts で数値フォーマット機能
  - utils/validators.ts で入力値検証機能
  - utils/constants.ts で定数定義
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 20. カスタムフックの実装（基本機能）

  - hooks/useTokenBalance.ts でトークン残高取得
  - hooks/useContractRead.ts でコントラクト読み取り
  - hooks/usePairData.ts でペア情報取得
  - リアルタイムデータ更新機能
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.2, 6.5_

- [x] 21. スワップ機能のカスタムフック実装

  - hooks/useSwap.ts の作成
  - スワップ金額計算機能
  - スリッページ設定機能
  - トランザクション実行機能
  - エラーハンドリング機能
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4_

- [x] 22. 流動性管理のカスタムフック実装

  - hooks/useLiquidity.ts の作成
  - 流動性追加・除去機能
  - LP 比率計算機能
  - 手数料収益計算機能
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [x] 23. スワップ UI コンポーネントの実装

  - components/swap/SwapInterface.tsx の作成
  - components/swap/TokenSelector.tsx の作成
  - components/swap/SwapButton.tsx の作成
  - トークン選択、金額入力、スワップ実行機能
  - リアルタイム価格表示とスリッページ設定
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4_

- [x] 24. 流動性提供 UI コンポーネントの実装

  - components/liquidity/LiquidityProvider.tsx の作成
  - components/liquidity/PoolManager.tsx の作成
  - components/liquidity/LiquidityPosition.tsx の作成
  - 流動性追加・除去インターフェース
  - ユーザーの LP ポジション表示
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3, 7.4_

- [x] 25. プール管理 UI コンポーネントの実装

  - components/pools/PoolList.tsx の作成
  - components/pools/PoolCard.tsx の作成
  - プール一覧表示機能
  - TVL、取引量、APR 表示機能
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3, 7.4_

- [x] 26. メインページとルーティングの実装

  - app/page.tsx（スワップ画面）の作成
  - app/liquidity/page.tsx（流動性提供画面）の作成
  - app/liquidity/manage/page.tsx（流動性管理画面）の作成
  - app/pools/page.tsx（プール一覧画面）の作成
  - ナビゲーションとレイアウトの実装
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 27. エラーハンドリングとユーザーフィードバックの実装

  - エラー表示コンポーネントの作成
  - トランザクション状態表示機能
  - 成功・失敗メッセージの実装
  - ローディング状態の管理
  - _Requirements: 1.5, 2.4, 3.4, 6.4, 7.3, 7.4, 7.5_

- [x] 28. レスポンシブデザインとアクセシビリティの実装

  - モバイルファーストデザインの適用
  - Tailwind CSS によるレスポンシブ対応
  - モダンでかっこいいデザインに仕上げる
  - アクセシビリティ機能の実装
  - ダークモード対応（オプション）
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 29. 統合テストと E2E テストの実装

  - フロントエンドコンポーネントのテスト
  - スマートコントラクト統合テスト
  - ユーザージャーニーの E2E テスト
  - エラーケースのテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [ ] 30. ドキュメントと README の作成
  - プロジェクト概要とセットアップガイド
  - 使用技術スタックの説明
  - デプロイメント手順の記載
  - 使用方法とトラブルシューティング
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
