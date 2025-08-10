// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DexPair
 * @dev 流動性プールとLPトークンの機能を提供するペアコントラクト
 * @notice Uniswap V2のペアパターンに基づいた実装
 */
contract DexPair is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /// @dev 最小流動性量（最初の流動性提供時にロックされる）
    uint256 public constant MINIMUM_LIQUIDITY = 10**3;
    
    /// @dev ファクトリーコントラクトのアドレス
    address public factory;
    
    /// @dev ペアの最初のトークンアドレス
    address public token0;
    
    /// @dev ペアの二番目のトークンアドレス
    address public token1;
    
    /// @dev 前回の各トークンのリザーブ量
    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;
    
    /// @dev 累積価格（価格オラクル用）
    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    
    /// @dev kLast（手数料計算用）
    uint256 public kLast;
    
    /**
     * @dev スワップ時に発生するイベント
     * @param sender スワップを実行したアドレス
     * @param amount0In token0の入力量
     * @param amount1In token1の入力量
     * @param amount0Out token0の出力量
     * @param amount1Out token1の出力量
     * @param to 出力トークンの受取人
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
     * @dev 流動性追加時に発生するイベント
     * @param sender 流動性を追加したアドレス
     * @param amount0 追加されたtoken0の量
     * @param amount1 追加されたtoken1の量
     */
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    
    /**
     * @dev 流動性削除時に発生するイベント
     * @param sender 流動性を削除したアドレス
     * @param amount0 削除されたtoken0の量
     * @param amount1 削除されたtoken1の量
     * @param to トークンの受取人
     */
    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        address indexed to
    );
    
    /**
     * @dev リザーブ同期時に発生するイベント
     * @param reserve0 token0のリザーブ量
     * @param reserve1 token1のリザーブ量
     */
    event Sync(uint112 reserve0, uint112 reserve1);
    
    /**
     * @dev エラー：権限なし
     */
    error Unauthorized();
    
    /**
     * @dev エラー：オーバーフロー
     */
    error Overflow();
    
    /**
     * @dev エラー：不十分な流動性
     */
    error InsufficientLiquidity();
    
    /**
     * @dev エラー：不十分な流動性をバーン
     */
    error InsufficientLiquidityBurned();
    
    /**
     * @dev エラー：不十分な出力量
     */
    error InsufficientOutputAmount();
    
    /**
     * @dev エラー：不十分な入力量
     */
    error InsufficientInputAmount();
    
    /**
     * @dev エラー：不正なK値
     */
    error InvalidK();
    
    /**
     * @dev エラー：無効な受取人アドレス
     */
    error InvalidTo();
    
    /**
     * @dev コンストラクタ
     */
    constructor() ERC20("DEX LP Token", "DEX-LP") {
        factory = msg.sender;
    }
    
    /**
     * @dev ペアの初期化（ファクトリーから呼び出される）
     * @param _token0 最初のトークンアドレス
     * @param _token1 二番目のトークンアドレス
     */
    function initialize(address _token0, address _token1) external {
        if (msg.sender != factory) revert Unauthorized();
        token0 = _token0;
        token1 = _token1;
    }
    
    /**
     * @dev 現在のリザーブ量と最終更新ブロック時刻を取得
     * @return _reserve0 token0のリザーブ量
     * @return _reserve1 token1のリザーブ量
     * @return _blockTimestampLast 最終更新ブロック時刻
     */
    function getReserves() public view returns (
        uint112 _reserve0,
        uint112 _reserve1,
        uint32 _blockTimestampLast
    ) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }
    
    /**
     * @dev 流動性をミント（流動性追加）
     * @param to LPトークンの受取人アドレス
     * @return liquidity ミントされたLPトークンの量
     */
    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        if (to == address(this)) revert InvalidTo();
        
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;
        
        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply();
        
        if (_totalSupply == 0) {
            // 初回流動性提供
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0xdead), MINIMUM_LIQUIDITY); // 永続的にロック（deadアドレスに送信）
        } else {
            // 追加流動性提供
            liquidity = _min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }
        
        if (liquidity == 0) revert InsufficientLiquidity();
        _mint(to, liquidity);
        
        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint256(reserve0) * reserve1;
        
        emit Mint(msg.sender, amount0, amount1);
    }
    
    /**
     * @dev 流動性をバーン（流動性削除）
     * @param to トークンの受取人アドレス
     * @return amount0 返却されるtoken0の量
     * @return amount1 返却されるtoken1の量
     */
    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        if (to == address(this)) revert InvalidTo();
        
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));
        
        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply();
        
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        
        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidityBurned();
        
        _burn(address(this), liquidity);
        IERC20(_token0).safeTransfer(to, amount0);
        IERC20(_token1).safeTransfer(to, amount1);
        
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        
        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint256(reserve0) * reserve1;
        
        emit Burn(msg.sender, amount0, amount1, to);
    }
    
    /**
     * @dev スワップ実行
     * @param amount0Out token0の出力量
     * @param amount1Out token1の出力量
     * @param to 出力トークンの受取人
     * @param data コールバック用データ
     */
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external nonReentrant {
        if (amount0Out == 0 && amount1Out == 0) revert InsufficientOutputAmount();
        
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        if (amount0Out >= _reserve0 || amount1Out >= _reserve1) revert InsufficientLiquidity();
        
        uint256 balance0;
        uint256 balance1;
        {
            address _token0 = token0;
            address _token1 = token1;
            if (to == _token0 || to == _token1) revert InvalidTo();
            
            if (amount0Out > 0) IERC20(_token0).safeTransfer(to, amount0Out);
            if (amount1Out > 0) IERC20(_token1).safeTransfer(to, amount1Out);
            
            // コールバック（フラッシュローン等）
            if (data.length > 0) {
                // IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
            }
            
            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }
        
        uint256 amount0In = balance0 > _reserve0 - amount0Out 
            ? balance0 - (_reserve0 - amount0Out) 
            : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out 
            ? balance1 - (_reserve1 - amount1Out) 
            : 0;
        
        if (amount0In == 0 && amount1In == 0) revert InsufficientInputAmount();
        
        {
            // 手数料を考慮したK値チェック（0.3%手数料）
            uint256 balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
            uint256 balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
            
            if (balance0Adjusted * balance1Adjusted < uint256(_reserve0) * _reserve1 * 1000**2) {
                revert InvalidK();
            }
        }
        
        _update(balance0, balance1, _reserve0, _reserve1);
        
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }
    
    /**
     * @dev トークン残高をリザーブに同期
     */
    function sync() external nonReentrant {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }
    
    /**
     * @dev リザーブの更新
     */
    function _update(
        uint256 balance0,
        uint256 balance1,
        uint112 _reserve0,
        uint112 _reserve1
    ) private {
        if (balance0 > type(uint112).max || balance1 > type(uint112).max) {
            revert Overflow();
        }
        
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            price0CumulativeLast += uint256(_encode(_reserve1) / _reserve0) * timeElapsed;
            price1CumulativeLast += uint256(_encode(_reserve0) / _reserve1) * timeElapsed;
        }
        
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        
        emit Sync(reserve0, reserve1);
    }
    
    /**
     * @dev 手数料のミント
     */
    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address feeTo = IFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint256 _kLast = kLast;
        
        if (feeOn) {
            if (_kLast != 0) {
                uint256 rootK = _sqrt(uint256(_reserve0) * _reserve1);
                uint256 rootKLast = _sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint256 numerator = totalSupply() * (rootK - rootKLast);
                    uint256 denominator = (rootK * 5) + rootKLast;
                    uint256 liquidity = numerator / denominator;
                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }
    
    /**
     * @dev 平方根の計算（バビロニア法）
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
     * @dev 最小値を返す
     */
    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x < y ? x : y;
    }
    
    /**
     * @dev UQ112x112形式でエンコード
     */
    function _encode(uint112 y) private pure returns (uint224) {
        return uint224(y) * uint224(2**112);
    }
}

/**
 * @dev ファクトリーインターフェース
 */
interface IFactory {
    function feeTo() external view returns (address);
}
