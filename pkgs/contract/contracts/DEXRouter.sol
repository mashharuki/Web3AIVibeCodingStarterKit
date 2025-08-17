// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "./interfaces/IERC20.sol";
import {IDEXRouter} from "./interfaces/IDEXRouter.sol";
import {IDEXFactory} from "./interfaces/IDEXFactory.sol";
import {IDEXPair} from "./interfaces/IDEXPair.sol";
import {Errors} from "./libraries/Errors.sol";

/**
 * @title DEXRouter
 * @dev Router contract providing user-friendly interfaces for DEX operations
 * @notice This contract handles liquidity management and token swaps with slippage protection
 */
contract DEXRouter is IDEXRouter {
    // ============ Constants ============
    
    /// @dev Factory contract address
    address private immutable _factory;
    
    /// @dev WETH contract address (for future ETH support)
    address private immutable _weth;
    
    // ============ Modifiers ============
    
    /// @dev Ensures transaction is executed before deadline
    modifier ensure(uint256 deadline) {
        if (deadline < block.timestamp) revert Errors.DeadlineExpired();
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @dev Constructor sets factory and WETH addresses
     * @param factoryAddress Address of the DEX factory contract
     * @param wethAddress Address of the WETH contract
     */
    constructor(address factoryAddress, address wethAddress) {
        if (factoryAddress == address(0) || wethAddress == address(0)) {
            revert Errors.ZeroAddress();
        }
        _factory = factoryAddress;
        _weth = wethAddress;
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Returns the factory address
     * @return factoryAddress Address of the factory contract
     */
    function factory() external view override returns (address factoryAddress) {
        return _factory;
    }
    
    /**
     * @dev Returns the WETH address
     * @return wethAddress Address of the wrapped ETH contract
     */
    function weth() external view override returns (address wethAddress) {
        return _weth;
    }
    
    // ============ Library Functions ============
    
    /**
     * @dev Sorts two token addresses
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return token0 Smaller address
     * @return token1 Larger address
     */
    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        if (tokenA == tokenB) revert Errors.IdenticalAddresses();
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        if (token0 == address(0)) revert Errors.ZeroAddress();
    }
    
    /**
     * @dev Calculates pair address for two tokens
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return pair Pair contract address
     */
    function _pairFor(address tokenA, address tokenB) internal view returns (address pair) {
        pair = IDEXFactory(_factory).getPair(tokenA, tokenB);
        if (pair == address(0)) revert Errors.PairNotExists();
    }
    
    /**
     * @dev Fetches and sorts reserves for a pair
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return reserveA Reserve of tokenA
     * @return reserveB Reserve of tokenB
     */
    function _getReserves(address tokenA, address tokenB) internal view returns (uint256 reserveA, uint256 reserveB) {
        (address token0,) = _sortTokens(tokenA, tokenB);
        address pair = _pairFor(tokenA, tokenB);
        (uint256 reserve0, uint256 reserve1,) = IDEXPair(pair).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }
    
    /**
     * @dev Calculates optimal amounts for adding liquidity
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param amountADesired Desired amount of tokenA
     * @param amountBDesired Desired amount of tokenB
     * @param amountAMin Minimum amount of tokenA
     * @param amountBMin Minimum amount of tokenB
     * @return amountA Optimal amount of tokenA
     * @return amountB Optimal amount of tokenB
     */
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        // Check if pair exists, if not it will be created
        if (IDEXFactory(_factory).getPair(tokenA, tokenB) == address(0)) {
            // For new pairs, use desired amounts
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            (uint256 reserveA, uint256 reserveB) = _getReserves(tokenA, tokenB);
            uint256 amountBOptimal = _quote(amountADesired, reserveA, reserveB);
            
            if (amountBOptimal <= amountBDesired) {
                if (amountBOptimal < amountBMin) revert Errors.InsufficientBAmount();
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = _quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                if (amountAOptimal < amountAMin) revert Errors.InsufficientAAmount();
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }
    
    /**
     * @dev Quotes amount of tokenB needed for given amount of tokenA
     * @param amountA Amount of tokenA
     * @param reserveA Reserve of tokenA
     * @param reserveB Reserve of tokenB
     * @return amountB Required amount of tokenB
     */
    function _quote(uint256 amountA, uint256 reserveA, uint256 reserveB) internal pure returns (uint256 amountB) {
        if (amountA == 0) revert Errors.InsufficientInputAmount();
        if (reserveA == 0 || reserveB == 0) revert Errors.InsufficientLiquidity();
        amountB = (amountA * reserveB) / reserveA;
    }
    
    /**
     * @dev Safe token transfer from user to contract
     * @param token Token address
     * @param from Sender address
     * @param to Recipient address
     * @param value Amount to transfer
     */
    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert Errors.TransferFailed();
        }
    }
    
    // ============ Liquidity Functions ============
    
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
    ) external override ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        // Calculate optimal amounts
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        
        // Get or create pair
        address pair = IDEXFactory(_factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = IDEXFactory(_factory).createPair(tokenA, tokenB);
        }
        
        // Transfer tokens to pair
        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        
        // Mint liquidity tokens
        liquidity = IDEXPair(pair).mint(to);
    }
    
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
    ) external override ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pair = _pairFor(tokenA, tokenB);
        
        // Transfer LP tokens to pair for burning
        IERC20(pair).transferFrom(msg.sender, pair, liquidity);
        
        // Burn LP tokens and get underlying tokens
        (uint256 amount0, uint256 amount1) = IDEXPair(pair).burn(to);
        
        // Sort amounts according to token order
        (address token0,) = _sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        
        // Check minimum amounts
        if (amountA < amountAMin) revert Errors.InsufficientAAmount();
        if (amountB < amountBMin) revert Errors.InsufficientBAmount();
    }
    
    // ============ Swap Functions ============
    
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
    ) external override ensure(deadline) returns (uint256[] memory amounts) {
        amounts = _getAmountsOut(amountIn, path);
        if (amounts[amounts.length - 1] < amountOutMin) {
            revert Errors.InsufficientOutputAmount();
        }
        
        // Transfer input tokens to first pair
        _safeTransferFrom(path[0], msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        
        // Execute swaps
        _swap(amounts, path, to);
    }
    
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
    ) external override ensure(deadline) returns (uint256[] memory amounts) {
        amounts = _getAmountsIn(amountOut, path);
        if (amounts[0] > amountInMax) {
            revert Errors.ExcessiveInputAmount();
        }
        
        // Transfer input tokens to first pair
        _safeTransferFrom(path[0], msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        
        // Execute swaps
        _swap(amounts, path, to);
    }
    
    /**
     * @dev Internal function to execute swaps along a path
     * @param amounts Array of amounts for each step
     * @param path Array of token addresses
     * @param _to Final recipient address
     */
    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = _sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            
            (uint256 amount0Out, uint256 amount1Out) = input == token0 
                ? (uint256(0), amountOut) 
                : (amountOut, uint256(0));
            
            address to = i < path.length - 2 ? _pairFor(output, path[i + 2]) : _to;
            
            IDEXPair(_pairFor(input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }
    
    // ============ Quote Functions ============
    
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
        override
        returns (uint256 amountOut)
    {
        return _getAmountOut(amountIn, reserveIn, reserveOut);
    }
    
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
        override
        returns (uint256 amountIn)
    {
        return _getAmountIn(amountOut, reserveIn, reserveOut);
    }
    
    /**
     * @dev Performs chained getAmountOut calculations on any number of pairs
     * @param amountIn Amount of input asset
     * @param path Array of token addresses representing the swap path
     * @return amounts Array of input/output amounts for each step
     */
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        override
        returns (uint256[] memory amounts)
    {
        return _getAmountsOut(amountIn, path);
    }
    
    /**
     * @dev Performs chained getAmountIn calculations on any number of pairs
     * @param amountOut Amount of output asset
     * @param path Array of token addresses representing the swap path
     * @return amounts Array of input/output amounts for each step
     */
    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        override
        returns (uint256[] memory amounts)
    {
        return _getAmountsIn(amountOut, path);
    }
    
    // ============ Internal Quote Functions ============
    
    /**
     * @dev Internal function to calculate output amount with 0.3% fee
     * @param amountIn Amount of input asset
     * @param reserveIn Reserve of input asset
     * @param reserveOut Reserve of output asset
     * @return amountOut Output amount
     */
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert Errors.InsufficientInputAmount();
        if (reserveIn == 0 || reserveOut == 0) revert Errors.InsufficientLiquidity();
        
        uint256 amountInWithFee = amountIn * 997; // 0.3% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }
    
    /**
     * @dev Internal function to calculate required input amount with 0.3% fee
     * @param amountOut Amount of output asset
     * @param reserveIn Reserve of input asset
     * @param reserveOut Reserve of output asset
     * @return amountIn Required input amount
     */
    function _getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountIn)
    {
        if (amountOut == 0) revert Errors.InsufficientOutputAmount();
        if (reserveIn == 0 || reserveOut == 0) revert Errors.InsufficientLiquidity();
        
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1; // Add 1 to round up
    }
    
    /**
     * @dev Internal function for chained getAmountOut calculations
     * @param amountIn Amount of input asset
     * @param path Array of token addresses
     * @return amounts Array of amounts for each step
     */
    function _getAmountsOut(uint256 amountIn, address[] memory path)
        internal
        view
        returns (uint256[] memory amounts)
    {
        if (path.length < 2) revert Errors.InvalidPath();
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = _getReserves(path[i], path[i + 1]);
            amounts[i + 1] = _getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }
    
    /**
     * @dev Internal function for chained getAmountIn calculations
     * @param amountOut Amount of output asset
     * @param path Array of token addresses
     * @return amounts Array of amounts for each step
     */
    function _getAmountsIn(uint256 amountOut, address[] memory path)
        internal
        view
        returns (uint256[] memory amounts)
    {
        if (path.length < 2) revert Errors.InvalidPath();
        
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        
        for (uint256 i = path.length - 1; i > 0; i--) {
            (uint256 reserveIn, uint256 reserveOut) = _getReserves(path[i - 1], path[i]);
            amounts[i - 1] = _getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }
}