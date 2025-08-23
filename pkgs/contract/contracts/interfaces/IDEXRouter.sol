// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IDEXRouter
 * @dev DEXルーターコントラクトのインターフェース
 * ユーザーフレンドリーなDEX操作を提供する
 */
interface IDEXRouter {
    /**
     * @dev 流動性を追加する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @param amountADesired 希望するtokenAの数量
     * @param amountBDesired 希望するtokenBの数量
     * @param amountAMin 最小許容tokenA数量
     * @param amountBMin 最小許容tokenB数量
     * @param to LPトークンの受取先
     * @param deadline 取引の有効期限
     * @return amountA 実際に使用されたtokenAの数量
     * @return amountB 実際に使用されたtokenBの数量
     * @return liquidity ミントされたLPトークンの数量
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    /**
     * @dev ETHと他のトークンで流動性を追加する
     * @param token トークンアドレス
     * @param amountTokenDesired 希望するトークン数量
     * @param amountTokenMin 最小許容トークン数量
     * @param amountETHMin 最小許容ETH数量
     * @param to LPトークンの受取先
     * @param deadline 取引の有効期限
     * @return amountToken 実際に使用されたトークン数量
     * @return amountETH 実際に使用されたETH数量
     * @return liquidity ミントされたLPトークン数量
     */
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);

    /**
     * @dev 流動性を除去する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @param liquidity 除去するLPトークン数量
     * @param amountAMin 最小許容tokenA数量
     * @param amountBMin 最小許容tokenB数量
     * @param to 除去されたトークンの受取先
     * @param deadline 取引の有効期限
     * @return amountA 除去されたtokenAの数量
     * @return amountB 除去されたtokenBの数量
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    /**
     * @dev ETHと他のトークンの流動性を除去する
     * @param token トークンアドレス
     * @param liquidity 除去するLPトークン数量
     * @param amountTokenMin 最小許容トークン数量
     * @param amountETHMin 最小許容ETH数量
     * @param to 除去されたトークンの受取先
     * @param deadline 取引の有効期限
     * @return amountToken 除去されたトークン数量
     * @return amountETH 除去されたETH数量
     */
    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountToken, uint256 amountETH);

    /**
     * @dev 正確な入力数量でトークンスワップを実行する
     * @param amountIn 入力トークン数量
     * @param amountOutMin 最小出力数量
     * @param path スワップパス（トークンアドレスの配列）
     * @param to 出力トークンの受取先
     * @param deadline 取引の有効期限
     * @return amounts 各ステップでの数量配列
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @dev 正確な出力数量でトークンスワップを実行する
     * @param amountOut 出力トークン数量
     * @param amountInMax 最大入力数量
     * @param path スワップパス（トークンアドレスの配列）
     * @param to 出力トークンの受取先
     * @param deadline 取引の有効期限
     * @return amounts 各ステップでの数量配列
     */
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @dev 正確なETH入力でトークンスワップを実行する
     * @param amountOutMin 最小出力数量
     * @param path スワップパス
     * @param to 出力トークンの受取先
     * @param deadline 取引の有効期限
     * @return amounts 各ステップでの数量配列
     */
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    /**
     * @dev 正確なトークン入力でETHスワップを実行する
     * @param amountIn 入力トークン数量
     * @param amountOutMin 最小ETH出力数量
     * @param path スワップパス
     * @param to ETHの受取先
     * @param deadline 取引の有効期限
     * @return amounts 各ステップでの数量配列
     */
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @dev 指定された入力数量に対する出力数量を計算する
     * @param amountIn 入力数量
     * @param path スワップパス
     * @return amounts 各ステップでの数量配列
     */
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    /**
     * @dev 指定された出力数量に必要な入力数量を計算する
     * @param amountOut 出力数量
     * @param path スワップパス
     * @return amounts 各ステップでの数量配列
     */
    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    /**
     * @dev 流動性追加時の最適な数量を計算する
     * @param amountADesired 希望するtokenA数量
     * @param amountBDesired 希望するtokenB数量
     * @param reserveA tokenAのリザーブ量
     * @param reserveB tokenBのリザーブ量
     * @return amountA 最適なtokenA数量
     * @return amountB 最適なtokenB数量
     */
    function quote(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 reserveA,
        uint256 reserveB
    ) external pure returns (uint256 amountA, uint256 amountB);

    /**
     * @dev ファクトリーコントラクトのアドレスを取得する
     * @return factory ファクトリーアドレス
     */
    function factory() external pure returns (address factory);

    /**
     * @dev WETHコントラクトのアドレスを取得する
     * @return weth WETHアドレス
     */
    function weth() external pure returns (address weth);
}