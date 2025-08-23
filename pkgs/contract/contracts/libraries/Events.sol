// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title Events
 * @dev DEXシステム全体で使用する共通イベント定義
 */
library Events {
    // === Factory Events ===
    
    /**
     * @dev 新しいペアが作成された時のイベント
     */
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 allPairsLength
    );

    /**
     * @dev 手数料設定が変更された時のイベント
     */
    event FeeConfigurationChanged(
        address indexed feeTo,
        address indexed feeToSetter,
        uint256 timestamp
    );

    // === Pair Events ===

    /**
     * @dev 流動性が追加された時のイベント
     */
    event LiquidityAdded(
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity,
        uint256 timestamp
    );

    /**
     * @dev 流動性が除去された時のイベント
     */
    event LiquidityRemoved(
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity,
        uint256 timestamp
    );

    /**
     * @dev スワップが実行された時のイベント
     */
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    /**
     * @dev 価格が更新された時のイベント
     */
    event PriceUpdated(
        address indexed pair,
        uint256 price0CumulativeLast,
        uint256 price1CumulativeLast,
        uint256 timestamp
    );

    // === Router Events ===

    /**
     * @dev ルーター経由で流動性が追加された時のイベント
     */
    event RouterLiquidityAdded(
        address indexed user,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity,
        uint256 timestamp
    );

    /**
     * @dev ルーター経由で流動性が除去された時のイベント
     */
    event RouterLiquidityRemoved(
        address indexed user,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity,
        uint256 timestamp
    );

    /**
     * @dev ルーター経由でスワップが実行された時のイベント
     */
    event RouterSwapExecuted(
        address indexed user,
        address[] path,
        uint256[] amounts,
        uint256 timestamp
    );

    // === Faucet Events ===

    /**
     * @dev トークンが配布された時のイベント
     */
    event TokensDistributed(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 remainingBalance,
        uint256 timestamp
    );

    /**
     * @dev ファセット設定が変更された時のイベント
     */
    event FaucetConfigurationChanged(
        address indexed token,
        uint256 oldLimit,
        uint256 newLimit,
        uint256 oldCooldown,
        uint256 newCooldown,
        uint256 timestamp
    );

    /**
     * @dev 緊急引き出しが実行された時のイベント
     */
    event EmergencyWithdrawal(
        address indexed admin,
        address indexed token,
        uint256 amount,
        address indexed to,
        uint256 timestamp
    );

    // === General Events ===

    /**
     * @dev 管理者権限が変更された時のイベント
     */
    event AdminChanged(
        address indexed oldAdmin,
        address indexed newAdmin,
        uint256 timestamp
    );

    /**
     * @dev コントラクトが一時停止された時のイベント
     */
    event ContractPaused(
        address indexed admin,
        string reason,
        uint256 timestamp
    );

    /**
     * @dev コントラクトの一時停止が解除された時のイベント
     */
    event ContractUnpaused(
        address indexed admin,
        uint256 timestamp
    );

    /**
     * @dev 設定が更新された時のイベント
     */
    event ConfigurationUpdated(
        string indexed configKey,
        uint256 oldValue,
        uint256 newValue,
        uint256 timestamp
    );
}