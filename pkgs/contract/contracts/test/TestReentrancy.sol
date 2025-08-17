// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TestReentrancy
 * @dev Contract to test reentrancy protection mechanisms
 * @notice This contract is for testing purposes only
 */
contract TestReentrancy is ReentrancyGuard {
    uint256 public counter = 0;
    bool public reentrancyAttempted = false;
    
    /**
     * @dev Function protected by nonReentrant modifier
     */
    function testNonReentrant() external nonReentrant {
        counter++;
        
        // Attempt to call itself (should fail due to reentrancy protection)
        try this.testNonReentrant() {
            reentrancyAttempted = true;
        } catch {
            // Expected to fail - reentrancy protection working
        }
    }
    
    /**
     * @dev Function without reentrancy protection for comparison
     */
    function testWithoutProtection() external {
        counter++;
    }
    
    /**
     * @dev Reset state for testing
     */
    function reset() external {
        counter = 0;
        reentrancyAttempted = false;
    }
}