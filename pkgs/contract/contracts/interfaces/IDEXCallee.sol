// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IDEXCallee
 * @dev Interface for contracts that want to receive flash swap callbacks
 */
interface IDEXCallee {
    /**
     * @dev Called by pair contract during a flash swap
     * @param sender Address that initiated the swap
     * @param amount0 Amount of token0 sent to the caller
     * @param amount1 Amount of token1 sent to the caller
     * @param data Arbitrary data passed through by the caller via the swap call
     */
    function dexCall(address sender, uint256 amount0, uint256 amount1, bytes calldata data) external;
}