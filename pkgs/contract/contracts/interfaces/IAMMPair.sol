// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IAMMPair
 * @dev AMM Pair コントラクトのインターフェース
 * 個別取引ペアの流動性管理とスワップ実行を行う
 * ERC20トークンとしてLPトークンの機能も提供する
 */
interface IAMMPair is IERC20 {
    /**
     * @dev 流動性が追加された時に発行されるイベント
     * @param sender 流動性を追加したアドレス
     * @param amount0 追加されたtoken0の量
     * @param amount1 追加されたtoken1の量
     */
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);

    /**
     * @dev 流動性が除去された時に発行されるイベント
     * @param sender 流動性を除去したアドレス
     * @param amount0 除去されたtoken0の量
     * @param amount1 除去されたtoken1の量
     * @param to トークンの送信先アドレス
     */
    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        address indexed to
    );

    /**
     * @dev スワップが実行された時に発行されるイベント
     * @param sender スワップを実行したアドレス
     * @param amount0In 入力されたtoken0の量
     * @param amount1In 入力されたtoken1の量
     * @param amount0Out 出力されたtoken0の量
     * @param amount1Out 出力されたtoken1の量
     * @param to トークンの送信先アドレス
     */
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );

    /**
     * @dev リザーブが同期された時に発行されるイベント
     * @param reserve0 token0のリザーブ量
     * @param reserve1 token1のリザーブ量
     */
    event Sync(uint112 reserve0, uint112 reserve1);

    /**
     * @dev ペアの最初のトークンアドレスを取得する
     * @return token0 最初のトークンアドレス
     */
    function token0() external view returns (address token0);

    /**
     * @dev ペアの2番目のトークンアドレスを取得する
     * @return token1 2番目のトークンアドレス
     */
    function token1() external view returns (address token1);

    /**
     * @dev 現在のリザーブ量を取得する
     * @return _reserve0 token0のリザーブ量
     * @return _reserve1 token1のリザーブ量
     * @return _blockTimestampLast 最後に更新されたブロックタイムスタンプ
     */
    function getReserves()
        external
        view
        returns (
            uint112 _reserve0,
            uint112 _reserve1,
            uint32 _blockTimestampLast
        );

    /**
     * @dev token0の価格累積値を取得する（TWAP計算用）
     * @return _price0CumulativeLast token0の価格累積値
     */
    function price0CumulativeLast()
        external
        view
        returns (uint256 _price0CumulativeLast);

    /**
     * @dev token1の価格累積値を取得する（TWAP計算用）
     * @return _price1CumulativeLast token1の価格累積値
     */
    function price1CumulativeLast()
        external
        view
        returns (uint256 _price1CumulativeLast);

    /**
     * @dev K値の最後の値を取得する（手数料計算用）
     * @return kLast 最後のK値
     */
    function kLast() external view returns (uint256 kLast);

    /**
     * @dev 流動性を追加してLPトークンを発行する
     * @param to LPトークンの受取人アドレス
     * @return liquidity 発行されたLPトークンの量
     */
    function mint(address to) external returns (uint256 liquidity);

    /**
     * @dev LPトークンをバーンして流動性を除去する
     * @param to トークンの受取人アドレス
     * @return amount0 返還されたtoken0の量
     * @return amount1 返還されたtoken1の量
     */
    function burn(address to)
        external
        returns (uint256 amount0, uint256 amount1);

    /**
     * @dev トークンスワップを実行する
     * @param amount0Out 出力するtoken0の量
     * @param amount1Out 出力するtoken1の量
     * @param to トークンの送信先アドレス
     * @param data フラッシュローン用のコールバックデータ
     */
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;

    /**
     * @dev リザーブを強制的に現在の残高に同期する
     */
    function skim(address to) external;

    /**
     * @dev リザーブを現在の残高に同期する
     */
    function sync() external;

    /**
     * @dev ペアを初期化する（Factoryから呼び出される）
     * @param _token0 最初のトークンアドレス
     * @param _token1 2番目のトークンアドレス
     */
    function initialize(address _token0, address _token1) external;
}