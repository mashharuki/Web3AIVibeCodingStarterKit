// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IDEXFactory} from "./interfaces/IDEXFactory.sol";
import {IDEXPair} from "./interfaces/IDEXPair.sol";
import {Errors} from "./libraries/Errors.sol";
import {DEXPair} from "./DEXPair.sol";

/**
 * @title DEXFactory
 * @dev Factory contract for creating and managing DEX trading pairs
 * @notice This contract implements the Uniswap V2 factory pattern with OpenZeppelin Ownable for access control
 */
contract DEXFactory is IDEXFactory, Ownable {
    /// @dev Mapping from token pair to pair address
    /// @notice getPair[tokenA][tokenB] returns the pair address for tokenA and tokenB
    mapping(address => mapping(address => address)) public override getPair;

    /// @dev Array of all created pair addresses
    address[] public override allPairs;

    /// @dev Address that receives protocol fees
    address public override feeTo;

    /// @dev Address that can set the feeTo address
    address public override feeToSetter;

    /// @dev Events
    event FeeToUpdated(address indexed oldFeeTo, address indexed newFeeTo);
    event FeeToSetterUpdated(address indexed oldFeeToSetter, address indexed newFeeToSetter);

    /**
     * @dev Constructor sets the initial fee setter
     * @param _feeToSetter Address that can set the feeTo address
     */
    constructor(address _feeToSetter) Ownable(msg.sender) {
        if (_feeToSetter == address(0)) {
            revert Errors.ZeroAddress();
        }
        feeToSetter = _feeToSetter;
    }

    /**
     * @dev Creates a new trading pair for two tokens
     * @param tokenA Address of the first token
     * @param tokenB Address of the second token
     * @return pair Address of the created pair contract
     * @notice Tokens are sorted to ensure consistent pair addresses
     */
    function createPair(address tokenA, address tokenB) external override returns (address pair) {
        // Validate input addresses
        if (tokenA == tokenB) {
            revert Errors.IdenticalAddresses();
        }
        
        // Sort tokens to ensure consistent pair addresses
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        if (token0 == address(0)) {
            revert Errors.ZeroAddress();
        }
        
        // Check if pair already exists
        if (getPair[token0][token1] != address(0)) {
            revert Errors.PairExists();
        }

        // Create pair contract using CREATE2 for deterministic addresses
        bytes memory bytecode = type(DEXPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        // Initialize the pair contract
        IDEXPair(pair).initialize(token0, token1);
        
        // Store pair address in both directions
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        
        // Add to allPairs array
        allPairs.push(pair);
        
        // Emit event
        emit PairCreated(token0, token1, pair, allPairs.length - 1);
    }

    /**
     * @dev Returns the total number of pairs created
     * @return length Total number of pairs
     */
    function allPairsLength() external view override returns (uint256 length) {
        return allPairs.length;
    }

    /**
     * @dev Sets the address that receives protocol fees
     * @param _feeTo New address to receive fees
     * @notice Only the feeToSetter can call this function
     */
    function setFeeTo(address _feeTo) external override {
        if (msg.sender != feeToSetter) {
            revert Errors.Forbidden();
        }
        
        address oldFeeTo = feeTo;
        feeTo = _feeTo;
        
        emit FeeToUpdated(oldFeeTo, _feeTo);
    }

    /**
     * @dev Sets the address that can set the feeTo address
     * @param _feeToSetter New address that can set feeTo
     * @notice Only the current owner can call this function
     */
    function setFeeToSetter(address _feeToSetter) external override onlyOwner {
        if (_feeToSetter == address(0)) {
            revert Errors.ZeroAddress();
        }
        
        address oldFeeToSetter = feeToSetter;
        feeToSetter = _feeToSetter;
        
        emit FeeToSetterUpdated(oldFeeToSetter, _feeToSetter);
    }
}

