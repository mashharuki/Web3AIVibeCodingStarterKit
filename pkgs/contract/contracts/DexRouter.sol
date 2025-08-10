// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./DexFactory.sol";
import "./DexPair.sol";

/**
 * @title DexRouter
 * @dev ユーザーとの主要インターフェースを提供するルーターコントラクト
 * @notice 流動性管理とスワップ機能を提供
 */
contract DexRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /// @dev ファクトリーコントラクトのアドレス
    address public immutable FACTORY;
    
    /**
     * @dev エラー：期限切れ
     */
    error DeadlineExpired();
    
    /**
     * @dev エラー：不十分なA量
     */
    error InsufficientAAmount();
    
    /**
     * @dev エラー：不十分なB量
     */
    error InsufficientBAmount();
    
    /**
     * @dev エラー：不十分な出力量
     */
    error InsufficientOutputAmount();
    
    /**
     * @dev エラー：過度な入力量
     */
    error ExcessiveInputAmount();
    
    /**
     * @dev エラー：不正なパス
     */
    error InvalidPath();
    
    /**
     * @dev エラー：ゼロアドレス
     */
    error ZeroAddress();
    
    /**
     * @dev エラー：同一トークン
     */
    error IdenticalTokens();
    
    /**
     * @dev エラー：ペアが存在しない
     */
    error PairDoesNotExist();
    
    /**
     * @dev エラー：不正な入力量
     */
    error InvalidInputAmount();
    
    /**
     * @dev コンストラクタ
     * @param factoryAddress ファクトリーコントラクトのアドレス
     */
    constructor(address factoryAddress) {
        if (factoryAddress == address(0)) revert ZeroAddress();
        FACTORY = factoryAddress;
    }
    
    /**
     * @dev デッドラインチェック用修飾子
     * @param deadline 期限タイムスタンプ
     */
    modifier ensure(uint256 deadline) {
        if (block.timestamp > deadline) revert DeadlineExpired();
        _;
    }
    
    /**
     * @dev 流動性を追加
     * @param tokenA トークンAのアドレス
     * @param tokenB トークンBのアドレス
     * @param amountADesired トークンAの希望追加量
     * @param amountBDesired トークンBの希望追加量
     * @param amountAMin トークンAの最小追加量
     * @param amountBMin トークンBの最小追加量
     * @param to LPトークンの受取人
     * @param deadline 期限タイムスタンプ
     * @return amountA 実際に追加されたトークンAの量
     * @return amountB 実際に追加されたトークンBの量
     * @return liquidity 受け取ったLPトークンの量
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) nonReentrant returns (
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    ) {
        (amountA, amountB) = _addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );
        
        address pair = DexFactory(FACTORY).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = DexFactory(FACTORY).createPair(tokenA, tokenB);
        }
        
        IERC20(tokenA).safeTransferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, pair, amountB);
        liquidity = DexPair(pair).mint(to);
    }
    
    /**
     * @dev 流動性を削除
     * @param tokenA トークンAのアドレス
     * @param tokenB トークンBのアドレス
     * @param liquidity 削除するLPトークンの量
     * @param amountAMin トークンAの最小受取量
     * @param amountBMin トークンBの最小受取量
     * @param to トークンの受取人
     * @param deadline 期限タイムスタンプ
     * @return amountA 受け取ったトークンAの量
     * @return amountB 受け取ったトークンBの量
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) nonReentrant returns (uint256 amountA, uint256 amountB) {
        address pair = DexFactory(FACTORY).getPair(tokenA, tokenB);
        if (pair == address(0)) revert PairDoesNotExist();
        
        IERC20(pair).safeTransferFrom(msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = DexPair(pair).burn(to);
        
        (address token0,) = _sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        
        if (amountA < amountAMin) revert InsufficientAAmount();
        if (amountB < amountBMin) revert InsufficientBAmount();
    }
    
    /**
     * @dev 正確な入力量でトークンをスワップ
     * @param amountIn 入力トークンの量
     * @param amountOutMin 最小出力トークンの量
     * @param path スワップパス（トークンアドレスの配列）
     * @param to 出力トークンの受取人
     * @param deadline 期限タイムスタンプ
     * @return amounts 各段階でのトークン量
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) nonReentrant returns (uint256[] memory amounts) {
        amounts = getAmountsOut(amountIn, path);
        if (amounts[amounts.length - 1] < amountOutMin) revert InsufficientOutputAmount();
        
        IERC20(path[0]).safeTransferFrom(
            msg.sender,
            DexFactory(FACTORY).getPair(path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, to);
    }
    
    /**
     * @dev 正確な出力量でトークンをスワップ
     * @param amountOut 出力トークンの量
     * @param amountInMax 最大入力トークンの量
     * @param path スワップパス（トークンアドレスの配列）
     * @param to 出力トークンの受取人
     * @param deadline 期限タイムスタンプ
     * @return amounts 各段階でのトークン量
     */
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) nonReentrant returns (uint256[] memory amounts) {
        amounts = getAmountsIn(amountOut, path);
        if (amounts[0] > amountInMax) revert ExcessiveInputAmount();
        
        IERC20(path[0]).safeTransferFrom(
            msg.sender,
            DexFactory(FACTORY).getPair(path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, to);
    }
    
    /**
     * @dev 流動性追加のための最適な量を計算
     */
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        address pair = DexFactory(FACTORY).getPair(tokenA, tokenB);
        
        if (pair == address(0)) {
            // 新しいペアの場合
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            // 既存ペアの場合、リザーブを確認
            (uint256 reserveA, uint256 reserveB) = getReserves(tokenA, tokenB);
            
            if (reserveA == 0 && reserveB == 0) {
                // ペアは存在するがリザーブが0の場合（初回流動性提供）
                (amountA, amountB) = (amountADesired, amountBDesired);
            } else {
                // 既存流動性がある場合、比率を計算
                uint256 amountBOptimal = _quote(amountADesired, reserveA, reserveB);
                
                if (amountBOptimal <= amountBDesired) {
                    if (amountBOptimal < amountBMin) revert InsufficientBAmount();
                    (amountA, amountB) = (amountADesired, amountBOptimal);
                } else {
                    uint256 amountAOptimal = _quote(amountBDesired, reserveB, reserveA);
                    if (amountAOptimal > amountADesired) revert ExcessiveInputAmount();
                    if (amountAOptimal < amountAMin) revert InsufficientAAmount();
                    (amountA, amountB) = (amountAOptimal, amountBDesired);
                }
            }
        }
    }
    
    /**
     * @dev スワップの実行
     */
    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = _sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0 
                ? (uint256(0), amountOut) 
                : (amountOut, uint256(0));
            address to = i < path.length - 2 
                ? DexFactory(FACTORY).getPair(output, path[i + 2]) 
                : _to;
            
            DexPair(DexFactory(FACTORY).getPair(input, output)).swap(
                amount0Out,
                amount1Out,
                to,
                new bytes(0)
            );
        }
    }
    
    /**
     * @dev リザーブ量を取得
     * @param tokenA トークンAのアドレス
     * @param tokenB トークンBのアドレス
     * @return reserveA トークンAのリザーブ量
     * @return reserveB トークンBのリザーブ量
     */
    function getReserves(address tokenA, address tokenB) 
        public view returns (uint256 reserveA, uint256 reserveB) {
        (address token0,) = _sortTokens(tokenA, tokenB);
        address pair = DexFactory(FACTORY).getPair(tokenA, tokenB);
        if (pair == address(0)) return (0, 0);
        
        (uint256 reserve0, uint256 reserve1,) = DexPair(pair).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }
    
    /**
     * @dev 入力量から出力量を計算
     * @param amountIn 入力トークンの量
     * @param reserveIn 入力トークンのリザーブ量
     * @param reserveOut 出力トークンのリザーブ量
     * @return amountOut 出力トークンの量
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public pure returns (uint256 amountOut) {
        if (amountIn == 0) revert InvalidInputAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientOutputAmount();
        
        uint256 amountInWithFee = amountIn * 997; // 0.3%の手数料
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }
    
    /**
     * @dev 出力量から入力量を計算
     * @param amountOut 出力トークンの量
     * @param reserveIn 入力トークンのリザーブ量
     * @param reserveOut 出力トークンのリザーブ量
     * @return amountIn 入力トークンの量
     */
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        public pure returns (uint256 amountIn) {
        if (amountOut == 0) revert InsufficientOutputAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InvalidInputAmount();
        
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }
    
    /**
     * @dev パス全体での出力量を計算
     * @param amountIn 入力量
     * @param path スワップパス
     * @return amounts 各段階での量
     */
    function getAmountsOut(uint256 amountIn, address[] memory path)
        public view returns (uint256[] memory amounts) {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }
    
    /**
     * @dev パス全体での入力量を計算
     * @param amountOut 出力量
     * @param path スワップパス
     * @return amounts 各段階での量
     */
    function getAmountsIn(uint256 amountOut, address[] memory path)
        public view returns (uint256[] memory amounts) {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        
        for (uint256 i = path.length - 1; i > 0; i--) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(path[i - 1], path[i]);
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }
    
    /**
     * @dev 比例計算（クォート）
     */
    function _quote(uint256 amountA, uint256 reserveA, uint256 reserveB) 
        internal pure returns (uint256 amountB) {
        if (amountA == 0) revert InsufficientAAmount();
        if (reserveA == 0 || reserveB == 0) revert InsufficientOutputAmount();
        amountB = (amountA * reserveB) / reserveA;
    }
    
    /**
     * @dev トークンアドレスをソート
     */
    function _sortTokens(address tokenA, address tokenB) 
        internal pure returns (address token0, address token1) {
        if (tokenA == tokenB) revert IdenticalTokens();
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        if (token0 == address(0)) revert ZeroAddress();
    }
}
