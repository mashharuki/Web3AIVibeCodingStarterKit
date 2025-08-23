// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title ITestTokenFaucet
 * @dev 検証用トークンファセットコントラクトのインターフェース
 * テスト用トークンの配布機能を提供する
 */
interface ITestTokenFaucet {
    /**
     * @dev トークンが請求された時に発行されるイベント
     * @param user トークンを請求したユーザーアドレス
     * @param token 請求されたトークンアドレス
     * @param amount 請求されたトークン数量
     * @param timestamp 請求時刻
     */
    event TokensRequested(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @dev トークン制限が設定された時に発行されるイベント
     * @param token トークンアドレス
     * @param oldLimit 変更前の制限値
     * @param newLimit 変更後の制限値
     */
    event TokenLimitSet(address indexed token, uint256 oldLimit, uint256 newLimit);

    /**
     * @dev クールダウン期間が設定された時に発行されるイベント
     * @param oldCooldown 変更前のクールダウン期間
     * @param newCooldown 変更後のクールダウン期間
     */
    event CooldownPeriodSet(uint256 oldCooldown, uint256 newCooldown);

    /**
     * @dev トークンが追加された時に発行されるイベント
     * @param token 追加されたトークンアドレス
     * @param dailyLimit 日次制限値
     */
    event TokenAdded(address indexed token, uint256 dailyLimit);

    /**
     * @dev トークンが削除された時に発行されるイベント
     * @param token 削除されたトークンアドレス
     */
    event TokenRemoved(address indexed token);

    /**
     * @dev 指定されたトークンを請求する
     * @param token 請求するトークンのアドレス
     * @param amount 請求するトークン数量
     */
    function requestTokens(address token, uint256 amount) external;

    /**
     * @dev 指定されたトークンの日次制限を設定する（管理者のみ）
     * @param token トークンアドレス
     * @param limit 新しい日次制限値
     */
    function setTokenLimit(address token, uint256 limit) external;

    /**
     * @dev クールダウン期間を設定する（管理者のみ）
     * @param newCooldown 新しいクールダウン期間（秒）
     */
    function setCooldownPeriod(uint256 newCooldown) external;

    /**
     * @dev 新しいトークンをファセットに追加する（管理者のみ）
     * @param token 追加するトークンアドレス
     * @param dailyLimit 日次制限値
     */
    function addToken(address token, uint256 dailyLimit) external;

    /**
     * @dev トークンをファセットから削除する（管理者のみ）
     * @param token 削除するトークンアドレス
     */
    function removeToken(address token) external;

    /**
     * @dev 指定されたトークンの日次制限を取得する
     * @param token トークンアドレス
     * @return limit 日次制限値
     */
    function getTokenLimit(address token) external view returns (uint256 limit);

    /**
     * @dev 現在のクールダウン期間を取得する
     * @return cooldown クールダウン期間（秒）
     */
    function getCooldownPeriod() external view returns (uint256 cooldown);

    /**
     * @dev 指定されたユーザーとトークンの最後の請求時刻を取得する
     * @param user ユーザーアドレス
     * @param token トークンアドレス
     * @return timestamp 最後の請求時刻
     */
    function getLastRequestTime(address user, address token) external view returns (uint256 timestamp);

    /**
     * @dev 指定されたユーザーとトークンの次回請求可能時刻を取得する
     * @param user ユーザーアドレス
     * @param token トークンアドレス
     * @return nextTime 次回請求可能時刻
     */
    function getNextRequestTime(address user, address token) external view returns (uint256 nextTime);

    /**
     * @dev 指定されたユーザーが指定されたトークンを請求可能かどうかを確認する
     * @param user ユーザーアドレス
     * @param token トークンアドレス
     * @return canRequest 請求可能かどうか
     */
    function canRequestTokens(address user, address token) external view returns (bool canRequest);

    /**
     * @dev 指定されたトークンがファセットでサポートされているかを確認する
     * @param token トークンアドレス
     * @return isSupported サポートされているかどうか
     */
    function isTokenSupported(address token) external view returns (bool isSupported);

    /**
     * @dev サポートされている全トークンのリストを取得する
     * @return tokens サポートされているトークンアドレスの配列
     */
    function getSupportedTokens() external view returns (address[] memory tokens);

    /**
     * @dev 緊急時にトークンを引き出す（管理者のみ）
     * @param token 引き出すトークンアドレス
     * @param amount 引き出す数量
     * @param to 引き出し先アドレス
     */
    function emergencyWithdraw(address token, uint256 amount, address to) external;
}