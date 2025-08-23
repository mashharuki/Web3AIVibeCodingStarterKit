// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IDEXFactory
 * @dev DEXファクトリーコントラクトのインターフェース
 * 新しい流動性ペアの作成と管理を行う
 */
interface IDEXFactory {
    /**
     * @dev 新しいペアが作成された時に発行されるイベント
     * @param token0 ペアの最初のトークンアドレス
     * @param token1 ペアの2番目のトークンアドレス
     * @param pair 作成されたペアコントラクトのアドレス
     * @param allPairsLength 作成後の総ペア数
     */
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 allPairsLength
    );

    /**
     * @dev 手数料受取先が変更された時に発行されるイベント
     * @param oldFeeTo 変更前の手数料受取先
     * @param newFeeTo 変更後の手数料受取先
     */
    event FeeToChanged(address indexed oldFeeTo, address indexed newFeeTo);

    /**
     * @dev 手数料設定者が変更された時に発行されるイベント
     * @param oldFeeToSetter 変更前の手数料設定者
     * @param newFeeToSetter 変更後の手数料設定者
     */
    event FeeToSetterChanged(address indexed oldFeeToSetter, address indexed newFeeToSetter);

    /**
     * @dev 新しい流動性ペアを作成する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @return pair 作成されたペアコントラクトのアドレス
     */
    function createPair(address tokenA, address tokenB) external returns (address pair);

    /**
     * @dev 指定されたトークンペアのアドレスを取得する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @return pair ペアコントラクトのアドレス（存在しない場合は0x0）
     */
    function getPair(address tokenA, address tokenB) external view returns (address pair);

    /**
     * @dev 指定されたインデックスのペアアドレスを取得する
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
     * @dev 手数料の受取先アドレスを取得する
     * @return feeTo 手数料受取先アドレス
     */
    function feeTo() external view returns (address feeTo);

    /**
     * @dev 手数料設定者のアドレスを取得する
     * @return feeToSetter 手数料設定者アドレス
     */
    function feeToSetter() external view returns (address feeToSetter);

    /**
     * @dev 手数料設定者を変更する（現在の手数料設定者のみ実行可能）
     * @param newFeeToSetter 新しい手数料設定者アドレス
     */
    function setFeeToSetter(address newFeeToSetter) external;

    /**
     * @dev 手数料受取先を設定する（手数料設定者のみ実行可能）
     * @param newFeeTo 新しい手数料受取先アドレス
     */
    function setFeeTo(address newFeeTo) external;
}