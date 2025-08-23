// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IDEXPair
 * @dev DEXペアコントラクトのインターフェース
 * 流動性プールとトークンスワップ機能を提供する
 */
interface IDEXPair is IERC20 {
    /**
     * @dev 流動性が追加された時に発行されるイベント
     * @param sender 流動性提供者のアドレス
     * @param amount0 追加されたtoken0の数量
     * @param amount1 追加されたtoken1の数量
     */
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);

    /**
     * @dev 流動性が除去された時に発行されるイベント
     * @param sender 流動性除去者のアドレス
     * @param amount0 除去されたtoken0の数量
     * @param amount1 除去されたtoken1の数量
     * @param to 除去されたトークンの送信先
     */
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);

    /**
     * @dev スワップが実行された時に発行されるイベント
     * @param sender スワップ実行者のアドレス
     * @param amount0In 入力されたtoken0の数量
     * @param amount1In 入力されたtoken1の数量
     * @param amount0Out 出力されたtoken0の数量
     * @param amount1Out 出力されたtoken1の数量
     * @param to 出力トークンの送信先
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
     * @dev 現在のリザーブ量と最終更新時刻を取得する
     * @return reserve0 token0のリザーブ量
     * @return reserve1 token1のリザーブ量
     * @return blockTimestampLast 最終更新時刻
     */
    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    /**
     * @dev token0の価格累積値を取得する（オラクル機能用）
     * @return price0CumulativeLast token0の価格累積値
     */
    function price0CumulativeLast() external view returns (uint256 price0CumulativeLast);

    /**
     * @dev token1の価格累積値を取得する（オラクル機能用）
     * @return price1CumulativeLast token1の価格累積値
     */
    function price1CumulativeLast() external view returns (uint256 price1CumulativeLast);

    /**
     * @dev kLast値を取得する（手数料計算用）
     * @return kLast 最後のk値
     */
    function kLast() external view returns (uint256 kLast);

    /**
     * @dev 流動性を追加してLPトークンをミントする
     * @param to LPトークンの受取先アドレス
     * @return liquidity ミントされたLPトークンの数量
     */
    function mint(address to) external returns (uint256 liquidity);

    /**
     * @dev LPトークンをバーンして流動性を除去する
     * @param to 除去されたトークンの受取先アドレス
     * @return amount0 除去されたtoken0の数量
     * @return amount1 除去されたtoken1の数量
     */
    function burn(address to) external returns (uint256 amount0, uint256 amount1);

    /**
     * @dev トークンスワップを実行する
     * @param amount0Out 出力するtoken0の数量
     * @param amount1Out 出力するtoken1の数量
     * @param to 出力トークンの受取先アドレス
     * @param data フラッシュスワップ用のデータ
     */
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;

    /**
     * @dev ペアコントラクトを初期化する（ファクトリーからのみ呼び出し可能）
     * @param token0Address token0のアドレス
     * @param token1Address token1のアドレス
     */
    function initialize(address token0Address, address token1Address) external;

    /**
     * @dev リザーブを強制的に現在の残高に同期する
     */
    function sync() external;
}