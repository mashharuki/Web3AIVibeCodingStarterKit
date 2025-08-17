// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IDEXPair
 * @dev Pair contract interface for managing liquidity pools and token swaps
 */
interface IDEXPair {
    /**
     * @dev Emitted when liquidity is minted
     * @param sender Address that provided liquidity
     * @param amount0 Amount of token0 added
     * @param amount1 Amount of token1 added
     */
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);

    /**
     * @dev Emitted when liquidity is burned
     * @param sender Address that removed liquidity
     * @param amount0 Amount of token0 removed
     * @param amount1 Amount of token1 removed
     * @param to Address that received the tokens
     */
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);

    /**
     * @dev Emitted when a swap occurs
     * @param sender Address that initiated the swap
     * @param amount0In Amount of token0 sent to pair
     * @param amount1In Amount of token1 sent to pair
     * @param amount0Out Amount of token0 sent from pair
     * @param amount1Out Amount of token1 sent from pair
     * @param to Address that received the output tokens
     */
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );

    /**
     * @dev Emitted when reserves are synced
     * @param reserve0 New reserve of token0
     * @param reserve1 New reserve of token1
     */
    event Sync(uint112 reserve0, uint112 reserve1);

    /**
     * @dev Returns the address of token0
     * @return token0 Address of the first token
     */
    function token0() external view returns (address token0);

    /**
     * @dev Returns the address of token1
     * @return token1 Address of the second token
     */
    function token1() external view returns (address token1);

    /**
     * @dev Returns the current reserves and last update timestamp
     * @return reserve0 Reserve of token0
     * @return reserve1 Reserve of token1
     * @return blockTimestampLast Timestamp of last update
     */
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    /**
     * @dev Returns the factory address that created this pair
     * @return factory Address of the factory contract
     */
    function factory() external view returns (address factory);

    /**
     * @dev Mints liquidity tokens to the specified address
     * @param to Address to receive the liquidity tokens
     * @return liquidity Amount of liquidity tokens minted
     */
    function mint(address to) external returns (uint256 liquidity);

    /**
     * @dev Burns liquidity tokens and returns underlying tokens
     * @param to Address to receive the underlying tokens
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     */
    function burn(address to) external returns (uint256 amount0, uint256 amount1);

    /**
     * @dev Swaps tokens
     * @param amount0Out Amount of token0 to send out
     * @param amount1Out Amount of token1 to send out
     * @param to Address to receive the output tokens
     * @param data Calldata for flash swap callback
     */
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;

    /**
     * @dev Skims excess tokens to the specified address
     * @param to Address to receive excess tokens
     */
    function skim(address to) external;

    /**
     * @dev Syncs reserves to match current token balances
     */
    function sync() external;

    /**
     * @dev Initializes the pair with token addresses
     * @param _token0 Address of token0
     * @param _token1 Address of token1
     */
    function initialize(address _token0, address _token1) external;
}