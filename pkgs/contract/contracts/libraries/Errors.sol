// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title Errors
 * @dev DEXシステム全体で使用するカスタムエラー定義
 */
library Errors {
    // === Factory Errors ===
    
    /**
     * @dev 同一トークンでペアを作成しようとした場合のエラー
     */
    error IdenticalAddresses();

    /**
     * @dev ゼロアドレスが指定された場合のエラー
     */
    error ZeroAddress();

    /**
     * @dev ペアが既に存在する場合のエラー
     */
    error PairExists();

    /**
     * @dev 権限がない場合のエラー
     */
    error Forbidden();

    // === Pair Errors ===

    /**
     * @dev 流動性が不足している場合のエラー
     */
    error InsufficientLiquidity();

    /**
     * @dev 流動性がロックされている場合のエラー
     */
    error InsufficientLiquidityMinted();

    /**
     * @dev 流動性がバーンできない場合のエラー
     */
    error InsufficientLiquidityBurned();

    /**
     * @dev 無効な出力数量の場合のエラー
     */
    error InsufficientOutputAmount();

    /**
     * @dev 無効な入力数量の場合のエラー
     */
    error InsufficientInputAmount();

    /**
     * @dev 不正なk値の場合のエラー
     */
    error InvalidK();

    /**
     * @dev 無効なトークンアドレスの場合のエラー
     */
    error InvalidToken();

    /**
     * @dev 転送に失敗した場合のエラー
     */
    error TransferFailed();

    /**
     * @dev オーバーフローが発生した場合のエラー
     */
    error Overflow();

    // === Router Errors ===

    /**
     * @dev 期限切れの場合のエラー
     */
    error Expired();

    /**
     * @dev 無効なパスの場合のエラー
     */
    error InvalidPath();

    /**
     * @dev 残高不足の場合のエラー
     */
    error InsufficientBalance();

    /**
     * @dev 許可量不足の場合のエラー
     */
    error InsufficientAllowance();

    /**
     * @dev スリッページが大きすぎる場合のエラー
     */
    error ExcessiveSlippage();

    /**
     * @dev 無効な数量の場合のエラー
     */
    error InvalidAmount();

    /**
     * @dev ETH転送に失敗した場合のエラー
     */
    error ETHTransferFailed();

    // === Faucet Errors ===

    /**
     * @dev クールダウン期間中の場合のエラー
     */
    error CooldownPeriodActive();

    /**
     * @dev 日次制限を超えた場合のエラー
     */
    error DailyLimitExceeded();

    /**
     * @dev サポートされていないトークンの場合のエラー
     */
    error TokenNotSupported();

    /**
     * @dev ファセットの残高不足の場合のエラー
     */
    error InsufficientFaucetBalance();

    /**
     * @dev 無効な制限値の場合のエラー
     */
    error InvalidLimit();

    /**
     * @dev 無効なクールダウン期間の場合のエラー
     */
    error InvalidCooldown();

    /**
     * @dev トークンが既に追加されている場合のエラー
     */
    error TokenAlreadyAdded();

    /**
     * @dev トークンが見つからない場合のエラー
     */
    error TokenNotFound();

    // === General Errors ===

    /**
     * @dev 初期化済みの場合のエラー
     */
    error AlreadyInitialized();

    /**
     * @dev 初期化されていない場合のエラー
     */
    error NotInitialized();

    /**
     * @dev 無効な署名の場合のエラー
     */
    error InvalidSignature();

    /**
     * @dev 再入可能性攻撃を検出した場合のエラー
     */
    error ReentrancyGuard();

    /**
     * @dev 無効なコールバックの場合のエラー
     */
    error InvalidCallback();
}