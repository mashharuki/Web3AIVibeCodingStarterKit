// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "./interfaces/IERC20.sol";
import {IDEXPair} from "./interfaces/IDEXPair.sol";
import {IDEXCallee} from "./interfaces/IDEXCallee.sol";
import {Errors} from "./libraries/Errors.sol";

/**
 * @title DEXPair
 * @dev Automated Market Maker pair contract implementing x*y=k formula
 * @notice This contract manages liquidity pools and token swaps for two ERC20 tokens
 */
contract DEXPair is IDEXPair {
    // ============ Constants ============
    
    /// @dev Minimum liquidity locked forever to prevent division by zero
    uint256 public constant MINIMUM_LIQUIDITY = 10**3;
    
    // ============ State Variables ============
    
    /// @dev Factory contract address that created this pair
    address public override factory;
    
    /// @dev Address of token0 (lexicographically smaller address)
    address public override token0;
    
    /// @dev Address of token1 (lexicographically larger address)  
    address public override token1;
    
    /// @dev Reserve of token0 (packed with reserve1 and blockTimestampLast)
    uint112 private reserve0;
    
    /// @dev Reserve of token1 (packed with reserve0 and blockTimestampLast)
    uint112 private reserve1;
    
    /// @dev Timestamp of last reserve update (packed with reserves)
    uint32 private blockTimestampLast;
    
    // ============ ERC20 State Variables ============
    
    /// @dev Total supply of LP tokens
    uint256 public totalSupply;
    
    /// @dev LP token balances
    mapping(address => uint256) public balanceOf;
    
    /// @dev LP token allowances
    mapping(address => mapping(address => uint256)) public allowance;
    
    /// @dev LP token name
    string public name = "DEX LP Token";
    
    /// @dev LP token symbol
    string public symbol = "DEX-LP";
    
    /// @dev LP token decimals
    uint8 public constant decimals = 18;
    
    // ============ Price Oracle Variables ============
    
    /// @dev Cumulative price of token0 (for TWAP oracle)
    uint256 public price0CumulativeLast;
    
    /// @dev Cumulative price of token1 (for TWAP oracle)
    uint256 public price1CumulativeLast;
    
    /// @dev Product of reserves at last liquidity event (for protocol fee calculation)
    uint256 public kLast;
    
    // ============ Reentrancy Protection ============
    
    /// @dev Reentrancy lock status
    uint256 private unlocked = 1;
    
    // ============ Events ============
    
    /// @dev ERC20 Transfer event
    event Transfer(address indexed from, address indexed to, uint256 value);
    
    /// @dev ERC20 Approval event
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    // ============ Modifiers ============
    
    /// @dev Prevents reentrancy attacks
    modifier lock() {
        if (unlocked != 1) revert Errors.K();
        unlocked = 0;
        _;
        unlocked = 1;
    }
    
    // ============ Constructor ============
    
    /**
     * @dev Constructor sets the factory address
     */
    constructor() {
        factory = msg.sender;
    }
    
    // ============ Initialization ============
    
    /**
     * @dev Initializes the pair with token addresses
     * @param _token0 Address of token0
     * @param _token1 Address of token1
     * @notice Can only be called once by the factory
     */
    function initialize(address _token0, address _token1) external override {
        if (msg.sender != factory) revert Errors.Forbidden();
        token0 = _token0;
        token1 = _token1;
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Returns current reserves and last update timestamp
     * @return _reserve0 Reserve of token0
     * @return _reserve1 Reserve of token1  
     * @return _blockTimestampLast Timestamp of last update
     */
    function getReserves() 
        external 
        view 
        override 
        returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) 
    {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }
    
    // ============ ERC20 Functions ============
    
    /**
     * @dev Approves spender to spend amount of LP tokens
     * @param spender Address to approve
     * @param value Amount to approve
     * @return success True if approval succeeded
     */
    function approve(address spender, uint256 value) external returns (bool success) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    /**
     * @dev Transfers LP tokens to another address
     * @param to Recipient address
     * @param value Amount to transfer
     * @return success True if transfer succeeded
     */
    function transfer(address to, uint256 value) external returns (bool success) {
        _transfer(msg.sender, to, value);
        return true;
    }
    
    /**
     * @dev Transfers LP tokens from one address to another using allowance
     * @param from Sender address
     * @param to Recipient address
     * @param value Amount to transfer
     * @return success True if transfer succeeded
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool success) {
        if (allowance[from][msg.sender] != type(uint256).max) {
            allowance[from][msg.sender] -= value;
        }
        _transfer(from, to, value);
        return true;
    }
    
    /**
     * @dev Internal transfer function
     * @param from Sender address
     * @param to Recipient address
     * @param value Amount to transfer
     */
    function _transfer(address from, address to, uint256 value) private {
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
    
    /**
     * @dev Mints LP tokens
     * @param to Recipient address
     * @param value Amount to mint
     */
    function _mint(address to, uint256 value) private {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
    
    /**
     * @dev Burns LP tokens
     * @param from Address to burn from
     * @param value Amount to burn
     */
    function _burn(address from, uint256 value) private {
        balanceOf[from] -= value;
        totalSupply -= value;
        emit Transfer(from, address(0), value);
    }
    
    // ============ Core AMM Functions ============
    
    /**
     * @dev Updates reserves and price accumulators
     * @param balance0 Current balance of token0
     * @param balance1 Current balance of token1
     * @param _reserve0 Previous reserve of token0
     * @param _reserve1 Previous reserve of token1
     */
    function _update(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) private {
        if (balance0 > type(uint112).max || balance1 > type(uint112).max) {
            revert Errors.Overflow();
        }
        
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        
        // Update price accumulators if time has passed and reserves exist
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // Overflow is desired for price accumulators
            unchecked {
                price0CumulativeLast += uint256(_reserve1) * 2**112 / _reserve0 * timeElapsed;
                price1CumulativeLast += uint256(_reserve0) * 2**112 / _reserve1 * timeElapsed;
            }
        }
        
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        
        emit Sync(reserve0, reserve1);
    }
    
    /**
     * @dev Mints protocol fee if enabled
     * @param _reserve0 Reserve of token0
     * @param _reserve1 Reserve of token1
     * @return feeOn True if protocol fee is enabled
     */
    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address feeTo = IDEXFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint256 _kLast = kLast;
        
        if (feeOn) {
            if (_kLast != 0) {
                uint256 rootK = _sqrt(uint256(_reserve0) * _reserve1);
                uint256 rootKLast = _sqrt(_kLast);
                
                if (rootK > rootKLast) {
                    uint256 numerator = totalSupply * (rootK - rootKLast);
                    uint256 denominator = rootK * 5 + rootKLast;
                    uint256 liquidity = numerator / denominator;
                    
                    if (liquidity > 0) {
                        _mint(feeTo, liquidity);
                    }
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }    
 
   /**
     * @dev Mints liquidity tokens to the specified address
     * @param to Address to receive LP tokens
     * @return liquidity Amount of LP tokens minted
     * @notice Caller must transfer tokens to this contract before calling mint
     */
    function mint(address to) external override lock returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = (reserve0, reserve1, blockTimestampLast);
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;
        
        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply;
        
        if (_totalSupply == 0) {
            // First liquidity provision
            uint256 rootProduct = _sqrt(amount0 * amount1);
            if (rootProduct <= MINIMUM_LIQUIDITY) revert Errors.InsufficientLiquidityMinted();
            liquidity = rootProduct - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY); // Lock minimum liquidity forever
        } else {
            // Subsequent liquidity provisions
            liquidity = _min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }
        
        if (liquidity == 0) revert Errors.InsufficientLiquidityMinted();
        
        _mint(to, liquidity);
        _update(balance0, balance1, _reserve0, _reserve1);
        
        if (feeOn) kLast = uint256(reserve0) * reserve1;
        
        emit Mint(msg.sender, amount0, amount1);
    }
    
    /**
     * @dev Burns liquidity tokens and returns underlying tokens
     * @param to Address to receive underlying tokens
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     * @notice Caller must transfer LP tokens to this contract before calling burn
     */
    function burn(address to) external override lock returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = (reserve0, reserve1, blockTimestampLast);
        address _token0 = token0;
        address _token1 = token1;
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf[address(this)];
        
        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply;
        
        // Calculate amounts to return proportional to liquidity burned
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        
        if (amount0 == 0 || amount1 == 0) revert Errors.InsufficientLiquidityBurned();
        
        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        
        _update(balance0, balance1, _reserve0, _reserve1);
        
        if (feeOn) kLast = uint256(reserve0) * reserve1;
        
        emit Burn(msg.sender, amount0, amount1, to);
    }
    
    /**
     * @dev Swaps tokens using the x*y=k formula
     * @param amount0Out Amount of token0 to send out
     * @param amount1Out Amount of token1 to send out
     * @param to Address to receive output tokens
     * @param data Calldata for flash swap callback
     * @notice Implements flash swaps - tokens are sent before payment is verified
     */
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external override lock {
        if (amount0Out == 0 && amount1Out == 0) revert Errors.InsufficientOutputAmount();
        
        (uint112 _reserve0, uint112 _reserve1,) = (reserve0, reserve1, blockTimestampLast);
        
        if (amount0Out >= _reserve0 || amount1Out >= _reserve1) {
            revert Errors.InsufficientLiquidity();
        }
        
        uint256 balance0;
        uint256 balance1;
        
        {
            address _token0 = token0;
            address _token1 = token1;
            
            if (to == _token0 || to == _token1) revert Errors.InvalidTo();
            
            // Send output tokens (flash swap)
            if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out);
            if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out);
            
            // Call callback if data is provided
            if (data.length > 0) {
                IDEXCallee(to).dexCall(msg.sender, amount0Out, amount1Out, data);
            }
            
            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }
        
        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        
        if (amount0In == 0 && amount1In == 0) revert Errors.InsufficientInputAmount();
        
        {
            // Verify x*y=k invariant with 0.3% fee
            uint256 balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
            uint256 balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
            
            if (balance0Adjusted * balance1Adjusted < uint256(_reserve0) * _reserve1 * (1000**2)) {
                revert Errors.K();
            }
        }
        
        _update(balance0, balance1, _reserve0, _reserve1);
        
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }
    
    /**
     * @dev Skims excess tokens to specified address
     * @param to Address to receive excess tokens
     * @notice Removes tokens that exceed the reserves (useful for token rebases)
     */
    function skim(address to) external override lock {
        address _token0 = token0;
        address _token1 = token1;
        
        _safeTransfer(_token0, to, IERC20(_token0).balanceOf(address(this)) - reserve0);
        _safeTransfer(_token1, to, IERC20(_token1).balanceOf(address(this)) - reserve1);
    }
    
    /**
     * @dev Syncs reserves to match current token balances
     * @notice Useful when tokens are sent directly to the pair without calling swap/mint
     */
    function sync() external override lock {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }
    
    // ============ Utility Functions ============
    
    /**
     * @dev Safe token transfer function
     * @param token Token address
     * @param to Recipient address
     * @param value Amount to transfer
     */
    function _safeTransfer(address token, address to, uint256 value) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, value)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert Errors.TransferFailed();
        }
    }
    
    /**
     * @dev Returns the square root of a number using Babylonian method
     * @param y Input number
     * @return z Square root of y
     */
    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    /**
     * @dev Returns the minimum of two numbers
     * @param x First number
     * @param y Second number
     * @return z Minimum of x and y
     */
    function _min(uint256 x, uint256 y) private pure returns (uint256 z) {
        z = x < y ? x : y;
    }
}

/**
 * @title IDEXFactory
 * @dev Interface for the DEX factory contract
 */
interface IDEXFactory {
    function feeTo() external view returns (address);
}