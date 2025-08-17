// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IDEXRouter
 * @dev Router contract interface for user-friendly DEX interactions
 */
interface IDEXRouter {
    /**
     * @dev Returns the factory address
     * @return factory Address of the factory contract
     */
    function factory() external view returns (address factory);

    /**
     * @dev Returns the WETH address
     * @return wethAddress Address of the wrapped ETH contract
     */
    function weth() external view returns (address wethAddress);

    /**
     * @dev Adds liquidity to a token pair
     * @param tokenA Address of tokenA
     * @param tokenB Address of tokenB
     * @param amountADesired Desired amount of tokenA to add
     * @param amountBDesired Desired amount of tokenB to add
     * @param amountAMin Minimum amount of tokenA to add
     * @param amountBMin Minimum amount of tokenB to add
     * @param to Address to receive liquidity tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amountA Actual amount of tokenA added
     * @return amountB Actual amount of tokenB added
     * @return liquidity Amount of liquidity tokens minted
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
     * @dev Removes liquidity from a token pair
     * @param tokenA Address of tokenA
     * @param tokenB Address of tokenB
     * @param liquidity Amount of liquidity tokens to burn
     * @param amountAMin Minimum amount of tokenA to receive
     * @param amountBMin Minimum amount of tokenB to receive
     * @param to Address to receive the tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amountA Amount of tokenA received
     * @return amountB Amount of tokenB received
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
     * @dev Swaps an exact amount of input tokens for as many output tokens as possible
     * @param amountIn Amount of input tokens to send
     * @param amountOutMin Minimum amount of output tokens to receive
     * @param path Array of token addresses representing the swap path
     * @param to Address to receive the output tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amounts Array of input/output amounts for each step of the swap
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @dev Swaps tokens for an exact amount of output tokens
     * @param amountOut Amount of output tokens to receive
     * @param amountInMax Maximum amount of input tokens to send
     * @param path Array of token addresses representing the swap path
     * @param to Address to receive the output tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amounts Array of input/output amounts for each step of the swap
     */
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @dev Given an input amount of an asset and pair reserves, returns the maximum output amount
     * @param amountIn Amount of input asset
     * @param reserveIn Reserve of input asset
     * @param reserveOut Reserve of output asset
     * @return amountOut Maximum output amount
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        external
        pure
        returns (uint256 amountOut);

    /**
     * @dev Given an output amount of an asset and pair reserves, returns a required input amount
     * @param amountOut Amount of output asset
     * @param reserveIn Reserve of input asset
     * @param reserveOut Reserve of output asset
     * @return amountIn Required input amount
     */
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        external
        pure
        returns (uint256 amountIn);

    /**
     * @dev Performs chained getAmountOut calculations on any number of pairs
     * @param amountIn Amount of input asset
     * @param path Array of token addresses representing the swap path
     * @return amounts Array of input/output amounts for each step
     */
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    /**
     * @dev Performs chained getAmountIn calculations on any number of pairs
     * @param amountOut Amount of output asset
     * @param path Array of token addresses representing the swap path
     * @return amounts Array of input/output amounts for each step
     */
    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);
}