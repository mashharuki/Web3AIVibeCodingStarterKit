// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IAMMRouter
 * @dev AMM Router コントラクトのインターフェース
 * ユーザーフレンドリーなインターフェースを提供し、
 * スリッページ保護とデッドライン機能を含む
 */
interface IAMMRouter {
    /**
     * @dev Factoryコントラクトのアドレスを取得する
     * @return factory Factoryコントラクトのアドレス
     */
    function factory() external view returns (address factory);

    /**
     * @dev WETHコントラクトのアドレスを取得する
     * @return WETH WETHコントラクトのアドレス
     */
    function WETH() external view returns (address WETH);

    /**
     * @dev ERC20トークンペアに流動性を追加する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @param amountADesired 追加したいtokenAの量
     * @param amountBDesired 追加したいtokenBの量
     * @param amountAMin 許容するtokenAの最小量（スリッページ保護）
     * @param amountBMin 許容するtokenBの最小量（スリッページ保護）
     * @param to LPトークンの受取人アドレス
     * @param deadline トランザクションの有効期限
     * @return amountA 実際に追加されたtokenAの量
     * @return amountB 実際に追加されたtokenBの量
     * @return liquidity 発行されたLPトークンの量
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
    )
        external
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        );

    /**
     * @dev ETHとERC20トークンペアに流動性を追加する
     * @param token ERC20トークンアドレス
     * @param amountTokenDesired 追加したいトークンの量
     * @param amountTokenMin 許容するトークンの最小量
     * @param amountETHMin 許容するETHの最小量
     * @param to LPトークンの受取人アドレス
     * @param deadline トランザクションの有効期限
     * @return amountToken 実際に追加されたトークンの量
     * @return amountETH 実際に追加されたETHの量
     * @return liquidity 発行されたLPトークンの量
     */
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        );

    /**
     * @dev ERC20トークンペアから流動性を除去する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @param liquidity 除去するLPトークンの量
     * @param amountAMin 許容するtokenAの最小量
     * @param amountBMin 許容するtokenBの最小量
     * @param to トークンの受取人アドレス
     * @param deadline トランザクションの有効期限
     * @return amountA 返還されたtokenAの量
     * @return amountB 返還されたtokenBの量
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
     * @dev ETHとERC20トークンペアから流動性を除去する
     * @param token ERC20トークンアドレス
     * @param liquidity 除去するLPトークンの量
     * @param amountTokenMin 許容するトークンの最小量
     * @param amountETHMin 許容するETHの最小量
     * @param to トークンの受取人アドレス
     * @param deadline トランザクションの有効期限
     * @return amountToken 返還されたトークンの量
     * @return amountETH 返還されたETHの量
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
     * @dev 正確な入力量でトークンスワップを実行する
     * @param amountIn 入力するトークンの量
     * @param amountOutMin 許容する出力トークンの最小量
     * @param path スワップパス（トークンアドレスの配列）
     * @param to トークンの受取人アドレス
     * @param deadline トランザクションの有効期限
     * @return amounts 各ステップでの実際の交換量
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @dev 正確な出力量でトークンスワップを実行する
     * @param amountOut 出力するトークンの量
     * @param amountInMax 許容する入力トークンの最大量
     * @param path スワップパス（トークンアドレスの配列）
     * @param to トークンの受取人アドレス
     * @param deadline トランザクションの有効期限
     * @return amounts 各ステップでの実際の交換量
     */
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @dev 正確なETH入力量でトークンスワップを実行する
     * @param amountOutMin 許容する出力トークンの最小量
     * @param path スワップパス（WETHから始まる）
     * @param to トークンの受取人アドレス
     * @param deadline トランザクションの有効期限
     * @return amounts 各ステップでの実際の交換量
     */
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    /**
     * @dev 正確なトークン入力量でETHスワップを実行する
     * @param amountIn 入力するトークンの量
     * @param amountOutMin 許容するETHの最小量
     * @param path スワップパス（WETHで終わる）
     * @param to ETHの受取人アドレス
     * @param deadline トランザクションの有効期限
     * @return amounts 各ステップでの実際の交換量
     */
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @dev 指定された入力量に対する出力量を計算する
     * @param amountIn 入力量
     * @param path スワップパス
     * @return amounts 各ステップでの出力量
     */
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    /**
     * @dev 指定された出力量に必要な入力量を計算する
     * @param amountOut 出力量
     * @param path スワップパス
     * @return amounts 各ステップでの入力量
     */
    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    /**
     * @dev 指定された入力量に対する出力量を計算する（単一ペア）
     * @param amountIn 入力量
     * @param reserveIn 入力トークンのリザーブ量
     * @param reserveOut 出力トークンのリザーブ量
     * @return amountOut 出力量
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountOut);

    /**
     * @dev 指定された出力量に必要な入力量を計算する（単一ペア）
     * @param amountOut 出力量
     * @param reserveIn 入力トークンのリザーブ量
     * @param reserveOut 出力トークンのリザーブ量
     * @return amountIn 入力量
     */
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountIn);

    /**
     * @dev 指定されたリザーブ比率に基づいて等価な量を計算する
     * @param amountA 基準となるトークンAの量
     * @param reserveA トークンAのリザーブ量
     * @param reserveB トークンBのリザーブ量
     * @return amountB 等価なトークンBの量
     */
    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) external pure returns (uint256 amountB);
}