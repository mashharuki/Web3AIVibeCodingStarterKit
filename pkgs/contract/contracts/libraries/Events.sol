// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title Events
 * @dev Common event definitions for the DEX system
 */
library Events {
    // Factory Events
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 pairIndex
    );

    event FeeToUpdated(
        address indexed oldFeeTo,
        address indexed newFeeTo
    );

    event FeeToSetterUpdated(
        address indexed oldFeeToSetter,
        address indexed newFeeToSetter
    );

    // Pair Events
    event Mint(
        address indexed sender,
        uint256 amount0,
        uint256 amount1
    );

    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        address indexed to
    );

    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );

    event Sync(
        uint112 reserve0,
        uint112 reserve1
    );

    // Router Events
    event LiquidityAdded(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity,
        address indexed to
    );

    event LiquidityRemoved(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity,
        address indexed to
    );

    event TokensSwapped(
        address indexed sender,
        address[] path,
        uint256[] amounts,
        address indexed to
    );

    // Faucet Events
    event TokensRequested(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    event TokenLimitUpdated(
        address indexed token,
        uint256 oldLimit,
        uint256 newLimit
    );

    event CooldownUpdated(
        uint256 oldCooldown,
        uint256 newCooldown
    );

    event TokenAdded(
        address indexed token,
        uint256 limit
    );

    event TokenRemoved(
        address indexed token
    );

    event EmergencyWithdrawal(
        address indexed token,
        uint256 amount,
        address indexed to
    );
}