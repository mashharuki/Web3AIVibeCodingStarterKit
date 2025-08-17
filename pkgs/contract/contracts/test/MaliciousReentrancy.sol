// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "../interfaces/IERC20.sol";
import {IDEXPair} from "../interfaces/IDEXPair.sol";
import {IDEXCallee} from "../interfaces/IDEXCallee.sol";

/**
 * @title MaliciousReentrancy
 * @dev Contract to test reentrancy protection in DEXPair
 * @notice This contract attempts to exploit reentrancy vulnerabilities
 */
contract MaliciousReentrancy is IDEXCallee {
    IDEXPair public pair;
    IERC20 public token0;
    IERC20 public token1;
    bool public attacking = false;
    uint256 public attackCount = 0;
    
    constructor(address _pair, address _token0, address _token1) {
        pair = IDEXPair(_pair);
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }
    
    /**
     * @dev Callback function called during flash swaps
     * @notice Attempts to reenter the pair contract
     */
    function dexCall(
        address sender,
        uint256 amount0Out,
        uint256 amount1Out,
        bytes calldata data
    ) external override {
        require(msg.sender == address(pair), "Only pair can call");
        
        if (attacking && attackCount < 2) {
            attackCount++;
            
            // Try to reenter mint function
            try pair.mint(address(this)) {
                // Should fail due to reentrancy protection
            } catch {
                // Expected to fail
            }
            
            // Try to reenter burn function
            try pair.burn(address(this)) {
                // Should fail due to reentrancy protection
            } catch {
                // Expected to fail
            }
            
            // Try to reenter swap function
            try pair.swap(0, 1, address(this), "0x") {
                // Should fail due to reentrancy protection
            } catch {
                // Expected to fail
            }
        }
        
        // Pay back the flash loan (just return what was borrowed for simplicity)
        // In a real flash swap, we would need to pay the fee, but for testing reentrancy
        // we just need to ensure the transaction doesn't revert due to insufficient payment
        if (amount0Out > 0) {
            token0.transfer(address(pair), amount0Out + 1);
        }
        if (amount1Out > 0) {
            token1.transfer(address(pair), amount1Out + 1);
        }
    }
    
    /**
     * @dev Initiates a reentrancy attack via flash swap
     */
    function attack() external {
        attacking = true;
        attackCount = 0;
        
        // Initiate flash swap to trigger callback (borrow 1 wei of token0)
        pair.swap(1, 0, address(this), "0x01");
        
        attacking = false;
    }
    
    /**
     * @dev Attempts direct reentrancy on mint
     */
    function attackMint() external {
        // Transfer tokens to pair
        uint256 balance0 = token0.balanceOf(address(this));
        uint256 balance1 = token1.balanceOf(address(this));
        
        if (balance0 > 0) token0.transfer(address(pair), balance0);
        if (balance1 > 0) token1.transfer(address(pair), balance1);
        
        // Try to mint (should work normally)
        pair.mint(address(this));
    }
    
    /**
     * @dev Attempts direct reentrancy on burn
     */
    function attackBurn() external {
        uint256 liquidity = IERC20(address(pair)).balanceOf(address(this));
        if (liquidity > 0) {
            // Transfer LP tokens to pair
            IERC20(address(pair)).transfer(address(pair), liquidity);
            
            // Try to burn (should work normally)
            pair.burn(address(this));
        }
    }
    
    /**
     * @dev Receives tokens from pair operations
     */
    function onTokenReceived() external {
        // This could be called during token transfers
        // Attempt reentrancy here would be blocked
    }
    
    /**
     * @dev Fallback function to receive ETH
     */
    receive() external payable {}
}