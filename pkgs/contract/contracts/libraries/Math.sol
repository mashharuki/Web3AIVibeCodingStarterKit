// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Errors} from "./Errors.sol";

/**
 * @title Math
 * @dev DEXで使用する数学計算ライブラリ
 */
library Math {
    /**
     * @dev 2つの値の最小値を返す
     * @param x 最初の値
     * @param y 2番目の値
     * @return z 最小値
     */
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }

    /**
     * @dev 平方根を計算する（Babylonian method）
     * @param y 平方根を求める値
     * @return z 平方根
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
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
     * @dev 指定された入力数量に対する出力数量を計算する（手数料考慮）
     * @param amountIn 入力数量
     * @param reserveIn 入力トークンのリザーブ量
     * @param reserveOut 出力トークンのリザーブ量
     * @return amountOut 出力数量
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        if (amountIn == 0) revert Errors.InsufficientInputAmount();
        if (reserveIn == 0 || reserveOut == 0) revert Errors.InsufficientLiquidity();
        
        uint256 amountInWithFee = amountIn * 997; // 0.3% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /**
     * @dev 指定された出力数量に必要な入力数量を計算する（手数料考慮）
     * @param amountOut 出力数量
     * @param reserveIn 入力トークンのリザーブ量
     * @param reserveOut 出力トークンのリザーブ量
     * @return amountIn 必要な入力数量
     */
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountIn) {
        if (amountOut == 0) revert Errors.InsufficientOutputAmount();
        if (reserveIn == 0 || reserveOut == 0) revert Errors.InsufficientLiquidity();
        
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    /**
     * @dev パス全体での出力数量を計算する
     * @param amountIn 入力数量
     * @param path スワップパス
     * @param reserves 各ペアのリザーブ量
     * @return amounts 各ステップでの数量配列
     */
    function getAmountsOut(
        uint256 amountIn,
        address[] memory path,
        uint256[][] memory reserves
    ) internal pure returns (uint256[] memory amounts) {
        if (path.length < 2) revert Errors.InvalidPath();
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        for (uint256 i; i < path.length - 1; i++) {
            amounts[i + 1] = getAmountOut(amounts[i], reserves[i][0], reserves[i][1]);
        }
    }

    /**
     * @dev パス全体での必要入力数量を計算する
     * @param amountOut 出力数量
     * @param path スワップパス
     * @param reserves 各ペアのリザーブ量
     * @return amounts 各ステップでの数量配列
     */
    function getAmountsIn(
        uint256 amountOut,
        address[] memory path,
        uint256[][] memory reserves
    ) internal pure returns (uint256[] memory amounts) {
        if (path.length < 2) revert Errors.InvalidPath();
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        
        for (uint256 i = path.length - 1; i > 0; i--) {
            amounts[i - 1] = getAmountIn(amounts[i], reserves[i - 1][0], reserves[i - 1][1]);
        }
    }

    /**
     * @dev 流動性追加時の最適な数量を計算する
     * @param amountADesired 希望するtokenA数量
     * @param amountBDesired 希望するtokenB数量
     * @param reserveA tokenAのリザーブ量
     * @param reserveB tokenBのリザーブ量
     * @return amountA 最適なtokenA数量
     * @return amountB 最適なtokenB数量
     */
    function quote(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 reserveA,
        uint256 reserveB
    ) internal pure returns (uint256 amountA, uint256 amountB) {
        if (amountADesired == 0 || amountBDesired == 0) revert Errors.InvalidAmount();
        
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = (amountADesired * reserveB) / reserveA;
            if (amountBOptimal <= amountBDesired) {
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = (amountBDesired * reserveA) / reserveB;
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }
}