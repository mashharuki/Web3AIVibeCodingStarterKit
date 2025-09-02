// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAMMRouter.sol";
import "./interfaces/IAMMFactory.sol";
import "./interfaces/IAMMPair.sol";

/**
 * @title AMMRouter
 * @dev AMM Router コントラクトの実装
 * ユーザーフレンドリーなインターフェースを提供し、
 * スリッページ保護とデッドライン機能を含む
 * 
 * Uniswap V2 Routerを参考にした実装
 * 流動性追加・除去、トークンスワップ機能を提供
 */
contract AMMRouter is IAMMRouter, ReentrancyGuard {
    // ファクトリーコントラクトのアドレス
    address private immutable _factory;
    
    // WETHコントラクトのアドレス（今回は使用しないが、インターフェース互換性のため）
    address private immutable _WETH;

    // 定数
    uint256 private constant FEE_DENOMINATOR = 1000;
    uint256 private constant FEE_NUMERATOR = 3; // 0.3% fee

    /**
     * @dev コンストラクタ
     * @param factoryAddr ファクトリーコントラクトのアドレス
     * @param WETHAddr WETHコントラクトのアドレス
     */
    constructor(address factoryAddr, address WETHAddr) {
        require(factoryAddr != address(0), "AMMRouter: INVALID_FACTORY");
        require(WETHAddr != address(0), "AMMRouter: INVALID_WETH");
        
        _factory = factoryAddr;
        _WETH = WETHAddr;
    }

    /**
     * @dev Factoryコントラクトのアドレスを取得する
     * @return factoryAddr Factoryコントラクトのアドレス
     */
    function factory() external view override returns (address factoryAddr) {
        return _factory;
    }

    /**
     * @dev WETHコントラクトのアドレスを取得する
     * @return WETHAddr WETHコントラクトのアドレス
     */
    function WETH() external view override returns (address WETHAddr) {
        return _WETH;
    }

    /**
     * @dev デッドラインチェック用のモディファイア
     * @param deadline トランザクションの有効期限
     */
    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "AMMRouter: EXPIRED");
        _;
    }

    /**
     * @dev トークンアドレスをソートする
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @return token0 小さいアドレス
     * @return token1 大きいアドレス
     */
    function _sortTokens(address tokenA, address tokenB)
        internal
        pure
        returns (address token0, address token1)
    {
        require(tokenA != tokenB, "AMMRouter: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "AMMRouter: ZERO_ADDRESS");
    }

    /**
     * @dev ペアアドレスを取得する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @return pair ペアコントラクトのアドレス
     */
    function _pairFor(address tokenA, address tokenB)
        internal
        view
        returns (address pair)
    {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        pair = IAMMFactory(_factory).getPair(token0, token1);
        require(pair != address(0), "AMMRouter: PAIR_NOT_EXISTS");
    }

    /**
     * @dev 指定されたリザーブ比率に基づいて等価な量を計算する
     * @param amountA 基準となるトークンAの量
     * @param reserveA トークンAのリザーブ量
     * @param reserveB トークンBのリザーブ量
     * @return amountB 等価なトークンBの量
     */
    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) public pure override returns (uint256 amountB) {
        require(amountA > 0, "AMMRouter: INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "AMMRouter: INSUFFICIENT_LIQUIDITY");
        amountB = (amountA * reserveB) / reserveA;
    }

    /**
     * @dev 指定された入力量に対する出力量を計算する（単一ペア）
     * @param amountIn 入力量
     * @param reserveIn 入力トークンのリザーブ量
     * @param reserveOut 出力トークンのリザーブ量
     * @return amountOut 出力量
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure override returns (uint256 amountOut) {
        require(amountIn > 0, "AMMRouter: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "AMMRouter: INSUFFICIENT_LIQUIDITY");
        
        // 手数料を考慮した計算（0.3%の手数料）
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /**
     * @dev 指定された出力量に必要な入力量を計算する（単一ペア）
     * @param amountOut 出力量
     * @param reserveIn 入力トークンのリザーブ量
     * @param reserveOut 出力トークンのリザーブ量
     * @return amountIn 入力量
     */
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure override returns (uint256 amountIn) {
        require(amountOut > 0, "AMMRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "AMMRouter: INSUFFICIENT_LIQUIDITY");
        
        // 手数料を考慮した計算（0.3%の手数料）
        uint256 numerator = reserveIn * amountOut * FEE_DENOMINATOR;
        uint256 denominator = (reserveOut - amountOut) * (FEE_DENOMINATOR - FEE_NUMERATOR);
        amountIn = (numerator / denominator) + 1;
    }

    /**
     * @dev 指定された入力量に対する出力量を計算する
     * @param amountIn 入力量
     * @param path スワップパス
     * @return amounts 各ステップでの出力量
     */
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        override
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "AMMRouter: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        for (uint256 i; i < path.length - 1; i++) {
            (uint112 reserveIn, uint112 reserveOut,) = IAMMPair(_pairFor(path[i], path[i + 1])).getReserves();
            if (path[i] > path[i + 1]) {
                (reserveIn, reserveOut) = (reserveOut, reserveIn);
            }
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    /**
     * @dev 指定された出力量に必要な入力量を計算する
     * @param amountOut 出力量
     * @param path スワップパス
     * @return amounts 各ステップでの入力量
     */
    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        override
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "AMMRouter: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        
        for (uint256 i = path.length - 1; i > 0; i--) {
            (uint112 reserveIn, uint112 reserveOut,) = IAMMPair(_pairFor(path[i - 1], path[i])).getReserves();
            if (path[i - 1] > path[i]) {
                (reserveIn, reserveOut) = (reserveOut, reserveIn);
            }
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }    /*
*
     * @dev 流動性追加時の最適な量を計算する
     * @param amountADesired 希望するtokenAの量
     * @param amountBDesired 希望するtokenBの量
     * @param amountAMin 許容するtokenAの最小量
     * @param amountBMin 許容するtokenBの最小量
     * @param reserveA tokenAのリザーブ量
     * @param reserveB tokenBのリザーブ量
     * @return amountA 実際に使用するtokenAの量
     * @return amountB 実際に使用するtokenBの量
     */
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        // ペアが存在しない場合は希望量をそのまま使用
        address pair = IAMMFactory(_factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            (uint112 reserveA, uint112 reserveB,) = IAMMPair(pair).getReserves();
            if (tokenA > tokenB) {
                (reserveA, reserveB) = (reserveB, reserveA);
            }
            
            if (reserveA == 0 && reserveB == 0) {
                (amountA, amountB) = (amountADesired, amountBDesired);
            } else {
                uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
                if (amountBOptimal <= amountBDesired) {
                    require(amountBOptimal >= amountBMin, "AMMRouter: INSUFFICIENT_B_AMOUNT");
                    (amountA, amountB) = (amountADesired, amountBOptimal);
                } else {
                    uint256 amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                    assert(amountAOptimal <= amountADesired);
                    require(amountAOptimal >= amountAMin, "AMMRouter: INSUFFICIENT_A_AMOUNT");
                    (amountA, amountB) = (amountAOptimal, amountBDesired);
                }
            }
        }
    }

    /**
     * @dev ERC20トークンペアに流動性を追加する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @param amountADesired 追加したいtokenAの量
     * @param amountBDesired 追加したいtokenBの量
     * @param amountAMin 許容するtokenAの最小量（スリッページ保護）
     * @param amountBMin 許容するtokenBの最小量（スリッページ保護）
     * @param to LPトークンの受取人アドレス
     * @param deadline トランザクションの有効期限
     * @return amountA 実際に追加されたtokenAの量
     * @return amountB 実際に追加されたtokenBの量
     * @return liquidity 発行されたLPトークンの量
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
    )
        external
        override
        nonReentrant
        ensure(deadline)
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        require(to != address(0), "AMMRouter: INVALID_TO");
        
        // 最適な流動性追加量を計算
        (amountA, amountB) = _addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );
        
        // ペアアドレスを取得（存在しない場合は作成）
        address pair = IAMMFactory(_factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = IAMMFactory(_factory).createPair(tokenA, tokenB);
        }
        
        // トークンをペアコントラクトに転送
        require(
            IERC20(tokenA).transferFrom(msg.sender, pair, amountA),
            "AMMRouter: TRANSFER_FROM_FAILED"
        );
        require(
            IERC20(tokenB).transferFrom(msg.sender, pair, amountB),
            "AMMRouter: TRANSFER_FROM_FAILED"
        );
        
        // LPトークンを発行
        liquidity = IAMMPair(pair).mint(to);
    }

    /**
     * @dev ERC20トークンペアから流動性を除去する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @param liquidity 除去するLPトークンの量
     * @param amountAMin 許容するtokenAの最小量
     * @param amountBMin 許容するtokenBの最小量
     * @param to トークンの受取人アドレス
     * @param deadline トランザクションの有効期限
     * @return amountA 返還されたtokenAの量
     * @return amountB 返還されたtokenBの量
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external override nonReentrant ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        require(to != address(0), "AMMRouter: INVALID_TO");
        require(liquidity > 0, "AMMRouter: INSUFFICIENT_LIQUIDITY");
        
        // ペアアドレスを取得
        address pair = _pairFor(tokenA, tokenB);
        
        // LPトークンをペアコントラクトに転送
        require(
            IERC20(pair).transferFrom(msg.sender, pair, liquidity),
            "AMMRouter: TRANSFER_FROM_FAILED"
        );
        
        // 流動性を除去
        (uint256 amount0, uint256 amount1) = IAMMPair(pair).burn(to);
        
        // トークンの順序を調整
        (address token0,) = _sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        
        // スリッページ保護
        require(amountA >= amountAMin, "AMMRouter: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "AMMRouter: INSUFFICIENT_B_AMOUNT");
    }

    /**
     * @dev 正確な入力量でトークンスワップを実行する
     * @param amountIn 入力するトークンの量
     * @param amountOutMin 許容する出力トークンの最小量
     * @param path スワップパス（トークンアドレスの配列）
     * @param to トークンの受取人アドレス
     * @param deadline トランザクションの有効期限
     * @return amounts 各ステップでの実際の交換量
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override nonReentrant ensure(deadline) returns (uint256[] memory amounts) {
        require(to != address(0), "AMMRouter: INVALID_TO");
        require(path.length >= 2, "AMMRouter: INVALID_PATH");
        require(amountIn > 0, "AMMRouter: INSUFFICIENT_INPUT_AMOUNT");
        
        // 出力量を計算
        amounts = this.getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "AMMRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        
        // 最初のトークンをペアに転送
        require(
            IERC20(path[0]).transferFrom(msg.sender, _pairFor(path[0], path[1]), amounts[0]),
            "AMMRouter: TRANSFER_FROM_FAILED"
        );
        
        // スワップを実行
        _swap(amounts, path, to);
    }

    /**
     * @dev 正確な出力量でトークンスワップを実行する
     * @param amountOut 出力するトークンの量
     * @param amountInMax 許容する入力トークンの最大量
     * @param path スワップパス（トークンアドレスの配列）
     * @param to トークンの受取人アドレス
     * @param deadline トランザクションの有効期限
     * @return amounts 各ステップでの実際の交換量
     */
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override nonReentrant ensure(deadline) returns (uint256[] memory amounts) {
        require(to != address(0), "AMMRouter: INVALID_TO");
        require(path.length >= 2, "AMMRouter: INVALID_PATH");
        require(amountOut > 0, "AMMRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        
        // 入力量を計算
        amounts = this.getAmountsIn(amountOut, path);
        require(amounts[0] <= amountInMax, "AMMRouter: EXCESSIVE_INPUT_AMOUNT");
        
        // 最初のトークンをペアに転送
        require(
            IERC20(path[0]).transferFrom(msg.sender, _pairFor(path[0], path[1]), amounts[0]),
            "AMMRouter: TRANSFER_FROM_FAILED"
        );
        
        // スワップを実行
        _swap(amounts, path, to);
    }

    /**
     * @dev 内部スワップ実行関数
     * @param amounts 各ステップでの交換量
     * @param path スワップパス
     * @param _to 最終的なトークンの受取人
     */
    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = _sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0 
                ? (uint256(0), amountOut) 
                : (amountOut, uint256(0));
            address to = i < path.length - 2 ? _pairFor(output, path[i + 2]) : _to;
            IAMMPair(_pairFor(input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    // ETH関連の関数（今回のプロジェクトでは使用しないが、インターフェース互換性のため実装）
    
    /**
     * @dev ETHとERC20トークンペアに流動性を追加する
     * 注意: 今回のプロジェクトではETHを使用しないため、この関数は実装されていません
     */
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        override
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        )
    {
        revert("AMMRouter: ETH_NOT_SUPPORTED");
    }

    /**
     * @dev ETHとERC20トークンペアから流動性を除去する
     * 注意: 今回のプロジェクトではETHを使用しないため、この関数は実装されていません
     */
    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external override returns (uint256 amountToken, uint256 amountETH) {
        revert("AMMRouter: ETH_NOT_SUPPORTED");
    }

    /**
     * @dev 正確なETH入力量でトークンスワップを実行する
     * 注意: 今回のプロジェクトではETHを使用しないため、この関数は実装されていません
     */
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable override returns (uint256[] memory amounts) {
        revert("AMMRouter: ETH_NOT_SUPPORTED");
    }

    /**
     * @dev 正確なトークン入力量でETHスワップを実行する
     * 注意: 今回のプロジェクトではETHを使用しないため、この関数は実装されていません
     */
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override returns (uint256[] memory amounts) {
        revert("AMMRouter: ETH_NOT_SUPPORTED");
    }
}