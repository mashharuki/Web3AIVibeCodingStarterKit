// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title Errors
 * @dev Common error definitions for the DEX system
 */
library Errors {
    // Factory Errors
    error IdenticalAddresses();
    error ZeroAddress();
    error PairExists();
    error PairNotExists();
    error Forbidden();

    // Pair Errors
    error InsufficientLiquidity();
    error InsufficientLiquidityMinted();
    error InsufficientLiquidityBurned();
    error InsufficientOutputAmount();
    error InsufficientInputAmount();
    error InvalidTo();
    error Overflow();
    error K();

    // Router Errors
    error ExcessiveInputAmount();
    error InsufficientAAmount();
    error InsufficientBAmount();
    error DeadlineExpired();
    error InvalidPath();
    error InsufficientBalance();

    // Faucet Errors
    error TokenNotSupported();
    error ExceedsLimit();
    error CooldownNotExpired();
    error InsufficientFaucetBalance();
    error InvalidAmount();
    error TokenAlreadyExists();

    // General Errors
    error Unauthorized();
    error InvalidAddress();
    error TransferFailed();
    error ApprovalFailed();
}