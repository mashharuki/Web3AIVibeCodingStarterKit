// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {ITestTokenFaucet} from "./interfaces/ITestTokenFaucet.sol";
import {Errors} from "./libraries/Errors.sol";

/**
 * @title TestTokenFaucet
 * @dev Faucet contract for distributing test tokens with daily limits and cooldown periods
 */
contract TestTokenFaucet is ITestTokenFaucet, Ownable, ReentrancyGuard {
    /// @dev Default cooldown period (24 hours in seconds)
    uint256 public constant DEFAULT_COOLDOWN = 24 hours;
    
    /// @dev Maximum cooldown period (7 days in seconds)
    uint256 public constant MAX_COOLDOWN = 7 days;
    
    /// @dev Cooldown period between requests
    uint256 private _cooldown;
    
    /// @dev Mapping from token address to daily limit
    mapping(address => uint256) private _tokenLimits;
    
    /// @dev Mapping from user address to token address to last request timestamp
    mapping(address => mapping(address => uint256)) private _lastRequestTime;
    
    /// @dev Array of supported token addresses
    address[] private _supportedTokens;
    
    /// @dev Mapping to check if token is supported (for O(1) lookup)
    mapping(address => bool) private _isTokenSupported;

    /**
     * @dev Constructor sets the initial owner and cooldown period
     * @param initialOwner Address of the initial owner
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        _cooldown = DEFAULT_COOLDOWN;
    }

    /**
     * @dev Requests tokens from the faucet
     * @param token Address of the token to request
     * @param amount Amount of tokens to request
     */
    function requestTokens(address token, uint256 amount) external nonReentrant {
        if (token == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.InvalidAmount();
        if (!_isTokenSupported[token]) revert Errors.TokenNotSupported();
        
        uint256 limit = _tokenLimits[token];
        if (amount > limit) revert Errors.ExceedsLimit();
        
        uint256 lastRequest = _lastRequestTime[msg.sender][token];
        if (lastRequest != 0 && block.timestamp < lastRequest + _cooldown) {
            revert Errors.CooldownNotExpired();
        }
        
        // Check faucet balance
        IERC20 tokenContract = IERC20(token);
        uint256 faucetBalance = tokenContract.balanceOf(address(this));
        if (faucetBalance < amount) revert Errors.InsufficientFaucetBalance();
        
        // Update last request time
        _lastRequestTime[msg.sender][token] = block.timestamp;
        
        // Transfer tokens
        bool success = tokenContract.transfer(msg.sender, amount);
        if (!success) revert Errors.TransferFailed();
        
        emit TokensRequested(msg.sender, token, amount, block.timestamp);
    }

    /**
     * @dev Sets the daily limit for a specific token
     * @param token Address of the token
     * @param limit New daily limit amount
     */
    function setTokenLimit(address token, uint256 limit) external onlyOwner {
        if (token == address(0)) revert Errors.ZeroAddress();
        if (!_isTokenSupported[token]) revert Errors.TokenNotSupported();
        
        uint256 oldLimit = _tokenLimits[token];
        _tokenLimits[token] = limit;
        
        emit TokenLimitUpdated(token, oldLimit, limit);
    }

    /**
     * @dev Sets the cooldown period between requests
     * @param cooldown New cooldown period in seconds
     */
    function setCooldown(uint256 cooldown) external onlyOwner {
        if (cooldown > MAX_COOLDOWN) revert Errors.InvalidAmount();
        
        uint256 oldCooldown = _cooldown;
        _cooldown = cooldown;
        
        emit CooldownUpdated(oldCooldown, cooldown);
    }

    /**
     * @dev Adds a new token to the faucet
     * @param token Address of the token to add
     * @param limit Daily limit for the token
     */
    function addToken(address token, uint256 limit) external onlyOwner {
        if (token == address(0)) revert Errors.ZeroAddress();
        if (_isTokenSupported[token]) revert Errors.TokenAlreadyExists();
        
        _isTokenSupported[token] = true;
        _tokenLimits[token] = limit;
        _supportedTokens.push(token);
        
        emit TokenAdded(token, limit);
    }

    /**
     * @dev Removes a token from the faucet
     * @param token Address of the token to remove
     */
    function removeToken(address token) external onlyOwner {
        if (token == address(0)) revert Errors.ZeroAddress();
        if (!_isTokenSupported[token]) revert Errors.TokenNotSupported();
        
        _isTokenSupported[token] = false;
        _tokenLimits[token] = 0;
        
        // Remove from supported tokens array
        for (uint256 i = 0; i < _supportedTokens.length; i++) {
            if (_supportedTokens[i] == token) {
                _supportedTokens[i] = _supportedTokens[_supportedTokens.length - 1];
                _supportedTokens.pop();
                break;
            }
        }
        
        emit TokenRemoved(token);
    }

    /**
     * @dev Returns the daily limit for a specific token
     * @param token Address of the token
     * @return limit Daily limit amount
     */
    function getTokenLimit(address token) external view returns (uint256 limit) {
        return _tokenLimits[token];
    }

    /**
     * @dev Returns the last request time for a user and token
     * @param user Address of the user
     * @param token Address of the token
     * @return timestamp Last request timestamp
     */
    function getLastRequestTime(address user, address token) external view returns (uint256 timestamp) {
        return _lastRequestTime[user][token];
    }

    /**
     * @dev Returns the cooldown period
     * @return cooldown Cooldown period in seconds
     */
    function getCooldown() external view returns (uint256 cooldown) {
        return _cooldown;
    }

    /**
     * @dev Returns the remaining cooldown time for a user and token
     * @param user Address of the user
     * @param token Address of the token
     * @return remainingTime Remaining cooldown time in seconds
     */
    function getRemainingCooldown(address user, address token) external view returns (uint256 remainingTime) {
        uint256 lastRequest = _lastRequestTime[user][token];
        if (lastRequest == 0) return 0;
        
        uint256 nextRequestTime = lastRequest + _cooldown;
        if (block.timestamp >= nextRequestTime) return 0;
        
        return nextRequestTime - block.timestamp;
    }

    /**
     * @dev Checks if a token is supported by the faucet
     * @param token Address of the token
     * @return supported True if token is supported
     */
    function isTokenSupported(address token) external view returns (bool supported) {
        return _isTokenSupported[token];
    }

    /**
     * @dev Returns all supported tokens
     * @return tokens Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory tokens) {
        return _supportedTokens;
    }

    /**
     * @dev Emergency function to withdraw tokens from the faucet
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     * @param to Address to receive the tokens
     */
    function emergencyWithdraw(address token, uint256 amount, address to) external onlyOwner {
        if (token == address(0)) revert Errors.ZeroAddress();
        if (to == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.InvalidAmount();
        
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        if (balance < amount) revert Errors.InsufficientFaucetBalance();
        
        bool success = tokenContract.transfer(to, amount);
        if (!success) revert Errors.TransferFailed();
    }
}