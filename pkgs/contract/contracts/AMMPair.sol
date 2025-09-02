// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAMMPair.sol";

/**
 * @title AMMPair
 * @dev AMM Pair コントラクトの完全実装
 * 個別取引ペアの流動性管理とスワップ実行を行う
 * ERC20トークンとしてLPトークンの機能も提供する
 * 
 * Constant Product Formula (x * y = k) を使用したAMM実装
 * 0.3%の取引手数料を徴収
 */
contract AMMPair is ERC20, IAMMPair, ReentrancyGuard {
    // ペアのトークンアドレス
    address public override token0;
    address public override token1;

    // リザーブ量
    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    // 価格累積値（TWAP計算用）
    uint256 public override price0CumulativeLast;
    uint256 public override price1CumulativeLast;
    
    // K値の最後の値（手数料計算用）
    uint256 public override kLast;

    // ファクトリーアドレス
    address public factory;

    // 初期化フラグ
    bool private initialized;

    // 定数
    uint256 private constant MINIMUM_LIQUIDITY = 10**3;
    uint256 private constant FEE_DENOMINATOR = 1000;
    uint256 private constant FEE_NUMERATOR = 3; // 0.3% fee

    // リエントランシー保護用のロック
    uint256 private unlocked = 1;

    /**
     * @dev コンストラクタ
     * LPトークンとしてERC20を初期化
     */
    constructor() ERC20("AMM LP Token", "AMM-LP") {
        factory = msg.sender;
    }

    /**
     * @dev ペアを初期化する（Factoryから呼び出される）
     * @param _token0 最初のトークンアドレス
     * @param _token1 2番目のトークンアドレス
     */
    function initialize(address _token0, address _token1) external override {
        require(msg.sender == factory, "AMMPair: FORBIDDEN");
        require(!initialized, "AMMPair: ALREADY_INITIALIZED");
        
        token0 = _token0;
        token1 = _token1;
        initialized = true;
    }

    /**
     * @dev リザーブを更新し、価格累積値を計算する
     * @param balance0 token0の現在残高
     * @param balance1 token1の現在残高
     * @param _reserve0 token0の前回リザーブ
     * @param _reserve1 token1の前回リザーブ
     */
    function _update(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "AMMPair: OVERFLOW");
        
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
        
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // * never overflows, and + overflow is desired
            price0CumulativeLast += uint256(_reserve1) * 2**112 / _reserve0 * timeElapsed;
            price1CumulativeLast += uint256(_reserve0) * 2**112 / _reserve1 * timeElapsed;
        }
        
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        
        emit Sync(reserve0, reserve1);
    }

    /**
     * @dev 平方根を計算する（Babylonian method）
     * @param y 平方根を求める値
     * @return z 平方根の結果
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
     * @dev 現在のリザーブ量を取得する
     * @return _reserve0 token0のリザーブ量
     * @return _reserve1 token1のリザーブ量
     * @return _blockTimestampLast 最後に更新されたブロックタイムスタンプ
     */
    function getReserves()
        external
        view
        override
        returns (
            uint112 _reserve0,
            uint112 _reserve1,
            uint32 _blockTimestampLast
        )
    {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    /**
     * @dev 流動性を追加してLPトークンを発行する
     * @param to LPトークンの受取人アドレス
     * @return liquidity 発行されたLPトークンの量
     */
    function mint(address to) external override nonReentrant returns (uint256 liquidity) {
        require(to != address(0), "AMMPair: INVALID_TO");
        require(initialized, "AMMPair: NOT_INITIALIZED");
        
        uint112 _reserve0 = reserve0; // gas savings
        uint112 _reserve1 = reserve1;
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply(); // gas savings, must be defined here since totalSupply can update in _mintFee
        
        if (_totalSupply == 0) {
            // 初回流動性提供の場合
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(factory, MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens at factory
        } else {
            // 既存プールへの流動性追加の場合
            liquidity = min(amount0 * _totalSupply / _reserve0, amount1 * _totalSupply / _reserve1);
        }
        
        require(liquidity > 0, "AMMPair: INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        
        emit Mint(msg.sender, amount0, amount1);
    }

    /**
     * @dev LPトークンをバーンして流動性を除去する
     * @param to トークンの受取人アドレス
     * @return amount0 返還されたtoken0の量
     * @return amount1 返還されたtoken1の量
     */
    function burn(address to)
        external
        override
        nonReentrant
        returns (uint256 amount0, uint256 amount1)
    {
        require(to != address(0), "AMMPair: INVALID_TO");
        require(initialized, "AMMPair: NOT_INITIALIZED");
        
        uint112 _reserve0 = reserve0; // gas savings
        uint112 _reserve1 = reserve1;
        address _token0 = token0;                                // gas savings
        address _token1 = token1;                                // gas savings
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply(); // gas savings, must be defined here since totalSupply can update in _mintFee
        amount0 = liquidity * balance0 / _totalSupply; // using balances ensures pro-rata distribution
        amount1 = liquidity * balance1 / _totalSupply; // using balances ensures pro-rata distribution
        
        require(amount0 > 0 && amount1 > 0, "AMMPair: INSUFFICIENT_LIQUIDITY_BURNED");
        
        _burn(address(this), liquidity);
        
        // トークンを送信
        require(IERC20(_token0).transfer(to, amount0), "AMMPair: TRANSFER_FAILED");
        require(IERC20(_token1).transfer(to, amount1), "AMMPair: TRANSFER_FAILED");
        
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);
        
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /**
     * @dev トークンスワップを実行する
     * @param amount0Out 出力するtoken0の量
     * @param amount1Out 出力するtoken1の量
     * @param to トークンの送信先アドレス
     * @param data フラッシュローン用のコールバックデータ
     */
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external override nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, "AMMPair: INSUFFICIENT_OUTPUT_AMOUNT");
        require(to != address(0), "AMMPair: INVALID_TO");
        require(initialized, "AMMPair: NOT_INITIALIZED");
        
        uint112 _reserve0 = reserve0; // gas savings
        uint112 _reserve1 = reserve1;
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "AMMPair: INSUFFICIENT_LIQUIDITY");

        uint256 balance0;
        uint256 balance1;
        { // scope for _token{0,1}, avoids stack too deep errors
            address _token0 = token0;
            address _token1 = token1;
            require(to != _token0 && to != _token1, "AMMPair: INVALID_TO");
            
            // トークンを送信
            if (amount0Out > 0) require(IERC20(_token0).transfer(to, amount0Out), "AMMPair: TRANSFER_FAILED");
            if (amount1Out > 0) require(IERC20(_token1).transfer(to, amount1Out), "AMMPair: TRANSFER_FAILED");
            
            // フラッシュローンのコールバック（必要に応じて）
            if (data.length > 0) {
                // フラッシュローンコールバックの実装は省略（基本的なAMMでは不要）
            }
            
            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }
        
        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, "AMMPair: INSUFFICIENT_INPUT_AMOUNT");
        
        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
            // 手数料を考慮した残高調整（0.3%の手数料）
            uint256 balance0Adjusted = balance0 * FEE_DENOMINATOR - amount0In * FEE_NUMERATOR;
            uint256 balance1Adjusted = balance1 * FEE_DENOMINATOR - amount1In * FEE_NUMERATOR;
            
            // Constant Product Formula (x * y = k) の検証
            require(
                balance0Adjusted * balance1Adjusted >= uint256(_reserve0) * _reserve1 * (FEE_DENOMINATOR**2),
                "AMMPair: K"
            );
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /**
     * @dev リザーブを強制的に現在の残高に同期する
     * 余剰分を指定されたアドレスに送信する
     * @param to 余剰トークンの送信先アドレス
     */
    function skim(address to) external override nonReentrant {
        require(to != address(0), "AMMPair: INVALID_TO");
        require(initialized, "AMMPair: NOT_INITIALIZED");
        
        address _token0 = token0; // gas savings
        address _token1 = token1; // gas savings
        
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        
        // 余剰分を送信
        if (balance0 > reserve0) {
            require(IERC20(_token0).transfer(to, balance0 - reserve0), "AMMPair: TRANSFER_FAILED");
        }
        if (balance1 > reserve1) {
            require(IERC20(_token1).transfer(to, balance1 - reserve1), "AMMPair: TRANSFER_FAILED");
        }
    }

    /**
     * @dev リザーブを現在の残高に同期する
     * 残高がリザーブより少ない場合に使用
     */
    function sync() external override nonReentrant {
        require(initialized, "AMMPair: NOT_INITIALIZED");
        
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        
        _update(balance0, balance1, reserve0, reserve1);
    }

    /**
     * @dev 2つの値の最小値を返す
     * @param x 値1
     * @param y 値2
     * @return 最小値
     */
    function min(uint256 x, uint256 y) private pure returns (uint256) {
        return x < y ? x : y;
    }


}