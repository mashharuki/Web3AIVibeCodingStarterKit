// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IDEXFactory
 * @dev Factory contract interface for creating and managing trading pairs
 */
interface IDEXFactory {
    /**
     * @dev Emitted when a new pair is created
     * @param token0 Address of the first token
     * @param token1 Address of the second token
     * @param pair Address of the created pair contract
     * @param pairIndex Index of the pair in allPairs array
     */
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 pairIndex
    );

    /**
     * @dev Creates a new trading pair for two tokens
     * @param tokenA Address of the first token
     * @param tokenB Address of the second token
     * @return pair Address of the created pair contract
     */
    function createPair(address tokenA, address tokenB) external returns (address pair);

    /**
     * @dev Returns the pair address for two tokens
     * @param tokenA Address of the first token
     * @param tokenB Address of the second token
     * @return pair Address of the pair contract (zero address if doesn't exist)
     */
    function getPair(address tokenA, address tokenB) external view returns (address pair);

    /**
     * @dev Returns the pair address at the given index
     * @param index Index in the allPairs array
     * @return pair Address of the pair contract
     */
    function allPairs(uint256 index) external view returns (address pair);

    /**
     * @dev Returns the total number of pairs created
     * @return length Total number of pairs
     */
    function allPairsLength() external view returns (uint256 length);

    /**
     * @dev Returns the address that receives protocol fees
     * @return feeTo Address that receives fees
     */
    function feeTo() external view returns (address feeTo);

    /**
     * @dev Returns the address that can set the feeTo address
     * @return feeToSetter Address that can set feeTo
     */
    function feeToSetter() external view returns (address feeToSetter);

    /**
     * @dev Sets the address that receives protocol fees
     * @param _feeTo New address to receive fees
     */
    function setFeeTo(address _feeTo) external;

    /**
     * @dev Sets the address that can set the feeTo address
     * @param _feeToSetter New address that can set feeTo
     */
    function setFeeToSetter(address _feeToSetter) external;
}