/**
 * 定数定義
 * アプリケーション全体で使用する定数値
 */

/**
 * ネットワーク関連の定数
 */
export const NETWORK_CONSTANTS = {
  /** Sepolia テストネットのチェーンID */
  SEPOLIA_CHAIN_ID: 11155111,
  /** ネットワーク名 */
  NETWORK_NAME: "Sepolia",
  /** RPC URL */
  RPC_URL: "https://eth-sepolia.g.alchemy.com/v2/",
  /** ブロックエクスプローラーURL */
  EXPLORER_URL: "https://sepolia.etherscan.io",
  /** ネイティブトークンシンボル */
  NATIVE_TOKEN_SYMBOL: "ETH",
  /** ネイティブトークン名 */
  NATIVE_TOKEN_NAME: "Ethereum",
  /** ネイティブトークンの小数点桁数 */
  NATIVE_TOKEN_DECIMALS: 18,
} as const;

/**
 * AMM 関連の定数
 */
export const AMM_CONSTANTS = {
  /** 取引手数料率（0.3%） */
  TRADING_FEE_RATE: 0.003,
  /** 手数料計算用の分子 */
  FEE_NUMERATOR: 997,
  /** 手数料計算用の分母 */
  FEE_DENOMINATOR: 1000,
  /** 最小流動性（初回流動性提供時にバーンされる量） */
  MINIMUM_LIQUIDITY: BigInt(1000),
  /** 最小取引量（Wei単位） */
  MINIMUM_TRADE_AMOUNT: BigInt(1),
  /** 最大価格インパクト（パーセンテージ） */
  MAX_PRICE_IMPACT: 15,
  /** 警告レベルの価格インパクト（パーセンテージ） */
  WARNING_PRICE_IMPACT: 5,
} as const;

/**
 * UI 関連の定数
 */
export const UI_CONSTANTS = {
  /** デフォルトのスリッページ許容値（パーセンテージ） */
  DEFAULT_SLIPPAGE: 0.5,
  /** スリッページの選択肢 */
  SLIPPAGE_OPTIONS: [0.1, 0.5, 1.0, 3.0],
  /** デフォルトのデッドライン（分） */
  DEFAULT_DEADLINE: 20,
  /** デッドラインの選択肢（分） */
  DEADLINE_OPTIONS: [5, 10, 20, 30, 60],
  /** 最大表示小数点桁数 */
  MAX_DISPLAY_DECIMALS: 6,
  /** 価格表示の最大小数点桁数 */
  MAX_PRICE_DECIMALS: 8,
  /** パーセンテージ表示の小数点桁数 */
  PERCENTAGE_DECIMALS: 2,
  /** アドレス表示の省略形式（開始文字数） */
  ADDRESS_DISPLAY_START: 6,
  /** アドレス表示の省略形式（終了文字数） */
  ADDRESS_DISPLAY_END: 4,
} as const;

/**
 * バリデーション関連の定数
 */
export const VALIDATION_CONSTANTS = {
  /** 最小スリッページ（パーセンテージ） */
  MIN_SLIPPAGE: 0.1,
  /** 最大スリッページ（パーセンテージ） */
  MAX_SLIPPAGE: 50,
  /** 最小デッドライン（分） */
  MIN_DEADLINE: 1,
  /** 最大デッドライン（分） */
  MAX_DEADLINE: 4320, // 3日
  /** 最大入力文字数 */
  MAX_INPUT_LENGTH: 50,
  /** 最大小数点桁数 */
  MAX_DECIMAL_PLACES: 18,
  /** 最小取引量（表示用） */
  MIN_TRADE_AMOUNT_DISPLAY: 0.000001,
  /** 最大取引量（表示用） */
  MAX_TRADE_AMOUNT_DISPLAY: 1000000000,
} as const;

/**
 * トークン関連の定数
 */
export const TOKEN_CONSTANTS = {
  /** サポートするトークンの最大数 */
  MAX_SUPPORTED_TOKENS: 10,
  /** デフォルトトークンの小数点桁数 */
  DEFAULT_TOKEN_DECIMALS: 18,
  /** トークンロゴのデフォルトサイズ */
  DEFAULT_LOGO_SIZE: 24,
  /** トークンシンボルの最大長 */
  MAX_SYMBOL_LENGTH: 10,
  /** トークン名の最大長 */
  MAX_NAME_LENGTH: 50,
} as const;

/**
 * 時間関連の定数
 */
export const TIME_CONSTANTS = {
  /** 1秒（ミリ秒） */
  SECOND: 1000,
  /** 1分（ミリ秒） */
  MINUTE: 60 * 1000,
  /** 1時間（ミリ秒） */
  HOUR: 60 * 60 * 1000,
  /** 1日（ミリ秒） */
  DAY: 24 * 60 * 60 * 1000,
  /** 1週間（ミリ秒） */
  WEEK: 7 * 24 * 60 * 60 * 1000,
  /** データ更新間隔（ミリ秒） */
  DATA_REFRESH_INTERVAL: 30 * 1000, // 30秒
  /** 価格更新間隔（ミリ秒） */
  PRICE_UPDATE_INTERVAL: 10 * 1000, // 10秒
  /** トランザクション確認タイムアウト（ミリ秒） */
  TRANSACTION_TIMEOUT: 5 * 60 * 1000, // 5分
} as const;

/**
 * ローカルストレージのキー
 */
export const STORAGE_KEYS = {
  /** スリッページ設定 */
  SLIPPAGE_SETTING: "amm-dex-slippage",
  /** デッドライン設定 */
  DEADLINE_SETTING: "amm-dex-deadline",
  /** 最近使用したトークン */
  RECENT_TOKENS: "amm-dex-recent-tokens",
  /** ユーザー設定 */
  USER_SETTINGS: "amm-dex-user-settings",
  /** トランザクション履歴 */
  TRANSACTION_HISTORY: "amm-dex-tx-history",
  /** お気に入りペア */
  FAVORITE_PAIRS: "amm-dex-favorite-pairs",
} as const;

/**
 * API 関連の定数
 */
export const API_CONSTANTS = {
  /** リクエストタイムアウト（ミリ秒） */
  REQUEST_TIMEOUT: 30 * 1000,
  /** リトライ回数 */
  MAX_RETRIES: 3,
  /** リトライ間隔（ミリ秒） */
  RETRY_DELAY: 1000,
  /** レート制限（リクエスト/分） */
  RATE_LIMIT: 60,
} as const;

/**
 * エラーメッセージ
 */
export const ERROR_MESSAGES = {
  /** ネットワーク接続エラー */
  NETWORK_ERROR: "ネットワークに接続できません",
  /** ウォレット接続エラー */
  WALLET_CONNECTION_ERROR: "ウォレットに接続できません",
  /** 残高不足エラー */
  INSUFFICIENT_BALANCE: "残高が不足しています",
  /** 流動性不足エラー */
  INSUFFICIENT_LIQUIDITY: "流動性が不足しています",
  /** スリッページエラー */
  SLIPPAGE_EXCEEDED: "スリッページが許容値を超えました",
  /** デッドライン超過エラー */
  DEADLINE_EXCEEDED: "デッドラインを超過しました",
  /** 無効な入力エラー */
  INVALID_INPUT: "無効な入力値です",
  /** トランザクション失敗エラー */
  TRANSACTION_FAILED: "トランザクションが失敗しました",
  /** 承認エラー */
  APPROVAL_FAILED: "トークンの承認に失敗しました",
  /** 一般的なエラー */
  GENERIC_ERROR: "エラーが発生しました",
} as const;

/**
 * 成功メッセージ
 */
export const SUCCESS_MESSAGES = {
  /** スワップ成功 */
  SWAP_SUCCESS: "スワップが完了しました",
  /** 流動性追加成功 */
  ADD_LIQUIDITY_SUCCESS: "流動性の追加が完了しました",
  /** 流動性除去成功 */
  REMOVE_LIQUIDITY_SUCCESS: "流動性の除去が完了しました",
  /** 承認成功 */
  APPROVAL_SUCCESS: "トークンの承認が完了しました",
  /** ウォレット接続成功 */
  WALLET_CONNECTED: "ウォレットが接続されました",
} as const;

/**
 * 警告メッセージ
 */
export const WARNING_MESSAGES = {
  /** 高いスリッページ警告 */
  HIGH_SLIPPAGE: "スリッページが高く設定されています",
  /** 低いスリッページ警告 */
  LOW_SLIPPAGE: "スリッページが低すぎます",
  /** 高い価格インパクト警告 */
  HIGH_PRICE_IMPACT: "価格インパクトが大きいです",
  /** 長いデッドライン警告 */
  LONG_DEADLINE: "デッドラインが長すぎます",
  /** 短いデッドライン警告 */
  SHORT_DEADLINE: "デッドラインが短すぎます",
  /** 大きな取引量警告 */
  LARGE_TRADE: "大きな取引量です",
  /** 小さな取引量警告 */
  SMALL_TRADE: "取引量が小さすぎます",
} as const;

/**
 * トランザクションタイプ
 */
export const TRANSACTION_TYPES = {
  /** スワップ */
  SWAP: "swap",
  /** 流動性追加 */
  ADD_LIQUIDITY: "add_liquidity",
  /** 流動性除去 */
  REMOVE_LIQUIDITY: "remove_liquidity",
  /** 承認 */
  APPROVAL: "approval",
  /** ペア作成 */
  CREATE_PAIR: "create_pair",
} as const;

/**
 * トランザクション状態
 */
export const TRANSACTION_STATUS = {
  /** 待機中 */
  PENDING: "pending",
  /** 確認中 */
  CONFIRMING: "confirming",
  /** 成功 */
  SUCCESS: "success",
  /** 失敗 */
  FAILED: "failed",
  /** キャンセル */
  CANCELLED: "cancelled",
} as const;

/**
 * ページルート
 */
export const ROUTES = {
  /** ホーム（スワップ） */
  HOME: "/",
  /** 流動性提供 */
  LIQUIDITY: "/liquidity",
  /** 流動性管理 */
  LIQUIDITY_MANAGE: "/liquidity/manage",
  /** プール一覧 */
  POOLS: "/pools",
  /** プール詳細 */
  POOL_DETAIL: "/pools/[address]",
} as const;

/**
 * 外部リンク
 */
export const EXTERNAL_LINKS = {
  /** Etherscan */
  ETHERSCAN: "https://sepolia.etherscan.io",
  /** ドキュメント */
  DOCS: "https://docs.example.com",
  /** GitHub */
  GITHUB: "https://github.com/example/amm-dex",
  /** Discord */
  DISCORD: "https://discord.gg/example",
  /** Twitter */
  TWITTER: "https://twitter.com/example",
} as const;

/**
 * CSS クラス名
 */
export const CSS_CLASSES = {
  /** 成功状態 */
  SUCCESS: "text-green-600 bg-green-50 border-green-200",
  /** エラー状態 */
  ERROR: "text-red-600 bg-red-50 border-red-200",
  /** 警告状態 */
  WARNING: "text-yellow-600 bg-yellow-50 border-yellow-200",
  /** 情報状態 */
  INFO: "text-blue-600 bg-blue-50 border-blue-200",
  /** ローディング状態 */
  LOADING: "animate-pulse opacity-50",
  /** 無効状態 */
  DISABLED: "opacity-50 cursor-not-allowed",
} as const;

/**
 * アニメーション設定
 */
export const ANIMATION_CONSTANTS = {
  /** 短いアニメーション時間（ミリ秒） */
  SHORT_DURATION: 150,
  /** 中程度のアニメーション時間（ミリ秒） */
  MEDIUM_DURATION: 300,
  /** 長いアニメーション時間（ミリ秒） */
  LONG_DURATION: 500,
  /** イージング関数 */
  EASING: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

/**
 * 全ての定数をまとめてエクスポート
 */
export const CONSTANTS = {
  NETWORK: NETWORK_CONSTANTS,
  AMM: AMM_CONSTANTS,
  UI: UI_CONSTANTS,
  VALIDATION: VALIDATION_CONSTANTS,
  TOKEN: TOKEN_CONSTANTS,
  TIME: TIME_CONSTANTS,
  STORAGE: STORAGE_KEYS,
  API: API_CONSTANTS,
  ERROR: ERROR_MESSAGES,
  SUCCESS: SUCCESS_MESSAGES,
  WARNING: WARNING_MESSAGES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  ROUTES,
  EXTERNAL_LINKS,
  CSS_CLASSES,
  ANIMATION: ANIMATION_CONSTANTS,
} as const;

/**
 * 型定義のエクスポート
 */
export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];
export type TransactionStatus = (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];
export type Route = (typeof ROUTES)[keyof typeof ROUTES];
