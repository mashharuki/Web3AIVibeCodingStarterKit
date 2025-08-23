// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IDEXPair} from "../interfaces/IDEXPair.sol";
import {IDEXFactory} from "../interfaces/IDEXFactory.sol";
import {Errors} from "../libraries/Errors.sol";
import {Math} from "../libraries/Math.sol";
import {UQ112x112} from "../libraries/UQ112x112.sol";

/**
 * @title DEXPair
 * @dev UniswapライクなAMM DEXのペアコントラクト
 * 流動性プールとトークンスワップ機能を提供する
 * x*y=k定数積公式を使用したAMM実装
 */
contract DEXPair is IDEXPair, ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev 最小流動性（初回流動性提供時にバーンされる）
    uint256 public constant MINIMUM_LIQUIDITY = 10**3;

    /// @dev ファクトリーコントラクトのアドレス
    address public factory;

    /// @dev ペアの最初のトークン
    address public override token0;

    /// @dev ペアの2番目のトークン
    address public override token1;

    /// @dev token0のリザーブ量
    uint112 private reserve0;

    /// @dev token1のリザーブ量
    uint112 private reserve1;

    /// @dev 最終更新時刻
    uint32 private blockTimestampLast;

    /// @dev token0の価格累積値
    uint256 public override price0CumulativeLast;

    /// @dev token1の価格累積値
    uint256 public override price1CumulativeLast;

    /// @dev 最後のk値（手数料計算用）
    uint256 public override kLast;

    /// @dev 初期化フラグ
    bool private initialized;

    /**
     * @dev コンストラクタ
     */
    constructor() ERC20("DEX LP Token", "DEX-LP") {
        factory = msg.sender;
    }

    /**
     * @dev ペアコントラクトを初期化する（ファクトリーからのみ呼び出し可能）
     * @param _token0 token0のアドレス
     * @param _token1 token1のアドレス
     */
    function initialize(address _token0, address _token1) external override {
        if (msg.sender != factory) revert Errors.Forbidden();
        if (initialized) revert Errors.AlreadyInitialized();
        
        token0 = _token0;
        token1 = _token1;
        initialized = true;
    }

    /**
     * @dev 現在のリザーブ量と最終更新時刻を取得する
     * @return _reserve0 token0のリザーブ量
     * @return _reserve1 token1のリザーブ量
     * @return _blockTimestampLast 最終更新時刻
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

    /**
     * @dev 内部用のリザーブ取得関数
     * @return _reserve0 token0のリザーブ量
     * @return _reserve1 token1のリザーブ量
     * @return _blockTimestampLast 最終更新時刻
     */
    function _getReserves()
        private
        view
        returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)
    {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    /**
     * @dev 流動性を追加してLPトークンをミントする
     * @param to LPトークンの受取先アドレス
     * @return liquidity ミントされたLPトークンの数量
     */
    function mint(address to) external override nonReentrant returns (uint256 liquidity) {
        if (to == address(0)) revert Errors.ZeroAddress();
        
        (uint112 _reserve0, uint112 _reserve1,) = _getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply(); // ガス節約のため、_mintFee後に取得

        if (_totalSupply == 0) {
            // 初回流動性提供
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(1), MINIMUM_LIQUIDITY); // 永続的にロック（address(1)を使用）
        } else {
            // 追加流動性提供
            liquidity = Math.min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }

        if (liquidity == 0) revert Errors.InsufficientLiquidityMinted();
        
        _mint(to, liquidity);
        _update(balance0, balance1, _reserve0, _reserve1);
        
        if (feeOn) kLast = uint256(reserve0) * reserve1; // reserve0とreserve1は_updateで更新済み
        
        emit Mint(msg.sender, amount0, amount1);
    }

    /**
     * @dev LPトークンをバーンして流動性を除去する
     * @param to 除去されたトークンの受取先アドレス
     * @return amount0 除去されたtoken0の数量
     * @return amount1 除去されたtoken1の数量
     */
    function burn(address to)
        external
        override
        nonReentrant
        returns (uint256 amount0, uint256 amount1)
    {
        if (to == address(0)) revert Errors.ZeroAddress();
        
        (uint112 _reserve0, uint112 _reserve1,) = _getReserves();
        address _token0 = token0; // ガス節約
        address _token1 = token1; // ガス節約
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply(); // ガス節約のため、_mintFee後に取得
        
        amount0 = (liquidity * balance0) / _totalSupply; // 比例配分を使用
        amount1 = (liquidity * balance1) / _totalSupply; // 比例配分を使用
        
        if (amount0 == 0 || amount1 == 0) revert Errors.InsufficientLiquidityBurned();
        
        _burn(address(this), liquidity);
        IERC20(_token0).safeTransfer(to, amount0);
        IERC20(_token1).safeTransfer(to, amount1);
        
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        
        _update(balance0, balance1, _reserve0, _reserve1);
        
        if (feeOn) kLast = uint256(reserve0) * reserve1; // reserve0とreserve1は_updateで更新済み
        
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /**
     * @dev トークンスワップを実行する
     * @param amount0Out 出力するtoken0の数量
     * @param amount1Out 出力するtoken1の数量
     * @param to 出力トークンの受取先アドレス
     * @param data フラッシュスワップ用のデータ
     */
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external override nonReentrant {
        _validateSwapInputs(amount0Out, amount1Out, to);
        
        (uint112 _reserve0, uint112 _reserve1,) = _getReserves();
        if (amount0Out >= _reserve0 || amount1Out >= _reserve1) revert Errors.InsufficientLiquidity();

        (uint256 balance0, uint256 balance1) = _executeSwap(amount0Out, amount1Out, to, data);
        
        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        
        _validateSwapAmounts(amount0In, amount1In, balance0, balance1, _reserve0, _reserve1);

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /**
     * @dev スワップ入力を検証する
     */
    function _validateSwapInputs(uint256 amount0Out, uint256 amount1Out, address to) private view {
        if (amount0Out == 0 && amount1Out == 0) revert Errors.InsufficientOutputAmount();
        if (to == token0 || to == token1) revert Errors.InvalidToken();
    }

    /**
     * @dev スワップを実行する
     */
    function _executeSwap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) private returns (uint256 balance0, uint256 balance1) {
        address _token0 = token0;
        address _token1 = token1;
        
        if (amount0Out > 0) IERC20(_token0).safeTransfer(to, amount0Out);
        if (amount1Out > 0) IERC20(_token1).safeTransfer(to, amount1Out);
        
        if (data.length > 0) ICallee(to).call(msg.sender, amount0Out, amount1Out, data);
        
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
    }

    /**
     * @dev スワップ数量を検証する
     */
    function _validateSwapAmounts(
        uint256 amount0In,
        uint256 amount1In,
        uint256 balance0,
        uint256 balance1,
        uint112 _reserve0,
        uint112 _reserve1
    ) private pure {
        if (amount0In == 0 && amount1In == 0) revert Errors.InsufficientInputAmount();
        
        uint256 balance0Adjusted = balance0 * 1000 - amount0In * 3;
        uint256 balance1Adjusted = balance1 * 1000 - amount1In * 3;
        if (balance0Adjusted * balance1Adjusted < uint256(_reserve0) * _reserve1 * (1000**2)) {
            revert Errors.InvalidK();
        }
    }

    /**
     * @dev リザーブを強制的に現在の残高に同期する
     */
    function sync() external override {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }

    /**
     * @dev リザーブを更新し、価格累積値を計算する
     * @param balance0 token0の現在残高
     * @param balance1 token1の現在残高
     * @param _reserve0 token0の前回リザーブ
     * @param _reserve1 token1の前回リザーブ
     */
    function _update(
        uint256 balance0,
        uint256 balance1,
        uint112 _reserve0,
        uint112 _reserve1
    ) private {
        if (balance0 > type(uint112).max || balance1 > type(uint112).max) {
            revert Errors.Overflow();
        }

        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;

        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // * は決してオーバーフローしない、かつ + は最大で1回だけオーバーフローする
            price0CumulativeLast += uint256(UQ112x112.uqdiv(UQ112x112.encode(_reserve1), _reserve0)) * timeElapsed;
            price1CumulativeLast += uint256(UQ112x112.uqdiv(UQ112x112.encode(_reserve0), _reserve1)) * timeElapsed;
        }

        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;

        emit Sync(reserve0, reserve1);
    }

    /**
     * @dev 手数料がオンの場合、kLastを更新する
     * @param _reserve0 token0のリザーブ
     * @param _reserve1 token1のリザーブ
     * @return feeOn 手数料がオンかどうか
     */
    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address feeTo = IDEXFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint256 _kLast = kLast; // ガス節約
        
        if (feeOn) {
            if (_kLast != 0) {
                uint256 rootK = Math.sqrt(uint256(_reserve0) * _reserve1);
                uint256 rootKLast = Math.sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint256 numerator = totalSupply() * (rootK - rootKLast);
                    uint256 denominator = rootK * 5 + rootKLast;
                    uint256 liquidity = numerator / denominator;
                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }
}

/**
 * @title ICallee
 * @dev フラッシュスワップコールバックインターフェース
 */
interface ICallee {
    function call(address sender, uint256 amount0, uint256 amount1, bytes calldata data) external;
}