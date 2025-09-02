// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IAMMFactory
 * @dev AMM Factory コントラクトのインターフェース
 * 新しい取引ペアの作成と管理を行う
 */
interface IAMMFactory {
    /**
     * @dev 新しいペアが作成された時に発行されるイベント
     * @param token0 ペアの最初のトークンアドレス
     * @param token1 ペアの2番目のトークンアドレス
     * @param pair 作成されたペアコントラクトのアドレス
     * @param pairLength 作成後の総ペア数
     */
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 pairLength
    );

    /**
     * @dev 新しい取引ペアを作成する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @return pair 作成されたペアコントラクトのアドレス
     */
    function createPair(address tokenA, address tokenB)
        external
        returns (address pair);

    /**
     * @dev 指定されたトークンペアのアドレスを取得する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @return pair ペアコントラクトのアドレス（存在しない場合は0x0）
     */
    function getPair(address tokenA, address tokenB)
        external
        view
        returns (address pair);

    /**
     * @dev インデックスによってペアアドレスを取得する
     * @param index ペアのインデックス
     * @return pair ペアコントラクトのアドレス
     */
    function allPairs(uint256 index) external view returns (address pair);

    /**
     * @dev 作成された全ペアの数を取得する
     * @return length 総ペア数
     */
    function allPairsLength() external view returns (uint256 length);

    /**
     * @dev 手数料受取人のアドレスを取得する
     * @return feeTo 手数料受取人のアドレス
     */
    function feeTo() external view returns (address feeTo);

    /**
     * @dev 手数料設定者のアドレスを取得する
     * @return feeToSetter 手数料設定者のアドレス
     */
    function feeToSetter() external view returns (address feeToSetter);

    /**
     * @dev 手数料受取人を設定する（feeToSetterのみ実行可能）
     * @param _feeTo 新しい手数料受取人のアドレス
     */
    function setFeeTo(address _feeTo) external;

    /**
     * @dev 手数料設定者を変更する（現在のfeeToSetterのみ実行可能）
     * @param _feeToSetter 新しい手数料設定者のアドレス
     */
    function setFeeToSetter(address _feeToSetter) external;
}