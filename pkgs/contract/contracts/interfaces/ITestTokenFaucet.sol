// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title ITestTokenFaucet
 * @dev Faucet contract interface for distributing test tokens
 */
interface ITestTokenFaucet {
    /**
     * @dev Emitted when tokens are requested from the faucet
     * @param user Address that requested tokens
     * @param token Address of the token requested
     * @param amount Amount of tokens distributed
     * @param timestamp Timestamp of the request
     */
    event TokensRequested(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @dev Emitted when token limit is updated
     * @param token Address of the token
     * @param oldLimit Previous limit amount
     * @param newLimit New limit amount
     */
    event TokenLimitUpdated(
        address indexed token,
        uint256 oldLimit,
        uint256 newLimit
    );

    /**
     * @dev Emitted when cooldown period is updated
     * @param oldCooldown Previous cooldown period in seconds
     * @param newCooldown New cooldown period in seconds
     */
    event CooldownUpdated(
        uint256 oldCooldown,
        uint256 newCooldown
    );

    /**
     * @dev Emitted when a token is added to the faucet
     * @param token Address of the token added
     * @param limit Daily limit for the token
     */
    event TokenAdded(
        address indexed token,
        uint256 limit
    );

    /**
     * @dev Emitted when a token is removed from the faucet
     * @param token Address of the token removed
     */
    event TokenRemoved(
        address indexed token
    );

    /**
     * @dev Requests tokens from the faucet
     * @param token Address of the token to request
     * @param amount Amount of tokens to request
     */
    function requestTokens(address token, uint256 amount) external;

    /**
     * @dev Sets the daily limit for a specific token
     * @param token Address of the token
     * @param limit New daily limit amount
     */
    function setTokenLimit(address token, uint256 limit) external;

    /**
     * @dev Sets the cooldown period between requests
     * @param cooldown New cooldown period in seconds
     */
    function setCooldown(uint256 cooldown) external;

    /**
     * @dev Adds a new token to the faucet
     * @param token Address of the token to add
     * @param limit Daily limit for the token
     */
    function addToken(address token, uint256 limit) external;

    /**
     * @dev Removes a token from the faucet
     * @param token Address of the token to remove
     */
    function removeToken(address token) external;

    /**
     * @dev Returns the daily limit for a specific token
     * @param token Address of the token
     * @return limit Daily limit amount
     */
    function getTokenLimit(address token) external view returns (uint256 limit);

    /**
     * @dev Returns the last request time for a user and token
     * @param user Address of the user
     * @param token Address of the token
     * @return timestamp Last request timestamp
     */
    function getLastRequestTime(address user, address token) external view returns (uint256 timestamp);

    /**
     * @dev Returns the cooldown period
     * @return cooldown Cooldown period in seconds
     */
    function getCooldown() external view returns (uint256 cooldown);

    /**
     * @dev Returns the remaining cooldown time for a user and token
     * @param user Address of the user
     * @param token Address of the token
     * @return remainingTime Remaining cooldown time in seconds
     */
    function getRemainingCooldown(address user, address token) external view returns (uint256 remainingTime);

    /**
     * @dev Checks if a token is supported by the faucet
     * @param token Address of the token
     * @return supported True if token is supported
     */
    function isTokenSupported(address token) external view returns (bool supported);

    /**
     * @dev Returns all supported tokens
     * @return tokens Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory tokens);

    /**
     * @dev Emergency function to withdraw tokens from the faucet
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     * @param to Address to receive the tokens
     */
    function emergencyWithdraw(address token, uint256 amount, address to) external;
}